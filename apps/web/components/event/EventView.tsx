'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Accessibility, BadgeCheck, CalendarPlus, Clock, HandHeart, MapPin, Minus, Plus, Share2, Star, Store as StoreIcon } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { FriendsGoing, SaveButton } from '@/components/EventCard';
import { EVENTS, formatDate, formatPKR, formatTime, getTheme, type Event } from '@/lib/data';
import { useStore } from '@/lib/store';

export function EventView({ event }: { event: Event }) {
  const { t, setOrder, notify } = useStore();
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [waitlisted, setWaitlisted] = useState<string[]>([]);
  const theme = getTheme(event.theme);

  const lines = useMemo(
    () => event.tiers.filter((tr) => (qty[tr.id] ?? 0) > 0).map((tr) => ({ tierId: tr.id, name: tr.name, price: tr.price, qty: qty[tr.id] })),
    [qty, event.tiers],
  );
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const openStalls = event.stalls.filter((s) => s.status === 'open').length;
  const openSpots = event.shifts.reduce((s, sh) => s + (sh.capacity - sh.filled), 0);
  const avg = event.reviews.length ? event.reviews.reduce((s, r) => s + r.rating, 0) / event.reviews.length : 0;

  const step = (id: string, d: number, max: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(Math.min(max, 10), (q[id] ?? 0) + d)) }));

  const checkout = () => {
    const order = { id: `ES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, eventSlug: event.slug, lines, seats: [], total };
    setOrder(order);
    router.push(event.hasSeating && lines.some((l) => l.tierId !== 't1') ? `/events/${event.slug}/seats/` : '/checkout/');
  };

  return (
    <div className="mx-auto max-w-page px-5 pt-8">
      <nav className="mb-5 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/explore/" className="hover:text-ink">Events</Link> <span aria-hidden="true">/</span>{' '}
        <Link href={`/explore/?theme=${theme.slug}`} className="hover:text-ink">{theme.name}</Link>
      </nav>

      <div className="relative overflow-hidden rounded-[28px]">
        <Cover theme={event.theme} seed={EVENTS.indexOf(event)} className="h-[240px] sm:h-[340px]" />
        <div className="absolute right-4 top-4 flex gap-2">
          <button type="button" onClick={() => { try { navigator.clipboard?.writeText(location.href); } catch {} notify('Link copied'); }}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 shadow-sm" aria-label="Copy link">
            <Share2 size={17} />
          </button>
          <SaveButton slug={event.slug} />
        </div>
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <p className="font-medium text-mehndi">{formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{event.title}</h1>
          <p className="mt-3 text-xl text-muted">{event.tagline}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
            <span className="flex items-center gap-2"><Clock size={17} aria-hidden="true" className="text-muted" />{formatTime(event.date)} to {event.endTime}</span>
            <span className="flex items-center gap-2"><MapPin size={17} aria-hidden="true" className="text-muted" />{event.venue}, {event.city}</span>
            <span className="rounded-full bg-line/70 px-3 py-0.5 text-sm">{event.format}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ink font-display text-lg font-bold text-paper">{event.organizer.name[0]}</span>
              <span>
                <span className="flex items-center gap-1 font-semibold">{event.organizer.name}{event.organizer.verified && <BadgeCheck size={16} className="text-mehndi" aria-label="Verified" />}</span>
                <span className="text-sm text-muted">Organizer</span>
              </span>
            </div>
            <button type="button" onClick={() => notify(`Following ${event.organizer.name}`)} className="rounded-full border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-paper">Follow</button>
          </div>

          <div className="mt-6"><FriendsGoing names={event.friendsGoing} count={event.goingCount} /></div>

          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed">{event.description}</p>

          {/* Take part: volunteering and stalls live next to tickets, not hidden away. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {event.shifts.length > 0 && (
              <Link href={`/events/${event.slug}/volunteer/`} className="group flex gap-4 rounded-2xl border border-line bg-surface p-5 hover:border-ink">
                <HandHeart className="mt-0.5 shrink-0 text-mehndi" aria-hidden="true" />
                <span>
                  <span className="block font-semibold group-hover:underline">{t('volunteer')}</span>
                  <span className="text-sm text-muted">{openSpots > 0 ? `${openSpots} spots open across ${event.shifts.length} shifts` : 'All shifts are full — join the reserve list'}</span>
                </span>
              </Link>
            )}
            {event.stalls.length > 0 && (
              <Link href={`/events/${event.slug}/stalls/`} className="group flex gap-4 rounded-2xl border border-line bg-surface p-5 hover:border-ink">
                <StoreIcon className="mt-0.5 shrink-0 text-marigold" aria-hidden="true" />
                <span>
                  <span className="block font-semibold group-hover:underline">{t('stall')}</span>
                  <span className="text-sm text-muted">{openStalls} of {event.stalls.length} stalls open on the floor map</span>
                </span>
              </Link>
            )}
          </div>

          <section className="mt-12" aria-labelledby="agenda">
            <h2 id="agenda" className="font-display text-2xl font-bold">Running order</h2>
            <ol className="mt-4 border-s-2 border-line">
              {event.agenda.map((a) => (
                <li key={a.time} className="relative ps-6 pb-5 last:pb-0">
                  <span className="absolute -start-[7px] top-2 h-3 w-3 rounded-full bg-marigold" aria-hidden="true" />
                  <span className="text-sm font-semibold text-muted">{a.time}</span>
                  <p className="text-lg">{a.item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12" aria-labelledby="access">
            <h2 id="access" className="flex items-center gap-2 font-display text-2xl font-bold"><Accessibility aria-hidden="true" /> Getting in</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {event.accessibility.map((a) => <li key={a} className="rounded-xl bg-line/50 px-4 py-3">{a}</li>)}
            </ul>
          </section>

          <section className="mt-12" aria-labelledby="reviews">
            <h2 id="reviews" className="font-display text-2xl font-bold">
              What people said {avg > 0 && <span className="ms-2 inline-flex items-center gap-1 text-lg font-semibold text-muted"><Star size={18} className="fill-marigold text-marigold" aria-hidden="true" />{avg.toFixed(1)}</span>}
            </h2>
            {event.reviews.length === 0 ? (
              <p className="mt-3 text-muted">This is the first edition. Reviews open after the event — tell people how it went.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {event.reviews.map((r) => (
                  <figure key={r.name} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} className={i < r.rating ? 'fill-marigold text-marigold' : 'text-line'} aria-hidden="true" />)}
                    </div>
                    <blockquote className="mt-2 text-lg">{r.text}</blockquote>
                    <figcaption className="mt-2 text-sm text-muted">{r.name}, last edition</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Ticket panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-labelledby="tix">
          <div className="stub bg-surface shadow-[0_24px_60px_-30px_rgba(30,27,58,.5)]" style={{ ['--cut' as string]: `${86 + event.tiers.length * 98}px` }}>
            <div className="p-6">
              <h2 id="tix" className="font-display text-2xl font-bold">Tickets</h2>
              <ul className="mt-4 divide-y divide-line">
                {event.tiers.map((tr) => {
                  const n = qty[tr.id] ?? 0;
                  const sold = tr.left === 0;
                  const low = !sold && tr.left <= 15;
                  return (
                    <li key={tr.id} className="flex min-h-[98px] items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{tr.name}</p>
                        <p className="text-sm text-muted">{tr.perks}</p>
                        <p className="mt-1 text-sm">
                          <span className="font-semibold">{formatPKR(tr.price)}</span>
                          {low && <span className="ms-2 text-rose">Only {tr.left} left</span>}
                        </p>
                      </div>
                      {sold ? (
                        <button type="button" disabled={waitlisted.includes(tr.id)}
                          onClick={() => { setWaitlisted((w) => [...w, tr.id]); notify('You’re on the waitlist. We’ll offer you a seat the moment one frees up.'); }}
                          className="shrink-0 rounded-full border border-ink px-3 py-1.5 text-sm font-semibold disabled:border-mehndi disabled:text-mehndi">
                          {waitlisted.includes(tr.id) ? 'On waitlist' : t('joinWaitlist')}
                        </button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2" role="group" aria-label={`${tr.name} quantity`}>
                          <button type="button" onClick={() => step(tr.id, -1, tr.left)} disabled={n === 0} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40" aria-label="One fewer"><Minus size={15} /></button>
                          <span className="w-5 text-center font-semibold tabular-nums" aria-live="polite">{n}</span>
                          <button type="button" onClick={() => step(tr.id, 1, tr.left)} className="grid h-9 w-9 place-items-center rounded-full border border-ink bg-ink text-paper" aria-label="One more"><Plus size={15} /></button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="perf mx-5" />
            <div className="p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-muted">{count > 0 ? `${count} ticket${count > 1 ? 's' : ''}` : 'Pick your tickets'}</span>
                <span className="font-display text-2xl font-bold tabular-nums">{formatPKR(total)}</span>
              </div>
              <button type="button" onClick={checkout} disabled={count === 0}
                className="mt-4 w-full rounded-full bg-marigold py-3.5 text-lg font-semibold text-night transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                {event.hasSeating && lines.some((l) => l.tierId !== 't1') ? 'Choose seats' : t('buy')}
              </button>
              <button type="button" onClick={() => notify('Group link created — share it and everyone pays their own share')} className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold hover:bg-line/60">
                Book as a group and split the cost
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <CalendarPlus size={14} aria-hidden="true" /> JazzCash, Easypaisa or card. Transfer or resell at face value.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
