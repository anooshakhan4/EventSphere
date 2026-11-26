'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Award, Clock, Users } from 'lucide-react';
import type { Event } from '@/lib/data';
import { useStore } from '@/lib/store';

export function VolunteerView({ event }: { event: Event }) {
  const { notify } = useStore();
  const [joined, setJoined] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8">
      <Link href={`/events/${event.slug}/`} className="text-sm text-muted hover:text-ink">Back to {event.title}</Link>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Help make it happen</h1>
      <p className="mt-3 text-lg text-muted">
        Volunteers get free entry, a meal, logged hours and a certificate from {event.organizer.name}. Hours count toward your badges.
      </p>

      <ul className="mt-8 space-y-3">
        {event.shifts.map((s) => {
          const full = s.filled >= s.capacity;
          const on = joined.includes(s.id);
          const pct = Math.round((s.filled / s.capacity) * 100);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-semibold">{s.role}</p>
                <p className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5"><Clock size={14} aria-hidden="true" />{s.time}</span>
                  <span className="flex items-center gap-1.5"><Users size={14} aria-hidden="true" />{s.filled + (on ? 1 : 0)} of {s.capacity}</span>
                </p>
                <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-mehndi transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button
                type="button"
                disabled={full && !on}
                onClick={() => setJoined((j) => (on ? j.filter((x) => x !== s.id) : [...j, s.id]))}
                aria-pressed={on}
                className={`rounded-full px-5 py-2.5 font-semibold ${on ? 'bg-mehndi text-white' : full ? 'bg-line text-muted' : 'border border-ink hover:bg-ink hover:text-paper'}`}
              >
                {on ? 'Picked' : full ? 'Full' : 'Pick shift'}
              </button>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-10 rounded-3xl bg-line/40 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!joined.length) return setError('Pick at least one shift first.');
          if (!name.trim()) return setError('Add your name so the team knows who’s coming.');
          setError('');
          notify(`Thanks, ${name.split(' ')[0]}! ${event.organizer.name} will confirm your shifts soon.`);
        }}
      >
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Award aria-hidden="true" className="text-marigold" /> Apply</h2>
        <label className="mt-5 block text-sm font-semibold" htmlFor="vname">Your name</label>
        <input id="vname" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3" placeholder="Ayesha Khan" />
        <label className="mt-4 block text-sm font-semibold" htmlFor="vwhy">Anything the team should know? <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="vwhy" value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3" placeholder="I’ve run a registration desk before and speak Punjabi and Pashto." />
        {error && <p className="mt-3 text-sm font-medium text-rose" role="alert">{error}</p>}
        <button className="mt-5 rounded-full bg-ink px-6 py-3 font-semibold text-paper">
          Apply for {joined.length || 'your'} shift{joined.length === 1 ? '' : 's'}
        </button>
      </form>
    </div>
  );
}
