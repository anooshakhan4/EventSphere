import express from 'express';
import cors from 'cors';
import { authOptional, errorHandler, prisma } from './lib/core.js';
import { auth } from './routes/auth.js';
import { events } from './routes/events.js';
import { offerWaitlist, orders, releaseOrder } from './routes/orders.js';
import { participation } from './routes/participation.js';

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true })); // JazzCash posts form-encoded callbacks
app.use(authOptional);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/themes', async (_req, res) => res.json(await prisma.theme.findMany({ orderBy: { name: 'asc' } })));
app.use('/auth', auth);
app.use('/events', events);
app.use('/', orders);
app.use('/', participation);
app.use(errorHandler);

// Background sweep: release expired holds every minute (orders, seats, stalls, waitlist offers).
// In production run this in a separate worker (or BullMQ repeatable job) so it runs once.
async function sweep() {
  const now = new Date();
  const expired = await prisma.order.findMany({ where: { status: 'PENDING', expiresAt: { lt: now } }, select: { id: true } });
  for (const o of expired) await releaseOrder(o.id, 'EXPIRED');
  await prisma.waitlistEntry.updateMany({ where: { status: 'OFFERED', offerExpires: { lt: now } }, data: { status: 'EXPIRED' } });
  const stalls = await prisma.stall.findMany({ where: { status: 'HELD', heldUntil: { lt: now } }, select: { id: true } });
  if (stalls.length) {
    await prisma.stallBooking.updateMany({ where: { stallId: { in: stalls.map((s) => s.id) }, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
    await prisma.stall.updateMany({ where: { id: { in: stalls.map((s) => s.id) } }, data: { status: 'OPEN', heldUntil: null } });
  }
  // Tiers that have free stock and people waiting.
  const tiers = await prisma.waitlistEntry.findMany({ where: { status: 'WAITING' }, select: { tierId: true }, distinct: ['tierId'] });
  for (const t of tiers) await offerWaitlist(t.tierId);
}
if (process.env.DISABLE_SWEEP !== '1') setInterval(() => sweep().catch((e) => console.error('sweep', e)), 60_000);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`EventSphere API on http://localhost:${port}`));
