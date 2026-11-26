import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { HttpError, assertEventStaff, asyncH, parse, prisma, requireAuth, requireRole } from '../lib/core.js';

export const events = Router();

// ---------- Discover ----------
const ListQuery = z.object({
  q: z.string().optional(),
  theme: z.string().optional(), // comma-separated slugs
  city: z.string().optional(),
  format: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  free: z.coerce.boolean().optional(),
  maxPrice: z.coerce.number().int().optional(),
  sort: z.enum(['soonest', 'trending', 'foryou']).default('soonest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

events.get('/', asyncH(async (req, res) => {
  const f = parse(ListQuery, req.query);
  const where: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
    startsAt: { gte: f.from ?? new Date(), ...(f.to ? { lte: f.to } : {}) },
    ...(f.q ? { OR: [
      { title: { contains: f.q, mode: 'insensitive' } },
      { venueName: { contains: f.q, mode: 'insensitive' } },
      { tagline: { contains: f.q, mode: 'insensitive' } },
      { organizer: { name: { contains: f.q, mode: 'insensitive' } } },
    ] } : {}),
    ...(f.theme ? { theme: { slug: { in: f.theme.split(',') } } } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.format ? { format: f.format } : {}),
    ...(f.free ? { tiers: { some: { price: 0 } } } : {}),
    ...(f.maxPrice != null ? { tiers: { some: { price: { lte: f.maxPrice } } } } : {}),
  };

  // "For you": boost the user's interest themes and organizers they follow.
  if (f.sort === 'foryou' && req.user) {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { interests: { select: { id: true } }, following: { select: { followeeId: true } } } });
    where.AND = [{ OR: [
      { themeId: { in: me?.interests.map((t) => t.id) ?? [] } },
      { organizerId: { in: me?.following.map((x) => x.followeeId) ?? [] } },
    ] }];
  }

  const orderBy: Prisma.EventOrderByWithRelationInput =
    f.sort === 'trending' ? { orders: { _count: 'desc' } } : { startsAt: 'asc' };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where, orderBy, skip: (f.page - 1) * f.limit, take: f.limit,
      select: {
        id: true, slug: true, title: true, tagline: true, coverUrl: true, startsAt: true, city: true, venueName: true, format: true,
        theme: { select: { slug: true, name: true, color: true } },
        organizer: { select: { name: true, handle: true } },
        tiers: { select: { price: true, quantity: true, sold: true } },
        _count: { select: { orders: { where: { status: 'PAID' } } } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  // Friends going: people the viewer follows who hold a paid ticket.
  let friends: Record<string, string[]> = {};
  if (req.user && items.length) {
    const rows = await prisma.order.findMany({
      where: { status: 'PAID', eventId: { in: items.map((e) => e.id) }, user: { followers: { some: { followerId: req.user.id } } } },
      select: { eventId: true, user: { select: { name: true } } },
      distinct: ['eventId', 'userId'],
    });
    friends = rows.reduce<Record<string, string[]>>((m, r) => ((m[r.eventId] ??= []).push(r.user.name), m), {});
  }

  res.json({
    total, page: f.page,
    items: items.map(({ tiers, _count, ...e }) => ({
      ...e,
      minPrice: tiers.length ? Math.min(...tiers.map((t) => t.price)) : 0,
      soldOut: tiers.every((t) => t.sold >= t.quantity),
      goingCount: _count.orders,
      friendsGoing: friends[e.id] ?? [],
    })),
  });
}));

events.get('/:slug', asyncH(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: {
      theme: true,
      organizer: { select: { name: true, handle: true } },
      agenda: { orderBy: { at: 'asc' } },
      tiers: { orderBy: { sortOrder: 'asc' } },
      roles: { include: { shifts: { include: { _count: { select: { assigns: true } } } } } },
      stalls: { select: { id: true, label: true, size: true, price: true, x: true, y: true, w: true, h: true, status: true } },
      addons: true,
      reviews: { where: { hidden: false }, take: 20, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
      photos: { where: { approved: true }, take: 24 },
    },
  });
  if (!event || (event.status !== 'PUBLISHED' && event.status !== 'ENDED')) throw new HttpError(404, 'This event isn’t available.');
  prisma.eventView.create({ data: { eventId: event.id, userId: req.user?.id, source: String(req.query.ref ?? '') } }).catch(() => {});
  const { streamUrl: _hidden, ...pub } = event; // stream link only via /me/tickets
  res.json({ ...pub, tiers: event.tiers.map((t) => ({ ...t, left: Math.max(0, t.quantity - t.sold - t.held) })) });
}));

