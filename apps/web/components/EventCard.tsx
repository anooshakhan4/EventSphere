'use client';

import Link from 'next/link';
import { Heart, MapPin } from 'lucide-react';
import { Cover } from './Cover';
import { EVENTS, formatDate, formatPKR, formatTime, minPrice, ticketsLeft, type Event } from '@/lib/data';
import { useStore } from '@/lib/store';

export function SaveButton({ slug, className = '' }: { slug: string; className?: string }) {
  const { saved, toggleSaved, notify } = useStore();
  const on = saved.includes(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save event'}
      onClick={(e) => {
        e.preventDefault();
        toggleSaved(slug);
        notify(on ? 'Removed from saved' : 'Saved — we’ll remind you a day before');
      }}
      className={`grid h-10 w-10 place-items-center rounded-full bg-surface/95 text-ink shadow-sm transition active:scale-90 ${className}`}
    >
      <Heart size={18} className={on ? 'fill-rose text-rose' : ''} />
    </button>
  );
}

export function FriendsGoing({ names, count }: { names: string[]; count: number }) {
  const { t } = useStore();
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      {names.length > 0 && (
        <span className="flex -space-x-2 rtl:space-x-reverse">
          {names.slice(0, 3).map((n, i) => (
            <span
              key={n}
              className="grid h-6 w-6 place-items-center rounded-full border-2 border-surface text-[11px] font-semibold text-white"
              style={{ backgroundColor: ['#5B4BC4', '#2B8A3E', '#C2255C'][i] }}
              title={n}
            >
              {n[0]}
            </span>
          ))}
        </span>
      )}
      <span>
        {names.length > 0 ? `${names[0]}${names.length > 1 ? ` +${names.length - 1} friends` : ''}, ` : ''}
        {count.toLocaleString()} {t('going')}
      </span>
    </div>
  );
}

export function EventCard({ event }: { event: Event }) {
  const { t } = useStore();
  const left = ticketsLeft(event);
  const price = minPrice(event);
  const seed = EVENTS.indexOf(event);
  return (
    <Link href={`/events/${event.slug}/`} className="group block focus-visible:outline-none">
      <article className="stub relative flex h-full flex-col bg-surface transition duration-300 group-hover:-translate-y-1 group-focus-visible:ring-4 group-focus-visible:ring-marigold" style={{ ['--cut' as string]: '176px' }}>
        <div className="relative h-[176px]">
          <Cover theme={event.theme} seed={seed} className="h-full w-full" />
          <SaveButton slug={event.slug} className="absolute right-3 top-3" />
          {event.format !== 'In person' && (
            <span className="absolute bottom-3 right-3 rounded-full bg-night/80 px-2.5 py-0.5 text-xs font-medium text-white">{event.format}</span>
          )}
        </div>
        <div className="perf mx-4" />
        <div className="flex flex-1 flex-col gap-2 p-5 pt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="font-medium text-mehndi">
              {formatDate(event.date)}, {formatTime(event.date)}
            </p>
            <p className="shrink-0">
              {left === 0 ? (
                <span className="font-semibold text-rose">{t('soldOut')}</span>
              ) : (
                <span className="font-semibold">{formatPKR(price)}{price > 0 && event.tiers.length > 1 ? '+' : ''}</span>
              )}
            </p>
          </div>
          <h3 className="font-display text-xl font-semibold leading-snug">{event.title}</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={15} aria-hidden="true" /> {event.venue}, {event.city}
          </p>
          <div className="mt-auto pt-3">
            <FriendsGoing names={event.friendsGoing} count={event.goingCount} />
          </div>
        </div>
      </article>
    </Link>
  );
}
