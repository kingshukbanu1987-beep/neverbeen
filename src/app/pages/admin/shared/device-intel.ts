/**
 * Device & network intelligence used by the user "Security & devices" view:
 * IP geolocation (city / region / country), ISP, time zone, realistic public
 * IP ranges per country and vendor-prefixed MAC addresses.
 *
 * Everything is deterministic demo data (seeded per session id) because the
 * NeverBeen community runs fully client-side.
 */

export interface DeviceModel {
  device: string;
  platform: string;
  browser: string;
  icon: string;
  kind: 'Mobile' | 'Tablet' | 'Laptop' | 'Desktop';
  /** Hardware vendor MAC prefixes (OUI). */
  oui: string[];
  /** How the OS names the device — `{first}` is replaced with the member's first name. */
  naming: string;
}

export const DEVICE_MODELS: DeviceModel[] = [
  { device: 'iPhone 15', platform: 'iOS 18', browser: 'Safari', icon: '📱', kind: 'Mobile', oui: ['F0:18:98', 'A4:83:E7', 'BC:D0:74'], naming: "{first}'s iPhone" },
  { device: 'Pixel 8', platform: 'Android 15', browser: 'Chrome', icon: '📱', kind: 'Mobile', oui: ['3C:28:6D', 'F8:0F:F9'], naming: 'Pixel 8' },
  { device: 'Galaxy S24', platform: 'Android 15', browser: 'Samsung Internet', icon: '📱', kind: 'Mobile', oui: ['8C:77:12', 'A0:CB:FD', '5C:E8:EB'], naming: "{first}'s Galaxy S24" },
  { device: 'MacBook Air', platform: 'macOS 15', browser: 'Chrome', icon: '💻', kind: 'Laptop', oui: ['A4:83:E7', '3C:22:FB', '14:7D:DA'], naming: "{first}'s MacBook Air" },
  { device: 'Windows PC', platform: 'Windows 11', browser: 'Edge', icon: '🖥️', kind: 'Desktop', oui: ['3C:A9:F4', 'D4:3D:7E', '00:1B:21'], naming: 'DESKTOP-{code}' },
  { device: 'iPad Air', platform: 'iPadOS 18', browser: 'Safari', icon: '📲', kind: 'Tablet', oui: ['F0:18:98', '90:B0:ED'], naming: "{first}'s iPad" },
  { device: 'OnePlus 12', platform: 'Android 14', browser: 'Chrome', icon: '📱', kind: 'Mobile', oui: ['C0:EE:FB', '94:65:2D'], naming: 'OnePlus 12' },
];

/** Older / additional devices that appear in sign-in history. */
export const HISTORY_MODELS: DeviceModel[] = [
  ...DEVICE_MODELS,
  { device: 'iPhone 12', platform: 'iOS 17', browser: 'Safari', icon: '📱', kind: 'Mobile', oui: ['F0:18:98', '28:CF:E9'], naming: "{first}'s iPhone" },
  { device: 'Redmi Note 12', platform: 'Android 13', browser: 'Chrome', icon: '📱', kind: 'Mobile', oui: ['64:CC:2E', '28:6C:07'], naming: 'Redmi Note 12' },
  { device: 'Vivo V29', platform: 'Android 14', browser: 'Chrome', icon: '📱', kind: 'Mobile', oui: ['EC:DF:3A', '3C:A5:81'], naming: 'vivo V29' },
  { device: 'Lenovo ThinkPad E14', platform: 'Windows 11', browser: 'Chrome', icon: '💻', kind: 'Laptop', oui: ['8C:16:45', '54:EE:75'], naming: 'LAPTOP-{code}' },
  { device: 'HP Pavilion 15', platform: 'Windows 10', browser: 'Firefox', icon: '💻', kind: 'Laptop', oui: ['9C:B6:D0', '10:1F:74'], naming: 'LAPTOP-{code}' },
  { device: 'Galaxy Tab S9', platform: 'Android 14', browser: 'Chrome', icon: '📲', kind: 'Tablet', oui: ['8C:77:12', 'BC:14:85'], naming: "{first}'s Tab S9" },
  { device: 'iMac 24"', platform: 'macOS 14', browser: 'Safari', icon: '🖥️', kind: 'Desktop', oui: ['3C:22:FB', 'AC:BC:32'], naming: "{first}'s iMac" },
];

interface CountryNet {
  iso: string;
  timezone: string;
  isps: string[];
  prefixes: [number, number][];
}

