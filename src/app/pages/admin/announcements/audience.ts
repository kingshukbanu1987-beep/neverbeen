import { MemberInsight } from '../shared/admin-insights.service';
import { ADMINS, ME, MY_ACCOUNT, MailAdmin } from '../mail/admin-mail.service';
import { AnnAudience, AudienceProfile, matchesAudience, regionOf } from '../../../services/announcements.service';

export function profileOf(m: MemberInsight): AudienceProfile {
  return { id: m.id, country: m.country, city: m.city, gender: m.gender, age: Number.isFinite(m.age) ? m.age : null, isVerified: m.isVerified };
}

/** Members an audience reaches (disabled accounts never receive announcements). */
export function audienceMembers(members: MemberInsight[], a: AnnAudience): MemberInsight[] {
  return members.filter((m) => m.accountState !== 'disabled' && matchesAudience(a, profileOf(m)));
}

export interface UserGroup {
  id: string;
  name: string;
  icon: string;
  hint: string;
  pick: (members: MemberInsight[]) => MemberInsight[];
}

const DAY = 86_400_000;

/** Ready-made groups of users that can be added to "Particular users" in one click. */
export const USER_GROUPS: UserGroup[] = [
  {
    id: 'top',
    name: 'Top contributors',
    icon: '🏆',
    hint: '25 members with the most posts & comments',
    pick: (ms) => [...ms].sort((a, b) => b.postCount + b.commentCount - (a.postCount + a.commentCount) || a.id - b.id).slice(0, 25),
  },
  {
    id: 'new',
    name: 'New members (30 days)',
    icon: '🌱',
    hint: 'Joined in the last 30 days',
    pick: (ms) => ms.filter((m) => Date.now() - Date.parse(m.registeredAtUtc) <= 30 * DAY),
  },
  { id: 'online', name: 'Online right now', icon: '🟢', hint: 'Members active at this moment', pick: (ms) => ms.filter((m) => m.isOnline) },
  { id: 'unverified', name: 'Unverified members', icon: '🪪', hint: 'Have not verified their identity yet', pick: (ms) => ms.filter((m) => !m.isVerified) },
  {
    id: 'inactive',
    name: 'Inactive 14+ days',
    icon: '💤',
    hint: 'Win-back: not seen for two weeks',
    pick: (ms) => ms.filter((m) => !m.isOnline && Date.now() - Date.parse(m.lastActiveUtc) >= 14 * DAY),
  },
  {
    id: 'restricted',
    name: 'Warned / restricted',
    icon: '⚠️',
    hint: 'Accounts under a moderation action',
    pick: (ms) => ms.filter((m) => m.accountState === 'warned' || m.accountState === 'restricted' || m.accountState === 'identity_required'),
  },
];

export const AGE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: '18–24', min: 18, max: 24 },
  { label: '25–29', min: 25, max: 29 },
  { label: '30–34', min: 30, max: 34 },
  { label: '35–44', min: 35, max: 44 },
  { label: '45+', min: 45, max: null },
];

export interface Breakdown {
  label: string;
  count: number;
  pct: number;
}

export function breakdown(list: MemberInsight[], key: (m: MemberInsight) => string, top = 5): Breakdown[] {
  const map = new Map<string, number>();
  for (const m of list) map.set(key(m), (map.get(key(m)) ?? 0) + 1);
  const total = list.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, top)
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));
}

export const regionKey = (m: MemberInsight) => regionOf(m.country);

export function adminPerson(id: string): MailAdmin {
  if (id === ME) return MY_ACCOUNT;
  return ADMINS.find((a) => a.id === id) ?? { id, name: id, email: '', title: 'Admin', team: '', color: '#64748b', location: '', online: false };
}

export function adminName(id: string): string {
  return id === ME ? 'You' : adminPerson(id).name;
}

/** Minimal, safe formatting for announcement bodies: **bold**, line breaks and links. */
export function renderAnnouncement(text: string): string {
  const esc = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br />');
}

export function plainAnnouncement(text: string): string {
  return (text || '').replace(/\*\*(.+?)\*\*/g, '$1');
}

/** "in 2d 4h" / "3h 10m ago" style relative time. */
export function relTime(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const txt = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
  return diff >= 0 ? `in ${txt}` : `${txt} ago`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** `<input type="datetime-local">` value for a timestamp (local time). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
