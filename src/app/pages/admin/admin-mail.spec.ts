import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Navbar } from '../../layout/navbar/navbar';
import { AdminLayout } from './admin';
import { AdminMailFolder } from './mail/mail-folder';
import { AdminMailCompose } from './mail/mail-compose';
import { ADMIN_MAIL_KEY, AdminMailService, ME } from './mail/admin-mail.service';
import { ATTACH_RULES, makePdf, renderMessage } from './mail/mail-utils';
import { AdminAuditService } from '../../services/admin-audit.service';

@Component({ selector: 'app-stub', template: '' })
class Stub {}

function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function btn(root: ParentNode, text: string): HTMLButtonElement {
  const b = ([...root.querySelectorAll('button')] as HTMLButtonElement[]).find((x) => (x.textContent ?? '').includes(text));
  expect(b, `button "${text}"`).toBeTruthy();
  return b!;
}

function routeMock(data: Record<string, unknown>, query: Record<string, string> = {}) {
  const qp = new BehaviorSubject(convertToParamMap(query));
  return { qp, value: { snapshot: { data, queryParamMap: convertToParamMap(query) }, queryParamMap: qp, data: new BehaviorSubject(data) } };
}

describe('Admin Console — compact header & Mail', () => {
  beforeEach(() => localStorage.clear());

  it('A: the website header and logo are compact (community size) inside the Admin Console', async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([{ path: 'admin/dashboard', component: Stub }, { path: 'about', component: Stub }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const header = () => fixture.nativeElement.querySelector('header.nav') as HTMLElement;
    await router.navigateByUrl('/about');
    fixture.detectChanges();
    expect(header().classList.contains('compact-nav')).toBe(false);
    await router.navigateByUrl('/admin/dashboard');
    fixture.detectChanges();
    expect(header().classList.contains('compact-nav')).toBe(true);
    expect(fixture.nativeElement.querySelector('.logo')?.classList.contains('compact-logo')).toBe(true);
  });

  it('side panel shows Mail (Inbox · Sent · Compose) right below Dashboard with the unread count', () => {
    TestBed.configureTestingModule({ imports: [AdminLayout], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const nav = el.querySelector('.admin-nav')!;
    const children = [...nav.children] as HTMLElement[];
    expect(children[0].textContent).toContain('Dashboard');
    expect(children[1].classList.contains('nav-group')).toBe(true);
    expect(children[1].querySelector('.nav-group-head')?.textContent).toContain('Mail');
    const subs = [...children[1].querySelectorAll('.nav-sub a')] as HTMLAnchorElement[];
    expect(subs.map((a) => a.querySelector('.nav-sub-label')?.textContent?.trim())).toEqual(['Inbox', 'Sent', 'Compose']);
    expect(subs.map((a) => a.getAttribute('href'))).toEqual(['/admin/mail/inbox', '/admin/mail/sent', '/admin/mail/compose']);
    const unread = TestBed.inject(AdminMailService).unreadCount();
    expect(unread).toBeGreaterThan(0);
    expect(subs[0].querySelector('.nav-count')?.textContent?.trim()).toBe(String(unread));

    // Collapsible: the unread badge moves to the group header when collapsed.
    (children[1].querySelector('.nav-group-head') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.nav-sub')).toBeNull();
    expect(el.querySelector('.nav-group-head .nav-flag')?.textContent?.trim()).toBe(String(unread));
  });

  it('mail service: seeded conversations, reply/forward drafts, send + audit, undo send and storage', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const mail = TestBed.inject(AdminMailService);
    const audit = TestBed.inject(AdminAuditService);

    expect(mail.inbox().length).toBe(12);
    expect(mail.sent().length).toBe(7);
    expect(mail.unreadCount()).toBe(3);
    expect(mail.inbox().every((m) => m.from !== ME)).toBe(true);
    expect(mail.inbox().some((m) => m.attachments.some((a) => a.mime.startsWith('image/')))).toBe(true);
    expect(mail.inbox().some((m) => m.attachments.some((a) => a.mime === 'application/pdf' && a.dataUrl))).toBe(true);
    // Conversations mix inbox and sent messages.
    expect(mail.thread('m102').map((m) => m.folder)).toEqual(['inbox', 'sent']);

    expect(mail.resolve('priya.sharma@neverbeen.com')?.id).toBe('priya');
    expect(mail.resolve('Arjun Mehta')?.id).toBe('arjun');
    expect(mail.resolve('someone@gmail.com')).toBeNull();

    const reply = mail.draftFrom('m101', 'reply')!;
    expect(reply.to).toEqual(['priya']);
    expect(reply.cc).toEqual([]);
    expect(reply.subject).toBe('Re: Escalation: coordinated harassment reports on 3 travel posts');
    expect(reply.body).toContain('Priya Sharma wrote:');
    expect(mail.draftFrom('m101', 'replyAll')!.cc).toEqual(['ananya']);
    const fwd = mail.draftFrom('m101', 'forward')!;
    expect(fwd.to).toEqual([]);
    expect(fwd.subject.startsWith('Fwd: ')).toBe(true);
    expect(fwd.attachments.length).toBe(2);

    const sent = mail.send({ ...reply, body: 'Approved.' });
    expect(mail.sent()[0].id).toBe(sent.id);
    expect(sent.threadId).toBe('m101');
    expect(mail.thread('m101').map((m) => m.id)).toContain(sent.id);
    expect(audit.entries()[0].category).toBe('mail');
    expect(audit.entries()[0].action).toContain('Message sent');
    expect(JSON.parse(localStorage.getItem(ADMIN_MAIL_KEY)!).messages.length).toBe(20);

    const restored = mail.unsend(sent.id)!;
    expect(mail.sent().some((m) => m.id === sent.id)).toBe(false);
    expect(restored.body).toBe('Approved.');
    expect(mail.draft()?.to).toEqual(['priya']);

    // Large uploads are kept for the session but not written into small browser storage.
    const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((ATTACH_RULES.maxStoredBytes * 4) / 3) + 100);
    const m2 = mail.send({ ...mail.emptyDraft(), to: ['arjun'], subject: 'Big', body: 'pic', attachments: [{ id: 'x', name: 'big.png', mime: 'image/png', size: 2_000_000, dataUrl: big }] });
    expect(mail.byId(m2.id)!.attachments[0].dataUrl).toBe(big);
    const saved = JSON.parse(localStorage.getItem(ADMIN_MAIL_KEY)!).messages.find((m: { id: string }) => m.id === m2.id);
    expect(saved.attachments[0].dataUrl).toBeUndefined();
    expect(saved.attachments[0].name).toBe('big.png');
  });

  it('message formatting is rendered safely', () => {
    const html = renderMessage('Hi **team**\n- one\n- two\n> quoted\n<script>alert(1)</script> https://neverbeen.com');
    expect(html).toContain('<strong>team</strong>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<blockquote>quoted</blockquote>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="https://neverbeen.com"');
    expect(atob(makePdf('T', ['x']).split(',')[1]).startsWith('%PDF-1.4')).toBe(true);
  });

  it('B: Inbox lists admin messages; opening one shows the conversation, attachments and marks it read', async () => {
    const r = routeMock({ folder: 'inbox' });
    TestBed.configureTestingModule({ imports: [AdminMailFolder], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const mail = TestBed.inject(AdminMailService);
    const fixture = TestBed.createComponent(AdminMailFolder);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.mx-title h2')?.textContent).toContain('Inbox');
    expect(el.querySelectorAll('.mx-row').length).toBe(12);
    expect(el.querySelectorAll('.mx-row.unread').length).toBe(3);
    expect(['Today', 'Yesterday']).toContain([...el.querySelectorAll('.mx-group')].map((g) => g.textContent?.trim())[0]);
    expect(el.querySelector('.mx-read-empty')).toBeTruthy();

    // Open the newest (Priya's escalation)
    (el.querySelector('.mx-row') as HTMLElement).click();
    fixture.detectChanges();
    expect(nav).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { m: 'm101' } }));
    expect(mail.byId('m101')!.read).toBe(true);
    expect(el.querySelectorAll('.mx-row.unread').length).toBe(2);
    expect(el.querySelector('.mx-read-head h3')?.textContent).toContain('Escalation');
    expect(el.querySelector('.mx-msg-body strong')?.textContent).toContain('17 abuse reports');
    expect(el.querySelectorAll('.mx-att').length).toBe(2);
    expect(el.querySelector('.mx-att.image img')).toBeTruthy();
    expect(el.querySelector('.mx-pos')?.textContent).toContain('1 of 12');

    // Preview an image attachment in the lightbox (rendered on top of everything)
    (el.querySelector('.mx-thumb') as HTMLButtonElement).click();
    fixture.detectChanges();
    const lb = document.body.querySelector('.mx-lightbox') as HTMLElement;
    expect(lb.parentElement).toBe(document.body);
    expect(lb.querySelector('img')).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(document.body.querySelector('.mx-lightbox')).toBeNull();

    // Keyboard: j → next message
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    fixture.detectChanges();
    expect(el.querySelector('.mx-pos')?.textContent).toContain('2 of 12');

    // Filters & search
    btn(el, 'Unread').click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.mx-row').length).toBe(mail.unreadCount());
    btn(el, 'All').click();
    btn(el, '📎 Files').click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.mx-row').length).toBe(mail.inbox().filter((m) => m.attachments.length).length);
    btn(el, 'All').click();
    const search = el.querySelector('.mx-search input') as HTMLInputElement;
    search.value = 'invoice';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelectorAll('.mx-row').length).toBe(1);
    expect(el.querySelector('.mx-row .mx-who')?.textContent).toContain('Zoya Khan');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  });

  it('B: star, bulk delete with Undo, check for new mail and quick reply', async () => {
    const r = routeMock({ folder: 'inbox' });
    TestBed.configureTestingModule({ imports: [AdminMailFolder], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const mail = TestBed.inject(AdminMailService);
    const fixture = TestBed.createComponent(AdminMailFolder);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const firstStar = el.querySelector('.mx-row .mx-star') as HTMLButtonElement;
    firstStar.click();
    fixture.detectChanges();
    expect(mail.byId('m101')!.starred).toBe(true);

    const checks = [...el.querySelectorAll('.mx-row-check')] as HTMLInputElement[];
    checks[0].click();
    checks[1].click();
    fixture.detectChanges();
    expect(el.querySelector('.mx-bulk-count')?.textContent).toContain('2 selected');
    btn(el, '🗑 Delete').click();
    fixture.detectChanges();
    expect(mail.inbox().length).toBe(10);
    const notice = document.body.querySelector('.mx-notice') as HTMLElement;
    expect(notice.textContent).toContain('moved to Bin');
    btn(notice, 'Undo').click();
    fixture.detectChanges();
    expect(mail.inbox().length).toBe(12);

    btn(el, '⟳').click();
    fixture.detectChanges();
    expect(mail.inbox().length).toBe(13);
    expect(el.querySelector('.mx-row .mx-who')?.textContent).toContain('Daniel Okafor');
    expect(document.body.querySelector('.mx-notice')?.textContent).toContain('New message from Daniel Okafor');

    // Quick reply from the reading pane
    (el.querySelector('.mx-row') as HTMLElement).click();
    fixture.detectChanges();
    const ta = el.querySelector('.mx-quick textarea') as HTMLTextAreaElement;
    ta.value = 'Enabled 2-step verification ✅';
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    btn(el, 'Send reply').click();
    fixture.detectChanges();
    const reply = mail.sent()[0];
    expect(reply.to).toEqual(['daniel']);
    expect(reply.subject).toBe('Re: 2-step verification is now available for admin accounts');
    expect(reply.body.startsWith('Enabled 2-step verification ✅')).toBe(true);
    expect(el.querySelectorAll('.mx-msg').length).toBe(2);
  });

  it('C: Sent lists messages sent to other admins with read receipts', () => {
    const r = routeMock({ folder: 'sent' });
    TestBed.configureTestingModule({ imports: [AdminMailFolder], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminMailFolder);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.mx-title h2')?.textContent).toContain('Sent');
    const rows = el.querySelectorAll('.mx-row');
    expect(rows.length).toBe(7);
    expect([...rows].every((row) => row.querySelector('.mx-who')?.textContent?.startsWith('To: '))).toBe(true);
    const policy = [...rows].find((row) => row.textContent?.includes('Updated abuse report policy v2')) as HTMLElement;
    policy.click();
    fixture.detectChanges();
    expect(el.querySelector('.mx-receipt')?.textContent).toContain('Read by Priya Sharma, Ananya Iyer');
    // The conversation includes Priya's reply from the inbox.
    expect(el.querySelectorAll('.mx-msg, .mx-msg-collapsed').length).toBe(2);
    expect(el.querySelector('.mx-msg-collapsed, .mx-msg')?.textContent).toBeTruthy();
  });

  it('D: Compose — add admins to To/Cc (typing, directory, teams), attach files and send', async () => {
    const r = routeMock({});
    TestBed.configureTestingModule({ imports: [AdminMailCompose], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const mail = TestBed.inject(AdminMailService);
    const fixture = TestBed.createComponent(AdminMailCompose);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.mx-title h2')?.textContent).toContain('New message');
    expect(el.querySelector('.mc-help')?.textContent).toContain('How to add admins');

    // Type in To → suggestions → Enter adds a chip
    const toInput = el.querySelector('#rc-to') as HTMLInputElement;
    toInput.dispatchEvent(new Event('focus'));
    toInput.value = 'pri';
    toInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const sugg = el.querySelectorAll('.rc-suggest li');
    expect(sugg.length).toBeGreaterThan(0);
    expect(sugg[0].textContent).toContain('Priya Sharma');
    toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect([...el.querySelectorAll('app-mail-recipients .rc-chip')].map((c) => c.textContent)).toEqual([expect.stringContaining('Priya Sharma')]);

    // Paste several addresses, one is not an admin → red chip blocks sending
    const paste = new Event('paste') as Event & { clipboardData: unknown };
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'arjun.mehta@neverbeen.com; hacker@gmail.com' } });
    toInput.dispatchEvent(paste);
    fixture.detectChanges();
    expect(el.querySelectorAll('.rc-chip').length).toBe(3);
    expect(el.querySelector('.rc-chip.bad')?.textContent).toContain('hacker@gmail.com');
    btn(el, '➤ Send').click();
    fixture.detectChanges();
    expect(el.querySelector('.mc-errors')?.textContent).toContain('only be sent to other NeverBeen admins');
    (el.querySelector('.rc-chip.bad button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Directory: Cc button opens the Cc line and adds the admin; moving between lines is exclusive
    const people = [...el.querySelectorAll('.mc-people li')] as HTMLElement[];
    const rahul = people.find((li) => li.textContent?.includes('Rahul Verma'))!;
    btn(rahul, 'Cc').click();
    fixture.detectChanges();
    const ccLine = el.querySelectorAll('app-mail-recipients')[1] as HTMLElement;
    expect(ccLine.querySelector('.rc-label')?.textContent).toContain('Cc');
    expect(ccLine.textContent).toContain('Rahul Verma');
    const arjunRow = people.find((li) => li.textContent?.includes('Arjun Mehta'))!;
    btn(arjunRow, 'Cc').click(); // Arjun was in To → moves to Cc
    fixture.detectChanges();
    const toLine = el.querySelectorAll('app-mail-recipients')[0] as HTMLElement;
    expect(toLine.textContent).not.toContain('Arjun Mehta');
    expect(ccLine.textContent).toContain('Arjun Mehta');

    // Team: add Legal & Finance to To (Rahul moves from Cc to To, Zoya added)
    const legal = [...el.querySelectorAll('.mc-team')].find((t) => t.textContent?.includes('Legal & Finance')) as HTMLElement;
    btn(legal, '+ To').click();
    fixture.detectChanges();
    expect(toLine.textContent).toContain('Zoya Khan');
    expect(toLine.textContent).toContain('Rahul Verma');
    expect(ccLine.textContent).not.toContain('Rahul Verma');

    // Subject, body, formatting
    const subject = el.querySelector('#mc-subject') as HTMLInputElement;
    subject.value = 'Q4 moderation budget';
    subject.dispatchEvent(new Event('input'));
    const body = el.querySelector('.mc-body') as HTMLTextAreaElement;
    body.value = 'Please review the numbers.';
    body.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    body.setSelectionRange(7, 13); // "review"
    (el.querySelector('.mc-toolbar [aria-label="Bold"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((el.querySelector('.mc-body') as HTMLTextAreaElement).value).toBe('Please **review** the numbers.');
    btn(el, 'Preview').click();
    fixture.detectChanges();
    expect(el.querySelector('.mc-preview strong')?.textContent).toBe('review');
    btn(el, 'Write').click();
    fixture.detectChanges();

    // Attachments: a document and a picture are accepted; wrong type and oversize are rejected
    const cmp = fixture.componentInstance;
    const pdf = new File(['%PDF-1.4 budget'], 'q4-budget.pdf', { type: 'application/pdf' });
    const png = new File([new Uint8Array([137, 80, 78, 71])], 'chart.png', { type: 'image/png' });
    const exe = new File(['MZ'], 'setup.exe', { type: 'application/x-msdownload' });
    const huge = new File(['x'], 'video.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: ATTACH_RULES.maxFileBytes + 1 });
    cmp.addFiles([pdf, png, exe, huge]);
    fixture.detectChanges();
    expect(el.querySelector('.mc-errors.files')?.textContent).toContain('setup.exe');
    expect(el.querySelector('.mc-errors.files')?.textContent).toContain('video.png');
    for (let i = 0; i < 20 && el.querySelectorAll('.mc-att.done').length < 2; i++) {
      await flush();
      fixture.detectChanges();
    }
    expect(el.querySelectorAll('.mc-att.done').length).toBe(2);
    expect(el.querySelector('.mc-att img')).toBeTruthy();

    btn(el, '➤ Send').click();
    fixture.detectChanges();
    const sent = mail.sent()[0];
    expect(sent.subject).toBe('Q4 moderation budget');
    expect(sent.to.sort()).toEqual(['priya', 'rahul', 'zoya']);
    expect(sent.cc).toEqual(['arjun']);
    expect(sent.attachments.map((a) => a.name)).toEqual(['q4-budget.pdf', 'chart.png']);
    expect(sent.attachments[1].dataUrl?.startsWith('data:image/png')).toBe(true);
    expect(sent.body).toContain('Please **review** the numbers.');
    expect(sent.body).toContain('Super Administrator'); // signature
    expect(nav).toHaveBeenCalledWith(['/admin/mail/sent'], { queryParams: { m: sent.id, sent: sent.id } });
    expect(mail.draft()).toBeNull();
  });

  it('D: Compose asks before sending without subject / with a forgotten attachment, and autosaves drafts', async () => {
    const r = routeMock({});
    TestBed.configureTestingModule({ imports: [AdminMailCompose], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const mail = TestBed.inject(AdminMailService);
    const fixture = TestBed.createComponent(AdminMailCompose);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    btn(el, '➤ Send').click();
    fixture.detectChanges();
    expect(el.querySelector('.mc-errors')?.textContent).toContain('Add at least one admin');

    const person = [...el.querySelectorAll('.mc-people li')].find((li) => li.textContent?.includes('Kenji')) as HTMLElement;
    btn(person, 'To').click();
    const body = el.querySelector('.mc-body') as HTMLTextAreaElement;
    body.value = 'See the attached mockups.';
    body.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Draft autosaves after a short pause
    await new Promise((res) => setTimeout(res, 900));
    fixture.detectChanges();
    expect(mail.draft()?.to).toEqual(['kenji']);
    expect(el.querySelector('.mc-status')?.textContent).toContain('Draft saved');

    btn(el, '➤ Send').click();
    fixture.detectChanges();
    let dialog = document.body.querySelector('.g-modal') as HTMLElement;
    expect(dialog.textContent).toContain('Send without a subject?');
    btn(dialog, 'Send anyway').click();
    fixture.detectChanges();
    dialog = document.body.querySelector('.g-modal') as HTMLElement;
    expect(dialog.textContent).toContain('forget an attachment');
    btn(dialog, 'Send without it').click();
    fixture.detectChanges();
    expect(mail.sent()[0].subject).toBe('(no subject)');
    expect(mail.sent()[0].to).toEqual(['kenji']);
  });

  it('D: Reply opens Compose pre-filled from the original message', () => {
    const r = routeMock({}, { replyAll: 'm102' });
    TestBed.configureTestingModule({ imports: [AdminMailCompose], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: r.value }] });
    const fixture = TestBed.createComponent(AdminMailCompose);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.mx-title h2')?.textContent).toContain('Reply all');
    const lines = el.querySelectorAll('app-mail-recipients');
    expect(lines[0].textContent).toContain('Arjun Mehta');
    expect(lines[1].textContent).toContain('Daniel Okafor');
    expect(lines[1].textContent).toContain('Kenji Watanabe');
    expect((el.querySelector('#mc-subject') as HTMLInputElement).value).toBe('Re: Release 4.8 — maintenance window Saturday 02:00–03:00 IST');
    expect((el.querySelector('.mc-body') as HTMLTextAreaElement).value).toContain('Arjun Mehta wrote:');
  });
});
