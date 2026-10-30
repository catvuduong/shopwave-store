// Deterministic demo catalog. Seeding inserts missing rows only (ON CONFLICT DO NOTHING),
// so restarts are harmless and stock already decremented by checkouts is never reset.

export interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  stock: number;
  rating: number;
}

export const PRODUCT_SEEDS: ProductSeed[] = [
  // Audio
  {
    slug: 'aurora-anc-headphones',
    name: 'Aurora ANC Headphones',
    description:
      'Over-ear wireless headphones with adaptive noise cancelling, a 40-hour battery and a memory-foam headband for long listening sessions.',
    priceCents: 19_900,
    category: 'Audio',
    stock: 42,
    rating: 4.7,
  },
  {
    slug: 'halo-wireless-earbuds',
    name: 'Halo Wireless Earbuds',
    description:
      'Pocket-sized earbuds with a secure in-ear fit, transparency mode and a charging case that gives four extra charges.',
    priceCents: 12_900,
    category: 'Audio',
    stock: 64,
    rating: 4.5,
  },
  {
    slug: 'pulse-bookshelf-speaker',
    name: 'Pulse Bookshelf Speaker',
    description:
      'Two-way walnut-finish bookshelf speaker with a silk-dome tweeter, Bluetooth 5.3 and a balanced sound that suits small rooms.',
    priceCents: 22_900,
    category: 'Audio',
    stock: 18,
    rating: 4.6,
  },
  {
    slug: 'drift-portable-speaker',
    name: 'Drift Portable Speaker',
    description:
      'IP67 waterproof speaker with 360-degree sound, an integrated strap and up to 18 hours of playback on a single charge.',
    priceCents: 8_900,
    category: 'Audio',
    stock: 75,
    rating: 4.3,
  },
  // Wearables
  {
    slug: 'meridian-smartwatch',
    name: 'Meridian Smartwatch',
    description:
      'Always-on smartwatch with a sapphire-glass display, GPS route tracking, sleep insights and seven days of battery life.',
    priceCents: 24_900,
    category: 'Wearables',
    stock: 35,
    rating: 4.6,
  },
  {
    slug: 'summit-fitness-band',
    name: 'Summit Fitness Band',
    description:
      'Lightweight activity band that tracks steps, heart rate and workouts, with a fourteen-day battery and swim-proof sealing.',
    priceCents: 7_900,
    category: 'Wearables',
    stock: 90,
    rating: 4.2,
  },
  {
    slug: 'tempo-smart-ring',
    name: 'Tempo Smart Ring',
    description:
      'Titanium smart ring that measures sleep, readiness and resting heart rate, with no subscription and a five-day charge.',
    priceCents: 29_900,
    category: 'Wearables',
    stock: 14,
    rating: 4.4,
  },
  {
    slug: 'stride-running-pod',
    name: 'Stride Running Pod',
    description:
      'Clip-on running sensor that tracks cadence, stride length and ground contact time, and syncs with any fitness app.',
    priceCents: 5_900,
    category: 'Wearables',
    stock: 50,
    rating: 4.0,
  },
  // Home Office
  {
    slug: 'ridge-75-keyboard',
    name: 'Ridge 75 Mechanical Keyboard',
    description:
      'Gasket-mounted 75% keyboard with hot-swappable switches, a PBT keycap set and a quiet, solid typing feel.',
    priceCents: 15_900,
    category: 'Home Office',
    stock: 28,
    rating: 4.8,
  },
  {
    slug: 'ember-desk-lamp',
    name: 'Ember Desk Lamp',
    description:
      'Dimmable LED desk lamp with a warm-to-cool colour range, a weighted base and a USB-C port built into the arm.',
    priceCents: 8_900,
    category: 'Home Office',
    stock: 40,
    rating: 4.5,
  },
  {
    slug: 'north-standing-desk',
    name: 'North Standing Desk Frame',
    description:
      'Dual-motor sit-stand frame with a 70 kg lift capacity, memory presets and a cable tray. Desktop sold separately.',
    priceCents: 54_900,
    category: 'Home Office',
    stock: 8,
    rating: 4.7,
  },
  {
    slug: 'quill-notebook-set',
    name: 'Quill Notebook Set',
    description:
      'Three A5 notebooks with 120gsm dot-grid paper, a ribbon bookmark and a lay-flat binding that stays open on the desk.',
    priceCents: 2_400,
    category: 'Home Office',
    stock: 120,
    rating: 4.1,
  },
  // Kitchen
  {
    slug: 'kestrel-pour-over-kit',
    name: 'Kestrel Pour-Over Kit',
    description:
      'Borosilicate glass dripper, a stainless gooseneck kettle and 100 paper filters for a clean, bright cup every morning.',
    priceCents: 6_400,
    category: 'Kitchen',
    stock: 55,
    rating: 4.6,
  },
  {
    slug: 'brisk-cold-brew-carafe',
    name: 'Brisk Cold Brew Carafe',
    description:
      'One-litre glass carafe with a fine-mesh filter insert. Steep overnight in the fridge for smooth, low-acid cold brew.',
    priceCents: 3_800,
    category: 'Kitchen',
    stock: 70,
    rating: 4.3,
  },
  {
    slug: 'forge-chef-knife',
    name: 'Forge 8-inch Chef Knife',
    description:
      'Hand-finished Japanese steel blade with a 60-degree edge, a walnut handle and a balance point just ahead of the bolster.',
    priceCents: 13_500,
    category: 'Kitchen',
    stock: 22,
    rating: 4.9,
  },
  {
    slug: 'cedar-cutting-board',
    name: 'Cedar Edge Cutting Board',
    description:
      'End-grain cedar board with juice grooves and rubber feet. Gentle on knife edges and easy to oil and refresh.',
    priceCents: 7_200,
    category: 'Kitchen',
    stock: 33,
    rating: 4.4,
  },
];

export const COUPON_SEEDS = [
  { code: 'WELCOME10', percentOff: 10 },
  { code: 'FALL15', percentOff: 15 },
];

/** Stable, distinct creation dates so "newest" sorting is deterministic. */
export function seedCreatedAt(index: number): string {
  return new Date(Date.UTC(2026, 0, 1 + index)).toISOString();
}
