// Stalls (vendors) and volunteering (roles, shifts, swaps, hours, badges, certificates).
import { Router } from 'express';
import { z } from 'zod';
import {
  HOLD_MINUTES, HttpError, assertEventStaff, asyncH, minutesFromNow, parse, prisma, requireAuth, shortCode,
} from '../lib/core.js';

export const participation = Router();

// ---------- Vendor profile ----------
participation.put('/me/vendor-profile', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ brand: z.string().min(2), category: z.string(), bio: z.string().optional(), logoUrl: z.string().url().optional(), gallery: z.array(z.string().url()).max(12).default([]) }), req.body);
  const p = await prisma.vendorProfile.upsert({ where: { userId: req.user!.id }, create: { ...d, userId: req.user!.id }, update: d });
  if (!req.user!.roles.includes('VENDOR')) await prisma.user.update({ where: { id: req.user!.id }, data: { roles: { push: 'VENDOR' } } });
  res.json(p);
}));

// ---------- Stall booking ----------
participation.post('/stalls/:id/book', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ addons: z.array(z.object({ addonId: z.string(), quantity: z.number().int().min(1).max(10) })).default([]) }), req.body);
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!vendor) throw new HttpError(400, 'Set up your vendor profile first so organizers know who you are.', 'no_profile');

  const booking = await prisma.$transaction(async (tx) => {
    const held = await tx.stall.updateMany({ where: { id: req.params.id, status: 'OPEN' }, data: { status: 'HELD', heldUntil: minutesFromNow(HOLD_MINUTES.stall) } });
    if (!held.count) throw new HttpError(409, 'Someone just picked that stall. Choose another one.', 'stall_taken');
    const stall = await tx.stall.findUniqueOrThrow({ where: { id: req.params.id } });
    const addons = await tx.stallAddon.findMany({ where: { id: { in: d.addons.map((a) => a.addonId) }, eventId: stall.eventId } });
    const total = stall.price + d.addons.reduce((s, a) => s + (addons.find((x) => x.id === a.addonId)?.price ?? 0) * a.quantity, 0);
    return tx.stallBooking.create({
      data: { stallId: stall.id, vendorId: vendor.id, total, addons: { create: d.addons.filter((a) => addons.some((x) => x.id === a.addonId)) } },
      include: { addons: true },
    });
  });
  res.status(201).json(booking);
}));

/** Called by the payment webhook for stall payments (same adapters as tickets). */
export async function stallPaid(bookingId: string) {
  const b = await prisma.stallBooking.findUniqueOrThrow({ where: { id: bookingId }, include: { stall: { include: { event: true } } } });
  const needsReview = b.stall.event.approveVendors;
  await prisma.$transaction([
    prisma.stallBooking.update({ where: { id: b.id }, data: { paidAt: new Date(), status: needsReview ? 'PENDING_APPROVAL' : 'APPROVED' } }),
    prisma.stall.update({ where: { id: b.stallId }, data: { status: 'BOOKED', heldUntil: null } }),
  ]);
}

participation.post('/stall-bookings/:id/decision', requireAuth, asyncH(async (req, res) => {
  const { approve } = parse(z.object({ approve: z.boolean() }), req.body);
  const b = await prisma.stallBooking.findUnique({ where: { id: req.params.id }, include: { stall: true } });
  if (!b) throw new HttpError(404, 'Booking not found.');
  await assertEventStaff(b.stall.eventId, req.user!);
  if (approve) return res.json(await prisma.stallBooking.update({ where: { id: b.id }, data: { status: 'APPROVED' } }));
  await prisma.$transaction([
    prisma.stallBooking.update({ where: { id: b.id }, data: { status: 'REJECTED' } }),
    prisma.stall.update({ where: { id: b.stallId }, data: { status: 'OPEN' } }),
  ]);
  // TODO: trigger refund through the payment adapter.
  res.json({ status: 'REJECTED' });
}));

// ---------- Volunteering ----------
participation.post('/volunteer-roles/:roleId/apply', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ note: z.string().max(500).optional(), shiftIds: z.array(z.string()).min(1, 'Pick at least one shift.') }), req.body);
  const role = await prisma.volunteerRole.findUnique({ where: { id: req.params.roleId }, include: { shifts: true } });
  if (!role) throw new HttpError(404, 'Role not found.');
  const app = await prisma.volunteerApplication.upsert({
    where: { roleId_userId: { roleId: role.id, userId: req.user!.id } },
    create: { roleId: role.id, userId: req.user!.id, note: d.note }, update: { note: d.note },
  });
  // Shifts are reserved now and confirmed when the organizer approves the application.
  for (const shiftId of d.shiftIds.filter((id) => role.shifts.some((s) => s.id === id))) await joinShift(shiftId, req.user!.id);
  res.status(201).json(app);
}));

async function joinShift(shiftId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const s = await tx.shift.findUniqueOrThrow({ where: { id: shiftId }, include: { _count: { select: { assigns: true } } } });
    if (s._count.assigns >= s.capacity) throw new HttpError(409, 'That shift just filled up.', 'shift_full');
    await tx.shiftAssignment.upsert({ where: { shiftId_userId: { shiftId, userId } }, create: { shiftId, userId }, update: {} });
  }, { isolationLevel: 'Serializable' });
}

participation.post('/volunteer-applications/:id/decision', requireAuth, asyncH(async (req, res) => {
  const { approve } = parse(z.object({ approve: z.boolean() }), req.body);
  const app = await prisma.volunteerApplication.findUnique({ where: { id: req.params.id }, include: { role: true } });
  if (!app) throw new HttpError(404, 'Application not found.');
  await assertEventStaff(app.role.eventId, req.user!);
  if (!approve) await prisma.shiftAssignment.deleteMany({ where: { userId: app.userId, shift: { roleId: app.roleId } } });
  res.json(await prisma.volunteerApplication.update({ where: { id: app.id }, data: { status: approve ? 'APPROVED' : 'REJECTED' } }));
}));

