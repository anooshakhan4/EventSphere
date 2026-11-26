'use client';

import Link from 'next/link';
import { EventCard } from '@/components/EventCard';
import { EVENTS } from '@/lib/data';
import { useStore } from '@/lib/store';

export default function Saved() {
  const { saved } = useStore();
  const list = EVENTS.filter((e) => saved.includes(e.slug));
  return (
    <div className="mx-auto max-w-page px-5 pt-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Saved for later</h1>
      {list.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Nothing saved yet</p>
          <p className="mt-2 text-muted">Tap the heart on any event and we’ll remind you a day before it starts.</p>
          <Link href="/explore/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Browse events</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <EventCard key={e.slug} event={e} />)}</div>
      )}
    </div>
  );
}
