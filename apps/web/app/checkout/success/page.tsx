'use client';

import Link from 'next/link';
import { CalendarPlus, Gift, Send } from 'lucide-react';
import { TicketPass } from '@/components/TicketPass';
import { getEvent } from '@/lib/data';
import { useStore } from '@/lib/store';

export default function Success() {
  const { order, notify } = useStore();
  const event = order ? getEvent(order.eventSlug) : undefined;
  if (!order || !event)
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 text-center">
        <p className="font-display text-3xl font-bold">No recent order</p>
        <Link href="/me/tickets/" className="mt-6 inline-block font-semibold underline">See your tickets</Link>
      </div>
    );

  const points = Math.max(10, Math.round(order.total / 100));

  const addToCalendar = () => {
    const start = new Date(event.date);
    const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(start.getTime() + 3 * 3600e3);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${order.id}@eventsphere`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${event.title}`, `LOCATION:${event.venue}, ${event.city}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14">
      <div className="rise text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight">You’re going!</h1>
        <p className="mt-3 text-lg text-muted">Your tickets are on their way to your inbox, and they’re saved in My tickets too.</p>
      </div>

      <div className="rise mt-10">
        <TicketPass event={event} order={order} />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={addToCalendar} className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-paper">
          <CalendarPlus size={18} aria-hidden="true" /> Add to calendar
        </button>
        <button type="button" onClick={() => notify('Invite link copied — friends will see you’re going')} className="flex items-center gap-2 rounded-full border border-ink px-5 py-3 font-semibold">
          <Send size={18} aria-hidden="true" /> Invite friends
        </button>
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-mehndi">
        <Gift size={18} aria-hidden="true" /> You earned {points} points. Use them for discounts on your next event.
      </p>
    </div>
  );
}
