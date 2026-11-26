import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  HOLD_MINUTES, HttpError, SERVICE_FEE, assertEventStaff, asyncH, makeQrToken, minutesFromNow, orderCode, parse, prisma,
  requireAuth, shortCode, verifyQrToken,
} from '../lib/core.js';
import { adapters, type Method } from '../lib/payments.js';

export const orders = Router();
type Tx = Prisma.TransactionClient;

/** Reserve `qty` of a tier without overselling: the WHERE clause is the lock. */
async function holdTier(tx: Tx, tierId: string, qty: number) {
  const n = await tx.$executeRaw`
    UPDATE "TicketTier" SET held = held + ${qty}
    WHERE id = ${tierId} AND sold + held + ${qty} <= quantity`;
  if (n === 0) throw new HttpError(409, 'Those tickets just sold out. Join the waitlist and we’ll offer you the next ones.', 'sold_out');
}

async function holdSeats(tx: Tx, eventId: string, seatIds: string[], orderId: string) {
  if (!seatIds.length) return;
  const r = await tx.seat.updateMany({
    where: { id: { in: seatIds }, eventId, status: 'OPEN' },
    data: { status: 'HELD', heldUntil: minutesFromNow(HOLD_MINUTES.order), heldByOrder: orderId },
  });
  if (r.count !== seatIds.length) throw new HttpError(409, 'Someone just took one of those seats. Pick another.', 'seat_taken');
}

function priceOrder(subtotal: number, promo?: { type: 'PERCENT' | 'FIXED'; value: number } | null) {
  const discount = !promo ? 0 : promo.type === 'PERCENT' ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);
  const fee = subtotal - discount > 0 ? Math.round((subtotal - discount) * SERVICE_FEE) : 0;
  return { discount, fee, total: subtotal - discount + fee };
}

// ---------- Create an order (places holds) ----------
const CreateOrder = z.object({
  eventId: z.string(),
  items: z.array(z.object({ tierId: z.string(), quantity: z.number().int().min(1).max(10) })).min(1),
  seatIds: z.array(z.string()).default([]),
  promoCode: z.string().optional(),
  groupShareCode: z.string().optional(),
});

orders.post('/orders', requireAuth, asyncH(async (req, res) => {
  const d = parse(CreateOrder, req.body);
  const tiers = await prisma.ticketTier.findMany({ where: { id: { in: d.items.map((i) => i.tierId) }, eventId: d.eventId } });
  if (tiers.length !== d.items.length) throw new HttpError(400, 'One of those ticket types isn’t part of this event.');
  const now = new Date();
  for (const t of tiers) {
    if (t.salesStart && t.salesStart > now) throw new HttpError(400, `${t.name} tickets aren’t on sale yet.`);
    if (t.salesEnd && t.salesEnd < now) throw new HttpError(400, `${t.name} sales have closed.`);
  }
  const seatsNeeded = d.items.reduce((s, i) => s + (tiers.find((t) => t.id === i.tierId)!.needsSeat ? i.quantity : 0), 0);
  if (seatsNeeded !== d.seatIds.length) throw new HttpError(400, `Pick ${seatsNeeded} seat${seatsNeeded === 1 ? '' : 's'}.`);

  const promo = d.promoCode
    ? await prisma.promoCode.findUnique({ where: { eventId_code: { eventId: d.eventId, code: d.promoCode.toUpperCase() } } })
    : null;
  if (d.promoCode && (!promo || (promo.expiresAt && promo.expiresAt < now) || (promo.maxUses && promo.used >= promo.maxUses)))
    throw new HttpError(400, 'That code isn’t valid for this event.', 'bad_promo');

  const group = d.groupShareCode ? await prisma.groupBooking.findUnique({ where: { shareCode: d.groupShareCode } }) : null;

  const subtotal = d.items.reduce((s, i) => s + tiers.find((t) => t.id === i.tierId)!.price * i.quantity, 0);
  const { discount, fee, total } = priceOrder(subtotal, promo);

  const order = await prisma.$transaction(async (tx) => {
    // Group members pay for seats already held by the group, so no new tier hold.
    if (!group) for (const i of d.items) await holdTier(tx, i.tierId, i.quantity);
    const o = await tx.order.create({
      data: {
        code: orderCode(), eventId: d.eventId, userId: req.user!.id, subtotal, discount, fee, total,
        promoId: promo?.id, groupBookingId: group?.id,
        expiresAt: group ? group.deadline : minutesFromNow(HOLD_MINUTES.order),
        items: { create: d.items.map((i) => ({ tierId: i.tierId, quantity: i.quantity, price: tiers.find((t) => t.id === i.tierId)!.price })) },
      },
    });
    await holdSeats(tx, d.eventId, d.seatIds, o.id);
    return o;
  });

  // Free orders confirm straight away.
  if (total === 0) await fulfil(order.id, 'FREE', `FREE-${order.code}`);
  res.status(201).json(await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } }));
}));

