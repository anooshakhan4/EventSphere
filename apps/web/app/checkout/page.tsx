'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreditCard, Lock, Smartphone } from 'lucide-react';
import { formatDate, formatPKR, formatTime, getEvent } from '@/lib/data';
import { useStore } from '@/lib/store';

// Demo promo codes. Real ones come from the organizer's Promo codes tab.
const PROMOS: Record<string, { kind: 'pct' | 'flat'; value: number; label: string }> = {
  EARLYBIRD: { kind: 'pct', value: 15, label: '15% early bird' },
  SPHERE500: { kind: 'flat', value: 500, label: 'Rs 500 off' },
};

const METHODS = [
  { id: 'jazzcash', name: 'JazzCash', icon: Smartphone, hint: 'We’ll send a payment prompt to your phone.' },
  { id: 'easypaisa', name: 'Easypaisa', icon: Smartphone, hint: 'Approve the request in your Easypaisa app.' },
  { id: 'card', name: 'Card', icon: CreditCard, hint: 'Visa, Mastercard and UnionPay.' },
] as const;

export default function Checkout() {
  const { order, setOrder } = useStore();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('jazzcash');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  const event = order ? getEvent(order.eventSlug) : undefined;
  if (!order || !event)
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 text-center">
        <p className="font-display text-3xl font-bold">Your basket is empty</p>
        <p className="mt-3 text-muted">Pick an event and some tickets, and they’ll wait for you here.</p>
        <Link href="/explore/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-paper">Find an event</Link>
      </div>
    );

  const subtotal = order.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const off = order.promo?.off ?? 0;
  const fee = subtotal > 0 ? Math.round((subtotal - off) * 0.03) : 0;
  const total = Math.max(0, subtotal - off + fee);

  const applyCode = () => {
    const p = PROMOS[code.trim().toUpperCase()];
    if (!p) return setCodeMsg({ ok: false, text: 'That code isn’t valid for this event. Check the spelling or try EARLYBIRD.' });
    const amount = p.kind === 'pct' ? Math.round((subtotal * p.value) / 100) : Math.min(p.value, subtotal);
    setOrder({ ...order, promo: { code: code.trim().toUpperCase(), off: amount } });
    setCodeMsg({ ok: true, text: `${p.label} applied — you saved ${formatPKR(amount)}` });
  };

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter the email where we should send your tickets.';
    if (method !== 'card' && !/^03\d{9}$/.test(phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter an 11-digit mobile number starting with 03.';
    if (method === 'card' && card.replace(/\s/g, '').length < 15) errors.card = 'Enter the full card number.';
    setErr(errors);
    if (Object.keys(errors).length) return;
    setPaying(true);
    setOrder({ ...order, total });
    window.setTimeout(() => router.push('/checkout/success/'), 1200);
  };

  return (
    <div className="mx-auto max-w-page px-5 pt-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Almost there</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <form onSubmit={pay} noValidate className="space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold">Where should we send your tickets?</h2>
            <label htmlFor="email" className="mt-3 block text-sm font-semibold">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr((x) => ({ ...x, email: '' })); }}
              className="mt-1 w-full max-w-md rounded-xl border border-line bg-surface px-4 py-3" placeholder="ayesha@example.com" aria-invalid={!!err.email} aria-describedby="email-err" />
            {err.email && <p id="email-err" className="mt-2 text-sm text-rose">{err.email}</p>}
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">How would you like to pay?</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-semibold transition ${method === m.id ? 'border-ink bg-surface' : 'border-line hover:border-muted'}`}>
                  <m.icon size={20} aria-hidden="true" /> {m.name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">{METHODS.find((m) => m.id === method)!.hint}</p>
            {method === 'card' ? (
              <>
                <label htmlFor="card" className="mt-3 block text-sm font-semibold">Card number</label>
                <input id="card" inputMode="numeric" value={card} onChange={(e) => { setCard(e.target.value); setErr((x) => ({ ...x, card: '' })); }}
                  className="mt-1 w-full max-w-md rounded-xl border border-line bg-surface px-4 py-3" placeholder="4242 4242 4242 4242" aria-invalid={!!err.card} />
                {err.card && <p className="mt-2 text-sm text-rose">{err.card}</p>}
              </>
            ) : (
              <>
                <label htmlFor="phone" className="mt-3 block text-sm font-semibold">Mobile number</label>
                <input id="phone" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErr((x) => ({ ...x, phone: '' })); }}
                  className="mt-1 w-full max-w-md rounded-xl border border-line bg-surface px-4 py-3" placeholder="0300 1234567" aria-invalid={!!err.phone} />
                {err.phone && <p className="mt-2 text-sm text-rose">{err.phone}</p>}
              </>
            )}
          </section>

          <button disabled={paying} className="flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-marigold py-4 text-lg font-semibold text-night disabled:opacity-70">
            <Lock size={18} aria-hidden="true" /> {paying ? 'Confirming payment…' : `Pay ${formatPKR(total)}`}
          </button>
        </form>

        <aside className="lg:self-start">
          <div className="stub bg-surface p-6" style={{ ['--cut' as string]: '118px' }}>
            <p className="text-sm text-mehndi">{formatDate(event.date)} at {formatTime(event.date)}</p>
            <p className="font-display text-xl font-bold">{event.title}</p>
            <p className="text-sm text-muted">{event.venue}, {event.city}</p>
            <div className="perf -mx-1 my-6" />
            <ul className="space-y-2">
              {order.lines.map((l) => (
                <li key={l.tierId} className="flex justify-between"><span>{l.qty} × {l.name}</span><span className="tabular-nums">{formatPKR(l.price * l.qty)}</span></li>
              ))}
              {order.seats.length > 0 && <li className="text-sm text-muted">Seats {order.seats.join(', ')}</li>}
              {off > 0 && <li className="flex justify-between text-mehndi"><span>Promo {order.promo?.code}</span><span>− {formatPKR(off)}</span></li>}
              {fee > 0 && <li className="flex justify-between text-sm text-muted"><span>Service fee</span><span>{formatPKR(fee)}</span></li>}
            </ul>
            <div className="mt-4 flex justify-between border-t border-line pt-4 font-display text-2xl font-bold"><span>Total</span><span className="tabular-nums">{formatPKR(total)}</span></div>
            <div className="mt-6 flex gap-2">
              <label htmlFor="promo" className="sr-only">Promo code</label>
              <input id="promo" value={code} onChange={(e) => { setCode(e.target.value); setCodeMsg(null); }} placeholder="Promo code" className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2 uppercase" />
              <button type="button" onClick={applyCode} className="rounded-full border border-ink px-4 font-semibold">Apply</button>
            </div>
            {codeMsg && <p className={`mt-2 text-sm ${codeMsg.ok ? 'text-mehndi' : 'text-rose'}`} role="status">{codeMsg.text}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
