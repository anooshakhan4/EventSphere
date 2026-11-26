import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient, type Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';
const QR_SECRET = process.env.QR_SECRET ?? 'dev-only-qr-secret';

// ---------- Errors ----------
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}

export const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Check the highlighted fields.', fields: err.flatten().fieldErrors });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again in a moment.' });
}

export const parse = <S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> => schema.parse(data);

// ---------- Auth ----------
export type AuthUser = { id: string; roles: Role[] };
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export const signToken = (u: AuthUser) => jwt.sign(u, JWT_SECRET, { expiresIn: '30d' });

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.slice(7), JWT_SECRET) as AuthUser; } catch { /* ignore bad token */ }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Sign in to continue.', 'auth'));
  next();
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, 'Sign in to continue.', 'auth'));
  if (!roles.some((r) => req.user!.roles.includes(r))) return next(new HttpError(403, 'You don’t have access to this.', 'forbidden'));
  next();
};

/** Organizer, co-organizer (any team role) or admin for a given event. */
export async function assertEventStaff(eventId: string, user: AuthUser, roles: ('OWNER' | 'MANAGER' | 'CHECKIN')[] = ['OWNER', 'MANAGER']) {
  if (user.roles.includes('ADMIN')) return;
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
  if (!ev) throw new HttpError(404, 'Event not found.');
  if (ev.organizerId === user.id) return;
  const member = await prisma.eventTeam.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
  if (!member || !roles.includes(member.role)) throw new HttpError(403, 'Only the event team can do this.', 'forbidden');
}

// ---------- Tickets ----------
/** Signed token encoded in the ticket QR. Reissued on transfer so old screenshots stop working. */
export function makeQrToken(ticketId: string) {
  const nonce = crypto.randomBytes(6).toString('base64url');
  const body = `${ticketId}.${nonce}`;
  const sig = crypto.createHmac('sha256', QR_SECRET).update(body).digest('base64url').slice(0, 16);
  return `${body}.${sig}`;
}

export function verifyQrToken(token: string) {
  const [id, nonce, sig] = token.split('.');
  if (!id || !nonce || !sig) return null;
  const expected = crypto.createHmac('sha256', QR_SECRET).update(`${id}.${nonce}`).digest('base64url').slice(0, 16);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

export const orderCode = () => `ES-${crypto.randomBytes(4).toString('base64url').replace(/[-_]/g, 'X').slice(0, 6).toUpperCase()}`;
export const shortCode = (n = 8) => crypto.randomBytes(n).toString('base64url').slice(0, n);

export const HOLD_MINUTES = { order: 10, stall: 15, waitlistOffer: 30 } as const;
export const SERVICE_FEE = 0.03;
export const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);
