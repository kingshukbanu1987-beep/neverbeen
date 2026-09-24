import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommunityService } from '../../services/community.service';
import { PreviewableUser, UserHoverCard, UserPreviewDirective, UserPreviewOverlayService } from './index';

@Component({
  selector: 'app-uhc-test-host',
  standalone: true,
  imports: [UserPreviewDirective, UserHoverCard],
  template: `
    <button type="button" class="uhc-trigger" [nbUserPreview]="user">Hover me</button>
    <app-user-hover-card />
  `,
})
class UhcTestHost {
  user: PreviewableUser = {
    id: 33,
    uniqueId: '89201534010000000033',
    fullName: 'Elena Rostova',
    profilePhotoUrl: 'https://example.com/elena.jpg',
    profession: 'Travel Blogger',
    city: 'Paris',
    country: 'France',
    isVerified: true,
    activeStatus: 'Active',
  };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('User hover preview card', () => {
  let service: CommunityService;
  let overlay: UserPreviewOverlayService;

  function mountAnchor(): HTMLElement {
    const anchor = document.createElement('div');
    anchor.className = 'uhc-anchor';
    document.body.appendChild(anchor);
    return anchor;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UhcTestHost],
      providers: [CommunityService],
    }).compileComponents();

    service = TestBed.inject(CommunityService);
    overlay = TestBed.inject(UserPreviewOverlayService);
    service.loginAsDemoUser('active_member');
  });

  afterEach(() => {
    document.body.querySelectorAll('.uhc-anchor, .uhc-host').forEach((el) => el.remove());
  });

  it('shows the preview card after a short hover delay and disappears when the pointer leaves', async () => {
    const author = service.journeyPosts()[0].author;
    const expectedJourneyCount = service
      .journeyPosts()
      .filter((p) => p.author.id === author.id).length;
    const anchor = mountAnchor();

    overlay.show(author, anchor);
    expect(overlay.state()).toBeNull(); // not shown immediately

    await delay(400);
    const card = overlay.state();
    expect(card).not.toBeNull();
    expect(card!.name).toBe(author.fullName);
    expect(card!.journeyPostCount).toBe(expectedJourneyCount);
    expect(card!.journeyPostCount).toBeGreaterThan(0);
    expect(card!.companionCount).toBeGreaterThanOrEqual(12);
    expect(card!.placement).toMatch(/^(right|left)$/);
    expect(card!.x).toBeGreaterThanOrEqual(10);
    expect(card!.y).toBeGreaterThanOrEqual(10);

    overlay.hide();
    expect(overlay.state()!.visible).toBe(false); // fading out

    await delay(250);
    expect(overlay.state()).toBeNull(); // removed from the DOM
  });

  it('stays visible while the pointer is over the card itself', async () => {
    const author = service.journeyPosts()[0].author;
    const anchor = mountAnchor();

    overlay.show(author, anchor);
    await delay(400);
    expect(overlay.state()).not.toBeNull();

    overlay.hide(); // pointer left the anchor…
    overlay.cardEntered(); // …but moved onto the card
    await delay(300);
    expect(overlay.state()).not.toBeNull();
    expect(overlay.state()!.visible).toBe(true);

    overlay.hide(); // pointer finally left the card
    await delay(250);
    expect(overlay.state()).toBeNull();
  });

  it('re-anchors the card when hovering a different traveler', async () => {
    const first = service.journeyPosts()[0].author;
    const otherPost = service.journeyPosts().find((p) => p.author.id !== first.id);
    const second = otherPost ? otherPost.author : service.companions()[0];
    const anchor = mountAnchor();

    overlay.show(first, anchor);
    await delay(400);
    expect(overlay.state()!.name).toBe(first.fullName);

    overlay.show(second, anchor);
    await delay(400);
    expect(overlay.state()!.name).toBe(second.fullName);
    expect(overlay.state()!.journeyPostCount).toBe(
      service.journeyPosts().filter((p) => p.author.id === second.id).length,
    );

    overlay.hide();
    await delay(250);
  });

  it('shows the mutual companion count when hovering one of my companions', async () => {
    const companion = service
      .companions()
      .find((c) => c.mutualCompanionsCount !== undefined && c.mutualCompanionsCount !== null);
    if (!companion) return; // no seeded companion carries a mutual count
    const anchor = mountAnchor();

    overlay.show(companion, anchor);
    await delay(400);

    expect(overlay.state()!.name).toBe(companion.fullName);
    expect(overlay.state()!.mutualWithMe).toBe(companion.mutualCompanionsCount);
    expect(overlay.state()!.location).toContain(companion.city);

    overlay.hide();
    await delay(250);
  });

  it('renders the ultra-modern card in the DOM while hovering a user name', async () => {
    const fixture = TestBed.createComponent(UhcTestHost);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.uhc-trigger') as HTMLElement;
    trigger.dispatchEvent(new Event('mouseenter'));
    await delay(400);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.uhc-card') as HTMLElement | null;
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain('Elena Rostova');
    expect(card!.textContent).toContain('Travel Blogger');
    expect(card!.textContent).toContain('Paris, France');
    expect(card!.querySelectorAll('.uhc-stat-chip').length).toBeGreaterThanOrEqual(2);
    expect(card!.querySelector('.uhc-verified')).not.toBeNull();

    trigger.dispatchEvent(new Event('mouseleave'));
    await delay(400);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.uhc-card')).toBeNull();
  });
});
