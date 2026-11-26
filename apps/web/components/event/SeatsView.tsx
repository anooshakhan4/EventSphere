'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import type { Event } from '@/lib/data';
import { useStore } from '@/lib/store';

const ROWS = 'ABCDEFGHIJ'.split('');
const PER_ROW = 14;
// Deterministic "taken" seats so the map looks lived-in.
const taken = (r: number, c: number) => (r * 7 + c * 3) % 5 === 0 || (r < 2 && c % 3 === 0);

export function SeatsView({ event }: { event: Event }) {
  const { order, setOrder } = useStore();
  const router = useRouter();
  const need = order?.eventSlug === event.slug ? order.lines.filter((l) => l.tierId !== 't1').reduce((s, l) => s + l.qty, 0) : 2;
  const [picked, setPicked] = useState<string[]>([]);
  const [secs, setSecs] = useState(600);

  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < need ? [...p, id] : [...p.slice(1), id]));

  return (
    <div className="mx-auto max-w-page px-5 pt-8">
      <Link href={`/events/${event.slug}/`} className="text-sm text-muted hover:text-ink">Back to {event.title}</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold tracking-tight">Choose {need} seat{need > 1 ? 's' : ''}</h1>
        <p className="flex items-center gap-2 rounded-full bg-line/60 px-4 py-2 text-sm font-medium" aria-live="off">
          <Timer size={16} aria-hidden="true" /> Held for you for {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-surface p-6 sm:p-10">
        <div className="mx-auto mb-10 h-3 w-2/3 rounded-full bg-marigold/80" aria-hidden="true" />
        <p className="-mt-8 mb-8 text-center text-sm text-muted">Stage</p>
        <div className="mx-auto grid w-max gap-2" role="grid" aria-label="Seating chart">
          {ROWS.map((row, r) => (
            <div key={row} className="flex items-center gap-1.5" role="row">
              <span className="w-5 text-sm text-muted">{row}</span>
              {Array.from({ length: PER_ROW }, (_, c) => {
                const id = `${row}${c + 1}`;
                const isTaken = taken(r, c);
                const on = picked.includes(id);
                return (
                  <span key={id} className={c === 6 ? 'me-5' : ''} role="gridcell">
                    <button
                      type="button"
                      disabled={isTaken}
                      onClick={() => toggle(id)}
                      aria-pressed={on}
                      aria-label={`Seat ${id}${isTaken ? ', taken' : ''}`}
                      className={`h-7 w-7 rounded-t-lg rounded-b-sm text-[10px] font-semibold transition ${
                        isTaken ? 'cursor-not-allowed bg-line' : on ? 'scale-110 bg-marigold text-night' : 'border-2 border-mehndi/60 hover:bg-mehndi/20'
                      }`}
                    >
                      {on ? c + 1 : ''}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm text-muted">
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border-2 border-mehndi/60" /> Available</span>
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-marigold" /> Your pick</span>
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-line" /> Taken</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg">{picked.length ? `Seats ${picked.join(', ')}` : 'Tap a seat to pick it'}</p>
        <button
          type="button"
          disabled={picked.length !== need}
          onClick={() => { if (order) setOrder({ ...order, seats: picked }); router.push('/checkout/'); }}
          className="rounded-full bg-marigold px-8 py-3.5 text-lg font-semibold text-night disabled:opacity-50"
        >
          Continue to payment
        </button>
      </div>
    </div>
  );
}
