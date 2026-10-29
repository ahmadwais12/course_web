export type CityKey =
  | 'Kabul'
  | 'Herat'
  | 'Mazar-i-Sharif'
  | 'Kandahar'
  | 'Jalalabad'
  | 'Kunduz'
  | 'Ghazni'
  | 'Bamyan'
  | 'Khost'
  | 'Farah'
  | 'Lashkar Gah'
  | 'Puli Khumri'
  | 'Sheberghan'
  | 'Taloqan'
  | 'Gardez'
  | 'Fayzabad'
  | 'Zaranj';

export type CityMeta = {
  name: CityKey;
  province: string;
  x: number;
  y: number;
  lng: number;
  lat: number;
  weight: number;
};

/** Afghanistan cities with map points and geographic coordinates. */
export const AFGHANISTAN_CITIES: CityMeta[] = [
  { name: 'Kabul', province: 'Kabul', x: 492, y: 214, lng: 69.2075, lat: 34.5553, weight: 38 },
  { name: 'Herat', province: 'Herat', x: 168, y: 198, lng: 62.2097, lat: 34.3482, weight: 12 },
  { name: 'Mazar-i-Sharif', province: 'Balkh', x: 412, y: 92, lng: 67.1101, lat: 36.7069, weight: 10 },
  { name: 'Kandahar', province: 'Kandahar', x: 368, y: 348, lng: 65.7101, lat: 31.6289, weight: 9 },
  { name: 'Jalalabad', province: 'Nangarhar', x: 572, y: 208, lng: 70.4517, lat: 34.4302, weight: 8 },
  { name: 'Kunduz', province: 'Kunduz', x: 508, y: 86, lng: 68.8673, lat: 36.7286, weight: 5 },
  { name: 'Ghazni', province: 'Ghazni', x: 448, y: 276, lng: 68.4173, lat: 33.5451, weight: 4 },
  { name: 'Bamyan', province: 'Bamyan', x: 412, y: 188, lng: 67.8211, lat: 34.8212, weight: 3 },
  { name: 'Khost', province: 'Khost', x: 548, y: 268, lng: 69.9204, lat: 33.3395, weight: 2 },
  { name: 'Farah', province: 'Farah', x: 178, y: 286, lng: 62.1164, lat: 32.3742, weight: 2 },
  { name: 'Lashkar Gah', province: 'Helmand', x: 298, y: 358, lng: 64.3716, lat: 31.5938, weight: 2 },
  { name: 'Puli Khumri', province: 'Baghlan', x: 456, y: 132, lng: 68.7151, lat: 35.9446, weight: 1 },
  { name: 'Sheberghan', province: 'Jowzjan', x: 338, y: 96, lng: 65.7522, lat: 36.6672, weight: 1 },
  { name: 'Taloqan', province: 'Takhar', x: 548, y: 92, lng: 69.5345, lat: 36.7361, weight: 1 },
  { name: 'Gardez', province: 'Paktia', x: 518, y: 252, lng: 69.2259, lat: 33.5973, weight: 1 },
  { name: 'Fayzabad', province: 'Badakhshan', x: 638, y: 72, lng: 70.58, lat: 37.1166, weight: 0.6 },
  { name: 'Zaranj', province: 'Nimruz', x: 148, y: 368, lng: 61.8604, lat: 30.9599, weight: 0.4 },
];

const WEIGHT_TOTAL = AFGHANISTAN_CITIES.reduce((sum, city) => sum + city.weight, 0);

export function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function cityForId(id: string): CityKey {
  const n = hashString(id) % 10000;
  let cursor = (n / 10000) * WEIGHT_TOTAL;
  for (const city of AFGHANISTAN_CITIES) {
    cursor -= city.weight;
    if (cursor <= 0) return city.name;
  }
  return 'Kabul';
}

const ALIASES: Record<string, CityKey> = {
  kabul: 'Kabul',
  herat: 'Herat',
  mazar: 'Mazar-i-Sharif',
  'mazar-i-sharif': 'Mazar-i-Sharif',
  'mazar i sharif': 'Mazar-i-Sharif',
  kandahar: 'Kandahar',
  qandahar: 'Kandahar',
  jalalabad: 'Jalalabad',
  kunduz: 'Kunduz',
  ghazni: 'Ghazni',
  bamyan: 'Bamyan',
  bamiyan: 'Bamyan',
  khost: 'Khost',
  farah: 'Farah',
  'lashkar gah': 'Lashkar Gah',
  lashkargah: 'Lashkar Gah',
  'puli khumri': 'Puli Khumri',
  sheberghan: 'Sheberghan',
  taloqan: 'Taloqan',
  gardez: 'Gardez',
  fayzabad: 'Fayzabad',
  faizabad: 'Fayzabad',
  zaranj: 'Zaranj',
};

export function normalizeCity(value?: string | null): CityKey | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const exact = AFGHANISTAN_CITIES.find((city) => city.name.toLowerCase() === key);
  return exact?.name ?? null;
}

export function resolveCity(id: string, recorded?: string | null): CityKey {
  return normalizeCity(recorded) ?? cityForId(id);
}

export const AFGHANISTAN_OUTLINE =
  'M178 168C154 146 148 112 172 88C206 58 268 48 332 46C402 44 468 58 528 78C576 94 628 86 678 108C716 124 748 148 742 186C734 228 688 244 646 268C612 290 590 326 548 356C508 384 454 404 396 410C332 416 276 396 226 368C178 342 140 308 128 262C116 216 142 188 178 168Z';