const COUNTRY_NET: Record<string, CountryNet> = {
  India: { iso: 'IN', timezone: 'Asia/Kolkata (UTC+05:30)', isps: ['Reliance Jio', 'Bharti Airtel', 'BSNL', 'ACT Fibernet', 'Vodafone Idea', 'Hathway'], prefixes: [[49, 36], [103, 211], [117, 199], [157, 34], [223, 176], [106, 51]] },
  Pakistan: { iso: 'PK', timezone: 'Asia/Karachi (UTC+05:00)', isps: ['PTCL', 'Jazz', 'Zong 4G', 'Nayatel'], prefixes: [[39, 32], [119, 160], [182, 185]] },
  Bangladesh: { iso: 'BD', timezone: 'Asia/Dhaka (UTC+06:00)', isps: ['Grameenphone', 'Robi Axiata', 'Banglalink', 'Link3 Technologies'], prefixes: [[103, 230], [114, 130], [202, 134]] },
  France: { iso: 'FR', timezone: 'Europe/Paris (UTC+01:00)', isps: ['Orange', 'Free', 'SFR', 'Bouygues Telecom'], prefixes: [[90, 3], [82, 64], [176, 180]] },
  Italy: { iso: 'IT', timezone: 'Europe/Rome (UTC+01:00)', isps: ['TIM', 'Fastweb', 'Vodafone Italia'], prefixes: [[79, 20], [151, 38]] },
  Japan: { iso: 'JP', timezone: 'Asia/Tokyo (UTC+09:00)', isps: ['NTT Docomo', 'SoftBank', 'KDDI au'], prefixes: [[126, 2], [153, 156]] },
  Ireland: { iso: 'IE', timezone: 'Europe/Dublin (UTC+00:00)', isps: ['Eir', 'Vodafone Ireland', 'Virgin Media IE'], prefixes: [[86, 40], [89, 101]] },
  Germany: { iso: 'DE', timezone: 'Europe/Berlin (UTC+01:00)', isps: ['Deutsche Telekom', 'Vodafone DE', 'O2 Germany'], prefixes: [[91, 64], [84, 150]] },
  Portugal: { iso: 'PT', timezone: 'Europe/Lisbon (UTC+00:00)', isps: ['MEO', 'NOS', 'Vodafone PT'], prefixes: [[85, 240], [89, 152]] },
  Switzerland: { iso: 'CH', timezone: 'Europe/Zurich (UTC+01:00)', isps: ['Swisscom', 'Sunrise', 'Salt'], prefixes: [[85, 1], [178, 197]] },
  Nigeria: { iso: 'NG', timezone: 'Africa/Lagos (UTC+01:00)', isps: ['MTN Nigeria', 'Airtel Nigeria'], prefixes: [[105, 112], [197, 210]] },
  Russia: { iso: 'RU', timezone: 'Europe/Moscow (UTC+03:00)', isps: ['Rostelecom', 'MTS'], prefixes: [[95, 24], [178, 176]] },
  Brazil: { iso: 'BR', timezone: 'America/Sao_Paulo (UTC−03:00)', isps: ['Vivo', 'Claro Brasil'], prefixes: [[177, 33], [189, 6]] },
  'United States': { iso: 'US', timezone: 'America/New_York (UTC−05:00)', isps: ['Comcast Xfinity', 'AT&T', 'Verizon'], prefixes: [[73, 12], [98, 210]] },
  'United Kingdom': { iso: 'GB', timezone: 'Europe/London (UTC+00:00)', isps: ['BT', 'Virgin Media', 'Sky Broadband'], prefixes: [[81, 2], [86, 128]] },
  'United Arab Emirates': { iso: 'AE', timezone: 'Asia/Dubai (UTC+04:00)', isps: ['Etisalat', 'du'], prefixes: [[94, 200], [5, 30]] },
  Netherlands: { iso: 'NL', timezone: 'Europe/Amsterdam (UTC+01:00)', isps: ['KPN', 'Ziggo'], prefixes: [[185, 107], [89, 38]] },
  Singapore: { iso: 'SG', timezone: 'Asia/Singapore (UTC+08:00)', isps: ['Singtel', 'StarHub'], prefixes: [[116, 86], [175, 156]] },
};

