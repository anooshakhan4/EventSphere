import type { Config } from 'tailwindcss';
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'), surface: v('surface'), ink: v('ink'), muted: v('muted'), line: v('line'),
        marigold: v('marigold'), mehndi: v('mehndi'), rose: v('rose'), night: v('night'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      maxWidth: { page: '1200px' },
    },
  },
  plugins: [],
} satisfies Config;
