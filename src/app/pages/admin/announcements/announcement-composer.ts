import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ANN_CATEGORY_META,
  ANN_CHANNEL_META,
  ANN_PRIORITY_META,
  AnnAudience,
  AnnCategory,
  AnnChannel,
  AnnPriority,
  AnnouncementsService,
  AudienceMode,
  REGIONS,
  describeAudience,
  regionOf,
  statusOf,
} from '../../../services/announcements.service';
import { AdminInsightsService, MemberInsight } from '../shared/admin-insights.service';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { ManageUserButton } from '../shared/manage-user-button';
import { AGE_PRESETS, USER_GROUPS, UserGroup, audienceMembers, breakdown, plainAnnouncement, regionKey, renderAnnouncement, toLocalInput } from './audience';

type Expiry = 'none' | '1' | '3' | '7' | '14' | '30' | 'custom';
type PreviewTab = 'banner' | 'push' | 'inbox' | 'email';

export const ANN_LIMITS = { title: 90, body: 600, cta: 30 };

/**
 * Admin > Announcement > New — write an announcement, choose who receives it
 * (everyone · filters by geography / country / city / gender / age / verified ·
 * particular users or groups of users) with a live reach counter, pick channels,
 * schedule & expiry, preview it on every channel and publish.
 */
@Component({
  selector: 'app-admin-announcement-composer',
  imports: [RouterLink, AdminConfirmDialog, ManageUserButton],
  templateUrl: './announcement-composer.html',
  styleUrls: ['../shared/admin-grid.css', './announcements.css'],
})
export class AdminAnnouncementComposer {
  private readonly svc = inject(AnnouncementsService);
  private readonly insights = inject(AdminInsightsService);
  private readonly audit = inject(AdminAuditService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly limits = ANN_LIMITS;
  protected readonly catMeta = ANN_CATEGORY_META;
  protected readonly chMeta = ANN_CHANNEL_META;
  protected readonly prMeta = ANN_PRIORITY_META;
  protected readonly categories = Object.keys(ANN_CATEGORY_META) as AnnCategory[];
  protected readonly channelKeys = Object.keys(ANN_CHANNEL_META) as AnnChannel[];
  protected readonly priorities = Object.keys(ANN_PRIORITY_META) as AnnPriority[];
  protected readonly agePresets = AGE_PRESETS;
  protected readonly render = renderAnnouncement;
  protected readonly plain = plainAnnouncement;

  /** Editing an existing draft / scheduled announcement (null = new). */
  protected readonly editId = signal<string | null>(null);
  protected readonly copiedFrom = signal<string | null>(null);

  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly category = signal<AnnCategory>('general');
  protected readonly priority = signal<AnnPriority>('normal');
  protected readonly channels = signal<AnnChannel[]>(['banner', 'inbox']);
  protected readonly ctaLabel = signal('');
  protected readonly ctaUrl = signal('');
  protected readonly pinned = signal(false);

  protected readonly mode = signal<AudienceMode>('all');
  protected readonly regions = signal<string[]>([]);
  protected readonly countries = signal<string[]>([]);
  protected readonly cities = signal<string[]>([]);
  protected readonly genders = signal<string[]>([]);
  protected readonly ageMin = signal<number | null>(null);
  protected readonly ageMax = signal<number | null>(null);
  protected readonly verifiedOnly = signal(false);
  protected readonly userIds = signal<number[]>([]);
  protected readonly groupNames = signal<string[]>([]);

  protected readonly countryQuery = signal('');
  protected readonly cityQuery = signal('');
  protected readonly userQuery = signal('');
  protected readonly pasteOpen = signal(false);
  protected readonly pasteText = signal('');
  protected readonly pasteResult = signal<string | null>(null);

  protected readonly schedule = signal<'now' | 'later'>('now');
  protected readonly sendAt = signal(toLocalInput(Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000));
  protected readonly expiry = signal<Expiry>('7');
  protected readonly expiresAt = signal(toLocalInput(Date.now() + 8 * 86_400_000));

  protected readonly previewTab = signal<PreviewTab>('banner');
  protected readonly errors = signal<string[]>([]);
  protected readonly confirming = signal(false);

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    const editId = q.get('edit');
    const id = editId ?? q.get('copy');
    if (!id) return;
    if (this.svc.byId(id)) this.prefill(id, !!editId);
    // Opened directly on a fresh session: the sample announcements may still be loading.
    else this.svc.ready.then(() => this.prefill(id, !!editId));
  }

