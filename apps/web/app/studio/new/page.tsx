'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { CITIES, THEMES, formatPKR, type ThemeSlug } from '@/lib/data';
import { useStore } from '@/lib/store';

const STEPS = ['Basics', 'When and where', 'Tickets', 'Take part', 'Publish'];

type Tier = { name: string; price: string; qty: string };

export default function CreateEvent() {
  const { notify } = useStore();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    title: '', tagline: '', theme: 'music' as ThemeSlug, date: '', time: '19:00', city: 'Lahore', venue: '',
    format: 'In person', volunteers: true, stalls: false, approval: true,
  });
  const [tiers, setTiers] = useState<Tier[]>([{ name: 'General', price: '1500', qty: '200' }]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError(''); };

  const validate = () => {
    if (step === 0 && f.title.trim().length < 4) return 'Give your event a name of at least 4 characters.';
    if (step === 1 && !f.date) return 'Pick a date so people can plan around it.';
    if (step === 1 && f.format !== 'Online' && !f.venue.trim()) return 'Add a venue, or switch the format to Online.';
    if (step === 2 && tiers.some((t) => !t.name.trim() || Number(t.qty) < 1)) return 'Each ticket type needs a name and at least 1 ticket.';
    return '';
  };
  const next = () => { const e = validate(); if (e) return setError(e); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };

  const input = 'mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3';
  const toggleRow = (k: 'volunteers' | 'stalls' | 'approval', title: string, body: string) => (
    <button type="button" role="switch" aria-checked={f[k]} onClick={() => set(k, !f[k])}
      className="flex w-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left">
      <span className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${f[k] ? 'bg-mehndi' : 'bg-line'}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition ${f[k] ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
      </span>
      <span><span className="block font-semibold">{title}</span><span className="text-sm text-muted">{body}</span></span>
    </button>
  );

  return (
    <div className="mx-auto max-w-page px-5 pt-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Host an event</h1>

      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i < step && setStep(i)} aria-current={i === step ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${i === step ? 'bg-ink text-paper' : i < step ? 'bg-mehndi/15 text-mehndi' : 'text-muted'}`}>
              <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">{i < step ? <Check size={12} /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {step === 0 && (
            <>
              <div><label htmlFor="title" className="text-sm font-semibold">Event name</label>
                <input id="title" className={input} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Qawwali under the stars" /></div>
              <div><label htmlFor="tag" className="text-sm font-semibold">One line about it</label>
                <input id="tag" className={input} value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="An open-air evening of Sufi qawwali in the old city" /></div>
              <fieldset><legend className="text-sm font-semibold">Theme</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button key={t.slug} type="button" aria-pressed={f.theme === t.slug} onClick={() => set('theme', t.slug)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${f.theme === t.slug ? 'border-ink bg-ink text-paper' : 'border-line bg-surface'}`}>{t.name}</button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="date" className="text-sm font-semibold">Date</label><input id="date" type="date" className={input} value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
                <div><label htmlFor="time" className="text-sm font-semibold">Starts at</label><input id="time" type="time" className={input} value={f.time} onChange={(e) => set('time', e.target.value)} /></div>
              </div>
              <fieldset><legend className="text-sm font-semibold">Format</legend>
                <div className="mt-2 flex gap-2">{['In person', 'Online', 'Hybrid'].map((x) => (
                  <button key={x} type="button" aria-pressed={f.format === x} onClick={() => set('format', x)} className={`rounded-full border px-4 py-2 text-sm font-medium ${f.format === x ? 'border-ink bg-ink text-paper' : 'border-line bg-surface'}`}>{x}</button>
                ))}</div>
              </fieldset>
              {f.format !== 'Online' && (
                <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                  <div><label htmlFor="city" className="text-sm font-semibold">City</label>
                    <select id="city" className={input} value={f.city} onChange={(e) => set('city', e.target.value)}>{CITIES.slice(1).map((c) => <option key={c}>{c}</option>)}</select></div>
                  <div><label htmlFor="venue" className="text-sm font-semibold">Venue</label><input id="venue" className={input} value={f.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Alhamra Arts Council" /></div>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              {tiers.map((t, i) => (
                <div key={i} className="grid items-end gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <div><label className="text-sm font-semibold" htmlFor={`tn${i}`}>Ticket type</label><input id={`tn${i}`} className={input} value={t.name} onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} /></div>
                  <div><label className="text-sm font-semibold" htmlFor={`tp${i}`}>Price (Rs)</label><input id={`tp${i}`} inputMode="numeric" className={input} value={t.price} onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value.replace(/\D/g, '') } : y)))} /></div>
                  <div><label className="text-sm font-semibold" htmlFor={`tq${i}`}>How many</label><input id={`tq${i}`} inputMode="numeric" className={input} value={t.qty} onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value.replace(/\D/g, '') } : y)))} /></div>
                  <button type="button" onClick={() => setTiers((x) => x.filter((_, j) => j !== i))} disabled={tiers.length === 1} className="grid h-12 w-12 place-items-center rounded-xl text-muted hover:text-rose disabled:opacity-30" aria-label={`Remove ${t.name}`}><Trash2 size={18} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setTiers((x) => [...x, { name: '', price: '0', qty: '50' }])} className="flex items-center gap-2 font-semibold"><Plus size={18} aria-hidden="true" /> Add a ticket type</button>
              <p className="text-sm text-muted">Promo codes and early-bird pricing are in your event dashboard after you publish.</p>
            </>
          )}
          {step === 3 && (
            <div className="space-y-3">
              {toggleRow('volunteers', 'Recruit volunteers', 'Add roles and shifts. Volunteers get logged hours, badges and a certificate.')}
              {toggleRow('stalls', 'Rent out stalls', 'Draw a floor map with stall sizes, prices and add-ons like power and tables.')}
              {toggleRow('approval', 'Review vendors and volunteers first', 'You approve each request before it’s confirmed.')}
            </div>
          )}
          {step === 4 && (
            <div className="rounded-3xl bg-line/40 p-6">
              <p className="font-display text-2xl font-bold">Ready when you are</p>
              <p className="mt-2 text-muted">Our team reviews new events within a few hours. You can keep editing while it’s in review.</p>
              <ul className="mt-4 space-y-1">
                <li>{tiers.length} ticket type{tiers.length > 1 ? 's' : ''}, {tiers.reduce((s, t) => s + Number(t.qty || 0), 0)} tickets in total</li>
                <li>Volunteers: {f.volunteers ? 'on' : 'off'} · Stalls: {f.stalls ? 'on' : 'off'}</li>
              </ul>
            </div>
          )}

          {error && <p className="text-sm font-medium text-rose" role="alert">{error}</p>}
          <div className="flex gap-3 pt-2">
            {step > 0 && <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-full border border-line px-6 py-3 font-semibold">Back</button>}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper">Continue</button>
            ) : (
              <button type="button" onClick={() => notify('Submitted for review — we’ll email you when it’s live')} className="rounded-full bg-marigold px-6 py-3 font-semibold text-night">Submit for review</button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Preview">
          <p className="mb-3 text-sm font-semibold text-muted">How people will see it</p>
          <div className="stub bg-surface" style={{ ['--cut' as string]: '176px' }}>
            <Cover theme={f.theme} seed={3} className="h-[176px]" />
            <div className="perf mx-4" />
            <div className="space-y-1.5 p-5">
              <p className="text-sm font-medium text-mehndi">{f.date ? new Date(`${f.date}T${f.time}`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be set'} · {f.time}</p>
              <p className="font-display text-xl font-semibold">{f.title || 'Your event name'}</p>
              <p className="text-sm text-muted">{f.tagline || 'A line that makes people want to come'}</p>
              <p className="pt-2 text-sm text-muted">{f.format === 'Online' ? 'Online' : `${f.venue || 'Venue'}, ${f.city}`}</p>
              <p className="pt-1 text-sm font-semibold">From {formatPKR(Math.min(...tiers.map((t) => Number(t.price || 0))))}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