/** Where members travel / sign in from when away from home. */
export const DOMESTIC_TRAVEL: Record<string, { city: string; region: string }[]> = {
  India: [
    { city: 'Mumbai', region: 'Maharashtra' },
    { city: 'Bengaluru', region: 'Karnataka' },
    { city: 'New Delhi', region: 'Delhi' },
    { city: 'Chennai', region: 'Tamil Nadu' },
    { city: 'Panaji', region: 'Goa' },
    { city: 'Hyderabad', region: 'Telangana' },
  ],
  Pakistan: [
    { city: 'Karachi', region: 'Sindh' },
    { city: 'Islamabad', region: 'Islamabad Capital Territory' },
  ],
  Bangladesh: [
    { city: 'Chattogram', region: 'Chattogram Division' },
    { city: 'Sylhet', region: 'Sylhet Division' },
  ],
};

export const ABROAD: { city: string; region: string; country: string }[] = [
  { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates' },
  { city: 'Singapore', region: 'Central Region', country: 'Singapore' },
  { city: 'London', region: 'England', country: 'United Kingdom' },
  { city: 'New York', region: 'New York', country: 'United States' },
];

/** Locations that raise a risk flag (unusual sign-in country). */
export const RISKY_ABROAD: { city: string; region: string; country: string }[] = [
  { city: 'Lagos', region: 'Lagos State', country: 'Nigeria' },
  { city: 'Moscow', region: 'Moscow', country: 'Russia' },
  { city: 'São Paulo', region: 'São Paulo', country: 'Brazil' },
  { city: 'Frankfurt', region: 'Hesse', country: 'Germany' },
];

/** Metro → state, for neighbourhood-style member cities such as "Park Street, Kolkata". */
const METRO_REGION: Record<string, string> = {
  Kolkata: 'West Bengal',
  Mumbai: 'Maharashtra',
  Pune: 'Maharashtra',
  Bengaluru: 'Karnataka',
  Mysuru: 'Karnataka',
  Chennai: 'Tamil Nadu',
  Madurai: 'Tamil Nadu',
  Kochi: 'Kerala',
  Delhi: 'Delhi',
  'New Delhi': 'Delhi',
  Hyderabad: 'Telangana',
  Lahore: 'Punjab',
  Karachi: 'Sindh',
  Islamabad: 'Islamabad Capital Territory',
  Dhaka: 'Dhaka Division',
  Paris: 'Île-de-France',
  Rome: 'Lazio',
  Milan: 'Lombardy',
  Tokyo: 'Tokyo',
  Dublin: 'Leinster',
  Berlin: 'Berlin',
  Munich: 'Bavaria',
  Lisbon: 'Lisbon',
  Zurich: 'Zurich',
  Geneva: 'Geneva',
};

/**
 * IP geolocation resolves to a city/metro, not a neighbourhood:
 * "Park Street, Kolkata" → Kolkata, West Bengal; "Darjeeling, West Bengal" → Darjeeling, West Bengal.
 */
export function geoOf(city: string, country: string): { city: string; region: string } {
  const parts = (city || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { city: country, region: '' };
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (METRO_REGION[last]) return { city: last, region: METRO_REGION[last] };
    return { city: parts[0], region: last };
  }
  return { city: parts[0], region: METRO_REGION[parts[0]] ?? '' };
}

export function countryNet(country: string): CountryNet {
  return COUNTRY_NET[country] ?? { iso: '', timezone: '—', isps: ['Local ISP'], prefixes: [[100, 64]] };
}

/** 🇮🇳-style flag emoji for a country name (empty when unknown). */
export function flagOf(country: string): string {
  const iso = COUNTRY_NET[country]?.iso;
  return iso ? String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}

export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length) % list.length];
}

export function ipFor(rand: () => number, country: string): string {
  const [a, b] = pick(rand, countryNet(country).prefixes);
  return `${a}.${b}.${1 + Math.floor(rand() * 254)}.${1 + Math.floor(rand() * 254)}`;
}

export function macFor(rand: () => number, model: DeviceModel): string {
  const hex = () => Math.floor(rand() * 256).toString(16).toUpperCase().padStart(2, '0');
  return `${pick(rand, model.oui)}:${hex()}:${hex()}:${hex()}`;
}

export function deviceNameFor(rand: () => number, model: DeviceModel, fullName: string): string {
  const first = (fullName || 'Member').split(/\s+/)[0];
  const code = Array.from({ length: 7 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(rand() * 32)]).join('');
  return model.naming.replace('{first}', first).replace('{code}', code);
}

/** 157.34.•••.••• */
export function maskIp(ip: string): string {
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.•••.•••` : '•••';
}

/** F0:18:98:••:••:•• (vendor prefix stays visible). */
export function maskMac(mac: string): string {
  return mac ? `${mac.slice(0, 8)}:••:••:••` : '—';
}

/** Stable numeric hash for string seeds. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h) % 2_147_483_000;
}
