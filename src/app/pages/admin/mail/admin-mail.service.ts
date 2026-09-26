import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { ATTACH_RULES, dataUrlBytes, makePdf, sampleImage, snippet, textDataUrl } from './mail-utils';

export const ADMIN_MAIL_KEY = 'neverbeen_admin_mail';
export const ME = 'me';

export interface MailAdmin {
  id: string;
  name: string;
  email: string;
  title: string;
  team: string;
  color: string;
  location: string;
  online: boolean;
}

export type MailLabel = 'urgent' | 'moderation' | 'security' | 'release' | 'privacy' | 'report' | 'design' | 'finance' | 'community';

export const LABELS: Record<MailLabel, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#dc2626' },
  moderation: { label: 'Moderation', color: '#7c3aed' },
  security: { label: 'Security', color: '#b91c1c' },
  release: { label: 'Release', color: '#0d9488' },
  privacy: { label: 'Privacy', color: '#2563eb' },
  report: { label: 'Report', color: '#0891b2' },
  design: { label: 'Design', color: '#db2777' },
  finance: { label: 'Finance', color: '#ca8a04' },
  community: { label: 'Community', color: '#16a34a' },
};

export interface MailAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** File contents; absent for sample Office files and for large uploads after a reload. */
  dataUrl?: string;
}

export interface MailMessage {
  id: string;
  threadId: string;
  folder: 'inbox' | 'sent';
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  sentAtUtc: string;
  read: boolean;
  starred: boolean;
  important: boolean;
  labels: MailLabel[];
  attachments: MailAttachment[];
  /** Sent mail: admins who have opened it (read receipts). */
  readBy: string[];
  requestReceipt?: boolean;
  deleted?: boolean;
}

export interface MailDraft {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: MailAttachment[];
  important: boolean;
  requestReceipt: boolean;
  replyToId?: string;
  mode?: 'new' | 'reply' | 'replyAll' | 'forward';
  savedAtUtc?: string;
}

export interface MailGroup {
  id: string;
  name: string;
  icon: string;
  members: string[];
}

interface MailState {
  messages: MailMessage[];
  draft: MailDraft | null;
  /** Seed messages still waiting to "arrive" when an admin checks for new mail. */
  incoming: MailMessage[];
}

/** Other administrators of NeverBeen (the signed-in account is "admin", the Super Administrator). */
export const ADMINS: MailAdmin[] = [
  { id: 'priya', name: 'Priya Sharma', email: 'priya.sharma@neverbeen.com', title: 'Head of Trust & Safety', team: 'Trust & Safety', color: '#7c3aed', location: 'Mumbai, India', online: true },
  { id: 'arjun', name: 'Arjun Mehta', email: 'arjun.mehta@neverbeen.com', title: 'Lead Engineer · Site Reliability', team: 'Engineering', color: '#0d9488', location: 'Bengaluru, India', online: true },
  { id: 'rahul', name: 'Rahul Verma', email: 'rahul.verma@neverbeen.com', title: 'Data Protection Officer', team: 'Legal & Privacy', color: '#2563eb', location: 'New Delhi, India', online: false },
  { id: 'ananya', name: 'Ananya Iyer', email: 'ananya.iyer@neverbeen.com', title: 'Content Moderation Lead', team: 'Trust & Safety', color: '#db2777', location: 'Chennai, India', online: true },
  { id: 'kenji', name: 'Kenji Watanabe', email: 'kenji.watanabe@neverbeen.com', title: 'Senior Product Designer', team: 'Product & Design', color: '#ea580c', location: 'Tokyo, Japan', online: false },
  { id: 'daniel', name: 'Daniel Okafor', email: 'daniel.okafor@neverbeen.com', title: 'Security Engineer', team: 'Engineering', color: '#b91c1c', location: 'Dublin, Ireland', online: true },
  { id: 'sofia', name: 'Sofia Rossi', email: 'sofia.rossi@neverbeen.com', title: 'Community Manager · Europe', team: 'Community', color: '#16a34a', location: 'Milan, Italy', online: false },
  { id: 'zoya', name: 'Zoya Khan', email: 'zoya.khan@neverbeen.com', title: 'Finance & Billing', team: 'Operations', color: '#ca8a04', location: 'Kolkata, India', online: false },
  { id: 'farhan', name: 'Farhan Rahman', email: 'farhan.rahman@neverbeen.com', title: 'Member Support Lead', team: 'Community', color: '#0891b2', location: 'Dhaka, Bangladesh', online: true },
  { id: 'meera', name: 'Meera Nair', email: 'meera.nair@neverbeen.com', title: 'Marketing & Partnerships', team: 'Operations', color: '#9333ea', location: 'Kochi, India', online: false },
];

