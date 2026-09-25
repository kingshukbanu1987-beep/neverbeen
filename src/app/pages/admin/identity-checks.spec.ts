import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AdminDashboard } from './dashboard/dashboard';
import { AdminIdentityChecks } from './identity-checks/identity-checks';
import { AdminIdentityDocument } from './identity-checks/identity-document';
import { AdminIdentityService, maskDocNumber } from './shared/admin-identity.service';
import { AdminModerationService } from '../../services/admin-moderation.service';
import { AdminAuditService } from '../../services/admin-audit.service';
import { CommunityService } from '../../services/community.service';

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const b = ([...root.querySelectorAll('button')] as HTMLButtonElement[]).find((x) => (x.textContent ?? '').includes(text));
  expect(b).toBeTruthy();
  return b!;
}

describe('Identity Check Verification', () => {
  beforeEach(() => localStorage.clear());

  it('dashboard replaces Total Journey Posts with the Identity Check Verification card', () => {
    TestBed.configureTestingModule({ imports: [AdminDashboard], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const card = [...el.querySelectorAll('.stat-card')].find((c) => c.textContent?.includes('Identity Check Verification')) as HTMLElement;
    expect(card).toBeTruthy();
    expect(el.textContent).not.toContain('Total Journey Posts');
    const pending = TestBed.inject(AdminIdentityService).pending().length;
    expect(pending).toBeGreaterThan(0);
    expect(card.querySelector('.stat-value')?.textContent?.trim()).toBe(String(pending));
    expect(card.classList.contains('clickable')).toBe(true);
  });

  it('seeded submissions belong to disabled / identity-check accounts', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const identity = TestBed.inject(AdminIdentityService);
    const moderation = TestBed.inject(AdminModerationService);
    for (const s of identity.pending()) {
      expect(moderation.stateOf(s.userId)).toBe(s.trigger);
    }
    expect(identity.pending().some((s) => s.trigger === 'disabled')).toBe(true);
    expect(identity.pending().some((s) => s.trigger === 'identity_required')).toBe(true);
    expect(maskDocNumber('1234 5678 9012')).toBe('•••• •••• 9012');
  });

  it('grid lists member details + documents (new page links) and the three actions work', () => {
    TestBed.configureTestingModule({ imports: [AdminIdentityChecks], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminIdentityChecks);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const identity = TestBed.inject(AdminIdentityService);
    const moderation = TestBed.inject(AdminModerationService);
    const community = TestBed.inject(CommunityService);

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(identity.pending().length);
    const link = rows[0].querySelector('a.ic-file') as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('href')).toMatch(/^\/admin\/identity-document\/\d+\//);
    expect(rows[0].querySelectorAll('app-id-document').length).toBeGreaterThan(1);

    const confirm = () => {
      fixture.detectChanges();
      (el.querySelector('app-admin-confirm-dialog .g-modal-actions .g-btn:last-child') as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    // 1) Enable back (oldest pending first)
    const first = identity.pending().slice().sort((a, b) => a.submittedAtUtc.localeCompare(b.submittedAtUtc))[0];
    buttonByText(el.querySelector('tbody tr') as HTMLElement, 'Enable account').click();
    confirm();
    expect(moderation.stateOf(first.userId)).toBe('active');
    expect(identity.byId(first.id)?.status).toBe('approved');
    expect(community.visibleCompanions().some((c) => c.id === first.userId)).toBe(true);

    // 2) Permanently disable
    const second = identity.pending().slice().sort((a, b) => a.submittedAtUtc.localeCompare(b.submittedAtUtc))[0];
    buttonByText(el.querySelector('tbody tr') as HTMLElement, 'Permanently disable').click();
    confirm();
    expect(moderation.stateOf(second.userId)).toBe('disabled');
    expect(moderation.actionOf(second.userId)?.permanent).toBe(true);
    expect(identity.byId(second.id)?.status).toBe('rejected');

    // 3) Force identity check again
    const third = identity.pending().slice().sort((a, b) => a.submittedAtUtc.localeCompare(b.submittedAtUtc))[0];
    buttonByText(el.querySelector('tbody tr') as HTMLElement, 'Force identity check again').click();
    confirm();
    expect(moderation.stateOf(third.userId)).toBe('identity_required');
    expect(identity.byId(third.id)?.status).toBe('resubmit_requested');

    expect(el.querySelectorAll('tbody tr').length).toBe(identity.pending().length);
    const actions = TestBed.inject(AdminAuditService).entries().map((e) => e.action);
    expect(actions).toContain('Identity verification approved');
    expect(actions).toContain('Identity verification rejected');
  });

  it('document page shows the document, details and logs the view', () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      imports: [AdminIdentityDocument],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: {} } }],
    });
    const identity = TestBed.inject(AdminIdentityService);
    const sub = identity.pending()[0];
    const file = sub.files[0];
    params.next(convertToParamMap({ submissionId: String(sub.id), fileId: file.id }));
    const fixture = TestBed.createComponent(AdminIdentityDocument);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.iv-title h1')?.textContent).toContain(sub.documentType);
    expect(el.querySelector('.iv-canvas app-id-document')).toBeTruthy();
    expect(el.textContent).toContain(sub.documentNumber);
    expect(el.querySelectorAll('.iv-strip a').length).toBe(sub.files.length);
    expect(TestBed.inject(AdminAuditService).entries().some((e) => e.action.startsWith('Identity document viewed'))).toBe(true);
    buttonByText(el, 'Enable account');
    buttonByText(el, 'Permanently disable account');
    buttonByText(el, 'Force identity check again');
  });
});
