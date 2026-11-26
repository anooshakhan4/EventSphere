'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeftRight, Tag } from 'lucide-react';
import { TicketPass } from '@/components/TicketPass';
import { getEvent } from '@/lib/data';
import { useStore } from '@/lib/store';

export default function MyTickets() {
  const { order, notify } = useStore();
  const [mode, setMode] = useState<'transfer' | 'resell' | null>(null);
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const event = order ? getEvent(order.eventSlug) : undefined;
  const face = order ? Math.max(...order.lines.map((l) => l.price)) : 0;

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">My tickets</h1>
      {!order || !event ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">No tickets yet</p>
          <p className="mt-2 text-muted">When you book, your tickets live here — ready to scan at the door, even offline.</p>
          <Link href="/explore/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Find something to do</Link>
        </div>
      ) : (
        <>
          <h2 className="mt-8 text-sm font-semibold text-muted">Upcoming</h2>
          <div className="mt-3"><TicketPass event={event} order={order} /></div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setMode(mode === 'transfer' ? null : 'transfer')} aria-expanded={mode === 'transfer'}
              className="flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-semibold"><ArrowLeftRight size={16} aria-hidden="true" /> Transfer</button>
            <button type="button" onClick={() => setMode(mode === 'resell' ? null : 'resell')} aria-expanded={mode === 'resell'}
              className="flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-semibold"><Tag size={16} aria-hidden="true" /> Resell</button>
          </div>
          {mode === 'transfer' && (
            <form className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-line/40 p-4" onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(to)) return setError('Enter your friend’s email address.');
              setError(''); setMode(null); notify(`Ticket sent to ${to}. Your old QR code no longer works.`);
            }}>
              <label htmlFor="to" className="sr-only">Friend’s email</label>
              <input id="to" value={to} onChange={(e) => { setTo(e.target.value); setError(''); }} placeholder="friend@example.com" className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2" />
              <button className="rounded-full bg-ink px-4 py-2 font-semibold text-paper">Send ticket</button>
              {error && <p className="w-full text-sm text-rose" role="alert">{error}</p>}
            </form>
          )}
          {mode === 'resell' && (
            <div className="mt-4 rounded-2xl bg-line/40 p-4">
              <p>Resale is capped at face value ({face.toLocaleString()} PKR) so nobody gets priced out. You get paid when it sells, minus a 5% fee.</p>
              <button type="button" onClick={() => { setMode(null); notify('Listed for resale. We’ll tell you when it sells.'); }} className="mt-3 rounded-full bg-ink px-4 py-2 font-semibold text-paper">List at face value</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
