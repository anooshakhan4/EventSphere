import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { HttpError, asyncH, parse, prisma, requireAuth, signToken } from '../lib/core.js';

export const auth = Router();

const Signup = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Use at least 8 characters.'),
  city: z.string().optional(),
  locale: z.enum(['en', 'ur']).default('en'),
  interests: z.array(z.string()).default([]), // theme slugs
});

auth.post('/signup', asyncH(async (req, res) => {
  const d = parse(Signup, req.body);
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, 'An account with that email already exists. Try signing in.');
  const base = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'user';
  const handle = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
  const user = await prisma.user.create({
    data: {
      name: d.name, email: d.email, handle, city: d.city, locale: d.locale,
      passwordHash: await bcrypt.hash(d.password, 10),
      interests: { connect: d.interests.map((slug) => ({ slug })) },
    },
  });
  res.status(201).json({ token: signToken({ id: user.id, roles: user.roles }), user: { id: user.id, name: user.name, handle } });
}));

auth.post('/login', asyncH(async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().email(), password: z.string() }), req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'That email and password don’t match.');
  res.json({ token: signToken({ id: user.id, roles: user.roles }), user: { id: user.id, name: user.name, handle: user.handle } });
}));

auth.get('/me', requireAuth, asyncH(async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, handle: true, city: true, locale: true, roles: true, points: true,
      interests: { select: { slug: true } }, badges: { select: { badge: true, awardedAt: true } } },
  });
  res.json(me);
}));

// Follow organizers and friends.
auth.post('/users/:handle/follow', requireAuth, asyncH(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { handle: req.params.handle } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.id === req.user!.id) throw new HttpError(400, 'You can’t follow yourself.');
  await prisma.follow.upsert({
    where: { followerId_followeeId: { followerId: req.user!.id, followeeId: target.id } },
    create: { followerId: req.user!.id, followeeId: target.id }, update: {},
  });
  res.json({ following: true });
}));

auth.delete('/users/:handle/follow', requireAuth, asyncH(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { handle: req.params.handle } });
  if (target) await prisma.follow.deleteMany({ where: { followerId: req.user!.id, followeeId: target.id } });
  res.json({ following: false });
}));
