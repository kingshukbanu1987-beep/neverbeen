import type { MemberInsight } from '../../shared/admin-insights.service';
import type { BarItem } from './charts';
import { Bucket, Dim, Gran, RangeKey, StatFilter, bucketIndex, colorFor, pctChange, segOf, segmentKeys } from './user-stats';
import { REGIONS } from '../../../../services/announcements.service';

/** Everything a section needs to know about the current selection. */
export interface InsightCtx {
  filter: StatFilter;
  range: RangeKey;
  gran: Gran;
  dim: Dim;
  /** Start of the selected range (ms). */
  from: number;
  /** Now (ms). */
  to: number;
  bks: Bucket[];
  /** Previous period of equal length (null for "All time"). */
  prev: { from: number; to: number } | null;
  rangeLabel: string;
}

/** Sum adjacent values so a long series fits in `n` points. */
export function compress(values: number[], n = 24): number[] {
  if (values.length <= n) return values.slice();
  const out: number[] = [];
  const size = values.length / n;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = Math.floor(i * size); j < Math.floor((i + 1) * size); j++) s += values[j];
    out.push(s);
  }
  return out;
}

const regionIcon = (name: string) => REGIONS.find((r) => r.name === name)?.icon ?? '🌐';

/**
 * Ranked bars for a dimension: events in the current period, change vs the
 * previous period and a per-bucket sparkline.
 */
export function segmentBars<T>(
  items: T[],
  member: (t: T) => MemberInsight,
  at: (t: T) => number | null,
  dim: Dim,
  ctx: InsightCtx,
  top = 8,
): BarItem[] {
  const cur = new Map<string, number>();
  const prev = new Map<string, number>();
  const spark = new Map<string, number[]>();
  for (const it of items) {
    const t = at(it);
    if (t === null) continue;
    const k = segOf(member(it), dim);
    if (t >= ctx.from && t <= ctx.to) {
      cur.set(k, (cur.get(k) ?? 0) + 1);
      const b = bucketIndex(ctx.bks, t);
      if (b >= 0) {
        const arr = spark.get(k) ?? new Array<number>(ctx.bks.length).fill(0);
        arr[b]++;
        spark.set(k, arr);
      }
    } else if (ctx.prev && t >= ctx.prev.from && t < ctx.prev.to) {
      prev.set(k, (prev.get(k) ?? 0) + 1);
    }
  }
  const keys = segmentKeys(items.map(member), dim, 99).keys;
  return [...cur.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([label, value]) => ({
      label,
      value,
      color: colorFor(dim, label, Math.max(0, keys.indexOf(label))),
      delta: ctx.prev ? pctChange(value, prev.get(label) ?? 0) : undefined,
      spark: compress(spark.get(label) ?? [], 20),
      icon: dim === 'region' ? regionIcon(label) : undefined,
    }));
}

/** Rate bars, e.g. "activity rate by age group" (value = numerator / denominator). */
export function rateBars(groups: Map<string, { num: number; den: number }>, dim: Dim, sub = 'members'): BarItem[] {
  const keys = [...groups.keys()];
  return [...groups.entries()]
    .filter(([, g]) => g.den > 0)
    .map(([label, g]) => {
      const pct = Math.round((g.num / g.den) * 1000) / 10;
      return {
        label,
        value: pct,
        display: `${pct}%`,
        sub: `${g.num.toLocaleString()} / ${g.den.toLocaleString()} ${sub}`,
        color: colorFor(dim, label, keys.indexOf(label)),
        icon: dim === 'region' ? regionIcon(label) : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export function location(m: MemberInsight): string {
  return [m.city, m.country].filter(Boolean).join(', ') || '—';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
