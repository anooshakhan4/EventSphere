// Seeds themes, badges, demo users and a few published events that match the web mock data.
// Run: npm run db:push && npm run db:seed
import bcrypt from 'bcryptjs';
import { PrismaClient, type StallSize } from '@prisma/client';

const prisma = new PrismaClient();

const THEMES = [
  ['music', 'Music', 'موسیقی', '#5B4BC4'], ['food', 'Food', 'کھانا', '#D9480F'], ['tech', 'Tech', 'ٹیکنالوجی', '#0B7285'],
  ['art', 'Art', 'فن', '#C2255C'], ['sports', 'Sports', 'کھیل', '#2B8A3E'], ['charity', 'Charity', 'خیرات', '#E8590C'],
  ['literature', 'Literature', 'ادب', '#7048E8'], ['fashion', 'Fashion', 'فیشن', '#A61E4D'],
] as const;

const BADGES = [['first-shift', 'First shift', 1], ['helping-hand', 'Helping hand', 10], ['regular', 'Regular', 25], ['pillar', 'Community pillar', 50], ['legend', 'Legend', 100]] as const;

async function main() {
  for (const [slug, name, nameUr, color] of THEMES)
    await prisma.theme.upsert({ where: { slug }, create: { slug, name, nameUr, color }, update: { name, nameUr, color } });
  for (const [slug, name, minHours] of BADGES)
    await prisma.badge.upsert({ where: { slug }, create: { slug, name, minHours }, update: { name, minHours } });

  const pw = await bcrypt.hash('password123', 10);
  const mk = (email: string, name: string, handle: string, roles: ('ATTENDEE' | 'ORGANIZER' | 'VENDOR' | 'ADMIN')[]) =>
    prisma.user.upsert({ where: { email }, create: { email, name, handle, roles, passwordHash: pw, city: 'Lahore' }, update: {} });
  const admin = await mk('admin@eventsphere.pk', 'Admin', 'admin', ['ATTENDEE', 'ADMIN']);
  const sama = await mk('hello@sama.pk', 'Sama Collective', 'sama', ['ATTENDEE', 'ORGANIZER']);
  const ayesha = await mk('ayesha@example.com', 'Ayesha Khan', 'ayesha', ['ATTENDEE']);
  const bilal = await mk('bilal@example.com', 'Bilal Ahmed', 'bilal', ['ATTENDEE', 'VENDOR']);
  await prisma.vendorProfile.upsert({ where: { userId: bilal.id }, create: { userId: bilal.id, brand: 'Bilal’s Chai Dhaba', category: 'Food and drink' }, update: {} });
  await prisma.follow.upsert({ where: { followerId_followeeId: { followerId: ayesha.id, followeeId: sama.id } }, create: { followerId: ayesha.id, followeeId: sama.id }, update: {} });
  void admin;

  const music = await prisma.theme.findUniqueOrThrow({ where: { slug: 'music' } });
  const slug = 'lahore-qawwali-night';
  if (!(await prisma.event.findUnique({ where: { slug } }))) {
    const start = new Date('2026-12-04T19:30:00+05:00');
    const ev = await prisma.event.create({
      data: {
        slug, title: 'Qawwali under the stars', tagline: 'An open-air evening of Sufi qawwali in the old city',
        description: 'Three qawwali parties, one courtyard, and the kind of night that stays with you.',
        themeId: music.id, organizerId: sama.id, status: 'PUBLISHED', format: 'IN_PERSON',
        startsAt: start, endsAt: new Date('2026-12-04T23:30:00+05:00'), city: 'Lahore', venueName: 'Haveli Courtyard, Walled City',
        accessibility: ['Step-free entry via Gate 2', 'Accessible restroom', 'Reserved wheelchair spaces'],
        hasSeating: true, volunteersOn: true, stallsOn: true,
        team: { create: { userId: sama.id, role: 'OWNER' } },
        tiers: { create: [
          { name: 'Floor seating', price: 2500, quantity: 300, sold: 236, perks: 'Cushions on the courtyard floor', sortOrder: 0 },
          { name: 'Chair seating', price: 4000, quantity: 150, sold: 138, perks: 'Reserved chair, choose your seat', needsSeat: true, sortOrder: 1 },
          { name: 'Front row', price: 8000, quantity: 30, sold: 30, perks: 'Front two rows and dinner', needsSeat: true, sortOrder: 2 },
        ] },
        agenda: { create: [
          { at: start, title: 'Doors open, chai stalls' },
          { at: new Date(start.getTime() + 45 * 60e3), title: 'Ustad Rafaqat & party' },
          { at: new Date(start.getTime() + 120 * 60e3), title: 'Fareed Ayaz tribute set' },
        ] },
        promoCodes: { create: [{ code: 'EARLYBIRD', type: 'PERCENT', value: 15, maxUses: 100 }, { code: 'SPHERE500', type: 'FIXED', value: 500 }] },
        addons: { create: [{ name: 'Power socket (2 kW)', price: 3000 }, { name: 'Extra table and 2 chairs', price: 1500 }, { name: 'Wi-Fi', price: 1000 }] },
      },
    });
    // Seats: 10 rows x 14
    await prisma.seat.createMany({
      data: 'ABCDEFGHIJ'.split('').flatMap((row) => Array.from({ length: 14 }, (_, i) => ({ eventId: ev.id, row, number: i + 1 }))),
    });
    // Stalls: 3 x 4 grid
    await prisma.stall.createMany({
      data: Array.from({ length: 12 }, (_, i) => {
        const size: StallSize = i % 5 === 0 ? 'L' : i % 3 === 0 ? 'M' : 'S';
        return { eventId: ev.id, label: `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`, size, price: size === 'L' ? 24000 : size === 'M' ? 16800 : 12000, x: i % 4, y: Math.floor(i / 4) };
      }),
    });
    const role = await prisma.volunteerRole.create({ data: { eventId: ev.id, name: 'Welcome desk', description: 'Greet guests and scan tickets' } });
    await prisma.shift.create({ data: { roleId: role.id, startsAt: new Date('2026-12-04T18:00:00+05:00'), endsAt: new Date('2026-12-04T21:00:00+05:00'), capacity: 6 } });
  }
  console.log('Seeded. Log in as ayesha@example.com / password123 (organizer: hello@sama.pk).');
}

main().finally(() => prisma.$disconnect());
