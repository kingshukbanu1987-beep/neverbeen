import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboard } from './dashboard/dashboard';
import { AdminMembers } from './members/members';
import { AdminAbuseReports } from './abuse-reports/abuse-reports';
import { AdminUnderDevelopment } from './under-development/under-development';
import { AdminInsightsService } from './shared/admin-insights.service';
import { AdminModerationService } from '../../services/admin-moderation.service';
import { CommunityService } from '../../services/community.service';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function routeWith(data: Record<string, unknown>, query: Record<string, string> = {}) {
  return {
    provide: ActivatedRoute,
    useValue: {
      data: of(data),
      snapshot: { data, queryParamMap: { get: (k: string) => query[k] ?? null } },
    },
  };
}

describe('Admin Console', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dashboard shows the requested cards, charts, highlight posts, reports and suspicious users', async () => {
    TestBed.configureTestingModule({ imports: [AdminDashboard], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const text = el.textContent ?? '';

    const labels = [...el.querySelectorAll('.stat-label')].map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Total Members', 'Online Now', 'Verified Members', 'Identity Check Verification', 'Abuse Reports', 'Suspicious Users']);
    expect(text).not.toContain('Pending Requests');
    expect(text).not.toContain('Total Likes');
    expect(text).not.toContain('Latest Journey Posts');
    expect(text).toContain('Latest Most Highlight Journey Posts');
    expect(text).toContain('Members by Country');
    expect(text).toContain('Member Registrations');
    expect(text).toContain('Find a user');
    expect(el.querySelectorAll('.hl-item').length).toBe(6);
    expect(el.querySelectorAll('.report-tile').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('app-admin-suspicious-users tbody tr').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('.cc-bars li').length).toBeGreaterThan(1);
    expect(el.querySelectorAll('.rc-col').length).toBeGreaterThan(12);
  });

  it('user search finds a member and disables the account (hidden from community)', async () => {
    TestBed.configureTestingModule({ imports: [AdminDashboard], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    const community = TestBed.inject(CommunityService);
    const moderation = TestBed.inject(AdminModerationService);
    const target = community.companions()[5];

    const input = fixture.nativeElement.querySelector('.us-box input') as HTMLInputElement;
    input.value = target.fullName;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.us-row');
    expect(rows.length).toBeGreaterThan(0);

    const before = new Set(moderation.disabledUserIds());
    (rows[0].querySelector('.g-btn.danger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const confirm = document.body.querySelector('.g-modal .g-btn.danger') as HTMLButtonElement;
    expect(confirm).toBeTruthy();
    confirm.click();
    fixture.detectChanges();

    const disabledId = moderation.disabledUserIds().find((id) => !before.has(id));
    expect(disabledId).toBeDefined();
    expect(community.visibleCompanions().some((c) => c.id === disabledId)).toBe(false);
  });

  it('member grid filters verified / online members', async () => {
    for (const mode of ['all', 'verified', 'online'] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [AdminMembers], providers: [provideRouter([]), routeWith({ mode })] });
      const fixture = TestBed.createComponent(AdminMembers);
      fixture.detectChanges();
      await flush();
      fixture.detectChanges();
      const insights = TestBed.inject(AdminInsightsService);
      const expected =
        mode === 'all' ? insights.members().length : mode === 'verified' ? insights.verifiedMembers().length : insights.onlineMembers().length;
      expect(fixture.nativeElement.querySelector('.g-foot')?.textContent).toContain(`of ${expected}`);
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(Math.min(25, expected));
    }
  });

  it('abuse reports page applies a "warn & restrict" decision', async () => {
    TestBed.configureTestingModule({ imports: [AdminAbuseReports], providers: [provideRouter([]), routeWith({})] });
    const fixture = TestBed.createComponent(AdminAbuseReports);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.ar-card');
    expect(cards.length).toBeGreaterThan(5);
    expect(cards[0].textContent).toContain('Reported by');
    expect(cards[0].textContent).toContain('Report against');

    const select = cards[0].querySelector('.ar-decision select') as HTMLSelectElement;
    select.value = 'restrict';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards[0].querySelector('.ar-scopes')).toBeTruthy();
    (cards[0].querySelector('.ar-decision .g-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    const moderation = TestBed.inject(AdminModerationService);
    const decided = Object.values(moderation.reportDecisions());
    expect(decided.length).toBe(1);
    expect(decided[0].decision).toBe('restrict');
    expect(decided[0].durationDays).toBe(7);
  });

  it('other sections show Under Development', async () => {
    TestBed.configureTestingModule({
      imports: [AdminUnderDevelopment],
      providers: [provideRouter([]), routeWith({ section: 'Repositories' })],
    });
    const fixture = TestBed.createComponent(AdminUnderDevelopment);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Under Development');
    expect(fixture.nativeElement.textContent).toContain('Repositories');
  });
});