  private prefill(id: string, isEdit: boolean): void {
    const src = this.svc.byId(id);
    if (!src) return;
    const editId = isEdit ? id : null;
    const editable = !!editId && ['draft', 'scheduled'].includes(statusOf(src));
    if (editable) this.editId.set(src.id);
    else this.copiedFrom.set(src.title);
    this.title.set(editable ? src.title : src.title.startsWith('Copy of') ? src.title : `Copy of ${src.title}`.slice(0, ANN_LIMITS.title));
    this.body.set(src.body);
    this.category.set(src.category);
    this.priority.set(src.priority);
    this.channels.set(src.channels.includes('inbox') ? [...src.channels] : ['inbox', ...src.channels]);
    this.ctaLabel.set(src.ctaLabel ?? '');
    this.ctaUrl.set(src.ctaUrl ?? '');
    this.pinned.set(editable ? src.pinned : false);
    const a = src.audience;
    this.mode.set(a.mode);
    this.regions.set([...a.regions]);
    this.countries.set([...a.countries]);
    this.cities.set([...a.cities]);
    this.genders.set([...a.genders]);
    this.ageMin.set(a.ageMin);
    this.ageMax.set(a.ageMax);
    this.verifiedOnly.set(a.verifiedOnly);
    this.userIds.set([...a.userIds]);
    this.groupNames.set([...a.groupNames]);
    if (editable && statusOf(src) === 'scheduled') {
      this.schedule.set('later');
      this.sendAt.set(toLocalInput(Date.parse(src.sendAtUtc)));
    }
    if (!src.expiresAtUtc) this.expiry.set('none');
    else if (editable) {
      this.expiry.set('custom');
      this.expiresAt.set(toLocalInput(Date.parse(src.expiresAtUtc)));
    }
  }

  /* -------------------------------- audience -------------------------------- */

  private readonly members = computed(() => this.insights.members().filter((m) => m.accountState !== 'disabled'));
  protected readonly totalUsers = computed(() => this.members().length);

  protected readonly audience = computed<AnnAudience>(() => ({
    mode: this.mode(),
    regions: this.regions(),
    countries: this.countries(),
    cities: this.cities(),
    genders: this.genders(),
    ageMin: this.ageMin(),
    ageMax: this.ageMax(),
    verifiedOnly: this.verifiedOnly(),
    userIds: this.mode() === 'users' ? this.userIds() : [],
    groupNames: this.mode() === 'users' ? this.groupNames() : [],
  }));
  protected readonly audienceLabel = computed(() => describeAudience(this.audience()));
  protected readonly reachList = computed(() => audienceMembers(this.members(), this.audience()));
  protected readonly reach = computed(() => this.reachList().length);
  protected readonly reachPct = computed(() => (this.totalUsers() ? Math.round((this.reach() / this.totalUsers()) * 1000) / 10 : 0));
  protected readonly sample = computed(() => this.reachList().slice(0, 7));
  protected readonly bd = computed(() => {
    const l = this.reachList();
    return {
      countries: breakdown(l, (m) => m.country, 4),
      genders: breakdown(l, (m) => m.gender, 3),
      ages: breakdown(l, (m) => m.ageGroup, 4),
      regions: breakdown(l, regionKey, 3),
    };
  });

