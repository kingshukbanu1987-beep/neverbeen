import { Injectable, computed, inject, signal } from '@angular/core';
import { CommunityService } from '../../../services/community.service';
import {
  AccountState,
  AdminModerationService,
  ReportDecision,
} from '../../../services/admin-moderation.service';
import type { AbuseReport, JourneyComment, JourneyPost } from '../../../models/community';

/* ------------------------------------------------------------------------ */
/*  Types                                                                   */
/* ------------------------------------------------------------------------ */

export interface MemberInsight {
  id: number;
  uniqueId: string;
  fullName: string;
  photo: string;
  email: string;
  profession: string;
  professionCategory: string;
  country: string;
  city: string;
  gender: string;
  age: number;
  ageGroup: string;
  isVerified: boolean;
  isOnline: boolean;
  activeStatus: string;
  registeredAtUtc: string;
  lastActiveUtc: string;
  postCount: number;
  commentCount: number;
  likesReceived: number;
  accountState: AccountState;
}

export type SuspiciousType =
  | 'offensive_language'
  | 'redundant_comments'
  | 'redundant_posts'
  | 'hate_speech'
  | 'political'
  | 'spam_links'
  | 'fake_profile'
  | 'mass_requests'
  | 'reported';

export interface SuspiciousSignal {
  type: SuspiciousType;
  evidence: string;
  severity: 1 | 2 | 3;
  detectedAtUtc: string;
}

export interface SuspiciousUser {
  member: MemberInsight;
  signals: SuspiciousSignal[];
  riskScore: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  lastFlaggedUtc: string;
}

export interface ReportParty {
  id: number;
  fullName: string;
  photo: string;
  location: string;
  email: string;
  isVerified: boolean;
  accountState: AccountState;
}

export interface AdminReportView {
  id: number;
  targetType: AbuseReport['targetType'];
  targetId: number;
  reason: string;
  details: string;
  createdAtUtc: string;
  reporter: ReportParty;
  reported: ReportParty;
  contentExcerpt: string;
  contentImage?: string;
  status: 'pending' | 'resolved';
  decision?: ReportDecision;
  /** Total reports (in this list) filed against the same member. */
  reportsAgainstMember: number;
}

export interface HighlightPost {
  post: JourneyPost;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  score: number;
}

export const SUSPICIOUS_META: Record<SuspiciousType, { label: string; icon: string }> = {
  offensive_language: { label: 'Offensive language', icon: '🤬' },
  redundant_comments: { label: 'Redundant comments', icon: '🔁' },
  redundant_posts: { label: 'Redundant journey posts', icon: '📑' },
  hate_speech: { label: 'Hateful content', icon: '⚠️' },
  political: { label: 'Anti-government political posts', icon: '📢' },
  spam_links: { label: 'Spam / promo links', icon: '🔗' },
  fake_profile: { label: 'Possible fake profile', icon: '🎭' },
  mass_requests: { label: 'Mass companion requests', icon: '📨' },
  reported: { label: 'Reported by members', icon: '🚩' },
};

export const AGE_GROUPS = ['18–24', '25–29', '30–34', '35–39', '40–49', '50+'];

export const PROFESSION_CATEGORIES = [
  'Arts, Media & Photography',
  'Heritage, History & Culture',
  'Nature, Wildlife & Conservation',
  'Travel & Tourism',
  'Food & Hospitality',
  'Technology & Engineering',
  'Education & Research',
  'Other',
];

/* ------------------------------------------------------------------------ */
/*  Helpers                                                                  */
/* ------------------------------------------------------------------------ */

