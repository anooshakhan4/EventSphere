// Mock data for the frontend slice. Mirrors the Prisma schema in apps/api so the
// swap to real API calls (lib/api.ts) is a one-line change per page.

export type ThemeSlug = 'music' | 'food' | 'tech' | 'art' | 'sports' | 'charity' | 'literature' | 'fashion';

export type Theme = { slug: ThemeSlug; name: string; nameUr: string; hue: string; pattern: 'dots' | 'waves' | 'grid' | 'arcs' | 'stripes' | 'petals' };

export const THEMES: Theme[] = [
  { slug: 'music', name: 'Music', nameUr: 'موسیقی', hue: '#5B4BC4', pattern: 'waves' },
  { slug: 'food', name: 'Food', nameUr: 'کھانا', hue: '#D9480F', pattern: 'dots' },
  { slug: 'tech', name: 'Tech', nameUr: 'ٹیکنالوجی', hue: '#0B7285', pattern: 'grid' },
  { slug: 'art', name: 'Art', nameUr: 'فن', hue: '#C2255C', pattern: 'arcs' },
  { slug: 'sports', name: 'Sports', nameUr: 'کھیل', hue: '#2B8A3E', pattern: 'stripes' },
  { slug: 'charity', name: 'Charity', nameUr: 'خیرات', hue: '#E8590C', pattern: 'petals' },
  { slug: 'literature', name: 'Literature', nameUr: 'ادب', hue: '#7048E8', pattern: 'arcs' },
  { slug: 'fashion', name: 'Fashion', nameUr: 'فیشن', hue: '#A61E4D', pattern: 'petals' },
];

export type TicketTier = { id: string; name: string; price: number; left: number; total: number; perks: string };
export type Stall = { id: string; label: string; size: 'S' | 'M' | 'L'; price: number; status: 'open' | 'held' | 'booked'; x: number; y: number };
export type Shift = { id: string; role: string; time: string; filled: number; capacity: number };
export type Review = { name: string; rating: number; text: string };

export type Event = {
  slug: string;
  title: string;
  theme: ThemeSlug;
  tagline: string;
  description: string;
  date: string; // ISO
  endTime: string;
  city: string;
  venue: string;
  format: 'In person' | 'Online' | 'Hybrid';
  organizer: { name: string; handle: string; verified: boolean };
  tiers: TicketTier[];
  friendsGoing: string[];
  goingCount: number;
  hasSeating: boolean;
  stalls: Stall[];
  shifts: Shift[];
  accessibility: string[];
  agenda: { time: string; item: string }[];
  reviews: Review[];
  trending?: boolean;
};

const stallGrid = (prefix: string, booked: number[], held: number[], base: number): Stall[] =>
  Array.from({ length: 12 }, (_, i) => {
    const size = i % 5 === 0 ? 'L' : i % 3 === 0 ? 'M' : 'S';
    return {
      id: `${prefix}-${i + 1}`,
      label: `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`,
      size,
      price: size === 'L' ? base * 2 : size === 'M' ? Math.round(base * 1.4) : base,
      status: booked.includes(i) ? 'booked' : held.includes(i) ? 'held' : 'open',
      x: i % 4,
      y: Math.floor(i / 4),
    } as Stall;
  });