  protected readonly filterCount = computed(
    () =>
      this.regions().length +
      this.countries().length +
      this.cities().length +
      this.genders().length +
      (this.ageMin() !== null || this.ageMax() !== null ? 1 : 0) +
      (this.verifiedOnly() ? 1 : 0),
  );

  protected readonly regionOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.members()) counts.set(regionOf(m.country), (counts.get(regionOf(m.country)) ?? 0) + 1);
    return REGIONS.map((r) => ({ ...r, count: counts.get(r.name) ?? 0 })).sort((a, b) => b.count - a.count);
  });

  protected readonly countryOptions = computed(() => {
    const regions = this.regions();
    const q = this.countryQuery().trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const m of this.members()) {
      if (regions.length && !regions.includes(regionOf(m.country))) continue;
      counts.set(m.country, (counts.get(m.country) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([c]) => !q || c.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  });

  protected readonly cityOptions = computed(() => {
    const countries = this.countries();
    const regions = this.regions();
    const q = this.cityQuery().trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const m of this.members()) {
      if (!m.city) continue;
      if (countries.length && !countries.includes(m.country)) continue;
      if (regions.length && !regions.includes(regionOf(m.country))) continue;
      counts.set(m.city, (counts.get(m.city) ?? 0) + 1);
    }
    const sel = new Set(this.cities());
    return [...counts.entries()]
      .filter(([c]) => !q || c.toLowerCase().includes(q))
      .sort((a, b) => Number(sel.has(b[0])) - Number(sel.has(a[0])) || b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, q ? 40 : 18)
      .map(([name, count]) => ({ name, count }));
  });

  protected readonly genderOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.members()) counts.set(m.gender, (counts.get(m.gender) ?? 0) + 1);
    for (const g of ['Male', 'Female', 'Non-binary']) if (!counts.has(g)) counts.set(g, 0);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  });

  protected readonly groups = computed(() => {
    const ms = this.members();
    return USER_GROUPS.map((g) => ({ g, count: g.pick(ms).length }));
  });

  protected readonly userResults = computed(() => {
    const q = this.userQuery().trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(this.userIds());
    return this.members()
      .filter((m) => !taken.has(m.id) && [m.fullName, m.email, m.uniqueId, m.city, m.country].some((v) => v.toLowerCase().includes(q)))
      .slice(0, 8);
  });

  protected readonly selectedUsers = computed(() => this.userIds().map((id) => this.insights.member(id)).filter((m): m is MemberInsight => !!m));

  protected setMode(m: AudienceMode): void {
    this.mode.set(m);
    this.errors.set([]);
  }

  protected toggleIn(sig: { (): string[]; set(v: string[]): void }, value: string): void {
    const cur = sig();
    sig.set(cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]);
  }

  protected toggleRegion(name: string): void {
    this.toggleIn(this.regions, name);
    // Keep countries / cities consistent with the chosen regions.
    const regions = this.regions();
    if (regions.length) {
      this.countries.set(this.countries().filter((c) => regions.includes(regionOf(c))));
      const validCities = new Set(this.members().filter((m) => regions.includes(regionOf(m.country))).map((m) => m.city));
      this.cities.set(this.cities().filter((c) => validCities.has(c)));
    }
  }

  protected setAge(min: number | null, max: number | null): void {
    const same = this.ageMin() === min && this.ageMax() === max;
    this.ageMin.set(same ? null : min);
    this.ageMax.set(same ? null : max);
  }

  protected ageInput(which: 'min' | 'max', raw: string): void {
    const n = raw.trim() === '' ? null : Math.max(13, Math.min(100, Math.round(Number(raw))));
    (which === 'min' ? this.ageMin : this.ageMax).set(Number.isFinite(n as number) ? n : null);
  }

  protected clearFilters(): void {
    this.regions.set([]);
    this.countries.set([]);
    this.cities.set([]);
    this.genders.set([]);
    this.ageMin.set(null);
    this.ageMax.set(null);
    this.verifiedOnly.set(false);
  }

  protected addUser(m: MemberInsight): void {
    if (!this.userIds().includes(m.id)) this.userIds.update((l) => [...l, m.id]);
    this.userQuery.set('');
  }

  protected removeUser(id: number): void {
    this.userIds.update((l) => l.filter((x) => x !== id));
  }

  protected addGroup(g: UserGroup): void {
    const ids = g.pick(this.members()).map((m) => m.id);
    const set = new Set(this.userIds());
    ids.forEach((id) => set.add(id));
    this.userIds.set([...set]);
    if (!this.groupNames().includes(g.name)) this.groupNames.update((l) => [...l, g.name]);
    this.insights.notify(`${g.name}: ${ids.length} user(s) added.`);
  }

  protected clearUsers(): void {
    this.userIds.set([]);
    this.groupNames.set([]);
  }

  /** Paste UIDs, emails or full names (comma / newline separated). */
  protected applyPaste(): void {
    const tokens = this.pasteText()
      .split(/[\n,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const found: number[] = [];
    let missing = 0;
    for (const t of tokens) {
      const m = this.members().find((x) => x.uniqueId === t || x.email.toLowerCase() === t || x.fullName.toLowerCase() === t || String(x.id) === t);
      if (m) found.push(m.id);
      else missing++;
    }
    const set = new Set(this.userIds());
    found.forEach((id) => set.add(id));
    this.userIds.set([...set]);
    this.pasteResult.set(`${found.length} matched${missing ? ` · ${missing} not found` : ''}`);
    if (found.length) this.pasteText.set('');
  }

  onUserKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = this.userResults()[0];
      if (first) this.addUser(first);
    }
  }

  /* -------------------------------- delivery -------------------------------- */

  protected toggleChannel(c: AnnChannel): void {
    if (c === 'inbox') return; // always delivered to Notifications
    const cur = this.channels();
    this.channels.set(cur.includes(c) ? cur.filter((x) => x !== c) : this.channelKeys.filter((k) => k === c || cur.includes(k)));
  }

  protected readonly sendAtMs = computed(() => (this.schedule() === 'now' ? Date.now() : Date.parse(this.sendAt())));
  protected readonly expiresAtMs = computed<number | null>(() => {
    const e = this.expiry();
    if (e === 'none') return null;
    if (e === 'custom') return Date.parse(this.expiresAt());
    return this.sendAtMs() + Number(e) * 86_400_000;
  });

  protected readonly titleLeft = computed(() => ANN_LIMITS.title - this.title().length);
  protected readonly bodyLeft = computed(() => ANN_LIMITS.body - this.body().length);

  protected insertFormat(el: HTMLTextAreaElement, kind: 'bold' | 'emoji', emoji = ''): void {
    const s = el.selectionStart ?? this.body().length;
    const e = el.selectionEnd ?? s;
    const v = this.body();
    const sel = v.slice(s, e);
    const ins = kind === 'bold' ? `**${sel || 'important'}**` : emoji;
    const next = (v.slice(0, s) + ins + v.slice(e)).slice(0, ANN_LIMITS.body);
    this.body.set(next);
    el.value = next;
    el.focus();
    const caret = s + ins.length;
    el.setSelectionRange(caret, caret);
  }

  private validate(forDraft: boolean): string[] {
    const errs: string[] = [];
    const t = this.title().trim();
    if (!t) errs.push('Add a title.');
    if (t.length > ANN_LIMITS.title) errs.push(`Title is too long (max ${ANN_LIMITS.title}).`);
    if (forDraft) return errs;
    if (!this.body().trim()) errs.push('Write the announcement message.');
    if (this.body().length > ANN_LIMITS.body) errs.push(`Message is too long (max ${ANN_LIMITS.body}).`);
    if (!this.channels().length) errs.push('Choose at least one delivery channel.');
    if (this.mode() === 'users' && !this.userIds().length) errs.push('Add at least one user (or a group of users).');
    else if (this.reach() === 0) errs.push('No users match this audience — loosen the filters.');
    if (this.ctaLabel().trim() && !/^(\/|https?:\/\/)\S+$/.test(this.ctaUrl().trim())) errs.push('Button link must start with / (site page) or https://');
    if (this.schedule() === 'later' && !(this.sendAtMs() > Date.now() + 60_000)) errs.push('Pick a future date & time to schedule.');
    const exp = this.expiresAtMs();
    if (exp !== null && !(exp > this.sendAtMs())) errs.push('The end date must be after the send time.');
    return errs;
  }

  protected publish(): void {
    const errs = this.validate(false);
    this.errors.set(errs);
    if (!errs.length) this.confirming.set(true);
  }

  protected readonly confirmMessage = computed(() => {
    const when = this.schedule() === 'now' ? 'immediately' : `on ${new Date(this.sendAtMs()).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;
    const ch = this.channels().map((c) => ANN_CHANNEL_META[c].label).join(', ');
    const everyone = this.mode() === 'all' ? ' This goes to EVERY user.' : '';
    return `“${this.title().trim()}” will be delivered ${when} to ${this.reach().toLocaleString()} user(s) — ${this.audienceLabel()} — via ${ch}.${everyone}`;
  });

  protected confirmPublish(): void {
    this.confirming.set(false);
    const a = this.save('published');
    const scheduled = this.schedule() === 'later';
    const failed = this.svc.saveError();
    this.insights.notify(
      failed
        ? `⚠ Published here, but not saved: ${failed}`
        : scheduled
          ? `Announcement scheduled for ${this.reach().toLocaleString()} user(s).`
          : `Announcement published to ${this.reach().toLocaleString()} user(s).`,
    );
    this.router.navigate(['/admin/announcements'], { queryParams: { a: a.id } });
  }

  protected saveDraft(): void {
    const errs = this.validate(true);
    this.errors.set(errs);
    if (errs.length) return;
    const a = this.save('draft');
    this.editId.set(a.id);
    this.insights.notify('Draft saved.');
  }

  protected sendTest(): void {
    const errs = this.validate(true);
    this.errors.set(errs);
    if (errs.length) return;
    this.insights.notify(`Test sent to admin@neverbeen.com via ${this.channels().map((c) => ANN_CHANNEL_META[c].label).join(', ') || 'email'}.`);
    this.audit.log({ category: 'announcement', action: 'Sent test announcement to self', targetLabel: this.title().trim() });
  }

  private save(state: 'draft' | 'published') {
    const payload = {
      title: this.title().trim(),
      body: this.body().trim(),
      category: this.category(),
      priority: this.priority(),
      channels: this.channels(),
      audience: this.audience(),
      state,
      sendAtUtc: new Date(state === 'draft' && this.schedule() === 'now' ? Date.now() : this.sendAtMs()).toISOString(),
      expiresAtUtc: this.expiresAtMs() === null ? null : new Date(this.expiresAtMs()!).toISOString(),
      ctaLabel: this.ctaLabel().trim() || undefined,
      ctaUrl: this.ctaLabel().trim() ? this.ctaUrl().trim() : undefined,
      pinned: this.pinned(),
      recipients: state === 'published' ? this.reach() : undefined,
    };
    const id = this.editId();
    const scheduled = state === 'published' && this.schedule() === 'later';
    const verb = state === 'draft' ? 'Saved announcement draft' : scheduled ? 'Scheduled announcement' : 'Published announcement';
    const out = (id && this.svc.update(id, payload, state === 'draft' ? 'Draft updated' : scheduled ? 'Scheduled' : 'Published')) || this.svc.create(payload);
    this.audit.log({
      category: 'announcement',
      action: verb,
      targetLabel: payload.title,
      details: `${payload.recipients ?? this.reach()} recipient(s) · ${this.audienceLabel()} · ${payload.channels.join(', ')}`,
    });
    return out;
  }

  protected discard(): void {
    this.router.navigate(['/admin/announcements']);
  }
}