// Shift swap: offer to the pool (no `to`) or to a named volunteer.
participation.post('/shift-assignments/:id/swap', requireAuth, asyncH(async (req, res) => {
  const { toHandle } = parse(z.object({ toHandle: z.string().optional() }), req.body ?? {});
  const a = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id } });
  if (!a || a.userId !== req.user!.id || a.status !== 'ASSIGNED') throw new HttpError(404, 'You can only swap your own upcoming shifts.');
  const to = toHandle ? await prisma.user.findUnique({ where: { handle: toHandle } }) : null;
  if (toHandle && !to) throw new HttpError(404, 'No volunteer with that handle.');
  res.json(await prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: 'SWAP_OFFERED', swapToId: to?.id ?? null } }));
}));

participation.post('/shift-assignments/:id/accept-swap', requireAuth, asyncH(async (req, res) => {
  const a = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id }, include: { shift: { include: { role: { include: { event: true } } } } } });
  if (!a || a.status !== 'SWAP_OFFERED' || (a.swapToId && a.swapToId !== req.user!.id)) throw new HttpError(404, 'This swap isn’t open to you.');
  const approved = await prisma.volunteerApplication.findFirst({ where: { userId: req.user!.id, role: { eventId: a.shift.role.eventId }, status: 'APPROVED' } });
  if (!approved) throw new HttpError(403, 'Only approved volunteers for this event can take a swap.');
  await prisma.$transaction([
    prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: 'SWAPPED' } }),
    prisma.shiftAssignment.create({ data: { shiftId: a.shiftId, userId: req.user!.id } }),
  ]);
  res.json({ ok: true, needsOrganizerApproval: a.shift.role.event.approveSwaps });
}));

// Check-in / out by the event team; logs minutes, awards points and badges.
participation.post('/shift-assignments/:id/:action', requireAuth, asyncH(async (req, res) => {
  if (!['checkin', 'checkout'].includes(req.params.action)) throw new HttpError(404, 'Unknown action.');
  const a = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id }, include: { shift: { include: { role: true } } } });
  if (!a) throw new HttpError(404, 'Assignment not found.');
  await assertEventStaff(a.shift.role.eventId, req.user!, ['OWNER', 'MANAGER', 'CHECKIN']);
  if (req.params.action === 'checkin')
    return res.json(await prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: 'CHECKED_IN', checkInAt: new Date() } }));
  if (!a.checkInAt) throw new HttpError(400, 'Check them in first.');
  const minutes = Math.round((Date.now() - a.checkInAt.getTime()) / 60000);
  await prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: 'COMPLETED', checkOutAt: new Date(), minutes } });
  await prisma.$transaction([
    prisma.pointsTransaction.create({ data: { userId: a.userId, amount: Math.round(minutes / 6), reason: 'VOLUNTEER', refId: a.id } }),
    prisma.user.update({ where: { id: a.userId }, data: { points: { increment: Math.round(minutes / 6) } } }),
  ]);
  await awardBadges(a.userId);
  res.json({ minutes });
}));

async function awardBadges(userId: string) {
  const total = await prisma.shiftAssignment.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { minutes: true } });
  const hours = (total._sum.minutes ?? 0) / 60;
  const earned = await prisma.badge.findMany({ where: { minHours: { lte: hours } } });
  for (const b of earned) await prisma.userBadge.upsert({ where: { userId_badgeId: { userId, badgeId: b.id } }, create: { userId, badgeId: b.id }, update: {} });
}

// ---------- Certificates ----------
participation.post('/events/:eventId/certificates', requireAuth, asyncH(async (req, res) => {
  const eventId = req.params.eventId;
  await assertEventStaff(eventId, req.user!);
  const { kind } = parse(z.object({ kind: z.enum(['ATTENDEE', 'VOLUNTEER']) }), req.body);
  let rows: { userId: string; hours?: number }[] = [];
  if (kind === 'ATTENDEE') {
    const t = await prisma.ticket.findMany({ where: { order: { eventId }, status: 'CHECKED_IN' }, select: { ownerId: true }, distinct: ['ownerId'] });
    rows = t.map((x) => ({ userId: x.ownerId }));
  } else {
    const a = await prisma.shiftAssignment.groupBy({ by: ['userId'], where: { status: 'COMPLETED', shift: { role: { eventId } } }, _sum: { minutes: true } });
    rows = a.map((x) => ({ userId: x.userId, hours: Math.round((x._sum.minutes ?? 0) / 60) }));
  }
  const existing = new Set((await prisma.certificate.findMany({ where: { eventId, kind }, select: { userId: true } })).map((c) => c.userId));
  const fresh = rows.filter((r) => !existing.has(r.userId));
  await prisma.certificate.createMany({ data: fresh.map((r) => ({ eventId, userId: r.userId, kind, hours: r.hours, verifyCode: shortCode(10) })) });
  // TODO: render PDFs in a background job (e.g. @react-pdf/renderer) and set pdfUrl.
  res.json({ issued: fresh.length });
}));

participation.get('/verify/:code', asyncH(async (req, res) => {
  const c = await prisma.certificate.findUnique({ where: { verifyCode: req.params.code }, include: { user: { select: { name: true } }, event: { select: { title: true, startsAt: true } } } });
  if (!c) throw new HttpError(404, 'We couldn’t find that certificate.');
  res.json({ name: c.user.name, event: c.event.title, date: c.event.startsAt, kind: c.kind, hours: c.hours });
}));
