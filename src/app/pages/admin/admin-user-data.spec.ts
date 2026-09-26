import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminUsers } from './users/users';
import { AdminUserDrawer } from './users/user-drawer';
import { AdminData } from './data/data';
import { AdminRolesMatrix } from './users/roles-matrix';
import { AdminDataExplorer, maskDeep } from './data/data-explorer';
import { AdminInsightsService } from './shared/admin-insights.service';
import { AdminUserOpsService } from './shared/admin-user-ops.service';
import { AdminDataOpsService } from './shared/admin-data-ops.service';
import { AdminModerationService } from '../../services/admin-moderation.service';
import { AdminAuditService } from '../../services/admin-audit.service';
import { CommunityService } from '../../services/community.service';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function click(el: Element | null): void {
  expect(el).toBeTruthy();
  (el as HTMLElement).click();
}

function buttonByText(root: HTMLElement, text: string, selector = 'button'): HTMLButtonElement | null {
  return ([...root.querySelectorAll(selector)] as HTMLButtonElement[]).find((b) => (b.textContent ?? '').includes(text)) ?? null;
}

describe('Admin User & Data Management', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no object URLs / navigation for downloads.
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:test';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('User Management shows KPIs, segments, directory and the four sections', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const kpis = [...el.querySelectorAll('.g-kpi small')].map((n) => n.textContent?.trim());
    expect(kpis).toEqual(['Total users', 'New · 7 days', 'Active · 24h', 'Verified', '2FA adoption', 'Restricted · Disabled']);
    expect(el.querySelectorAll('.um-seg').length).toBe(10);
    expect(el.querySelectorAll('app-admin-user-directory tbody tr').length).toBe(20);
    const tabs = [...el.querySelectorAll('.um-tabs-row .g-tabs button')].map((b) => b.textContent?.trim());
    expect(tabs.join('|')).toContain('Directory');
    expect(tabs.join('|')).toContain('Roles & permissions');
    expect(tabs.join('|')).toContain('Sessions & security');
    expect(tabs.join('|')).toContain('Audit log');

    // Switch to the sessions view
    click(buttonByText(el, 'Sessions & security', '.um-tabs-row button'));
    fixture.detectChanges();
    expect(el.querySelectorAll('app-admin-sessions-security tbody tr').length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Security posture');
  });

  it('User 360° drawer controls the account: warn, role, notes, tags, sign-out, password reset', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const ops = TestBed.inject(AdminUserOpsService);
    const moderation = TestBed.inject(AdminModerationService);
    const audit = TestBed.inject(AdminAuditService);

    click(el.querySelector('app-admin-user-directory tbody tr .g-btn.dark'));
    fixture.detectChanges();
    const drawer = el.querySelector('app-admin-user-drawer') as HTMLElement;
    expect(drawer).toBeTruthy();
    const name = drawer.querySelector('.ud-id-meta h3')?.textContent?.trim() ?? '';
    const insights = TestBed.inject(AdminInsightsService);
    const member = insights.members().find((m) => name.startsWith(m.fullName))!;
    expect(member).toBeTruthy();

    // PII masked by default, reveal is audited
    expect(drawer.querySelector('.ud-details')?.textContent).not.toContain(member.email);
    click(buttonByText(drawer, 'Reveal personal data'));
    fixture.detectChanges();
    expect(drawer.querySelector('.ud-details')?.textContent).toContain(member.email);
    expect(audit.entries().some((e) => e.category === 'privacy' && e.targetId === member.id)).toBe(true);

    // Warn
    click(buttonByText(drawer, '⚠ Warn'));
    fixture.detectChanges();
    expect(moderation.actionOf(member.id)?.warnings).toBe(1);

    // Role
    const roleSelect = drawer.querySelector('.ud-role select') as HTMLSelectElement;
    roleSelect.value = 'moderator';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(ops.roleOf(member.id)).toBe('moderator');

    // Password reset + sign out everywhere
    click(buttonByText(drawer, 'Force password reset'));
    expect(ops.security(member).passwordResetRequired).toBe(true);
    click(buttonByText(drawer, 'Sign out all devices'));
    fixture.detectChanges();
    click(document.body.querySelector('.g-modal-backdrop .g-modal-actions .g-btn:last-child'));
    fixture.detectChanges();
    expect(ops.sessionsOf(member).length).toBe(0);

    // Activity timeline includes admin actions
    click(buttonByText(drawer, 'Activity', '.ud-tabs button'));
    fixture.detectChanges();
    expect(drawer.querySelector('.ud-timeline')?.textContent).toContain('Role changed');

    // Notes & tags
    click(buttonByText(drawer, 'Notes & tags', '.ud-tabs button'));
    fixture.detectChanges();
    const tagInput = drawer.querySelector('.ud-inline-form input') as HTMLInputElement;
    tagInput.value = 'VIP';
    tagInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(buttonByText(drawer, 'Add tag'));
    const note = drawer.querySelector('.ud-inline-form textarea') as HTMLTextAreaElement;
    note.value = 'Called the member, issue resolved.';
    note.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(buttonByText(drawer, 'Save note'));
    fixture.detectChanges();
    expect(ops.tagsOf(member.id)).toContain('VIP');
    expect(ops.notesOf(member.id)[0].text).toContain('issue resolved');
    expect(JSON.parse(localStorage.getItem('neverbeen_admin_user_ops')!).tags[member.id]).toContain('VIP');
  });

  it('directory bulk actions verify and restrict selected users', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const moderation = TestBed.inject(AdminModerationService);

    click(el.querySelector('app-admin-user-directory thead input[type=checkbox]'));
    fixture.detectChanges();
    expect(el.querySelector('.um-bulk')?.textContent).toContain('20 selected');
    click(buttonByText(el, 'Restrict 7d', '.um-bulk button'));
    fixture.detectChanges();
    const restricted = Object.values(moderation.accountActions()).filter((a) => a.state === 'restricted');
    expect(restricted.length).toBe(20);
  });

  it('roles matrix toggles permissions but keeps Administrator locked', () => {
    TestBed.configureTestingModule({ imports: [AdminRolesMatrix], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminRolesMatrix);
    fixture.detectChanges();
    const ops = TestBed.inject(AdminUserOpsService);
    const el: HTMLElement = fixture.nativeElement;

    expect(ops.can('member', 'circles')).toBe(false);
    click(el.querySelector('[aria-label="Member: Create circles"]'));
    fixture.detectChanges();
    expect(ops.can('member', 'circles')).toBe(true);
    expect((el.querySelector('[aria-label="Administrator: Create circles"]') as HTMLButtonElement).disabled).toBe(true);
    expect(TestBed.inject(AdminAuditService).entries()[0].category).toBe('role');
  });

  it('Data Management shows catalog, storage meter and all governance sections', async () => {
    TestBed.configureTestingModule({ imports: [AdminData], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminData);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const kpis = [...el.querySelectorAll('.g-kpi small')].map((n) => n.textContent?.trim());
    expect(kpis).toEqual(['Datasets', 'Records', 'Storage', 'Privacy requests', 'Data health', 'Last backup']);
    expect(el.querySelector('.dm-meter')).toBeTruthy();
    expect(el.querySelectorAll('app-admin-data-catalog tbody tr').length).toBeGreaterThanOrEqual(12);
    expect(el.textContent).toContain('Member directory');

    for (const [tab, marker] of [
      ['Privacy requests', '.dm-req'],
      ['Retention', 'app-admin-retention tbody tr'],
      ['Data quality', '.dm-check'],
      ['Backup & restore', '.dm-drop'],
    ] as const) {
      click(buttonByText(el, tab, '.dm-tabs-row button'));
      fixture.detectChanges();
      expect(el.querySelectorAll(marker).length).toBeGreaterThan(0);
    }
  });

  it('explorer masks personal data until unmasked', () => {
    expect(maskDeep({ email: 'priya@example.com', nested: { contactPhone: '+91 9800 0101' }, city: 'Delhi' })).toEqual({
      email: 'pr•••@example.com',
      nested: { contactPhone: '+91••••••••01' },
      city: 'Delhi',
    });

    TestBed.configureTestingModule({ imports: [AdminDataExplorer], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminDataExplorer);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const first = TestBed.inject(CommunityService).companions()[0];
    click(el.querySelector('.dm-record header'));
    fixture.detectChanges();
    const email = first.aboutMeDetails?.contactEmail;
    if (email) expect(el.querySelector('.dm-json')?.textContent).not.toContain(email);
    click(el.querySelector('.g-toolbar .g-icon-btn'));
    fixture.detectChanges();
    if (email) expect(el.querySelector('.dm-json')?.textContent).toContain(email);
    expect(TestBed.inject(AdminDataOpsService).state().maskPii).toBe(false);
  });

  it('privacy erasure removes the member, anonymises their content and completes the request', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const dataOps = TestBed.inject(AdminDataOpsService);
    const community = TestBed.inject(CommunityService);
    const author = community.journeyPosts().find((p) => p.author?.id && community.companions().some((c) => c.id === p.author.id))!.author;
    const before = community.journeyPosts().filter((p) => p.author?.id === author.id).length;
    expect(before).toBeGreaterThan(0);

    dataOps.createRequest(author.id, 'erasure', 'Delete me');
    const req = dataOps.requests().find((r) => r.userId === author.id && r.type === 'erasure')!;
    expect(req.status).toBe('new');

    const res = dataOps.eraseUser(author.id, 'anonymize');
    dataOps.setRequestStatus(req.id, 'completed', 'done');
    expect(res.posts).toBe(before);
    expect(community.companions().some((c) => c.id === author.id)).toBe(false);
    expect(community.journeyPosts().filter((p) => p.author?.id === author.id).length).toBe(0);
    expect(dataOps.requests().find((r) => r.id === req.id)?.status).toBe('completed');
  });

  it('backup snapshot round-trips through a verified restore preview', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const dataOps = TestBed.inject(AdminDataOpsService);
    const snap = await dataOps.buildSnapshot();
    const ok = await dataOps.previewRestore(JSON.stringify(snap));
    expect(ok.valid).toBe(true);
    expect(ok.checksumOk).toBe(true);
    expect(ok.rows.length).toBeGreaterThan(3);

    const tampered = structuredClone(snap);
    (tampered.data as Record<string, unknown>)['neverbeen_hidden_posts'] = [1, 2, 3];
    expect((await dataOps.previewRestore(JSON.stringify(tampered))).checksumOk).toBe(false);
    expect((await dataOps.previewRestore('not json')).valid).toBe(false);
  });

  it('confirmation modals open above the Manage drawer', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    click(el.querySelector('app-admin-user-directory tbody tr .g-btn.dark'));
    fixture.detectChanges();
    const drawer = el.querySelector('app-admin-user-drawer') as HTMLElement;
    const panel = drawer.querySelector('aside.ud') as HTMLElement;

    // Profile photo fills the circle (centred, cropped to cover), not a small square in its corner.
    const avatar = drawer.querySelector('.ud-avatar') as HTMLElement;
    const photo = avatar.querySelector('img') as HTMLImageElement;
    expect(getComputedStyle(avatar).borderRadius).toBe('50%');
    expect(getComputedStyle(photo).width).toBe('100%');
    expect(getComputedStyle(photo).height).toBe('100%');
    expect(getComputedStyle(photo).borderRadius).toBe('50%');
    expect(getComputedStyle(photo).objectFit).toBe('cover');

    let opened = 0;
    for (const label of ['Disable account', 'Force identity check', 'Erase']) {
      const btn = buttonByText(drawer, label, '.ud-actions button, button');
      if (!btn || btn.disabled) continue;
      opened++;
      click(btn);
      fixture.detectChanges();
      const backdrop = document.body.querySelector('.g-modal-backdrop') as HTMLElement;
      expect(backdrop).toBeTruthy();
      // Rendered at the <body> root, outside the drawer, so no parent panel can cover it.
      expect(backdrop.parentElement).toBe(document.body);
      expect(drawer.contains(backdrop)).toBe(false);
      const zModal = Number(getComputedStyle(backdrop).zIndex);
      const zDrawer = Number(getComputedStyle(panel).zIndex);
      expect(zModal).toBeGreaterThan(zDrawer);
      // Modal comes after the drawer in DOM order too, so it paints on top.
      expect(panel.compareDocumentPosition(backdrop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      click(buttonByText(backdrop, 'Cancel'));
      fixture.detectChanges();
      expect(document.body.querySelector('.g-modal-backdrop')).toBeNull();
    }
    expect(opened).toBeGreaterThanOrEqual(2);
  });

  it('Security & devices lists active and up to 10 inactive devices with IP, MAC and IP location', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const insights = TestBed.inject(AdminInsightsService);
    const ops = TestBed.inject(AdminUserOpsService);
    const audit = TestBed.inject(AdminAuditService);

    // Every member: inactive list is capped at 10, most recent first, with full device details.
    let maxSeen = 0;
    for (const m of insights.members()) {
      const list = ops.inactiveDevicesOf(m);
      maxSeen = Math.max(maxSeen, list.length);
      expect(list.length).toBeLessThanOrEqual(10);
      for (let i = 1; i < list.length; i++) expect(Date.parse(list[i - 1].lastSeenUtc)).toBeGreaterThanOrEqual(Date.parse(list[i].lastSeenUtc));
      for (const d of list) {
        expect(d.active).toBe(false);
        expect(d.ipFull).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        expect(d.mac).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
        expect(d.deviceName).toBeTruthy();
        expect(d.country).toBeTruthy();
        expect(d.city).toBeTruthy();
      }
    }
    expect(maxSeen).toBe(10);

    // IP geolocation resolves neighbourhoods to the metro + state.
    const kolkatan = insights.members().find((m) => m.city.endsWith(', Kolkata'));
    if (kolkatan) {
      const d = ops.inactiveDevicesOf(kolkatan).find((x) => x.country === 'India' && x.city === 'Kolkata');
      if (d) expect(d.region).toBe('West Bengal');
    }

    // Open the Manage drawer for a member with an active session
    const target = insights.members().find((m) => ops.sessionsOf(m).length > 0 && m.accountState !== 'disabled')!;
    const f2 = TestBed.createComponent(AdminUserDrawer);
    f2.componentRef.setInput('userId', target.id);
    f2.detectChanges();
    const drawer: HTMLElement = f2.nativeElement;
    click(buttonByText(drawer, 'Security & devices', '.ud-tabs button, button'));
    f2.detectChanges();

    const heads = [...drawer.querySelectorAll('.ud-section-head h4')].map((h) => h.textContent ?? '');
    expect(heads.some((h) => h.includes('Active sessions & devices'))).toBe(true);
    expect(heads.some((h) => h.includes('Inactive sessions & devices'))).toBe(true);
    const inactiveCount = drawer.querySelectorAll('.ud-device.inactive').length;
    expect(inactiveCount).toBe(ops.inactiveDevicesOf(target).length);
    expect(inactiveCount).toBeLessThanOrEqual(10);
    const labels = [...drawer.querySelectorAll('.ud-device-grid dt')].map((d) => d.textContent?.trim());
    for (const l of ['IP address', 'MAC address', 'Location (IP)', 'Country', 'ISP / network']) expect(labels).toContain(l);

    // IP & MAC masked until revealed (audited)
    const firstIp = drawer.querySelector('.ud-device-grid dd.mono')!;
    expect(firstIp.textContent).toContain('•••');
    click(buttonByText(drawer, 'Reveal IP & MAC'));
    f2.detectChanges();
    expect(drawer.querySelector('.ud-device-grid dd.mono')!.textContent).not.toContain('•••');
    expect(audit.entries()[0].category).toBe('privacy');

    // Revoking an active session moves it into the inactive group
    const activeBefore = drawer.querySelectorAll('.ud-device:not(.inactive)').length;
    click(buttonByText(drawer.querySelector('.ud-device:not(.inactive)') as HTMLElement, 'Revoke'));
    f2.detectChanges();
    expect(drawer.querySelectorAll('.ud-device:not(.inactive)').length).toBe(activeBefore - 1);
    const revoked = ops.inactiveDevicesOf(target).find((d) => d.endReason === 'Revoked by admin');
    expect(revoked).toBeTruthy();
    expect(drawer.textContent).toContain('Revoked by admin');

    // CSV export
    click(buttonByText(drawer, 'Export devices'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
  it("Manage drawer's Role dropdown shows the user's actual role (not the first option)", async () => {
    TestBed.configureTestingModule({ imports: [AdminUserDrawer], providers: [provideRouter([])] });
    const insights = TestBed.inject(AdminInsightsService);
    const ops = TestBed.inject(AdminUserOpsService);
    const byRole = new Map<string, number>();
    for (const m of insights.members()) if (!byRole.has(ops.roleOf(m.id))) byRole.set(ops.roleOf(m.id), m.id);
    // Non-default roles present in the seed (the Administrator is the separate admin login, not a member).
    for (const r of ['moderator', 'ambassador', 'creator']) expect(byRole.has(r)).toBe(true);

    // Each "Manage" click opens a brand-new drawer, so check the very first render for every role.
    for (const [role, id] of byRole) {
      const f = TestBed.createComponent(AdminUserDrawer);
      f.componentRef.setInput('userId', id);
      f.detectChanges();
      await f.whenStable();
      const root: HTMLElement = f.nativeElement;
      const sel = root.querySelector('.ud-role select') as HTMLSelectElement;
      expect(sel.value).toBe(role);
      const badge = root.querySelector('.ud-badges .g-badge:nth-child(2)')!.textContent!.trim();
      expect(badge).toContain(sel.selectedOptions[0].textContent!.trim().split(' ').pop()!);
      f.destroy();
    }

    // Changing the role updates the stored role, the badge and the dropdown together.
    const [, memberId] = [...byRole].find(([r]) => r === 'member')!;
    const fixture = TestBed.createComponent(AdminUserDrawer);
    const el: HTMLElement = fixture.nativeElement;
    const select = () => el.querySelector('.ud-role select') as HTMLSelectElement;
    fixture.componentRef.setInput('userId', memberId);
    fixture.detectChanges();
    select().value = 'moderator';
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(ops.roleOf(memberId)).toBe('moderator');
    expect(select().value).toBe('moderator');
    expect(el.querySelector('.ud-badges')!.textContent).toContain('Moderator');
  });

  it('Directory role filter keeps the chosen role selected', async () => {
    TestBed.configureTestingModule({ imports: [AdminUsers], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const roleFilter = [...el.querySelectorAll('app-admin-user-directory select')].find((s) =>
      [...(s as HTMLSelectElement).options].some((o) => o.textContent?.includes('All roles')),
    ) as HTMLSelectElement;
    roleFilter.value = 'moderator';
    roleFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(roleFilter.value).toBe('moderator');
    const badges = [...el.querySelectorAll('app-admin-user-directory tbody tr td .g-badge')].map((b) => b.textContent ?? '');
    expect(badges.some((b) => b.includes('Moderator'))).toBe(true);
  });
});
