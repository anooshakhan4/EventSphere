'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'en' | 'ur';
type Mode = 'light' | 'dark';

export type CartLine = { tierId: string; name: string; price: number; qty: number };
export type Order = {
  id: string;
  eventSlug: string;
  lines: CartLine[];
  seats: string[];
  promo?: { code: string; off: number };
  total: number;
};

const DICT = {
  en: {
    explore: 'Explore', create: 'Create an event', saved: 'Saved', tickets: 'My tickets',
    heroLine1: 'Find your people.', heroLine2: 'Find your night.',
    heroSub: 'Concerts, food streets, mushairas, trail runs — everything happening across Pakistan, in one place.',
    search: 'Search events, venues, organizers', thisWeek: 'Happening this week', trending: 'People are talking about',
    byTheme: 'Browse by theme', seeAll: 'See all events', from: 'From', going: 'going', soldOut: 'Sold out',
    buy: 'Get tickets', volunteer: 'Volunteer', stall: 'Book a stall', joinWaitlist: 'Join waitlist',
    language: 'اردو', footer: 'Made for people who love a good gathering.',
  },
  ur: {
    explore: 'دریافت کریں', create: 'ایونٹ بنائیں', saved: 'محفوظ', tickets: 'میرے ٹکٹ',
    heroLine1: 'اپنے لوگ ڈھونڈیں۔', heroLine2: 'اپنی شام ڈھونڈیں۔',
    heroSub: 'محفلیں، فوڈ اسٹریٹ، مشاعرے، دوڑیں — پاکستان بھر کی تقریبات ایک جگہ۔',
    search: 'ایونٹ، مقام یا منتظم تلاش کریں', thisWeek: 'اس ہفتے', trending: 'سب کی زبان پر',
    byTheme: 'موضوع کے لحاظ سے', seeAll: 'تمام ایونٹس', from: 'سے شروع', going: 'جا رہے ہیں', soldOut: 'ختم',
    buy: 'ٹکٹ لیں', volunteer: 'رضاکار بنیں', stall: 'اسٹال بک کریں', joinWaitlist: 'انتظار فہرست',
    language: 'English', footer: 'اچھی محفل کے شوقین لوگوں کے لیے۔',
  },
} as const;

export type DictKey = keyof (typeof DICT)['en'];

type Store = {
  locale: Locale;
  toggleLocale: () => void;
  t: (k: DictKey) => string;
  mode: Mode;
  toggleMode: () => void;
  saved: string[];
  toggleSaved: (slug: string) => void;
  order: Order | null;
  setOrder: (o: Order | null) => void;
  toast: string | null;
  notify: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory */
  }
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [mode, setMode] = useState<Mode>('light');
  const [saved, setSaved] = useState<string[]>([]);
  const [order, setOrderState] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLocale(read('es.locale', 'en'));
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setMode(read('es.mode', prefersDark ? 'dark' : 'light'));
    setSaved(read('es.saved', []));
    setOrderState(read('es.order', null));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
  }, [locale]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo<Store>(
    () => ({
      locale,
      toggleLocale: () => setLocale((l) => { const n = l === 'en' ? 'ur' : 'en'; write('es.locale', n); return n; }),
      t: (k) => DICT[locale][k],
      mode,
      toggleMode: () => setMode((m) => { const n = m === 'light' ? 'dark' : 'light'; write('es.mode', n); return n; }),
      saved,
      toggleSaved: (slug) =>
        setSaved((s) => {
          const n = s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug];
          write('es.saved', n);
          return n;
        }),
      order,
      setOrder: (o) => { setOrderState(o); write('es.order', o); },
      toast,
      notify,
    }),
    [locale, mode, saved, order, toast, notify],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
};
