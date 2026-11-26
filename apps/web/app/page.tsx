'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HandHeart, Search, Store as StoreIcon, Megaphone } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { EventCard } from '@/components/EventCard';
import { EVENTS, THEMES, formatDate, formatPKR, minPrice, type Event } from '@/lib/data';
import { useStore } from '@/lib/store';

function HeroStub({ event, depth, onPick }: { event: Event; depth: number; onPick: () => void }) {
  const pos = [
    { x: 0, y: 92, r: -2 },
    { x: 34, y: 44, r: 4 },
    { x: 68, y: 0, r: 9 },
  ][depth];
  const active = depth === 0;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Show ${event.title}`}
      aria-pressed={active}
      className="absolute left-0 top-0 w-[min(420px,calc(100vw-120px))] text-left transition-transform duration-500 ease-out"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg)`,
        zIndex: 10 - depth,
      }}
    >
      <div className="stub-h flex h-[168px] overflow-hidden bg-surface shadow-[0_18px_40px_-18px_rgba(30,27,58,.45)]">
        <Cover theme={event.theme} seed={EVENTS.indexOf(event)} className="h-full w-[70%]" />
        <div className="perf-v my-3" />
        <div className="flex flex-1 flex-col justify-center gap-1 px-3 text-center">
          <span className="text-xs text-muted">{formatDate(event.date, { month: 'short' })}</span>
          <span className="font-display text-4xl font-bold leading-none">{formatDate(event.date, { day: 'numeric' })}</span>
          <span className="text-xs font-semibold">{formatPKR(minPrice(event))}</span>
        </div>
      </div>
    </button>
  );
}

export default function Home() {
  const { t } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const featured = EVENTS.filter((e) => e.trending).slice(0, 3);
  const [active, setActive] = useState(featured[0].slug);
  const activeEvent = featured.find((e) => e.slug === active)!;
  const thisWeek = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const trending = EVENTS.filter((e) => !thisWeek.includes(e)).concat(EVENTS.filter((e) => e.trending)).slice(0, 3);

  return (
    <>
      {/* Hero: headline on one side, a fan of real tickets on the other. */}
      <section className="mx-auto grid max-w-page items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,6.4vw,5rem)] font-bold leading-[0.98] tracking-[-0.03em]">
            {t('heroLine1')}
            <br />
            {t('heroLine2')}
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg text-muted">{t('heroSub')}</p>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore/?q=${encodeURIComponent(q)}`);
            }}
            className="mt-8 flex max-w-lg items-center gap-2 rounded-full border border-line bg-surface p-1.5 ps-5 shadow-sm focus-within:border-marigold"
          >
            <Search size={19} className="shrink-0 text-muted" aria-hidden="true" />
            <label htmlFor="hero-q" className="sr-only">{t('search')}</label>
            <input
              id="hero-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search')}
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted"
            />
            <button className="rounded-full bg-marigold px-5 py-2.5 font-semibold text-night transition hover:brightness-105">Search</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Lahore', 'Karachi', 'Islamabad'].map((c) => (
              <Link key={c} href={`/explore/?city=${c}`} className="rounded-full border border-line px-3.5 py-1 text-sm text-muted hover:border-ink hover:text-ink">
                {c}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="fan relative h-[290px]">
            {featured.map((e, i) => {
              const a = featured.findIndex((x) => x.slug === active);
              const depth = (i - a + featured.length) % featured.length;
              return <HeroStub key={e.slug} event={e} depth={depth} onPick={() => setActive(e.slug)} />;
            })}
          </div>
          <Link href={`/events/${activeEvent.slug}/`} className="group mt-2 block ps-5" aria-live="polite">
            <p className="text-sm text-mehndi">{activeEvent.city}</p>
            <p className="font-display text-2xl font-semibold group-hover:underline">{activeEvent.title}</p>
            <p className="text-muted">{activeEvent.tagline}</p>
          </Link>
        </div>
      </section>

      {/* This week */}
      <section className="mx-auto max-w-page px-5 py-10" aria-labelledby="week">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="week" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t('thisWeek')}</h2>
          <Link href="/explore/" className="text-sm font-semibold underline-offset-4 hover:underline">{t('seeAll')}</Link>
        </div>
        <div className="scrollbar-none -mx-5 flex snap-x gap-5 overflow-x-auto px-5 pb-4 md:grid md:grid-cols-4 md:overflow-visible">
          {thisWeek.map((e) => (
            <div key={e.slug} className="w-[280px] shrink-0 snap-start md:w-auto">
              <EventCard event={e} />
            </div>
          ))}
        </div>
      </section>

      {/* Themes */}
      <section className="mx-auto max-w-page px-5 py-10" aria-labelledby="themes">
        <h2 id="themes" className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t('byTheme')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((th, i) => (
            <Link key={th.slug} href={`/explore/?theme=${th.slug}`} className="group relative h-28 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 transition duration-500 group-hover:scale-105"><Cover theme={th.slug} seed={i + 2} label={false} className="h-full w-full" /></div>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-4 pt-10 font-display text-xl font-semibold text-white">
                {th.name} <span className="font-urdu text-base font-normal opacity-80">{th.nameUr}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-page px-5 py-10" aria-labelledby="trending">
        <h2 id="trending" className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t('trending')}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      {/* Take part */}
      <section className="mx-auto mt-10 max-w-page px-5">
        <div className="rounded-[28px] bg-night px-6 py-12 text-white sm:px-12">
          <h2 className="max-w-[20ch] font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Every great gathering needs more than an audience.
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              { icon: HandHeart, title: 'Volunteer', body: 'Pick a shift, meet good people, and earn hours and certificates you can show.', cta: 'Find shifts', href: '/explore/' },
              { icon: StoreIcon, title: 'Book a stall', body: 'Choose your spot on a live floor map, add power or tables, and pay with JazzCash or card.', cta: 'See open stalls', href: '/events/karachi-food-street-fest/stalls/' },
              { icon: Megaphone, title: 'Host an event', body: 'Tickets, seating, promo codes, volunteers and stalls — set up in one guided flow.', cta: 'Start hosting', href: '/studio/new/' },
            ].map((x) => (
              <div key={x.title} className="border-t border-white/15 pt-6">
                <x.icon size={26} className="text-marigold" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-semibold">{x.title}</h3>
                <p className="mt-2 text-white/70">{x.body}</p>
                <Link href={x.href} className="mt-4 inline-block font-semibold text-marigold underline-offset-4 hover:underline">
                  {x.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
