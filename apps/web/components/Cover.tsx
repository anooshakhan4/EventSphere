import { getTheme, type ThemeSlug } from '@/lib/data';

// Generated cover art per theme: a flat colour field with a pattern drawn in SVG,
// so the app has no dependency on stock photos until organizers upload their own.
export function Cover({ theme, seed = 0, className = '', label = true }: { theme: ThemeSlug; seed?: number; className?: string; label?: boolean }) {
  const t = getTheme(theme);
  const id = `p-${theme}-${seed}`;
  const s = (seed % 5) * 7;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: t.hue }} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 240">
        <defs>
          {t.pattern === 'dots' && (
            <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform={`rotate(${s})`}>
              <circle cx="12" cy="12" r="4" fill="#fff" fillOpacity=".22" />
            </pattern>
          )}
          {t.pattern === 'grid' && (
            <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="1.5" />
            </pattern>
          )}
          {t.pattern === 'stripes' && (
            <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform={`rotate(${35 + s})`}>
              <rect width="9" height="22" fill="#fff" fillOpacity=".16" />
            </pattern>
          )}
        </defs>
        {(t.pattern === 'dots' || t.pattern === 'grid' || t.pattern === 'stripes') && <rect width="400" height="240" fill={`url(#${id})`} />}
        {t.pattern === 'waves' &&
          Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M-20 ${30 + i * 26 + s} C 80 ${i * 26 - 10 + s}, 180 ${70 + i * 26 + s}, 420 ${20 + i * 26 + s}`} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2" />
          ))}
        {t.pattern === 'arcs' &&
          Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={320 - s} cy={220} r={30 + i * 34} fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="2" />
          ))}
        {t.pattern === 'petals' &&
          Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="300" cy="120" rx="22" ry="96" fill="#fff" fillOpacity=".09" transform={`rotate(${i * 15 + s} 300 120)`} />
          ))}
        {/* A marigold sun sits on every cover: the brand's quiet signature. */}
        <circle cx={60 + s * 2} cy="190" r="34" fill="rgb(242 160 7)" fillOpacity=".9" />
      </svg>
      {label && <span className="absolute left-4 top-3 text-sm font-semibold text-white/90">{t.name}</span>}
    </div>
  );
}