export const MY_ACCOUNT: MailAdmin = {
  id: ME,
  name: 'admin',
  email: 'admin@neverbeen.com',
  title: 'Super Administrator',
  team: 'Leadership',
  color: '#10b981',
  location: 'NeverBeen HQ',
  online: true,
};

export const GROUPS: MailGroup[] = [
  { id: 'g-all', name: 'All admins', icon: '👥', members: ADMINS.map((a) => a.id) },
  { id: 'g-ts', name: 'Trust & Safety', icon: '🛡️', members: ['priya', 'ananya', 'daniel'] },
  { id: 'g-eng', name: 'Engineering', icon: '🛠️', members: ['arjun', 'daniel', 'kenji'] },
  { id: 'g-community', name: 'Community & Support', icon: '💬', members: ['sofia', 'farhan', 'meera'] },
  { id: 'g-legal', name: 'Legal & Finance', icon: '⚖️', members: ['rahul', 'zoya'] },
];

const SIGNATURE = '\n\n—\nadmin · Super Administrator\nNeverBeen Admin Console';
export const signatureText = SIGNATURE;

/* ------------------------------------------------------------------------ */
/*                                  Seed data                               */
/* ------------------------------------------------------------------------ */

function seedMessages(now: number): { messages: MailMessage[]; incoming: MailMessage[] } {
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  const H = 60;
  const D = 24 * H;
  const m = (x: Partial<MailMessage> & Pick<MailMessage, 'id' | 'from' | 'subject' | 'body' | 'sentAtUtc'>): MailMessage => ({
    threadId: x.id,
    folder: x.from === ME ? 'sent' : 'inbox',
    to: [ME],
    cc: [],
    bcc: [],
    read: x.from === ME,
    starred: false,
    important: false,
    labels: [],
    attachments: [],
    readBy: [],
    ...x,
  });
  const csv = (name: string, rows: string[][]): MailAttachment => {
    const text = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    return { id: `${name}-a`, name, mime: 'text/csv', size: text.length, dataUrl: textDataUrl(text, 'text/csv') };
  };
  const pdf = (id: string, name: string, title: string, lines: string[], size: number): MailAttachment => ({
    id,
    name,
    mime: 'application/pdf',
    size,
    dataUrl: makePdf(title, lines),
  });
  const img = (id: string, name: string, title: string, sub: string, a: string, b: string, kind: 'mockup' | 'photo' | 'screenshot' | 'chart', size: number): MailAttachment => ({
    id,
    name,
    mime: 'image/svg+xml',
    size,
    dataUrl: sampleImage(title, sub, a, b, kind),
  });
  const office = (id: string, name: string, size: number): MailAttachment => ({
    id,
    name,
    mime: name.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size,
  });

  const messages: MailMessage[] = [
    m({
      id: 'm101',
      from: 'priya',
      cc: ['ananya'],
      subject: 'Escalation: coordinated harassment reports on 3 travel posts',
      sentAtUtc: ago(25),
      important: true,
      labels: ['urgent', 'moderation'],
      body: `Hi admin,

We've received **17 abuse reports in the last hour** targeting three Journey posts from members in Kolkata and Darjeeling. The pattern looks coordinated — most reporters joined this week and share two IP ranges.

What we've done so far:
- Hidden the 3 posts from the public feed while we review
- Put the 6 newest reporting accounts on a 24-hour comment restriction
- Captured screenshots of the comment threads (attached)

Could you approve a **temporary rate limit on reports** from accounts younger than 7 days? The full list of reports is in the CSV.

Thanks,
Priya`,
      attachments: [
        img('a1011', 'comment-thread-screenshot.svg', 'Journey post #48213', 'Comment thread · 17 reports in 58 minutes', '#7c3aed', '#db2777', 'screenshot', 184_320),
        csv('abuse-reports-last-hour.csv', [
          ['report_id', 'post_id', 'reporter_uid', 'account_age_days', 'reason', 'reported_at_ist'],
          ['R-90311', '48213', 'NB-24-88121', '3', 'Harassment', '09:12'],
          ['R-90312', '48213', 'NB-24-88135', '2', 'Harassment', '09:14'],
          ['R-90318', '48240', 'NB-24-88140', '5', 'Spam', '09:21'],
          ['R-90322', '48251', 'NB-24-88121', '3', 'Hate speech', '09:33'],
        ]),
      ],
    }),
    m({
      id: 'm102',
      from: 'arjun',
      cc: ['daniel', 'kenji'],
      subject: 'Release 4.8 — maintenance window Saturday 02:00–03:00 IST',
      sentAtUtc: ago(2 * H + 10),
      labels: ['release'],
      body: `Hi admin,

Release 4.8 is ready for production. It includes the new Community search, faster image uploads and the database index changes, which **need about 40 minutes of downtime**.

Proposed plan:
1. Friday 18:00 — schedule the announcement banner in Site Downtime
2. Saturday 02:00 IST — take the site down, run migrations
3. Saturday 03:00 IST — smoke tests and bring the site back

The runbook is attached. Please approve so I can schedule it in Admin → Site Downtime.

Arjun`,
      attachments: [pdf('a1021', 'release-4.8-runbook.pdf', 'Release 4.8 runbook', ['1. Freeze deploys Friday 18:00 IST', '2. Schedule downtime banner (24h notice)', '3. 02:00 take site down, run migrations 0147-0152', '4. 02:40 smoke tests: sign-in, feed, upload, admin', '5. 03:00 bring site back, monitor error rate 30 min', 'Rollback: restore snapshot nb-prod-2026-09-27-0155'], 248_000)],
    }),
    m({
      id: 'm103',
      from: 'rahul',
      subject: 'DPDP erasure request #PR-2291 needs your sign-off by Friday',
      sentAtUtc: ago(5 * H + 40),
      important: true,
      labels: ['privacy'],
      body: `Hello,

A member from Pune has asked us to erase their account and all content under the **DPDP Act, 2023 (§12)**. Identity has been verified and there are no open abuse cases against the account.

The statutory deadline is this Friday. Could you review the request in **Admin → Data Management → Privacy requests** and approve the erasure? I've attached the request summary for our records.

Regards,
Rahul Verma
Data Protection Officer`,
      attachments: [pdf('a1031', 'erasure-request-PR-2291.pdf', 'Erasure request PR-2291', ['Regulation: DPDP Act 2023, section 12', 'Received: 22 Sep 2026 · Deadline: 26 Sep 2026', 'Identity verified: yes (Aadhaar-masked + selfie)', 'Open abuse cases: none', 'Action requested: erase profile, anonymise posts', 'Recommendation: approve'], 96_000)],
    }),
    m({
      id: 'm104',
      from: 'ananya',
      subject: 'Identity check backlog — 9 submissions waiting',
      sentAtUtc: ago(D + 3 * H),
      read: true,
      labels: ['moderation'],
      body: `Hi,

Quick heads-up: we have **9 identity submissions** waiting in Identity Check Verification. Three of them have a face match below 60%, so I'd like a second pair of eyes before we decide.

Could you take the three low-match ones today? I'll handle the rest.

Ananya`,
    }),
    m({
      id: 'm105',
      from: 'kenji',
      cc: ['meera'],
      subject: 'New Community profile header mockups 🎨',
      sentAtUtc: ago(D + 6 * H),
      read: true,
      starred: true,
      labels: ['design'],
      body: `Hey admin,

Here are three directions for the new member profile header. Goals: bigger cover photo, clearer verification badge and a "Connect" button that stands out on mobile.

- **Option A** — full-bleed cover, avatar overlapping
- **Option B** — card layout with stats row (my favourite)
- **Option C** — minimal, photo grid first

Let me know which one you'd like us to prototype.

Kenji`,
      attachments: [
        img('a1051', 'profile-header-option-A.svg', 'Option A · Full-bleed cover', 'Community profile header', '#ea580c', '#db2777', 'mockup', 412_000),
        img('a1052', 'profile-header-option-B.svg', 'Option B · Card + stats', 'Community profile header', '#0d9488', '#2563eb', 'mockup', 398_000),
        img('a1053', 'profile-header-option-C.svg', 'Option C · Photo grid first', 'Community profile header', '#7c3aed', '#0f172a', 'mockup', 371_000),
      ],
    }),
    m({
      id: 'm106',
      from: 'daniel',
      subject: 'Security: 14 failed admin sign-ins from a Tor exit node',
      sentAtUtc: ago(2 * D + 2 * H),
      read: true,
      important: true,
      labels: ['security', 'urgent'],
      body: `Hi admin,

Between 03:10 and 03:25 IST we saw **14 failed sign-in attempts** on the Admin Console from 185.220.101.x (a known Tor exit node). No attempt succeeded and the account lockout kicked in after 5 tries.

Recommendations:
- Enable 2-step verification for every admin account
- Block Tor exit nodes on /login
- Rotate the shared demo admin password

Log extract attached.

Daniel`,
      attachments: [
        {
          id: 'a1061',
          name: 'admin-login-failures.txt',
          mime: 'text/plain',
          size: 1_240,
          dataUrl: textDataUrl(
            Array.from({ length: 14 }, (_, i) => `2026-09-23T03:${String(10 + i).padStart(2, '0')}:0${i % 10}+05:30  POST /login  user=admin  ip=185.220.101.${40 + i}  result=FAILED${i >= 4 ? '  (locked)' : ''}`).join('\n'),
          ),
        },
      ],
    }),
    m({
      id: 'm107',
      from: 'sofia',
      subject: 'Europe meetup photos for the Collection page',
      sentAtUtc: ago(3 * D + 5 * H),
      read: true,
      labels: ['community'],
      body: `Ciao!

Our Milan and Lake Como meetups went really well — 42 members came along. Here are two of the best photos (members gave consent). Could we feature them on the Collection page next week?

Grazie,
Sofia`,
      attachments: [
        img('a1071', 'lake-como-meetup.svg', 'Lake Como meetup', '42 NeverBeen members · 21 Sep 2026', '#0ea5e9', '#6366f1', 'photo', 1_820_000),
        img('a1072', 'milan-duomo-walk.svg', 'Milan Duomo walk', 'Sunrise photo walk · 20 Sep 2026', '#f59e0b', '#ef4444', 'photo', 1_640_000),
      ],
    }),
    m({
      id: 'm108',
      from: 'zoya',
      subject: 'Invoice INV-2026-0914 — Google Maps Platform (₹48,210)',
      sentAtUtc: ago(4 * D + 1 * H),
      read: true,
      labels: ['finance'],
      body: `Hi,

September's Google Maps Platform invoice came in **18% higher** than August, mainly from Destination page map loads. The invoice and a cost breakdown are attached.

Can you approve payment? I'd also suggest caching static map tiles to bring the cost down.

Zoya`,
      attachments: [
        pdf('a1081', 'INV-2026-0914.pdf', 'Invoice INV-2026-0914', ['Vendor: Google Maps Platform', 'Period: 1-30 Sep 2026', 'Dynamic Maps loads: 412,880', 'Places API calls: 96,204', 'Total due: INR 48,210 (incl. GST)', 'Due date: 05 Oct 2026'], 132_000),
        office('a1082', 'maps-cost-breakdown-sep.xlsx', 58_400),
      ],
    }),
    m({
      id: 'm109',
      from: 'farhan',
      cc: ['sofia'],
      subject: 'Support digest: top 5 member questions this week',
      sentAtUtc: ago(5 * D + 3 * H),
      read: true,
      labels: ['report'],
      body: `Hello team,

This week's top member questions:
1. How do I get the verified badge? (38 tickets)
2. Why was my post hidden? (21)
3. Changing my username (17)
4. Photo upload fails on iPhone (12)
5. Deleting my account (9)

Median first-response time was **2h 14m** (target 4h). The iPhone upload issue is with Engineering.

Farhan`,
    }),
    m({
      id: 'm110',
      from: 'meera',
      subject: 'Partnership draft with Kerala Tourism — can you review?',
      sentAtUtc: ago(6 * D + 4 * H),
      read: true,
      starred: true,
      labels: ['community'],
      body: `Hi admin,

Kerala Tourism would like to sponsor a "Monsoon Journeys" challenge on the Community page in October. The draft agreement is attached — the main points are a featured banner for four weeks and a prize pool for the top 10 journeys.

Could you review it by Tuesday?

Meera`,
      attachments: [office('a1101', 'kerala-tourism-partnership-draft.docx', 214_000)],
    }),
    m({
      id: 'm111',
      threadId: 'm201',
      from: 'priya',
      cc: ['ananya'],
      subject: 'Re: Updated abuse report policy v2',
      sentAtUtc: ago(8 * D + 2 * H),
      read: true,
      labels: ['moderation'],
      body: `Thanks — this reads well. Two small suggestions:
- add a line about appeals within 14 days
- make the 3-strikes rule explicit for hate speech

Otherwise good to publish from our side.

Priya

> Please review the attached v2 of the abuse report policy before we publish it.`,
    }),
    m({
      id: 'm112',
      from: 'arjun',
      subject: 'Weekly Health report — uptime 99.97%',
      sentAtUtc: ago(9 * D),
      read: true,
      labels: ['report'],
      body: `Weekly summary:
- Uptime **99.97%** (one 3-minute blip on Tuesday)
- p95 page load 1.8 s (↓ 0.2 s)
- Storage 61% of quota
- Error rate 0.12%

Full charts are in Admin → Health. Chart snapshot attached.

Arjun`,
      attachments: [img('a1121', 'health-week-38.svg', 'Website health · week 38', 'Daily visits and p95 load time', '#0f766e', '#0e7490', 'chart', 268_000)],
    }),

    /* ------------------------------- Sent ------------------------------- */
    m({
      id: 'm201',
      from: ME,
      to: ['priya'],
      cc: ['ananya'],
      subject: 'Updated abuse report policy v2',
      sentAtUtc: ago(9 * D + 3 * H),
      labels: ['moderation'],
      readBy: ['priya', 'ananya'],
      body: `Hi Priya, Ananya,

Please review the attached v2 of the abuse report policy before we publish it. Main changes:
- clearer categories (harassment, hate speech, spam, scams)
- response targets: urgent 1h, standard 24h
- repeat offenders move to identity check automatically

Thanks!${SIGNATURE}`,
      attachments: [office('a2011', 'abuse-report-policy-v2.docx', 186_000)],
    }),
    m({
      id: 'm202',
      threadId: 'm105',
      from: ME,
      to: ['kenji'],
      cc: ['meera'],
      subject: 'Re: New Community profile header mockups 🎨',
      sentAtUtc: ago(20 * H),
      labels: ['design'],
      readBy: ['kenji'],
      body: `Love **Option B** — the stats row makes profiles feel alive. Please prototype it with the verification badge next to the name, and let's test it with 5 members next week.${SIGNATURE}

> Here are three directions for the new member profile header.`,
    }),
    m({
      id: 'm203',
      threadId: 'm102',
      from: ME,
      to: ['arjun'],
      cc: ['daniel', 'kenji'],
      subject: 'Re: Release 4.8 — maintenance window Saturday 02:00–03:00 IST',
      sentAtUtc: ago(1 * H + 5),
      labels: ['release'],
      readBy: ['arjun'],
      body: `Approved 👍 Please schedule the banner 24 hours ahead in Site Downtime and post in #releases once the site is back.${SIGNATURE}

> Release 4.8 is ready for production.`,
    }),
    m({
      id: 'm204',
      from: ME,
      to: ['priya', 'ananya', 'daniel'],
      subject: 'Weekend on-call rota (Trust & Safety)',
      sentAtUtc: ago(3 * D + 2 * H),
      readBy: ['priya', 'daniel'],
      body: `Hi all,

The on-call rota for the next four weekends is attached. Swap directly with each other if you need to, and let me know once it's agreed.${SIGNATURE}`,
      attachments: [office('a2041', 'on-call-rota-oct.xlsx', 24_600)],
    }),
    m({
      id: 'm205',
      threadId: 'm108',
      from: ME,
      to: ['zoya'],
      subject: 'Re: Invoice INV-2026-0914 — Google Maps Platform (₹48,210)',
      sentAtUtc: ago(4 * D - 30),
      labels: ['finance'],
      readBy: ['zoya'],
      body: `Approved for payment. Agree on caching the static tiles — please loop in Arjun to estimate the effort.${SIGNATURE}

> September's Google Maps Platform invoice came in 18% higher than August.`,
    }),
    m({
      id: 'm206',
      from: ME,
      to: ['farhan'],
      cc: ['sofia'],
      subject: 'Thanks for the support digest',
      sentAtUtc: ago(5 * D + 1 * H),
      readBy: ['farhan', 'sofia'],
      body: `Great work on the response times, Farhan. Let's add a short "How verification works" article to the FAQ — that should cut the #1 question in half.${SIGNATURE}`,
    }),
    m({
      id: 'm207',
      from: ME,
      to: ['rahul'],
      subject: 'Question on retention of abuse evidence',
      sentAtUtc: ago(6 * D + 6 * H),
      labels: ['privacy'],
      readBy: [],
      body: `Hi Rahul,

How long may we keep screenshots attached to abuse reports after a case is closed? I'd like to set the retention policy in Data Management to match.${SIGNATURE}`,
    }),
  ];

  const incoming: MailMessage[] = [
    m({
      id: 'm301',
      from: 'daniel',
      subject: '2-step verification is now available for admin accounts',
      sentAtUtc: ago(0),
      labels: ['security'],
      body: `Hi admin,

2-step verification (authenticator app) is live for Admin Console accounts. Please enable it for your account from **User Management → Security** today — I'll make it mandatory for everyone next Monday.

Daniel`,
    }),
    m({
      id: 'm302',
      threadId: 'm104',
      from: 'ananya',
      subject: 'Re: Identity check backlog — 9 submissions waiting',
      sentAtUtc: ago(0),
      labels: ['moderation'],
      body: `Update: I've cleared 6 of the 9. The remaining three are the low face-match ones — they're all yours 🙂

Ananya`,
    }),
  ];

  return { messages, incoming };
}

