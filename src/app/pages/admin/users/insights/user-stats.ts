import { Injectable, computed, inject } from '@angular/core';
import { AdminInsightsService, AGE_GROUPS, MemberInsight, seeded } from '../../shared/admin-insights.service';
import { AdminModerationService } from '../../../../services/admin-moderation.service';
import { REGIONS, regionOf } from '../../../../services/announcements.service';
import { ADMINS } from '../../mail/admin-mail.service';

/* ------------------------------------------------------------------------ */
/*  Types                                                                    */
/* ------------------------------------------------------------------------ */

export type Dim = 'none' | 'region' | 'country' | 'city' | 'gender' | 'age';
export type Gran = 'hour' | 'day' | 'week' | 'month' | 'year';
export type RangeKey = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all';

export interface StatFilter {
  regions: string[];
  countries: string[];
  cities: string[];
  genders: string[];
  ages: string[];
}

export interface Bucket {
  /** Inclusive start (ms, local time). */
  start: number;
  /** Exclusive end (ms). */
  end: number;
  /** Full label for tooltips, e.g. "Mon, 14 Sep 2026" or "Week of 7 Sep". */
  label: string;
  /** Short axis label. */
  short: string;
}

export interface Series {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export interface DisableEvent {
  member: MemberInsight;
  disabledAt: number;
  reinstatedAt: number | null;
  reason: string;
  by: string;
  permanent: boolean;
  /** True when it reflects the member's current account state (not history). */
  current: boolean;
}

export interface ActivityRow {
  member: MemberInsight;
  /** Local day number of registration. */
  start: number;
  /** One byte per day since registration: 1 = active that day. */
  days: Uint8Array;
  /** Local day number of the last active day (or -1). */
  lastDay: number;
}

/* ------------------------------------------------------------------------ */
/*  Constants & helpers                                                      */
/* ------------------------------------------------------------------------ */

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const LAUNCH = Date.UTC(2024, 0, 8);

export const DIMS: { key: Dim; label: string; icon: string }[] = [
  { key: 'none', label: 'Total', icon: '∑' },
  { key: 'region', label: 'Geography', icon: '🌍' },
  { key: 'country', label: 'Country', icon: '🏳️' },
  { key: 'city', label: 'City', icon: '🏙️' },
  { key: 'gender', label: 'Gender', icon: '⚧' },
  { key: 'age', label: 'Age group', icon: '🎂' },
];

export const GRANS: { key: Gran; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export const RANGES: { key: RangeKey; label: string; gran: Gran }[] = [
  { key: '7d', label: '7 days', gran: 'day' },
  { key: '30d', label: '30 days', gran: 'day' },
  { key: '90d', label: '90 days', gran: 'week' },
  { key: '12m', label: '12 months', gran: 'month' },
  { key: 'ytd', label: 'This year', gran: 'month' },
  { key: 'all', label: 'All time', gran: 'month' },
];

export const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316'];
export const OTHER_COLOR = '#94a3b8';
export const GENDER_COLORS: Record<string, string> = { Male: '#3b82f6', Female: '#ec4899' };
export const AGE_COLORS = ['#22d3ee', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const DISABLE_REASONS = [
  'Spam or promotional content',
  'Fake profile / impersonation',
  'Harassment of other members',
  'Hate speech',
  'Failed identity verification',
  'Scam or fraud attempt',
  'Account compromised',
  'Requested by the member',
];

export function emptyFilter(): StatFilter {
  return { regions: [], countries: [], cities: [], genders: [], ages: [] };
}

export function filterCount(f: StatFilter): number {
  return f.regions.length + f.countries.length + f.cities.length + f.genders.length + f.ages.length;
}

/** Local-time day number (days since the epoch in the viewer's timezone). */
export function dayNo(ms: number): number {
  return Math.floor((ms - new Date(ms).getTimezoneOffset() * 60_000) / DAY);
}

/** Local midnight (ms) of a local day number. */
export function dayStart(n: number): number {
  const approx = n * DAY;
  return approx + new Date(approx).getTimezoneOffset() * 60_000;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  const back = (d.getDay() + 6) % 7; // Monday
  d.setDate(d.getDate() - back);
  return d.getTime();
}

export function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function startOfYear(ms: number): number {
  return new Date(new Date(ms).getFullYear(), 0, 1).getTime();
}

function stepStart(ms: number, g: Gran): number {
  switch (g) {
    case 'hour':
      return Math.floor(ms / HOUR) * HOUR;
    case 'day':
      return startOfDay(ms);
    case 'week':
      return startOfWeek(ms);
    case 'month':
      return startOfMonth(ms);
    case 'year':
      return startOfYear(ms);
  }
}

function next(ms: number, g: Gran): number {
  const d = new Date(ms);
  switch (g) {
    case 'hour':
      return ms + HOUR;
    case 'day':
      d.setDate(d.getDate() + 1);
      return d.getTime();
    case 'week':
      d.setDate(d.getDate() + 7);
      return d.getTime();
    case 'month':
      return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    case 'year':
      return new Date(d.getFullYear() + 1, 0, 1).getTime();
  }
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDate(ms: number, withYear = true): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MON[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
}

function labelOf(ms: number, g: Gran): { label: string; short: string } {
  const d = new Date(ms);
  switch (g) {
    case 'hour': {
      const h = d.getHours();
      const hh = `${String(h).padStart(2, '0')}:00`;
      return { label: `${fmtDate(ms)} · ${hh}–${String((h + 1) % 24).padStart(2, '0')}:00`, short: hh };
    }
    case 'day':
      return { label: `${WD[d.getDay()]}, ${fmtDate(ms)}`, short: `${d.getDate()} ${MON[d.getMonth()]}` };
    case 'week':
      return { label: `Week of ${fmtDate(ms)}`, short: `${d.getDate()} ${MON[d.getMonth()]}` };
    case 'month':
      return { label: `${MON[d.getMonth()]} ${d.getFullYear()}`, short: `${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` };
    case 'year':
      return { label: String(d.getFullYear()), short: String(d.getFullYear()) };
  }
}

/** Time buckets covering [from, to]. The last bucket may be partial. */
export function buckets(from: number, to: number, g: Gran): Bucket[] {
  const out: Bucket[] = [];
  let s = stepStart(from, g);
  let guard = 0;
  while (s <= to && guard++ < 5000) {
    const e = next(s, g);
    out.push({ start: s, end: e, ...labelOf(s, g) });
    s = e;
  }
  return out;
}

/** Start of a preset range, ending now. */
export function rangeStart(key: RangeKey, now: number): number {
  switch (key) {
    case '7d':
      return startOfDay(now) - 6 * DAY;
    case '30d':
      return startOfDay(now) - 29 * DAY;
    case '90d':
      return startOfDay(now) - 89 * DAY;
    case '12m': {
      const d = new Date(startOfMonth(now));
      d.setMonth(d.getMonth() - 11);
      return d.getTime();
    }
    case 'ytd':
      return startOfYear(now);
    case 'all':
      return startOfDay(LAUNCH);
  }
}

/** Sensible granularities for a range (the first is the default). */
export function gransFor(key: RangeKey): Gran[] {
  switch (key) {
    case '7d':
    case '30d':
      return ['day', 'week'];
    case '90d':
      return ['day', 'week', 'month'];
    case '12m':
    case 'ytd':
      return ['day', 'week', 'month'];
    case 'all':
      return ['day', 'week', 'month', 'year'];
  }
}

export function segOf(m: MemberInsight, dim: Dim): string {
  switch (dim) {
    case 'none':
      return 'All users';
    case 'region':
      return regionOf(m.country);
    case 'country':
      return m.country || 'Unknown';
    case 'city':
      return m.city || 'Unknown';
    case 'gender':
      return m.gender === 'Male' || m.gender === 'Female' ? m.gender : 'Not specified';
    case 'age':
      return m.ageGroup;
  }
}

export function matchesFilter(m: MemberInsight, f: StatFilter): boolean {
  if (f.regions.length && !f.regions.includes(regionOf(m.country))) return false;
  if (f.countries.length && !f.countries.includes(m.country)) return false;
  if (f.cities.length && !f.cities.includes(m.city)) return false;
  if (f.genders.length && !f.genders.includes(segOf(m, 'gender'))) return false;
  if (f.ages.length && !f.ages.includes(m.ageGroup)) return false;
  return true;
}

/**
 * Ordered segment keys for a breakdown. Country / city keep the top `top`
 * segments by weight and fold the rest into "Other".
 */
export function segmentKeys(members: MemberInsight[], dim: Dim, top = 6): { keys: string[]; fold: (k: string) => string } {
  if (dim === 'none') return { keys: ['All users'], fold: () => 'All users' };
  if (dim === 'age') return { keys: AGE_GROUPS.slice(), fold: (k) => k };
  if (dim === 'gender') {
    const keys = ['Male', 'Female'];
    if (members.some((m) => segOf(m, 'gender') === 'Not specified')) keys.push('Not specified');
    return { keys, fold: (k) => k };
  }
  const counts = new Map<string, number>();
  for (const m of members) {
    const k = segOf(m, dim);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const order = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  if (dim === 'region') {
    const names = REGIONS.map((r) => r.name);
    const keys = order.filter((k) => names.includes(k) || k === 'Other');
    return { keys, fold: (k) => k };
  }
  if (order.length <= top + 1) return { keys: order, fold: (k) => k };
  const keep = new Set(order.slice(0, top));
  return { keys: [...order.slice(0, top), 'Other'], fold: (k) => (keep.has(k) ? k : 'Other') };
}

export function colorFor(dim: Dim, key: string, index: number): string {
  if (key === 'Other' || key === 'Not specified' || key === 'Unknown') return OTHER_COLOR;
  if (dim === 'gender') return GENDER_COLORS[key] ?? PALETTE[index % PALETTE.length];
  if (dim === 'age') return AGE_COLORS[AGE_GROUPS.indexOf(key)] ?? PALETTE[index % PALETTE.length];
  if (dim === 'none') return PALETTE[0];
  return PALETTE[index % PALETTE.length];
}

/** Count events per bucket, split by segment. `at` returns the event time (ms) or null. */
export function countSeries<T>(
  items: T[],
  bks: Bucket[],
  member: (t: T) => MemberInsight,
  at: (t: T) => number | null,
  dim: Dim,
  allMembers: MemberInsight[],
): Series[] {
  const { keys, fold } = segmentKeys(allMembers, dim);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const rows = keys.map(() => new Array<number>(bks.length).fill(0));
  if (!bks.length) return [];
  const from = bks[0].start;
  const to = bks[bks.length - 1].end;
  for (const it of items) {
    const t = at(it);
    if (t === null || t < from || t >= to) continue;
    const b = bucketIndex(bks, t);
    if (b < 0) continue;
    const s = idx.get(fold(segOf(member(it), dim)));
    if (s !== undefined) rows[s][b]++;
  }
  return keys.map((k, i) => ({ name: k, color: colorFor(dim, k, i), values: rows[i] })).filter((s) => dim === 'none' || s.values.some((v) => v > 0));
}

export function bucketIndex(bks: Bucket[], t: number): number {
  let lo = 0;
  let hi = bks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < bks[mid].start) hi = mid - 1;
    else if (t >= bks[mid].end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

export function sum(values: number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

/** Totals per bucket across all series. */
export function totals(series: Series[], n: number): number[] {
  const out = new Array<number>(n).fill(0);
  for (const s of series) s.values.forEach((v, i) => (out[i] += v));
  return out;
}

/** Percentage change, or null when there's no baseline. */
export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** Group members into slices for a dimension (top segments + Other). */
export function slicesOf(members: MemberInsight[], dim: Dim, universe: MemberInsight[] = members, top = 6): Slice[] {
  const { keys, fold } = segmentKeys(universe, dim, top);
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const m of members) {
    const k = fold(segOf(m, dim));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((k, i) => ({ label: k, value: counts.get(k) ?? 0, color: colorFor(dim, k, i) })).filter((s) => s.value > 0 || dim === 'age');
}

/** Rows of a "gender × age" population pyramid. */
export function pyramidOf(members: MemberInsight[]): { label: string; left: number; right: number }[] {
  return AGE_GROUPS.map((g) => ({
    label: g,
    left: members.filter((m) => m.ageGroup === g && m.gender === 'Male').length,
    right: members.filter((m) => m.ageGroup === g && m.gender === 'Female').length,
  }));
}

function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------------ */
/*  Service                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Statistics behind User Management → Insights. Registration dates, profile
 * data and account state come from the member records; the per-day activity
 * history and past disable / reinstate events are modelled deterministically
 * (seeded per member) so charts stay stable between reloads and agree with each
 * member's "last active" time, online status and current account state.
 */
@Injectable({ providedIn: 'root' })
export class UserStatsService {
  private readonly insights = inject(AdminInsightsService);
  private readonly moderation = inject(AdminModerationService);

  readonly members = this.insights.members;

  /** Filter options present in the data. */
  readonly options = computed(() => {
    const ms = this.members();
    const count = (f: (m: MemberInsight) => string) => {
      const c = new Map<string, number>();
      for (const m of ms) {
        const k = f(m);
        if (k) c.set(k, (c.get(k) ?? 0) + 1);
      }
      return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, n }));
    };
    return {
      regions: count((m) => regionOf(m.country)),
      countries: count((m) => m.country),
      cities: count((m) => m.city),
      genders: count((m) => segOf(m, 'gender')),
      ages: AGE_GROUPS.map((g) => ({ value: g, n: ms.filter((m) => m.ageGroup === g).length })),
      cityCountry: new Map(ms.map((m) => [m.city, m.country])),
    };
  });

  /** Disable → reinstate history (modelled) plus accounts disabled right now. */
  readonly disableEvents = computed<DisableEvent[]>(() => {
    const actions = this.moderation.accountActions();
    const now = Date.now();
    const out: DisableEvent[] = [];
    for (const m of this.members()) {
      const reg = Date.parse(m.registeredAtUtc);
      const act = actions[m.id];
      if (m.accountState === 'disabled') {
        const at = act?.updatedAtUtc ? Date.parse(act.updatedAtUtc) : now;
        out.push({ member: m, disabledAt: at, reinstatedAt: null, reason: act?.reason || 'Disabled by administrator', by: 'Admin', permanent: !!act?.permanent, current: true });
        continue;
      }
      const r = seeded(hash(m.id, 'disable'));
      if (r() > 0.075) continue;
      const lastActive = Date.parse(m.lastActiveUtc);
      const span = lastActive - reg - 3 * DAY;
      if (span < 5 * DAY) continue;
      const disabledAt = reg + DAY + Math.floor(r() * span * 0.9);
      const length = Math.round((1 + Math.pow(r(), 1.6) * 44) * DAY);
      const reinstatedAt = Math.min(disabledAt + length, lastActive - DAY);
      if (reinstatedAt <= disabledAt) continue;
      const reason = DISABLE_REASONS[Math.floor(Math.pow(r(), 1.3) * DISABLE_REASONS.length)];
      const by = ADMINS[Math.floor(r() * ADMINS.length)]?.name ?? 'Admin';
      out.push({ member: m, disabledAt, reinstatedAt, reason, by, permanent: false, current: false });
    }
    return out.sort((a, b) => b.disabledAt - a.disabledAt);
  });

  /** Per-member daily activity since registration (1 byte per day). */
  readonly activity = computed<ActivityRow[]>(() => {
    const now = Date.now();
    const today = dayNo(now);
    const gaps = new Map<number, [number, number][]>();
    for (const e of this.disableEvents()) {
      const list = gaps.get(e.member.id) ?? [];
      list.push([dayNo(e.disabledAt), e.reinstatedAt === null ? Infinity : dayNo(e.reinstatedAt) - 1]);
      gaps.set(e.member.id, list);
    }
    return this.members().map((m) => {
      const start = dayNo(Date.parse(m.registeredAtUtc));
      const last = m.isOnline ? today : Math.max(start, Math.min(today, dayNo(Date.parse(m.lastActiveUtc))));
      const len = Math.max(1, today - start + 1);
      const days = new Uint8Array(len);
      const r = seeded(hash(m.id, 'activity'));
      const engagement = Math.min(1, (m.postCount * 2 + m.commentCount) / 30);
      let p = 0.1 + r() * 0.3 + engagement * 0.3 + (m.isOnline ? 0.12 : 0);
      p = Math.min(0.88, Math.max(0.04, p));
      // Some members take a long break at some point.
      let breakFrom = -1;
      let breakTo = -1;
      if (r() < 0.3 && len > 60) {
        breakFrom = start + Math.floor(r() * (len - 40));
        breakTo = breakFrom + 14 + Math.floor(r() * 90);
      }
      const blocked = gaps.get(m.id) ?? [];
      let lastDay = -1;
      for (let d = start; d <= last; d++) {
        const i = d - start;
        if (blocked.some(([a, b]) => d >= a && d <= b)) {
          r();
          continue;
        }
        const wd = new Date(dayStart(d)).getDay();
        const wf = wd === 0 || wd === 6 ? 1.18 : wd === 5 ? 1.06 : 0.94;
        const bf = d >= breakFrom && d <= breakTo ? 0.06 : 1;
        // First weeks after joining are busier; members online now were likely around lately too.
        const nf = i < 14 ? 1.35 : 1;
        const rf = m.isOnline && today - d <= 6 ? 1.5 : 1;
        if (d === start || d === last || r() < p * wf * bf * nf * rf) {
          days[i] = 1;
          lastDay = d;
        }
      }
      return { member: m, start, days, lastDay };
    });
  });

  /** Activity rows of members matching a filter. */
  rows(f: StatFilter): ActivityRow[] {
    const fc = filterCount(f);
    return fc ? this.activity().filter((r) => matchesFilter(r.member, f)) : this.activity();
  }

  /** Unique active members per bucket for the given rows, split by segment. */
  activeSeries(rows: ActivityRow[], bks: Bucket[], dim: Dim, mode: 'unique' | 'avg' = 'unique'): Series[] {
    const { keys, fold } = segmentKeys(rows.map((r) => r.member), dim);
    const idx = new Map(keys.map((k, i) => [k, i]));
    const out = keys.map(() => new Array<number>(bks.length).fill(0));
    const ranges = bks.map((b) => [dayNo(b.start), dayNo(b.end - 1)] as const);
    for (const row of rows) {
      const s = idx.get(fold(segOf(row.member, dim)));
      if (s === undefined) continue;
      const first = row.start;
      const lastIdx = row.start + row.days.length - 1;
      for (let b = 0; b < ranges.length; b++) {
        const a = Math.max(ranges[b][0], first);
        const e = Math.min(ranges[b][1], lastIdx);
        if (a > e) continue;
        if (mode === 'unique') {
          for (let d = a; d <= e; d++) {
            if (row.days[d - first]) {
              out[s][b]++;
              break;
            }
          }
        } else {
          let c = 0;
          for (let d = a; d <= e; d++) c += row.days[d - first];
          out[s][b] += c;
        }
      }
    }
    if (mode === 'avg') {
      ranges.forEach(([a, e], b) => {
        const n = e - a + 1;
        for (const row of out) row[b] = Math.round((row[b] / n) * 10) / 10;
      });
    }
    return keys.map((k, i) => ({ name: k, color: colorFor(dim, k, i), values: out[i] })).filter((s) => dim === 'none' || s.values.some((v) => v > 0));
  }

  /** Number of distinct members active between two local day numbers (inclusive). */
  uniqueActive(rows: ActivityRow[], fromDay: number, toDay: number): number {
    let n = 0;
    for (const row of rows) if (this.activeDays(row, fromDay, toDay) > 0) n++;
    return n;
  }

  activeDays(row: ActivityRow, fromDay: number, toDay: number): number {
    const a = Math.max(fromDay, row.start);
    const e = Math.min(toDay, row.start + row.days.length - 1);
    let c = 0;
    for (let d = a; d <= e; d++) c += row.days[d - row.start];
    return c;
  }

  /** Longest run of consecutive active days ending at or before `toDay`. */
  streak(row: ActivityRow, toDay: number): number {
    let best = 0;
    let cur = 0;
    const e = Math.min(toDay, row.start + row.days.length - 1);
    for (let d = row.start; d <= e; d++) {
      cur = row.days[d - row.start] ? cur + 1 : 0;
      if (cur > best) best = cur;
    }
    return best;
  }

  /** Active flags for the last `n` days up to `toDay` (for sparklines). */
  recent(row: ActivityRow, toDay: number, n: number, per = 1): number[] {
    const out: number[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const e = toDay - i * per;
      out.push(this.activeDays(row, e - per + 1, e));
    }
    return out;
  }
}
