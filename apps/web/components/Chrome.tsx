'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Languages, Moon, Plus, Sun, Ticket } from 'lucide-react';
import { useStore } from '@/lib/store';

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight" aria-label="EventSphere home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="rgb(var(--ink))" />
        <circle cx="16" cy="16" r="7" fill="rgb(var(--marigold))" />
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} cx={16 + 11 * Math.cos((i * Math.PI) / 4)} cy={16 + 11 * Math.sin((i * Math.PI) / 4)} r="2" fill="rgb(var(--marigold))" />
        ))}
      </svg>
      <span>EventSphere</span>
    </Link>
  );
}

export function Header() {
  const { t, toggleLocale, toggleMode, mode, saved } = useStore();
  const path = usePathname();
  const nav = [
    { href: '/explore/', label: t('explore') },
    { href: '/me/tickets/', label: t('tickets') },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-5">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-1.5 text-[15px] font-medium transition hover:bg-line/60 ${path?.startsWith(n.href) ? 'bg-line/70' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <button type="button" onClick={toggleLocale} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-line/60" aria-label="Switch language">
            <Languages size={17} aria-hidden="true" /> <span className="hidden sm:inline">{t('language')}</span>
          </button>
          <button type="button" onClick={toggleMode} className="grid h-10 w-10 place-items-center rounded-full hover:bg-line/60" aria-label={mode === 'dark' ? 'Use light mode' : 'Use dark mode'}>
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/me/saved/" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-line/60" aria-label={`${t('saved')} (${saved.length})`}>
            <Heart size={18} />
            {saved.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">{saved.length}</span>}
          </Link>
          <Link href="/me/tickets/" className="grid h-10 w-10 place-items-center rounded-full hover:bg-line/60 md:hidden" aria-label={t('tickets')}>
            <Ticket size={18} />
          </Link>
          <Link href="/studio/new/" className="ms-1 hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:opacity-90 sm:flex">
            <Plus size={16} aria-hidden="true" /> {t('create')}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useStore();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-page gap-8 px-5 py-12 text-sm text-muted sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs">{t('footer')}</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-ink">Discover</p>
          <Link href="/explore/" className="block hover:text-ink">All events</Link>
          <Link href="/explore/?theme=music" className="block hover:text-ink">Music</Link>
          <Link href="/explore/?theme=food" className="block hover:text-ink">Food</Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-ink">Take part</p>
          <Link href="/studio/new/" className="block hover:text-ink">Host an event</Link>
          <Link href="/explore/" className="block hover:text-ink">Volunteer</Link>
          <Link href="/explore/" className="block hover:text-ink">Book a stall</Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-ink">Pay with</p>
          <p>JazzCash, Easypaisa, Visa and Mastercard</p>
        </div>
      </div>
    </footer>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div role="status" className="toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper shadow-lg">
      {toast}
    </div>
  );
}
