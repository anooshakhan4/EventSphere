# EventSphere

Discover events across Pakistan, buy tickets, volunteer, or book a stall. Bilingual (English and Urdu), with dark mode, built with Next.js + Node/Express + PostgreSQL (Prisma).

```
eventsphere/
├─ apps/web   Next.js 15 frontend (App Router, Tailwind). Runs on mock data today.
└─ apps/api   Express 5 API, Prisma schema for every feature, seed data.
```

## Run it

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm install                      # from the repo root (npm workspaces)

# Frontend: http://localhost:3000
npm run dev:web

# API: http://localhost:4000
cd apps/api
cp .env.example .env             # set DATABASE_URL and the secrets
npx prisma db push               # create tables
npm run db:seed                  # themes, badges, demo users, one full event
npm run dev
```

Demo logins after seeding (password `password123`): `ayesha@example.com` (attendee), `hello@sama.pk` (organizer), `admin@eventsphere.pk` (admin).

Demo promo codes on the checkout page: `EARLYBIRD` (15% off), `SPHERE500` (Rs 500 off).

## What's built

**Frontend (`apps/web`)**

| Page | Route | Highlights |
| --- | --- | --- |
| Home | `/` | Ticket-fan hero, this week, browse by theme, trending, take part |
| Explore | `/explore` | Search, theme/date/price/format/city filters, grid or map view |
| Event | `/events/[slug]` | Ticket tiers with quantity steppers, low-stock and waitlist, friends going, running order, accessibility, reviews, save and share |
| Seat picker | `/events/[slug]/seats` | Seat map with a 10-minute hold timer |
| Stall booking | `/events/[slug]/stalls` | Floor map, stall sizes, add-ons (power, tables, Wi-Fi), approval flow |
| Volunteer | `/events/[slug]/volunteer` | Shifts with capacity, application form with validation |
| Checkout | `/checkout` | JazzCash / Easypaisa / card, promo codes, service fee, field validation |
| Success | `/checkout/success` | E-ticket with QR, add to calendar (.ics), points earned |
| My tickets | `/me/tickets` | Transfer to a friend, resell at face value |
| Saved | `/me/saved` | Wishlist |
| Host an event | `/studio/new` | 5-step wizard with live preview card |

Global: English/Urdu toggle with full right-to-left layout and Nastaliq font, light/dark mode, saved events, toasts, keyboard focus states, reduced-motion support.

**API (`apps/api`)**

| Area | Endpoints |
| --- | --- |
| Auth and social | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `POST/DELETE /auth/users/:handle/follow` |
| Discover | `GET /events` (filters, "for you", trending, friends going), `GET /events/:slug`, `GET /themes` |
| Saved and reviews | `POST/DELETE /events/:id/save`, `POST /events/:id/reviews` |
| Organizer | `POST /events`, `POST /events/:id/submit`, `POST /events/:id/promos`, `POST /events/:id/team`, `GET /events/:id/analytics` |
| Orders | `POST /orders` (atomic holds, no overselling), `POST /orders/:id/pay`, `POST /payments/webhook/:provider` |
| Waitlist and groups | `POST /tiers/:tierId/waitlist`, `POST /groups`, `GET /groups/:code` |
| Tickets | `GET /me/tickets`, `POST /tickets/:id/transfer`, `POST /tickets/:id/resell`, `POST /events/:eventId/checkin` (signed QR) |
| Stalls | `PUT /me/vendor-profile`, `POST /stalls/:id/book`, `POST /stall-bookings/:id/decision` |
| Volunteers | `POST /volunteer-roles/:roleId/apply`, `POST /volunteer-applications/:id/decision`, shift swap / accept, check-in / check-out (hours, points, badges) |
| Certificates | `POST /events/:eventId/certificates`, `GET /verify/:code` |
| Admin | `GET /events/admin/queue`, `POST /events/admin/:id/decision` |

A background sweep runs every minute: it releases expired ticket, seat and stall holds, and offers freed tickets to the next person on the waitlist.

## Next steps

1. Connect the frontend to the API: replace imports from `lib/data.ts` with `fetch` calls (shapes already match).
2. Add the JazzCash and Easypaisa merchant credentials and finish the two `init()` calls in `src/lib/payments.ts`.
3. Email and push notifications (marked `TODO` in the code), certificate PDFs, image uploads for covers.
4. Organizer dashboard pages (analytics charts, check-in scanner), admin panel UI, and the recommendations ranking.

## Notes

- The API type-checks, but it hasn't been run against a database yet. Run `prisma db push` and the seed on your machine first.
- Prices are whole rupees (PKR). Times are stored in UTC and shown in Asia/Karachi.