// ---------- Saved + reminders ----------
events.post('/:id/save', requireAuth, asyncH(async (req, res) => {
  const ev = await prisma.event.findUnique({ where: { id: req.params.id }, select: { startsAt: true } });
  if (!ev) throw new HttpError(404, 'Event not found.');
  await prisma.savedEvent.upsert({
    where: { userId_eventId: { userId: req.user!.id, eventId: req.params.id } },
    create: { userId: req.user!.id, eventId: req.params.id, remindAt: new Date(ev.startsAt.getTime() - 864e5) },
    update: {},
  });
  res.json({ saved: true });
}));
events.delete('/:id/save', requireAuth, asyncH(async (req, res) => {
  await prisma.savedEvent.deleteMany({ where: { userId: req.user!.id, eventId: req.params.id } });
  res.json({ saved: false });
}));

// ---------- Reviews ----------
events.post('/:id/reviews', requireAuth, asyncH(async (req, res) => {
  const d = parse(z.object({ rating: z.number().int().min(1).max(5), text: z.string().min(3).max(1000) }), req.body);
  const attended = await prisma.ticket.findFirst({ where: { ownerId: req.user!.id, order: { eventId: req.params.id }, status: { in: ['VALID', 'CHECKED_IN'] } } });
  if (!attended) throw new HttpError(403, 'Only people with a ticket can review this event.');
  const review = await prisma.review.upsert({
    where: { eventId_userId: { eventId: req.params.id, userId: req.user!.id } },
    create: { ...d, eventId: req.params.id, userId: req.user!.id }, update: d,
  });
  await prisma.$transaction([
    prisma.pointsTransaction.create({ data: { userId: req.user!.id, amount: 20, reason: 'REVIEW', refId: review.id } }),
    prisma.user.update({ where: { id: req.user!.id }, data: { points: { increment: 20 } } }),
  ]);
  res.status(201).json(review);
}));

// ---------- Organizer: create and manage ----------
const EventInput = z.object({
  title: z.string().min(4),
  tagline: z.string().max(140).default(''),
  description: z.string().default(''),
  themeSlug: z.string(),
  format: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']).default('IN_PERSON'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  city: z.string().optional(),
  venueName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  streamUrl: z.string().url().optional(),
  accessibility: z.array(z.string()).default([]),
  hasSeating: z.boolean().default(false),
  volunteersOn: z.boolean().default(false),
  stallsOn: z.boolean().default(false),
  approveVendors: z.boolean().default(true),
  tiers: z.array(z.object({
    name: z.string().min(1), price: z.number().int().min(0), quantity: z.number().int().min(1),
    perks: z.string().optional(), isOnline: z.boolean().default(false), needsSeat: z.boolean().default(false),
    salesEnd: z.coerce.date().optional(),
  })).min(1),
}).refine((e) => e.endsAt > e.startsAt, { message: 'The end time must be after the start.', path: ['endsAt'] })
  .refine((e) => e.format === 'ONLINE' || !!e.venueName, { message: 'Add a venue, or make the event online.', path: ['venueName'] });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

events.post('/', requireAuth, asyncH(async (req, res) => {
  const d = parse(EventInput, req.body);
  const theme = await prisma.theme.findUnique({ where: { slug: d.themeSlug } });
  if (!theme) throw new HttpError(400, 'Pick one of the listed themes.');
  const { tiers, themeSlug: _t, ...rest } = d;
  const event = await prisma.event.create({
    data: {
      ...rest, slug: `${slugify(d.title)}-${Date.now().toString(36).slice(-4)}`, themeId: theme.id, organizerId: req.user!.id,
      tiers: { create: tiers.map((t, i) => ({ ...t, sortOrder: i })) },
      team: { create: { userId: req.user!.id, role: 'OWNER' } },
    },
  });
  if (!req.user!.roles.includes('ORGANIZER'))
    await prisma.user.update({ where: { id: req.user!.id }, data: { roles: { push: 'ORGANIZER' } } });
  res.status(201).json(event);
}));

events.post('/:id/submit', requireAuth, asyncH(async (req, res) => {
  await assertEventStaff(req.params.id, req.user!, ['OWNER']);
  res.json(await prisma.event.update({ where: { id: req.params.id }, data: { status: 'IN_REVIEW' } }));
}));