export const EVENTS: Event[] = [
  {
    slug: 'lahore-qawwali-night',
    title: 'Qawwali under the stars',
    theme: 'music',
    tagline: 'An open-air evening of Sufi qawwali in the old city',
    description:
      'Three qawwali parties, one courtyard, and the kind of night that stays with you. Bring a shawl — it gets cool after ten. Chai and kahwa stalls open from 7.',
    date: '2026-12-04T19:30:00+05:00',
    endTime: '23:30',
    city: 'Lahore',
    venue: 'Haveli Courtyard, Walled City',
    format: 'In person',
    organizer: { name: 'Sama Collective', handle: 'sama', verified: true },
    tiers: [
      { id: 't1', name: 'Floor seating', price: 2500, left: 64, total: 300, perks: 'Cushions on the courtyard floor' },
      { id: 't2', name: 'Chair seating', price: 4000, left: 12, total: 150, perks: 'Reserved chair, choose your seat' },
      { id: 't3', name: 'Front row', price: 8000, left: 0, total: 30, perks: 'Front two rows and dinner' },
    ],
    friendsGoing: ['Ayesha', 'Bilal', 'Hira'],
    goingCount: 412,
    hasSeating: true,
    stalls: stallGrid('q', [0, 2, 5, 6], [9], 12000),
    shifts: [
      { id: 's1', role: 'Welcome desk', time: '18:00 – 21:00', filled: 4, capacity: 6 },
      { id: 's2', role: 'Seating guides', time: '19:00 – 23:30', filled: 8, capacity: 8 },
      { id: 's3', role: 'Clean-up crew', time: '23:00 – 00:30', filled: 2, capacity: 10 },
    ],
    accessibility: ['Step-free entry via Gate 2', 'Accessible restroom', 'Reserved wheelchair spaces'],
    agenda: [
      { time: '19:30', item: 'Doors open, chai stalls' },
      { time: '20:15', item: 'Ustad Rafaqat & party' },
      { time: '21:30', item: 'Fareed Ayaz tribute set' },
      { time: '22:45', item: 'Closing dhamaal' },
    ],
    reviews: [
      { name: 'Sana K.', rating: 5, text: 'Last year’s edition was the best night of my winter. Go early for floor spots.' },
      { name: 'Umar F.', rating: 4, text: 'Gorgeous setting. Parking is a walk, take a rickshaw from Delhi Gate.' },
    ],
    trending: true,
  },
  {
    slug: 'karachi-food-street-fest',
    title: 'Burns Road food festival',
    theme: 'food',
    tagline: 'Forty stalls, one street, nihari at midnight',
    description:
      'The city’s most famous food street closes to traffic for one weekend. Family-run stalls, a live tandoor theatre, and a dessert lane you will not finish.',
    date: '2026-12-06T17:00:00+05:00',
    endTime: '01:00',
    city: 'Karachi',
    venue: 'Burns Road, Saddar',
    format: 'In person',
    organizer: { name: 'Karachi Eats', handle: 'karachieats', verified: true },
    tiers: [
      { id: 't1', name: 'Entry pass', price: 500, left: 1800, total: 5000, perks: 'Entry and a tasting card' },
      { id: 't2', name: 'Tasting pass', price: 2500, left: 140, total: 600, perks: '8 tasting tokens and fast lane' },
    ],
    friendsGoing: ['Zain', 'Mehwish'],
    goingCount: 2310,
    hasSeating: false,
    stalls: stallGrid('f', [0, 1, 3, 4, 7, 8, 10], [2], 18000),
    shifts: [
      { id: 's1', role: 'Token booth', time: '16:00 – 20:00', filled: 5, capacity: 8 },
      { id: 's2', role: 'Lost and found', time: '17:00 – 23:00', filled: 1, capacity: 3 },
    ],
    accessibility: ['Fully street-level', 'Seating zones every 50 m'],
    agenda: [
      { time: '17:00', item: 'Stalls open' },
      { time: '19:00', item: 'Tandoor theatre' },
      { time: '22:00', item: 'Dessert lane opens' },
    ],
    reviews: [{ name: 'Rabia T.', rating: 5, text: 'Bring cash for the small stalls and an empty stomach.' }],
    trending: true,
  },
  {
    slug: 'islamabad-ai-summit',
    title: 'Build with AI, Islamabad',
    theme: 'tech',
    tagline: 'A practical day of talks and workshops for builders',
    description:
      'Talks from local founders, hands-on workshops, and a startup alley. Hybrid: join the main stage online if you can’t make it to the capital.',
    date: '2026-12-10T09:30:00+05:00',
    endTime: '18:00',
    city: 'Islamabad',
    venue: 'NIC, F-5',
    format: 'Hybrid',
    organizer: { name: 'Devs of Pakistan', handle: 'devspk', verified: true },
    tiers: [
      { id: 't1', name: 'Online', price: 0, left: 2000, total: 2000, perks: 'Main stage livestream' },
      { id: 't2', name: 'Student', price: 1500, left: 38, total: 200, perks: 'Valid student ID at the door' },
      { id: 't3', name: 'General', price: 5000, left: 210, total: 500, perks: 'All talks, lunch, workshops' },
    ],
    friendsGoing: ['Hamza', 'Fatima', 'Owais', 'Sara'],
    goingCount: 980,
    hasSeating: false,
    stalls: stallGrid('t', [0, 4, 8], [], 25000),
    shifts: [
      { id: 's1', role: 'Registration', time: '08:30 – 12:00', filled: 6, capacity: 10 },
      { id: 's2', role: 'Workshop helpers', time: '11:00 – 17:00', filled: 3, capacity: 12 },
    ],
    accessibility: ['Lift access', 'Live captions on main stage', 'Quiet room'],
    agenda: [
      { time: '09:30', item: 'Keynote' },
      { time: '11:00', item: 'Workshops round 1' },
      { time: '14:00', item: 'Founder panel' },
      { time: '16:30', item: 'Demo hour' },
    ],
    reviews: [],
  },
  {
    slug: 'truck-art-open-studio',
    title: 'Truck art open studio',
    theme: 'art',
    tagline: 'Paint a panel with the masters of phool patti',
    description:
      'A weekend with the painters who decorate Pakistan’s trucks. Watch, then pick up a brush — you take home the panel you paint.',
    date: '2026-12-13T11:00:00+05:00',
    endTime: '17:00',
    city: 'Lahore',
    venue: 'Alhamra Arts Council',
    format: 'In person',
    organizer: { name: 'Rang Studio', handle: 'rang', verified: false },
    tiers: [
      { id: 't1', name: 'Watch', price: 800, left: 90, total: 150, perks: 'Gallery and live painting' },
      { id: 't2', name: 'Paint a panel', price: 4500, left: 6, total: 40, perks: 'Materials and your own panel' },
    ],
    friendsGoing: [],
    goingCount: 132,
    hasSeating: false,
    stalls: stallGrid('a', [1], [], 8000),
    shifts: [{ id: 's1', role: 'Studio assistant', time: '10:00 – 17:00', filled: 1, capacity: 4 }],
    accessibility: ['Step-free ground floor'],
    agenda: [
      { time: '11:00', item: 'Masters at work' },
      { time: '13:00', item: 'Workshop session' },
    ],
    reviews: [],
  },
  {
    slug: 'margalla-trail-run',
    title: 'Margalla trail run',
    theme: 'sports',
    tagline: '5K, 10K and 21K through the hills at sunrise',
    description:
      'Chip-timed trail race on Trails 3 and 5. Medals for every finisher, breakfast at the top, and the best view of Islamabad you’ll earn all year.',
    date: '2026-12-20T06:30:00+05:00',
    endTime: '11:00',
    city: 'Islamabad',
    venue: 'Trail 3 trailhead, F-6',
    format: 'In person',
    organizer: { name: 'Run Islamabad', handle: 'runisb', verified: true },
    tiers: [
      { id: 't1', name: '5K', price: 2000, left: 120, total: 400, perks: 'Bib, medal, breakfast' },
      { id: 't2', name: '10K', price: 3000, left: 75, total: 300, perks: 'Bib, chip time, medal' },
      { id: 't3', name: '21K', price: 4500, left: 22, total: 150, perks: 'Chip time, medal, jacket' },
    ],
    friendsGoing: ['Bilal'],
    goingCount: 640,
    hasSeating: false,
    stalls: stallGrid('s', [0, 3], [], 10000),
    shifts: [
      { id: 's1', role: 'Water station', time: '06:00 – 10:00', filled: 9, capacity: 16 },
      { id: 's2', role: 'Finish line', time: '07:00 – 11:00', filled: 4, capacity: 6 },
    ],
    accessibility: ['Not suitable for wheelchairs on trail', 'Accessible spectator zone at start'],
    agenda: [
      { time: '06:30', item: '21K start' },
      { time: '07:00', item: '10K start' },
      { time: '07:30', item: '5K start' },
    ],
    reviews: [{ name: 'Daniyal R.', rating: 5, text: 'Brutal climb, perfect organisation. Paratha at the top was elite.' }],
    trending: true,
  },
  {
    slug: 'winter-clothes-drive',
    title: 'Warm hands winter drive',
    theme: 'charity',
    tagline: 'Sort, pack and deliver 5,000 winter kits',
    description:
      'Volunteer for a day of sorting and packing blankets and jackets for families in northern Punjab. Entry is free — donations are optional.',
    date: '2026-12-14T10:00:00+05:00',
    endTime: '16:00',
    city: 'Rawalpindi',
    venue: 'Liaquat Bagh community hall',
    format: 'In person',
    organizer: { name: 'Hamdard Youth', handle: 'hamdardyouth', verified: true },
    tiers: [
      { id: 't1', name: 'Free entry', price: 0, left: 300, total: 400, perks: 'Join the packing line' },
      { id: 't2', name: 'Sponsor a kit', price: 3000, left: 999, total: 999, perks: 'One full winter kit' },
    ],
    friendsGoing: ['Hira', 'Zain'],
    goingCount: 210,
    hasSeating: false,
    stalls: [],
    shifts: [
      { id: 's1', role: 'Sorting', time: '10:00 – 13:00', filled: 22, capacity: 40 },
      { id: 's2', role: 'Packing', time: '13:00 – 16:00', filled: 18, capacity: 40 },
      { id: 's3', role: 'Delivery drivers', time: '15:00 – 19:00', filled: 3, capacity: 12 },
    ],
    accessibility: ['Ground floor hall', 'Seated sorting tables'],
    agenda: [{ time: '10:00', item: 'Briefing and sorting' }],
    reviews: [],
  },
  {
    slug: 'urdu-mushaira-evening',
    title: 'An evening of mushaira',
    theme: 'literature',
    tagline: 'Twelve poets, one stage, and plenty of wah wah',
    description:
      'A traditional Urdu mushaira with established and young poets, hosted in the lawns of the Arts Council. Online tickets include the livestream and a recording.',
    date: '2026-12-18T20:00:00+05:00',
    endTime: '23:59',
    city: 'Karachi',
    venue: 'Arts Council lawns',
    format: 'Hybrid',
    organizer: { name: 'Bazm-e-Sukhan', handle: 'bazm', verified: true },
    tiers: [
      { id: 't1', name: 'Livestream', price: 500, left: 1000, total: 1000, perks: 'Stream and recording' },
      { id: 't2', name: 'Lawn seating', price: 1500, left: 0, total: 800, perks: 'Open seating' },
    ],
    friendsGoing: ['Ayesha'],
    goingCount: 760,
    hasSeating: false,
    stalls: stallGrid('l', [0, 1, 2], [], 6000),
    shifts: [{ id: 's1', role: 'Ushers', time: '19:00 – 00:00', filled: 10, capacity: 10 }],
    accessibility: ['Step-free lawns', 'Sign language interpreter'],
    agenda: [{ time: '20:00', item: 'Opening and young poets' }],
    reviews: [],
  },
  {
    slug: 'peshawar-craft-bazaar',
    title: 'Qissa Khwani craft bazaar',
    theme: 'fashion',
    tagline: 'Handmade chappals, embroidery and copperware',
    description:
      'Artisans from across Khyber Pakhtunkhwa in one heritage bazaar. Stalls are still open — book one if you make things by hand.',
    date: '2027-01-09T12:00:00+05:00',
    endTime: '20:00',
    city: 'Peshawar',
    venue: 'Qissa Khwani Bazaar',
    format: 'In person',
    organizer: { name: 'Hunar Collective', handle: 'hunar', verified: false },
    tiers: [{ id: 't1', name: 'Entry', price: 300, left: 2000, total: 3000, perks: 'Entry all day' }],
    friendsGoing: [],
    goingCount: 85,
    hasSeating: false,
    stalls: stallGrid('p', [0], [4], 7000),
    shifts: [{ id: 's1', role: 'Info desk', time: '11:00 – 20:00', filled: 0, capacity: 4 }],
    accessibility: ['Narrow lanes, uneven ground'],
    agenda: [{ time: '12:00', item: 'Bazaar opens' }],
    reviews: [],
  },
];

export const CITIES = ['All cities', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar'];

export const getEvent = (slug: string) => EVENTS.find((e) => e.slug === slug);
export const getTheme = (slug: ThemeSlug) => THEMES.find((t) => t.slug === slug)!;
export const minPrice = (e: Event) => Math.min(...e.tiers.map((t) => t.price));
export const ticketsLeft = (e: Event) => e.tiers.reduce((s, t) => s + t.left, 0);

export const formatPKR = (n: number) => (n === 0 ? 'Free' : `Rs ${n.toLocaleString('en-PK')}`);

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'Asia/Karachi' }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }).format(new Date(iso));