// ---------- Pay ----------
orders.post('/orders/:id/pay', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ method: z.enum(['JAZZCASH', 'EASYPAISA', 'CARD']), phone: z.string().regex(/^03\d{9}$/).optional(), email: z.string().email() }), req.body);
  if (d.method !== 'CARD' && !d.phone) throw new HttpError(400, 'Enter an 11-digit mobile number starting with 03.');
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== req.user!.id) throw new HttpError(404, 'Order not found.');
  if (order.status !== 'PENDING') throw new HttpError(409, 'This order is already closed.');
  if (order.expiresAt < new Date()) throw new HttpError(410, 'Your hold ran out. Pick your tickets again.');
  const r = await adapters[d.method as Method].init({ code: order.code, total: order.total, phone: d.phone, email: d.email });
  await prisma.order.update({ where: { id: order.id }, data: { method: d.method, providerRef: r.providerRef } });
  res.json(r);
}));

// Provider callbacks (JazzCash / Easypaisa / card). Idempotent.
orders.post('/payments/webhook/:provider', asyncH(async (req, res) => {
  const m = req.params.provider.toUpperCase() as Method;
  const adapter = adapters[m];
  if (!adapter) throw new HttpError(404, 'Unknown provider.');
  const cb = adapter.verify(req.body, req.headers);
  if (!cb) throw new HttpError(400, 'Bad signature.');
  const order = await prisma.order.findUnique({ where: { code: cb.orderCode } });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status === 'PAID') return res.json({ ok: true });
  if (!cb.success) {
    await releaseOrder(order.id, 'FAILED');
    return res.json({ ok: true });
  }
  await fulfil(order.id, m, cb.providerRef);
  res.json({ ok: true });
}));

/** Mark paid, convert holds to sales, issue tickets with signed QR codes, add points. */
export async function fulfil(orderId: string, method: Method | 'FREE', providerRef: string) {
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { tier: true } } } });
    if (o.status === 'PAID') return;
    await tx.order.update({ where: { id: o.id }, data: { status: 'PAID', paidAt: new Date(), method, providerRef } });
    if (o.promoId) await tx.promoCode.update({ where: { id: o.promoId }, data: { used: { increment: 1 } } });
    const seats = await tx.seat.findMany({ where: { heldByOrder: o.id }, orderBy: [{ row: 'asc' }, { number: 'asc' }] });
    let seatIdx = 0;
    for (const it of o.items) {
      if (!o.groupBookingId)
        await tx.ticketTier.update({ where: { id: it.tierId }, data: { held: { decrement: it.quantity }, sold: { increment: it.quantity } } });
      for (let k = 0; k < it.quantity; k++) {
        const seat = it.tier.needsSeat ? seats[seatIdx++] : undefined;
        const t = await tx.ticket.create({ data: { orderId: o.id, tierId: it.tierId, ownerId: o.userId, seatId: seat?.id, qrToken: `pending-${o.id}-${it.id}-${k}` } });
        await tx.ticket.update({ where: { id: t.id }, data: { qrToken: makeQrToken(t.id) } });
      }
    }
    if (seats.length) await tx.seat.updateMany({ where: { heldByOrder: o.id }, data: { status: 'SOLD', heldUntil: null } });
    const pts = Math.max(10, Math.round(o.total / 100));
    await tx.pointsTransaction.create({ data: { userId: o.userId, amount: pts, reason: 'BOOKING', refId: o.id } });
    await tx.user.update({ where: { id: o.userId }, data: { points: { increment: pts } } });
  });
  // TODO: send ticket email + push via your mail provider (Resend, SES) here.
}