/* ------------------------------------------------------------------------ */

function load(): MailState {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(ADMIN_MAIL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MailState;
        if (Array.isArray(parsed.messages)) return { messages: parsed.messages, draft: parsed.draft ?? null, incoming: parsed.incoming ?? [] };
      }
    } catch {
      /* fall through to seed */
    }
  }
  const seed = seedMessages(Date.now());
  return { messages: seed.messages, draft: null, incoming: seed.incoming };
}

let seq = 0;
export function mailId(prefix = 'm'): string {
  seq = (seq + 1) % 1000;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/**
 * Admin Mail — private messages between NeverBeen administrators (Inbox, Sent, Compose).
 * Everything lives in the browser (localStorage), like the rest of the Admin Console demo.
 */
@Injectable({ providedIn: 'root' })
export class AdminMailService {
  private readonly audit = inject(AdminAuditService);

  readonly state = signal<MailState>(load());
  readonly admins = ADMINS;
  readonly groups = GROUPS;
  readonly me = MY_ACCOUNT;

  readonly inbox = computed(() => this.folder('inbox'));
  readonly sent = computed(() => this.folder('sent'));
  readonly unreadCount = computed(() => this.inbox().filter((m) => !m.read).length);
  readonly draft = computed(() => this.state().draft);
  readonly hasIncoming = computed(() => this.state().incoming.length > 0);

  private folder(f: 'inbox' | 'sent'): MailMessage[] {
    return this.state()
      .messages.filter((m) => m.folder === f && !m.deleted)
      .sort((a, b) => b.sentAtUtc.localeCompare(a.sentAtUtc));
  }

  /* ------------------------------ people ------------------------------ */

  person(id: string): MailAdmin {
    if (id === ME) return MY_ACCOUNT;
    return ADMINS.find((a) => a.id === id) ?? { id, name: id, email: id, title: 'Unknown', team: '', color: '#64748b', location: '', online: false };
  }

  displayName(id: string): string {
    return id === ME ? 'Me' : this.person(id).name;
  }

  /** Finds an admin by id, e-mail or full name (case-insensitive). */
  resolve(text: string): MailAdmin | null {
    const q = text.trim().toLowerCase().replace(/^.*<(.+)>$/, '$1');
    if (!q) return null;
    return ADMINS.find((a) => a.id === q || a.email.toLowerCase() === q || a.name.toLowerCase() === q) ?? null;
  }

  search(query: string, exclude: string[] = []): MailAdmin[] {
    const q = query.trim().toLowerCase();
    return ADMINS.filter((a) => !exclude.includes(a.id)).filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.team.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
    );
  }

  searchGroups(query: string): MailGroup[] {
    const q = query.trim().toLowerCase();
    return GROUPS.filter((g) => !q || g.name.toLowerCase().includes(q));
  }

  /* ------------------------------ reading ------------------------------ */

  byId(id: string | null | undefined): MailMessage | undefined {
    return id ? this.state().messages.find((m) => m.id === id && !m.deleted) : undefined;
  }

  thread(threadId: string): MailMessage[] {
    return this.state()
      .messages.filter((m) => m.threadId === threadId && !m.deleted)
      .sort((a, b) => a.sentAtUtc.localeCompare(b.sentAtUtc));
  }

  setRead(ids: string[], read: boolean): void {
    const set = new Set(ids);
    this.mutate((s) => ({ ...s, messages: s.messages.map((m) => (set.has(m.id) && m.folder === 'inbox' ? { ...m, read } : m)) }));
  }

  setStarred(ids: string[], starred: boolean): void {
    const set = new Set(ids);
    this.mutate((s) => ({ ...s, messages: s.messages.map((m) => (set.has(m.id) ? { ...m, starred } : m)) }));
  }

  toggleStar(id: string): void {
    const m = this.byId(id);
    if (m) this.setStarred([id], !m.starred);
  }

  setImportant(id: string, important: boolean): void {
    this.mutate((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, important } : m)) }));
  }

  /** Moves messages to the bin (reversible with {@link restore}). */
  remove(ids: string[]): void {
    const set = new Set(ids);
    this.mutate((s) => ({ ...s, messages: s.messages.map((m) => (set.has(m.id) ? { ...m, deleted: true } : m)) }));
  }

  restore(ids: string[]): void {
    const set = new Set(ids);
    this.mutate((s) => ({ ...s, messages: s.messages.map((m) => (set.has(m.id) ? { ...m, deleted: false } : m)) }));
  }

  /** "Check for new mail": delivers the next queued message from another admin. */
  checkForNew(): MailMessage | null {
    const next = this.state().incoming[0];
    if (!next) return null;
    const arrived: MailMessage = { ...next, sentAtUtc: new Date().toISOString(), read: false };
    this.mutate((s) => ({ ...s, incoming: s.incoming.slice(1), messages: [arrived, ...s.messages] }));
    return arrived;
  }

  /* ------------------------------ writing ------------------------------ */

  emptyDraft(): MailDraft {
    return { to: [], cc: [], bcc: [], subject: '', body: '', attachments: [], important: false, requestReceipt: false, mode: 'new' };
  }

  /** Builds a Reply / Reply all / Forward draft from an existing message. */
  draftFrom(id: string, mode: 'reply' | 'replyAll' | 'forward'): MailDraft | null {
    const src = this.byId(id);
    if (!src) return null;
    const who = this.person(src.from);
    const quoted = src.body
      .split('\n')
      .filter((l) => !l.startsWith('>'))
      .map((l) => `> ${l}`)
      .join('\n');
    const header = `On ${new Date(src.sentAtUtc).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}, ${who.name} wrote:`;
    const base = src.subject.replace(/^((re|fwd?):\s*)+/i, '');
    if (mode === 'forward') {
      return {
        ...this.emptyDraft(),
        mode,
        replyToId: id,
        subject: `Fwd: ${base}`,
        body: `\n\n---------- Forwarded message ----------\nFrom: ${who.name} <${who.email}>\nDate: ${new Date(src.sentAtUtc).toUTCString()}\nSubject: ${src.subject}\nTo: ${src.to.map((t) => this.person(t).name).join(', ')}\n\n${src.body}`,
        attachments: src.attachments.map((a) => ({ ...a })),
      };
    }
    const sender = src.from === ME ? src.to[0] : src.from;
    const to = [sender].filter(Boolean);
    const cc = mode === 'replyAll' ? [...new Set([...src.to, ...src.cc].filter((x) => x !== ME && !to.includes(x)))] : [];
    return { ...this.emptyDraft(), mode, replyToId: id, to, cc, subject: `Re: ${base}`, body: `\n\n${header}\n${quoted}` };
  }

  saveDraft(d: MailDraft): void {
    this.mutate((s) => ({ ...s, draft: { ...d, savedAtUtc: new Date().toISOString() } }));
  }

  discardDraft(): void {
    this.mutate((s) => ({ ...s, draft: null }));
  }

  /** Sends a message to other admins. It appears in Sent; recipients' copies live in their own mailboxes. */
  send(d: MailDraft): MailMessage {
    const replyTo = d.replyToId ? this.byId(d.replyToId) : undefined;
    const msg: MailMessage = {
      id: mailId(),
      threadId: replyTo && d.mode !== 'forward' ? replyTo.threadId : '',
      folder: 'sent',
      from: ME,
      to: [...d.to],
      cc: [...d.cc],
      bcc: [...d.bcc],
      subject: d.subject.trim() || '(no subject)',
      body: d.body.replace(/\s+$/, ''),
      sentAtUtc: new Date().toISOString(),
      read: true,
      starred: false,
      important: d.important,
      labels: replyTo && d.mode !== 'forward' ? [...replyTo.labels] : [],
      attachments: d.attachments.map((a) => ({ ...a })),
      readBy: [],
      requestReceipt: d.requestReceipt,
    };
    if (!msg.threadId) msg.threadId = msg.id;
    this.mutate((s) => ({ ...s, draft: null, messages: [msg, ...s.messages] }));
    const names = [...msg.to, ...msg.cc, ...msg.bcc].map((id) => this.person(id).name);
    this.audit.log({
      category: 'mail',
      action: `Message sent: “${msg.subject}”`,
      targetLabel: names.join(', '),
      details: `${msg.attachments.length} attachment(s)${msg.important ? ' · high importance' : ''}`,
    });
    return msg;
  }

  /** Undo send (offered for a few seconds after sending): removes the message and restores the draft. */
  unsend(id: string): MailDraft | null {
    const msg = this.state().messages.find((m) => m.id === id && m.folder === 'sent');
    if (!msg) return null;
    const draft: MailDraft = {
      to: msg.to,
      cc: msg.cc,
      bcc: msg.bcc,
      subject: msg.subject === '(no subject)' ? '' : msg.subject,
      body: msg.body,
      attachments: msg.attachments,
      important: msg.important,
      requestReceipt: !!msg.requestReceipt,
      mode: msg.threadId !== msg.id ? 'reply' : 'new',
      replyToId: msg.threadId !== msg.id ? this.thread(msg.threadId).filter((m) => m.id !== id).pop()?.id : undefined,
    };
    this.mutate((s) => ({ ...s, draft, messages: s.messages.filter((m) => m.id !== id) }));
    this.audit.log({ category: 'mail', action: `Message unsent: “${msg.subject}”` });
    return draft;
  }

  snippetOf(m: MailMessage): string {
    return snippet(m.body);
  }

  /* ------------------------------ storage ------------------------------ */

  private mutate(fn: (s: MailState) => MailState): void {
    this.state.update(fn);
    this.persist();
  }

  /**
   * Saves to localStorage. Browser storage is small (~5 MB), so large uploaded files are kept
   * only for this session: if the quota is exceeded their contents are dropped from the saved
   * copy (name, type and size are kept) and saving is retried.
   */
  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    const state = this.state();
    const strip = (a: MailAttachment, limit: number) => (a.dataUrl && dataUrlBytes(a.dataUrl) > limit ? { ...a, dataUrl: undefined } : a);
    const attempt = (limit: number) => {
      const slim: MailState = {
        ...state,
        messages: state.messages.map((m) => ({ ...m, attachments: m.attachments.map((a) => strip(a, limit)) })),
        draft: state.draft ? { ...state.draft, attachments: state.draft.attachments.map((a) => strip(a, limit)) } : null,
      };
      localStorage.setItem(ADMIN_MAIL_KEY, JSON.stringify(slim));
    };
    for (const limit of [ATTACH_RULES.maxStoredBytes, 200 * 1024, 0]) {
      try {
        attempt(limit);
        return;
      } catch {
        /* try again with smaller attachments */
      }
    }
  }
}