/** Deterministic PRNG so demo analytics stay stable between reloads. */
export function seeded(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLATFORM_LAUNCH = Date.UTC(2024, 0, 8);
const ANALYTICS_END = Date.UTC(2026, 8, 24, 12);

export function ageGroupOf(age: number): string {
  if (age < 25) return AGE_GROUPS[0];
  if (age < 30) return AGE_GROUPS[1];
  if (age < 35) return AGE_GROUPS[2];
  if (age < 40) return AGE_GROUPS[3];
  if (age < 50) return AGE_GROUPS[4];
  return AGE_GROUPS[5];
}

export function professionCategoryOf(profession: string): string {
  const p = profession.toLowerCase();
  const has = (...words: string[]) => words.some((w) => p.includes(w));
  if (has('photograph', 'film', 'artist', 'designer', 'storyteller', 'journalist', 'columnist', 'blogger', 'writer', 'vocalist', 'music', 'creator', 'influencer', 'painter', 'art', 'textile', 'potter', 'craft', 'dancer'))
    return PROFESSION_CATEGORIES[0];
  if (has('heritage', 'histor', 'archaeolog', 'archiv', 'temple', 'culture', 'cultural', 'architect', 'chronicler', 'folk'))
    return PROFESSION_CATEGORIES[1];
  if (has('wildlife', 'marine', 'conservation', 'botan', 'eco', 'naturalist', 'environment', 'forest', 'mangrove', 'green'))
    return PROFESSION_CATEGORIES[2];
  if (has('guide', 'travel', 'tour', 'trek', 'nomad', 'expedition', 'safari'))
    return PROFESSION_CATEGORIES[3];
  if (has('chef', 'culinary', 'food', 'tea', 'spice', 'vineyard', 'viticultur', 'baker', 'hotel', 'hospitality'))
    return PROFESSION_CATEGORIES[4];
  if (has('software', 'engineer', 'developer', 'tech', 'data', 'ux', 'ui/', 'product'))
    return PROFESSION_CATEGORIES[5];
  if (has('professor', 'teacher', 'research', 'student', 'scientist', 'lecturer', 'academic'))
    return PROFESSION_CATEGORIES[6];
  return PROFESSION_CATEGORIES[7];
}

const OFFENSIVE_WORDS = ['idiot', 'stupid', 'moron', 'shut up', 'loser', 'pathetic', 'dumb', 'trash', 'bastard', 'hate you'];
const HATE_WORDS = ['those people', 'should be banned', 'go back to', 'vermin', 'inferior'];
const POLITICAL_WORDS = ['government is corrupt', 'down with', 'overthrow', 'regime', 'rise against', 'anti-national', 'boycott the government'];
const SPAM_WORDS = ['http://', 'https://', 'www.', 'bit.ly', 'click here', 'earn money', 'promo code', 'dm me for', 'follow me back'];

/* Demo moderation data (evidence samples) --------------------------------- */

const DEMO_SAMPLES: Record<Exclude<SuspiciousType, 'reported'>, string[]> = {
  offensive_language: [
    'Used abusive words in {n} comments — e.g. "What a stupid place, only idiots go there"',
    'Insulted other members {n} times — e.g. "Shut up, nobody cares about your trash photos"',
    'Repeated profanity in replies ({n} times) — e.g. "You are pathetic, stop posting"',
  ],
  redundant_comments: [
    'Posted the same comment "Nice pic 👍 follow me back" {n} times in 2 hours',
    'Copy-pasted "Visit my page for more!!!" on {n} different journey posts',
    'Left {n} identical "Awesome awesome awesome" comments within 30 minutes',
  ],
  redundant_posts: [
    'Published {n} near-identical journey posts within 3 hours',
    'Re-posted the same photo & caption {n} times this week',
    '{n} duplicate journey posts with only the location changed',
  ],
  hate_speech: [
    'Hateful remark aimed at a community — "Those people ruin every city they visit"',
    'Derogatory comment about a religion flagged by keyword filter ({n} hits)',
    'Targeted a nationality in {n} comments — "They should be banned from travelling here"',
  ],
  political: [
    '{n} posts attacking the government — "The government is corrupt, everyone must rise against it"',
    'Shared protest call — "Down with this regime, join the march tomorrow" ({n} posts)',
    'Political propaganda unrelated to travel in {n} journey posts',
  ],
  spam_links: [
    'Shared {n} shortened external links (bit.ly/…) in comments',
    'Promoted a paid "earn money from travel" scheme in {n} posts',
    'Posted {n} promo codes for an unrelated shopping site',
  ],
  fake_profile: [
    'Profile photo matches {n} other accounts; email not verified',
    'Signed up from {n} different devices in one day with the same photo',
    'Profile details copied from a public celebrity page',
  ],
  mass_requests: [
    'Sent {n} companion requests in under 1 hour',
    '{n} companion requests declined by recipients this week',
    'Messaged {n} members they are not connected with in 24 hours',
  ],
};

const DEMO_REPORT_TEMPLATES: { reason: string; type: AbuseReport['targetType']; excerpt: string; details: string }[] = [
  {
    reason: 'Harassment or bullying',
    type: 'comment',
    excerpt: 'Shut up, nobody cares about your trash photos. Delete your account.',
    details: 'This member keeps leaving insulting comments on every post I publish. It has happened five times this week and I feel targeted.',
  },
  {
    reason: 'Hate speech',
    type: 'post',
    excerpt: 'Those people ruin every city they visit — they should be banned from travelling here.',
    details: 'The post attacks a whole nationality. Several members in the comments are upset. Please review and remove it.',
  },
  {
    reason: 'Political content against the government',
    type: 'post',
    excerpt: 'The government is corrupt, everyone must rise against it. Join the march tomorrow!',
    details: 'This is a travel community, not a place for political propaganda. The member has posted this kind of content repeatedly.',
  },
  {
    reason: 'Spam or misleading',
    type: 'comment',
    excerpt: 'Earn ₹50,000 a week from travel!!! Click here 👉 bit.ly/travel-rich-fast',
    details: 'Same promotional comment posted on dozens of journey posts, including mine. Looks like a scam link.',
  },
  {
    reason: 'Offensive language',
    type: 'message',
    excerpt: 'You are pathetic. Stop messaging people here, idiot.',
    details: 'Received this in a direct message after I politely declined a companion request.',
  },
  {
    reason: 'Fake profile / impersonation',
    type: 'post',
    excerpt: 'Hi everyone, I am the official NeverBeen travel ambassador — DM me for free trips!',
    details: 'This account is pretending to be staff of the platform and is asking members for their phone numbers.',
  },
  {
    reason: 'Redundant / repeated posting',
    type: 'post',
    excerpt: 'Nice pic 👍 follow me back — Visit my page for more!!!',
    details: 'The member floods the Journey feed with the same post again and again. My feed is full of it.',
  },
  {
    reason: 'Inappropriate image',
    type: 'post',
    excerpt: '[Image hidden by auto-filter] "Night out in Goa 🔥"',
    details: 'The photo attached to this post is not appropriate for a family-friendly travel community.',
  },
  {
    reason: 'Harassment or bullying',
    type: 'message',
    excerpt: 'I know which hotel you are staying at. Reply to me or else.',
    details: 'This felt threatening. The member found my location from a journey post and started messaging me repeatedly.',
  },
  {
    reason: 'Scam or fraud',
    type: 'message',
    excerpt: 'Send ₹2,000 advance to book our shared villa, I will refund later.',
    details: 'Asked me and two other companions for advance payment for a trip that does not seem to exist.',
  },
  {
    reason: 'Offensive language',
    type: 'comment',
    excerpt: 'What a stupid place, only idiots go there.',
    details: 'Rude comment on my Darjeeling post. Not the first time from this member.',
  },
  {
    reason: 'Hate speech',
    type: 'comment',
    excerpt: 'People of that religion should not be allowed in our temples.',
    details: 'Religious hate comment on a heritage post. Please take action quickly.',
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function walkComments(list: JourneyComment[] | undefined, visit: (c: JourneyComment) => void): void {
  for (const c of list ?? []) {
    visit(c);
    walkComments(c.replies, visit);
  }
}

/* ------------------------------------------------------------------------ */
/*  Service                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Derived analytics for the Admin Console: member insights (with deterministic
 * demo registration dates / ages where the dataset has none), abuse reports,
 * suspicious-user detection and highlight posts.
 */
@Injectable({ providedIn: 'root' })
export class AdminInsightsService {
  private readonly community = inject(CommunityService);
  private readonly moderation = inject(AdminModerationService);

  /** Toast message shown by the admin shell. */
  readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  notify(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2800);
  }

  /** Per-author content stats from the journey feed + legacy comments. */
  private readonly contentStats = computed(() => {
    const posts = new Map<number, number>();
    const comments = new Map<number, number>();
    const likes = new Map<number, number>();
    const inc = (m: Map<number, number>, id: number, by = 1) => m.set(id, (m.get(id) ?? 0) + by);
    for (const p of this.community.journeyPosts()) {
      const aid = Number(p.author?.id);
      inc(posts, aid);
      inc(likes, aid, p.likeCount ?? 0);
      walkComments(p.comments, (c) => inc(comments, Number(c.author?.id)));
    }
    for (const c of this.community.comments()) inc(comments, Number(c.author?.id));
    return { posts, comments, likes };
  });

  readonly members = computed<MemberInsight[]>(() => {
    const stats = this.contentStats();
    // Touch accountActions so account state stays reactive.
    this.moderation.accountActions();
    const now = Date.now();
    const end = Math.min(now, ANALYTICS_END);

    return this.community.companions().map((c, index) => {
      const id = Number(c.id);
      const rand = seeded(id + 17);
      const dob = c.aboutMeDetails?.dateOfBirth ? new Date(c.aboutMeDetails.dateOfBirth) : null;
      const age =
        dob && !Number.isNaN(dob.getTime())
          ? Math.floor((now - dob.getTime()) / (365.25 * 86_400_000))
          : 19 + Math.floor(rand() * 40);
      // Growth curve: later dates are more likely (sqrt skew).
      const regT = id === 1 ? 0 : Math.pow(rand(), 0.62);
      const registered = new Date(PLATFORM_LAUNCH + regT * (end - PLATFORM_LAUNCH));
      const lastActive = c.isOnline ? new Date(now) : new Date(now - Math.floor(rand() * 21 * 86_400_000));
      const profession = c.profession || 'Others';
      const emailName = (c.fullName || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
      return {
        id,
        uniqueId: c.uniqueId ?? String(id),
        fullName: c.fullName || 'Unnamed member',
        photo: c.profilePhotoUrl || '',
        email: c.verifiedEmail || c.aboutMeDetails?.contactEmail || `${emailName}${index % 3 === 0 ? '' : id}@mail.com`,
        profession,
        professionCategory: professionCategoryOf(profession),
        country: (c.country || 'Unknown').trim(),
        city: (c.city || '').trim(),
        gender: c.aboutMeDetails?.gender || 'Not specified',
        age,
        ageGroup: ageGroupOf(age),
        isVerified: c.isVerified === true,
        isOnline: c.isOnline === true,
        activeStatus: c.activeStatus || (c.isOnline ? 'Active' : 'Inactive'),
        registeredAtUtc: registered.toISOString(),
        lastActiveUtc: lastActive.toISOString(),
        postCount: stats.posts.get(id) ?? 0,
        commentCount: stats.comments.get(id) ?? 0,
        likesReceived: stats.likes.get(id) ?? 0,
        accountState: this.moderation.stateOf(id),
      } satisfies MemberInsight;
    });
  });

  private readonly memberById = computed(() => new Map(this.members().map((m) => [m.id, m])));

  readonly onlineMembers = computed(() => this.members().filter((m) => m.isOnline && m.accountState !== 'disabled'));
  readonly verifiedMembers = computed(() => this.members().filter((m) => m.isVerified));

  member(id: number): MemberInsight | undefined {
    return this.memberById().get(Number(id));
  }

  /* --------------------------- Abuse reports --------------------------- */

  /** Demo reports, built once from real members so names/photos line up. */
  private readonly demoReports = computed<AbuseReport[]>(() => {
    const companions = this.community.companions();
    if (companions.length < 30) return [];
    const posts = this.community.journeyPosts();
    const pick = (seed: number) => companions[Math.floor(seeded(seed)() * companions.length)];
    const base = ANALYTICS_END;
    return DEMO_REPORT_TEMPLATES.map((tpl, i) => {
      // Several reports target the same few accounts to make repeat offenders visible.
      const reported = pick(i % 4 === 3 ? 41 : 900 + i * 7);
      let reporter = pick(1700 + i * 13);
      if (reporter.id === reported.id) reporter = companions[(companions.indexOf(reporter) + 5) % companions.length];
      const post = posts.find((p) => Number(p.author?.id) === Number(reported.id));
      return {
        id: 910_001 + i,
        targetType: tpl.type,
        targetId: tpl.type === 'post' && post ? post.id : 50_000 + i,
        reportedAuthor: {
          id: reported.id,
          fullName: reported.fullName,
          profilePhotoUrl: reported.profilePhotoUrl,
          profession: reported.profession,
          country: reported.country,
          city: reported.city,
        },
        reportedByUserId: reporter.id,
        reason: tpl.reason,
        details: `${tpl.details}\n\nReported content: “${tpl.excerpt}”`,
        reporterEmail: reporter.verifiedEmail,
        createdAtUtc: new Date(base - (i * 9 + 2) * 3_600_000).toISOString(),
        status: 'pending',
      } satisfies AbuseReport;
    });
  });

  readonly reports = computed<AdminReportView[]>(() => {
    const decisions = this.moderation.reportDecisions();
    const posts = this.community.journeyPosts();
    const all = [...this.community.abuseReports(), ...this.demoReports()];
    const againstCount = new Map<number, number>();
    for (const r of all) {
      const id = Number(r.reportedAuthor?.id);
      againstCount.set(id, (againstCount.get(id) ?? 0) + 1);
    }

    return all
      .map((r) => {
        const decision = decisions[r.id];
        const [detailText, quoted] = (r.details ?? '').split('\n\nReported content: ');
        const post = r.targetType === 'post' ? posts.find((p) => p.id === r.targetId) : undefined;
        const excerpt = quoted ? quoted.replace(/^“|”$/g, '') : post?.text ?? '(original content no longer available)';
        return {
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          details: detailText || '—',
          createdAtUtc: r.createdAtUtc,
          reporter: this.party(r.reportedByUserId, { email: r.reporterEmail }),
          reported: this.party(Number(r.reportedAuthor?.id), {
            fullName: r.reportedAuthor?.fullName,
            photo: r.reportedAuthor?.profilePhotoUrl,
            location: [r.reportedAuthor?.city, r.reportedAuthor?.country].filter(Boolean).join(', '),
          }),
          contentExcerpt: excerpt,
          contentImage: post?.imageUrl,
          status: decision || r.status === 'reviewed' ? 'resolved' : 'pending',
          decision,
          reportsAgainstMember: againstCount.get(Number(r.reportedAuthor?.id)) ?? 1,
        } satisfies AdminReportView;
      })
      .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
  });

  readonly pendingReports = computed(() => this.reports().filter((r) => r.status === 'pending'));

  private party(id: number, fallback: { fullName?: string; photo?: string; location?: string; email?: string }): ReportParty {
    const m = this.member(id);
    return {
      id,
      fullName: m?.fullName ?? fallback.fullName ?? `Member #${id}`,
      photo: m?.photo ?? fallback.photo ?? '',
      location: m ? [m.city, m.country].filter(Boolean).join(', ') : fallback.location ?? '—',
      email: fallback.email ?? m?.email ?? '—',
      isVerified: m?.isVerified ?? false,
      accountState: this.moderation.stateOf(id),
    };
  }

  /* --------------------------- Suspicious users --------------------------- */

  readonly suspiciousUsers = computed<SuspiciousUser[]>(() => {
    const members = this.members();
    const byId = this.memberById();
    const signals = new Map<number, SuspiciousSignal[]>();
    const add = (id: number, s: SuspiciousSignal) => {
      if (!byId.has(id)) return;
      const list = signals.get(id) ?? [];
      if (!list.some((x) => x.type === s.type)) list.push(s);
      signals.set(id, list);
    };

    // 1) Live content scan of journey posts & comments.
    type Hit = { count: number; sample: string; at: string };
    const scan = new Map<string, Hit>();
    const dupComments = new Map<string, Hit>();
    const dupPosts = new Map<string, Hit>();
    const bump = (map: Map<string, Hit>, key: string, sample: string, at: string) => {
      const hit = map.get(key) ?? { count: 0, sample, at };
      hit.count++;
      if (at > hit.at) hit.at = at;
      map.set(key, hit);
    };
    const inspect = (authorId: number, text: string, at: string) => {
      const t = normalize(text ?? '');
      if (!t) return;
      if (OFFENSIVE_WORDS.some((w) => t.includes(w))) bump(scan, `${authorId}|offensive_language`, text, at);
      if (HATE_WORDS.some((w) => t.includes(w))) bump(scan, `${authorId}|hate_speech`, text, at);
      if (POLITICAL_WORDS.some((w) => t.includes(w))) bump(scan, `${authorId}|political`, text, at);
      if (SPAM_WORDS.some((w) => t.includes(w))) bump(scan, `${authorId}|spam_links`, text, at);
    };
    for (const p of this.community.journeyPosts()) {
      const aid = Number(p.author?.id);
      inspect(aid, p.text, p.createdAtUtc);
      if (p.text && !p.isShared) bump(dupPosts, `${aid}|${normalize(p.text)}`, p.text, p.createdAtUtc);
      walkComments(p.comments, (c) => {
        const cid = Number(c.author?.id);
        inspect(cid, c.text, c.createdAtUtc);
        bump(dupComments, `${cid}|${normalize(c.text ?? '')}`, c.text, c.createdAtUtc);
      });
    }
    for (const c of this.community.comments()) inspect(Number(c.author?.id), c.text, c.createdAtUtc);

    const clip = (s: string) => (s.length > 70 ? s.slice(0, 67) + '…' : s);
    for (const [key, hit] of scan) {
      const [id, type] = key.split('|') as [string, SuspiciousType];
      const sev: 1 | 2 | 3 = type === 'spam_links' ? 1 : type === 'offensive_language' ? 2 : 3;
      add(Number(id), { type, severity: sev, detectedAtUtc: hit.at, evidence: `Flagged in ${hit.count} item(s) — "${clip(hit.sample)}"` });
    }
    for (const [key, hit] of dupComments) {
      if (hit.count >= 3 && key.split('|')[1]) {
        add(Number(key.split('|')[0]), { type: 'redundant_comments', severity: 1, detectedAtUtc: hit.at, evidence: `Posted "${clip(hit.sample)}" ${hit.count} times` });
      }
    }
    for (const [key, hit] of dupPosts) {
      if (hit.count >= 2) {
        add(Number(key.split('|')[0]), { type: 'redundant_posts', severity: 1, detectedAtUtc: hit.at, evidence: `${hit.count} identical journey posts — "${clip(hit.sample)}"` });
      }
    }

    // 2) Members reported more than once / with pending reports.
    const reportCount = new Map<number, { n: number; reasons: Set<string>; at: string }>();
    for (const r of this.reports()) {
      const e = reportCount.get(r.reported.id) ?? { n: 0, reasons: new Set<string>(), at: r.createdAtUtc };
      e.n++;
      e.reasons.add(r.reason);
      if (r.createdAtUtc > e.at) e.at = r.createdAtUtc;
      reportCount.set(r.reported.id, e);
    }
    for (const [id, e] of reportCount) {
      add(id, {
        type: 'reported',
        severity: e.n >= 3 ? 3 : e.n === 2 ? 2 : 1,
        detectedAtUtc: e.at,
        evidence: `Reported ${e.n} time(s): ${[...e.reasons].join(', ')}`,
      });
    }

    // 3) Demo behavioural signals from the moderation pipeline (deterministic).
    const types = Object.keys(DEMO_SAMPLES) as Exclude<SuspiciousType, 'reported'>[];
    members.forEach((m, index) => {
      const rand = seeded(m.id * 31 + 7);
      if (index === 0 || rand() > 0.035) return;
      const howMany = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < howMany; k++) {
        const type = types[Math.floor(rand() * types.length)];
        const samples = DEMO_SAMPLES[type];
        const n = 3 + Math.floor(rand() * 14);
        const sev: 1 | 2 | 3 =
          type === 'hate_speech' || type === 'political' ? 3 : type === 'offensive_language' || type === 'fake_profile' ? 2 : 1;
        add(m.id, {
          type,
          severity: sev,
          detectedAtUtc: new Date(ANALYTICS_END - Math.floor(rand() * 10 * 86_400_000)).toISOString(),
          evidence: samples[Math.floor(rand() * samples.length)].replace('{n}', String(n)),
        });
      }
    });

    const result: SuspiciousUser[] = [];
    for (const [id, list] of signals) {
      const member = byId.get(id);
      if (!member) continue;
      const score = Math.min(100, list.reduce((sum, s) => sum + s.severity * 18, 0) + (member.isVerified ? 0 : 10));
      result.push({
        member,
        signals: list.sort((a, b) => b.severity - a.severity),
        riskScore: score,
        riskLevel: score >= 60 ? 'High' : score >= 35 ? 'Medium' : 'Low',
        lastFlaggedUtc: list.reduce((max, s) => (s.detectedAtUtc > max ? s.detectedAtUtc : max), ''),
      });
    }
    return result.sort((a, b) => b.riskScore - a.riskScore || b.lastFlaggedUtc.localeCompare(a.lastFlaggedUtc));
  });

  /* --------------------------- Highlight posts --------------------------- */

  readonly highlightPosts = computed<HighlightPost[]>(() =>
    this.community
      .visibleJourneyPosts()
      .map((post) => {
        let comments = 0;
        walkComments(post.comments, () => comments++);
        const likes = post.likeCount ?? 0;
        const shares = post.sharesCount ?? post.shareCount ?? 0;
        const reactions = post.reactions?.length ?? 0;
        return { post, likes, comments, shares, reactions, score: likes + comments * 3 + shares * 4 + reactions };
      })
      .sort((a, b) => b.score - a.score || b.post.createdAtUtc.localeCompare(a.post.createdAtUtc)),
  );

  /* --------------------------- Actions --------------------------- */

  disable(id: number, reason?: string): void {
    this.moderation.disableAccount(id, reason);
    this.notify(`${this.member(id)?.fullName ?? 'Member'}'s account has been disabled.`);
  }

  enable(id: number): void {
    this.moderation.enableAccount(id);
    this.notify(`${this.member(id)?.fullName ?? 'Member'}'s account is active again.`);
  }

  forceIdentity(id: number): void {
    this.moderation.forceIdentityConfirmation(id);
    this.notify(`${this.member(id)?.fullName ?? 'Member'} must confirm their identity before continuing.`);
  }
}

/* ------------------------------------------------------------------------ */
/*  Shared formatting helpers                                                */
/* ------------------------------------------------------------------------ */

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