/** Release holds for an expired or failed order, then offer freed tickets to the waitlist. */
export async function releaseOrder(orderId: string, status: 'EXPIRED' | 'FAILED') {
  const tierIds = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (o.status !== 'PENDING') return [];
    await tx.order.update({ where: { id: o.id }, data: { status } });
    if (!o.groupBookingId)
      for (const it of o.items) await tx.ticketTier.update({ where: { id: it.tierId }, data: { held: { decrement: it.quantity } } });
    await tx.seat.updateMany({ where: { heldByOrder: o.id }, data: { status: 'OPEN', heldUntil: null, heldByOrder: null } });
    return o.items.map((i) => i.tierId);
  });
  for (const t of tierIds) await offerWaitlist(t);
}

// ---------- Waitlist ----------
orders.post('/tiers/:tierId/waitlist', requireAuth, asyncH(async (req, res) => {
  const tier = await prisma.ticketTier.findUnique({ where: { id: req.params.tierId } });
  if (!tier) throw new HttpError(404, 'Ticket type not found.');
  const { quantity } = parse(z.object({ quantity: z.number().int().min(1).max(4).default(1) }), req.body ?? {});
  const entry = await prisma.waitlistEntry.upsert({
    where: { tierId_userId: { tierId: tier.id, userId: req.user!.id } },
    create: { tierId: tier.id, eventId: tier.eventId, userId: req.user!.id, quantity }, update: { quantity },
  });
  const ahead = await prisma.waitlistEntry.count({ where: { tierId: tier.id, status: 'WAITING', createdAt: { lt: entry.createdAt } } });
  res.status(201).json({ ...entry, position: ahead + 1 });
}));

/** Offer freed tickets to the next person: they get a held order with a 30-minute window. */
export async function offerWaitlist(tierId: string) {
  const next = await prisma.waitlistEntry.findFirst({ where: { tierId, status: 'WAITING' }, orderBy: { createdAt: 'asc' } });
  if (!next) return;
  try {
    await prisma.$transaction(async (tx) => {
      await holdTier(tx, tierId, next.quantity);
      const tier = await tx.ticketTier.findUniqueOrThrow({ where: { id: tierId } });
      const sub = tier.price * next.quantity;
      const { fee, total } = priceOrder(sub);
      await tx.order.create({
        data: { code: orderCode(), eventId: tier.eventId, userId: next.userId, subtotal: sub, fee, total,
          expiresAt: minutesFromNow(HOLD_MINUTES.waitlistOffer), items: { create: { tierId, quantity: next.quantity, price: tier.price } } },
      });
      await tx.waitlistEntry.update({ where: { id: next.id }, data: { status: 'OFFERED', offerExpires: minutesFromNow(HOLD_MINUTES.waitlistOffer) } });
    });
    // TODO: notify the user (push + email) that seats are waiting for them.
  } catch (e) {
    if (!(e instanceof HttpError)) throw e; // not enough freed yet; try again on the next release
  }
}

// ---------- Group booking with split payment ----------
orders.post('/groups', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ tierId: z.string(), seats: z.number().int().min(2).max(20) }), req.body);
  const tier = await prisma.ticketTier.findUnique({ where: { id: d.tierId }, include: { event: true } });
  if (!tier) throw new HttpError(404, 'Ticket type not found.');
  const group = await prisma.$transaction(async (tx) => {
    await holdTier(tx, tier.id, d.seats);
    return tx.groupBooking.create({
      data: { leadId: req.user!.id, tierId: tier.id, seats: d.seats, shareCode: shortCode(10), deadline: new Date(Date.now() + tier.event.groupHoldHours * 3600e3) },
    });
  });
  res.status(201).json({ ...group, shareUrl: `/group/${group.shareCode}`, perPerson: tier.price });
}));