// Promo codes and early bird
events.post('/:id/promos', requireAuth, asyncH(async (req, res) => {
  await assertEventStaff(req.params.id, req.user!);
  const d = parse(z.object({
    code: z.string().min(3).max(20).transform((s) => s.toUpperCase()),
    type: z.enum(['PERCENT', 'FIXED']), value: z.number().int().positive(),
    maxUses: z.number().int().positive().optional(), expiresAt: z.coerce.date().optional(),
  }).refine((p) => p.type !== 'PERCENT' || p.value <= 100, { message: 'A percentage can’t be over 100.' }), req.body);
  res.status(201).json(await prisma.promoCode.create({ data: { ...d, eventId: req.params.id } }));
}));

// Co-organizers
events.post('/:id/team', requireAuth, asyncH(async (req, res) => {
  await assertEventStaff(req.params.id, req.user!, ['OWNER']);
  const d = parse(z.object({ email: z.string().email(), role: z.enum(['MANAGER', 'CHECKIN']) }), req.body);
  const u = await prisma.user.findUnique({ where: { email: d.email } });
  if (!u) throw new HttpError(404, 'No EventSphere account uses that email yet. Ask them to sign up first.');
  res.status(201).json(await prisma.eventTeam.upsert({
    where: { eventId_userId: { eventId: req.params.id, userId: u.id } },
    create: { eventId: req.params.id, userId: u.id, role: d.role }, update: { role: d.role },
  }));
}));

// Analytics dashboard
events.get('/:id/analytics', requireAuth, asyncH(async (req, res) => {
  const id = req.params.id;
  await assertEventStaff(id, req.user!);
  const [views, paid, byTier, checkedIn, stalls, shifts, daily] = await Promise.all([
    prisma.eventView.count({ where: { eventId: id } }),
    prisma.order.aggregate({ where: { eventId: id, status: 'PAID' }, _sum: { total: true, discount: true }, _count: true }),
    prisma.ticketTier.findMany({ where: { eventId: id }, select: { name: true, price: true, sold: true, quantity: true } }),
    prisma.ticket.count({ where: { order: { eventId: id }, status: 'CHECKED_IN' } }),
    prisma.stall.groupBy({ by: ['status'], where: { eventId: id }, _count: true }),
    prisma.shift.findMany({ where: { role: { eventId: id } }, select: { capacity: true, _count: { select: { assigns: true } } } }),
    prisma.$queryRaw<{ day: Date; orders: bigint; revenue: bigint }[]>`
      SELECT date_trunc('day', "paidAt") AS day, count(*) AS orders, sum(total) AS revenue
      FROM "Order" WHERE "eventId" = ${id} AND status = 'PAID' GROUP BY 1 ORDER BY 1`,
  ]);
  const sold = byTier.reduce((s, t) => s + t.sold, 0);
  res.json({
    views, orders: paid._count, revenue: paid._sum.total ?? 0, discounts: paid._sum.discount ?? 0,
    conversion: views ? paid._count / views : 0,
    ticketsSold: sold, checkedIn,
    byTier: byTier.map((t) => ({ ...t, revenue: t.sold * t.price })),
    stalls, volunteerFill: shifts.reduce((s, x) => s + x._count.assigns, 0) / Math.max(1, shifts.reduce((s, x) => s + x.capacity, 0)),
    daily: daily.map((d) => ({ day: d.day, orders: Number(d.orders), revenue: Number(d.revenue) })),
  });
}));

// ---------- Admin moderation ----------
events.get('/admin/queue', requireRole('ADMIN'), asyncH(async (_req, res) => {
  const [inReview, reports, vendors] = await Promise.all([
    prisma.event.findMany({ where: { status: 'IN_REVIEW' }, orderBy: { updatedAt: 'asc' }, include: { organizer: { select: { name: true, email: true } } } }),
    prisma.report.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
    prisma.stallBooking.count({ where: { status: 'PENDING_APPROVAL' } }),
  ]);
  res.json({ inReview, reports, vendorsWaiting: vendors });
}));

events.post('/admin/:id/decision', requireRole('ADMIN'), asyncH(async (req, res) => {
  const { approve } = parse(z.object({ approve: z.boolean(), note: z.string().optional() }), req.body);
  res.json(await prisma.event.update({ where: { id: req.params.id }, data: { status: approve ? 'PUBLISHED' : 'REJECTED' } }));
}));
