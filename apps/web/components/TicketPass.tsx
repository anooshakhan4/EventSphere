'use client';

import { QR } from './QR';
import { Cover } from './Cover';
import { EVENTS, formatDate, formatTime, type Event } from '@/lib/data';
import type { Order } from '@/lib/store';

// The e-ticket: event on the left, admit stub with QR on the right.
export function TicketPass({ event, order, tearing = false }: { event: Event; order: Order; tearing?: boolean }) {
  const count = order.lines.reduce((s, l) => s + l.qty, 0);
  return (
    <div className="stub-h relative flex flex-col overflow-hidden bg-surface shadow-[0_30px_60px_-30px_rgba(30,27,58,.55)] sm:flex-row" style={{ ['--cut' as string]: '64%' }}>
      <div className="flex flex-1 flex-col sm:w-[64%] sm:flex-none">
        <Cover theme={event.theme} seed={EVENTS.indexOf(event)} className="h-28" />
        <div className="space-y-1 p-6">
          <p className="text-sm text-mehndi">{formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long' })}, {formatTime(event.date)}</p>
          <p className="font-display text-2xl font-bold leading-tight">{event.title}</p>
          <p className="text-muted">{event.venue}, {event.city}</p>
          <p className="pt-3 text-sm">
            {order.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
            {order.seats.length > 0 && <> · Seats {order.seats.join(', ')}</>}
          </p>
        </div>
      </div>
      <div className="perf-v my-4 hidden sm:block" />
      <div className={`flex flex-col items-center justify-center gap-3 p-6 ${tearing ? 'tear' : ''}`}>
        <QR value={order.id} />
        <p className="font-mono text-sm tracking-wider">{order.id}</p>
        <p className="text-xs text-muted">Admits {count}</p>
      </div>
    </div>
  );
}