orders.get('/groups/:code', asyncH(async (req, res) => {
  const g = await prisma.groupBooking.findUnique({ where: { shareCode: req.params.code }, include: { orders: { where: { status: 'PAID' }, select: { user: { select: { name: true } }, items: true } } } });
  if (!g) throw new HttpError(404, 'This group link has expired.');
  const paid = g.orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);
  res.json({ seats: g.seats, paid, remaining: g.seats - paid, deadline: g.deadline, members: g.orders.map((o) => o.user.name) });
}));

// ---------- My tickets, transfer and resale ----------
orders.get('/me/tickets', requireAuth, asyncH(async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { ownerId: req.user!.id, status: { in: ['VALID', 'CHECKED_IN', 'RESALE_LISTED'] } },
    include: { tier: { select: { name: true } }, seat: true, order: { select: { code: true, event: { select: { slug: true, title: true, startsAt: true, venueName: true, city: true, streamUrl: true, format: true } } } } },
    orderBy: { order: { event: { startsAt: 'asc' } } },
  });
  res.json(tickets);
}));

orders.post('/tickets/:id/transfer', requireAuth, asyncH(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().email() }), req.body);
  const t = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!t || t.ownerId !== req.user!.id || t.status !== 'VALID') throw new HttpError(404, 'You can only transfer valid tickets you own.');
  const to = await prisma.user.findUnique({ where: { email } });
  if (!to) throw new HttpError(404, 'Ask your friend to sign up with that email first, then send it again.');
  await prisma.$transaction([
    prisma.ticket.update({ where: { id: t.id }, data: { ownerId: to.id, qrToken: makeQrToken(t.id) } }),
    prisma.ticketTransfer.create({ data: { ticketId: t.id, fromId: req.user!.id, toEmail: email, kind: 'GIFT' } }),
  ]);
  res.json({ ok: true });
}));

orders.post('/tickets/:id/resell', requireAuth, asyncH(async (req, res) => {
  const t = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { tier: true } });
  if (!t || t.ownerId !== req.user!.id || t.status !== 'VALID') throw new HttpError(404, 'You can only resell valid tickets you own.');
  const { price } = parse(z.object({ price: z.number().int().min(0) }), req.body);
  if (price > t.tier.price) throw new HttpError(400, `Resale is capped at face value (Rs ${t.tier.price}).`);
  res.json(await prisma.ticket.update({ where: { id: t.id }, data: { status: 'RESALE_LISTED', resalePrice: price } }));
}));

// ---------- Door check-in (QR scanner) ----------
orders.post('/events/:eventId/checkin', requireAuth, asyncH(async (req, res) => {
  await assertEventStaff(req.params.eventId, req.user!, ['OWNER', 'MANAGER', 'CHECKIN']);
  const { token } = parse(z.object({ token: z.string() }), req.body);
  const id = verifyQrToken(token);
  const t = id ? await prisma.ticket.findUnique({ where: { id }, include: { tier: true, owner: { select: { name: true } }, order: true, seat: true } }) : null;
  if (!t || t.qrToken !== token || t.order.eventId !== req.params.eventId) return res.status(404).json({ result: 'invalid', message: 'Not a ticket for this event.' });
  if (t.status === 'CHECKED_IN') return res.status(409).json({ result: 'used', message: `Already scanned at ${t.checkedInAt?.toLocaleTimeString()}`, name: t.owner.name });
  if (t.status !== 'VALID') return res.status(409).json({ result: 'void', message: 'This ticket was transferred or cancelled.' });
  await prisma.ticket.update({ where: { id: t.id }, data: { status: 'CHECKED_IN', checkedInAt: new Date() } });
  res.json({ result: 'ok', name: t.owner.name, tier: t.tier.name, seat: t.seat ? `${t.seat.row}${t.seat.number}` : null });
}));
