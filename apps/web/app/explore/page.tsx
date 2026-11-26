'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, Map as MapIcon, Search, X } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { CITIES, EVENTS, THEMES, minPrice, type ThemeSlug } from '@/lib/data';
import { useStore } from '@/lib/store';

// Rough positions on a schematic map of Pakistan (0–100 space).
const CITY_POS: Record<string, { x: number; y: number }> = {
  Peshawar: { x: 58, y: 22 }, Islamabad: { x: 68, y: 24 }, Rawalpindi: { x: 67, y: 28 },
  Lahore: { x: 78, y: 40 }, Karachi: { x: 30, y: 88 },
};

const DATE_OPTS = [
  { id: 'any', label: 'Any date' },
  { id: 'week', label: 'Next 7 days' },
  { id: 'month', label: 'Next 30 days' },
];
const PRICE_OPTS = [
  { id: 'any', label: 'Any price' },
  { id: 'free', label: 'Free' },
  { id: 'u2k', label: 'Under Rs 2,000' },
];

function Explore() {
  const params = useSearchParams();
  const { t } = useStore();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [themes, setThemes] = useState<ThemeSlug[]>(params.get('theme') ? [params.get('theme') as ThemeSlug] : []);
  const [city, setCity] = useState(params.get('city') ?? 'All cities');
  const [format, setFormat] = useState('Any');
  const [date, setDate] = useState('any');
  const [price, setPrice] = useState('any');
  const [view, setView] = useState<'grid' | 'map'>('grid');

  const now = new Date('2026-11-30T00:00:00+05:00').getTime(); // demo "today" so mock dates stay relevant
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EVENTS.filter((e) => {
      if (term && !`${e.title} ${e.venue} ${e.city} ${e.organizer.name} ${e.tagline}`.toLowerCase().includes(term)) return false;
      if (themes.length && !themes.includes(e.theme)) return false;
      if (city !== 'All cities' && e.city !== city) return false;
      if (format !== 'Any' && e.format !== format) return false;
      const days = (new Date(e.date).getTime() - now) / 864e5;
      if (date === 'week' && days > 7) return false;
      if (date === 'month' && days > 30) return false;
      const p = minPrice(e);
      if (price === 'free' && p !== 0) return false;
      if (price === 'u2k' && p >= 2000) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [q, themes, city, format, date, price, now]);

  const activeCount = themes.length + (city !== 'All cities' ? 1 : 0) + (format !== 'Any' ? 1 : 0) + (date !== 'any' ? 1 : 0) + (price !== 'any' ? 1 : 0);
  const clear = () => { setThemes([]); setCity('All cities'); setFormat('Any'); setDate('any'); setPrice('any'); setQ(''); };

  const pill = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink'}`;

  return (
    <div className="mx-auto max-w-page px-5 pt-10">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">What’s on</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-marigold">
          <Search size={18} className="text-muted" aria-hidden="true" />
          <label htmlFor="q" className="sr-only">{t('search')}</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-muted" />
        </div>
        <label className="sr-only" htmlFor="city">City</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium">
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="View">
          <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-ink text-paper' : ''}`}>
            <LayoutGrid size={15} aria-hidden="true" /> Grid
          </button>
          <button type="button" onClick={() => setView('map')} aria-pressed={view === 'map'} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${view === 'map' ? 'bg-ink text-paper' : ''}`}>
            <MapIcon size={15} aria-hidden="true" /> Map
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Themes">
        {THEMES.map((th) => {
          const on = themes.includes(th.slug);
          return (
            <button key={th.slug} type="button" aria-pressed={on} className={pill(on)}
              onClick={() => setThemes((s) => (on ? s.filter((x) => x !== th.slug) : [...s, th.slug]))}>
              <span className="me-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: th.hue }} aria-hidden="true" />
              {th.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DATE_OPTS.map((o) => <button key={o.id} type="button" aria-pressed={date === o.id} onClick={() => setDate(o.id)} className={pill(date === o.id)}>{o.label}</button>)}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        {PRICE_OPTS.map((o) => <button key={o.id} type="button" aria-pressed={price === o.id} onClick={() => setPrice(o.id)} className={pill(price === o.id)}>{o.label}</button>)}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        {['Any', 'In person', 'Online', 'Hybrid'].map((f) => <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)} className={pill(format === f)}>{f === 'Any' ? 'Any format' : f}</button>)}
      </div>

      <div className="mt-8 flex items-center justify-between text-sm text-muted" aria-live="polite">
        <span>{results.length} event{results.length === 1 ? '' : 's'}</span>
        {activeCount > 0 && (
          <button type="button" onClick={clear} className="flex items-center gap-1 font-medium text-ink hover:underline">
            <X size={14} aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Nothing matches all of that yet</p>
          <p className="mx-auto mt-2 max-w-md text-muted">Try another city or fewer themes. New events are added every day.</p>
          <button type="button" onClick={clear} className="mt-6 rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Clear filters</button>
        </div>
      ) : view === 'grid' ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((e) => <EventCard key={e.slug} event={e} />)}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-surface sm:aspect-[5/4]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M28 96 L18 80 L10 70 L22 60 L36 52 L44 40 L52 30 L54 14 L62 6 L76 8 L84 18 L80 30 L88 42 L82 52 L70 58 L58 70 L48 82 L40 94 Z" fill="rgb(var(--line))" fillOpacity=".55" />
            </svg>
            {Object.entries(CITY_POS).map(([c, p]) => {
              const n = results.filter((e) => e.city === c).length;
              if (!n) return null;
              return (
                <button key={c} type="button" onClick={() => setCity(c)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-marigold px-3 py-1 text-sm font-semibold text-night shadow-md ring-4 ring-marigold/25 transition hover:scale-105"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-label={`${n} events in ${c}`}>
                  {c} · {n}
                </button>
              );
            })}
          </div>
          <div className="grid content-start gap-6">
            {results.slice(0, 4).map((e) => <EventCard key={e.slug} event={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-page px-5 pt-10" />}>
      <Explore />
    </Suspense>
  );
}
