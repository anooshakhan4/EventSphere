'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { formatPKR, type Event, type Stall } from '@/lib/data';
import { useStore } from '@/lib/store';

const ADDONS = [
  { id: 'power', name: 'Power socket (2 kW)', price: 3000 },
  { id: 'table', name: 'Extra table and 2 chairs', price: 1500 },
  { id: 'wifi', name: 'Wi-Fi for card machines', price: 1000 },
  { id: 'sign', name: 'Printed banner', price: 2500 },
];

export function StallsView({ event }: { event: Event }) {
  const { notify } = useStore();
  const [sel, setSel] = useState<Stall | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const total = (sel?.price ?? 0) + ADDONS.filter((a) => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);

  if (done && sel)
    return (
      <div className="mx-auto max-w-xl px-5 pt-20 text-center">
        <p className="font-display text-4xl font-bold">Stall {sel.label} is yours to review</p>
        <p className="mt-4 text-lg text-muted">
          {event.organizer.name} approves vendors within 48 hours. If they say no, your payment comes back automatically.
        </p>
        <Link href={`/events/${event.slug}/`} className="mt-8 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-paper">Back to the event</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-page px-5 pt-8">
      <Link href={`/events/${event.slug}/`} className="text-sm text-muted hover:text-ink">Back to {event.title}</Link>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Pick your stall</h1>
      <p className="mt-2 text-muted">{event.venue}. Larger stalls sit on the corners and get the most foot traffic.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-line bg-surface p-6">
          <div className="mb-4 rounded-xl bg-line/60 py-2 text-center text-sm text-muted">Main entrance</div>
          <div className="grid grid-cols-4 gap-3">
            {event.stalls.map((s) => {
              const on = sel?.id === s.id;
              const off = s.status !== 'open';
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={off}
                  onClick={() => setSel(s)}
                  aria-pressed={on}
                  aria-label={`Stall ${s.label}, size ${s.size}, ${off ? s.status : formatPKR(s.price)}`}
                  className={`flex flex-col items-start rounded-xl p-3 text-left transition ${
                    s.size === 'L' ? 'min-h-28' : s.size === 'M' ? 'min-h-24' : 'min-h-20'
                  } ${off ? 'cursor-not-allowed bg-line/50 text-muted' : on ? 'bg-marigold text-night ring-4 ring-marigold/30' : 'border-2 border-dashed border-mehndi/50 hover:bg-mehndi/10'}`}
                >
                  <span className="font-display text-lg font-bold">{s.label}</span>
                  <span className="text-xs">{s.size === 'L' ? 'Large 3×3 m' : s.size === 'M' ? 'Medium 2×3 m' : 'Small 2×2 m'}</span>
                  <span className="mt-auto text-sm font-semibold">{s.status === 'booked' ? 'Booked' : s.status === 'held' ? 'On hold' : formatPKR(s.price)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl bg-line/60 py-2 text-center text-sm text-muted">Food court and seating</div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-6">
            {sel ? (
              <>
                <p className="text-sm text-muted">Stall {sel.label}</p>
                <p className="font-display text-3xl font-bold">{formatPKR(sel.price)}</p>
                <p className="mt-5 font-semibold">Add to your stall</p>
                <ul className="mt-2 space-y-2">
                  {ADDONS.map((a) => {
                    const on = addons.includes(a.id);
                    return (
                      <li key={a.id}>
                        <button type="button" aria-pressed={on}
                          onClick={() => setAddons((x) => (on ? x.filter((y) => y !== a.id) : [...x, a.id]))}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${on ? 'border-ink' : 'border-line'}`}>
                          <span className={`grid h-5 w-5 place-items-center rounded ${on ? 'bg-ink text-paper' : 'border border-line'}`}>{on && <Check size={14} />}</span>
                          <span className="flex-1">{a.name}</span>
                          <span className="font-semibold">{formatPKR(a.price)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-muted">Total</span>
                  <span className="font-display text-2xl font-bold">{formatPKR(total)}</span>
                </div>
                <button type="button" onClick={() => { setDone(true); notify('Stall request sent'); }} className="mt-4 w-full rounded-full bg-marigold py-3.5 font-semibold text-night">
                  Request stall {sel.label}
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-bold">Choose a spot on the map</p>
                <p className="mt-2 text-muted">Dashed stalls are open. We hold your pick for 15 minutes while you pay.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
