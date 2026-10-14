import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { CommunitySignInCard } from '../../../shared/community-sign-in-card/community-sign-in-card';
import { AiModelProfile } from '../ai-model-data';
import { ChatIdentity } from './chat-identity';
import { requiresRegisteredChat } from './live-chat-policy';
import { LIVE_CHAT_PLANS, LiveChatPlan } from './chat-types';

type AccessStage = 'plans' | 'sign-in' | 'member-check';

type PlanFeature = {
  text: string;
  included: boolean;
  emphasis?: boolean;
};

/**
 * The deliberate access step placed in front of every Live Chat. It presents the two entitlements
 * first, then either passes Free Chat to the existing identity form or verifies a Community member
 * and lets them review both sides of a Registered User chat before it opens.
 */
@Component({
  selector: 'app-live-chat-access',
  imports: [RouterLink, CommunitySignInCard],
  templateUrl: './live-chat-access.html',
  styleUrl: './live-chat-access.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveChatAccess {
  readonly model = input.required<AiModelProfile>();
  /** Safe same-origin destination held across the Google / registration round trip. */
  readonly returnTo = input.required<string>();
  /** The return destination tells us a member has just completed Community access. */
  readonly resumeRegistered = input(false);

  readonly closed = output<void>();
  readonly freeStarted = output<void>();
  readonly registeredStarted = output<ChatIdentity>();

  protected readonly plans = LIVE_CHAT_PLANS;
  protected readonly stage = signal<AccessStage>('plans');
  protected readonly registeredOnly = computed(() => requiresRegisteredChat(this.model()));
  /** Exclusive models always show Registered User, including when the model input changes. */
  private readonly preferredPlan = signal<LiveChatPlan>('free');
  protected readonly selected = computed<LiveChatPlan>(() =>
    this.registeredOnly() ? 'registered' : this.preferredPlan(),
  );
  protected readonly registrationMessage = signal('');
  /** Incremented as the member sign-in form opens, so its album backdrop is newly randomised. */
  private readonly signInPhotoSelection = signal(0);

  private readonly community = inject(CommunityService);
  private resumeHandled = false;

  constructor() {
    // The Google callback and Community registration return to this same component. Once the
    // member session is available, take them straight to the requested profile review rather than
    // making them choose the plan a second time.
    effect(() => {
      if (!this.resumeRegistered() || this.resumeHandled || !this.isRegisteredMember()) return;
      this.resumeHandled = true;
      this.preferredPlan.set('registered');
      this.stage.set('member-check');
    });
  }

  /** A guest tour is never a Community account for member-only Live Chat. */
  protected readonly isRegisteredMember = computed(() => {
    const user = this.community.currentUser();
    return Boolean(
      this.community.isAuthenticated() &&
      !this.community.guestBrowsing() &&
      user?.profileComplete &&
      user.status.trim().toLocaleLowerCase() === 'active',
    );
  });

  protected readonly member = computed(() => this.community.profile() ?? null);
  protected readonly memberName = computed(() => {
    const profile = this.member();
    const user = this.community.currentUser();
    return (
      profile?.fullName?.trim() ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
      user?.fullName?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      'Community member'
    );
  });
  protected readonly memberLocation = computed(() => {
    const profile = this.member();
    return [profile?.cityName ?? profile?.city, profile?.countryName ?? profile?.country]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(', ');
  });
  protected readonly memberPhoto = computed(
    () =>
      this.member()?.profilePhotoUrl ||
      this.member()?.externalProfilePictureUrl ||
      this.community.currentUser()?.profilePhotoUrl ||
      '',
  );
  protected readonly memberInitials = computed(() =>
    this.memberName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase())
      .join(''),
  );
  protected readonly canStartRegistered = computed(
    () =>
      this.isRegisteredMember() &&
      Boolean(this.memberPhoto()) &&
      this.memberName() !== 'Community member',
  );

  protected readonly freeFeatures: readonly PlanFeature[] = [
    { text: 'Text-based chat conversations', included: true },
    { text: 'No photo or video sharing', included: false },
    { text: 'Access to the selected NeverBeen model', included: true },
    { text: 'Shorter chat duration up to 2 minutes', included: true, emphasis: true },
    { text: 'Basic conversational memory', included: true },
    { text: 'Standard response speed', included: true },
  ];

  protected readonly registeredFeatures: readonly PlanFeature[] = [
    { text: 'Text-based chat conversations', included: true },
    { text: 'Photo or video sharing', included: true, emphasis: true },
    { text: 'Access to all NeverBeen models', included: true },
    { text: 'More chat duration up to 45 minutes', included: true, emphasis: true },
    { text: 'Advanced conversation memory', included: true },
    { text: 'Faster response speed', included: true },
  ];

  protected choose(plan: LiveChatPlan): void {
    if (plan === 'free' && this.registeredOnly()) return;
    this.preferredPlan.set(plan);
  }

  protected start(plan: LiveChatPlan): void {
    if (plan === 'free' && this.registeredOnly()) return;
    this.preferredPlan.set(plan);
    this.registrationMessage.set('');
    if (plan === 'free') {
      this.freeStarted.emit();
      return;
    }

    if (this.isRegisteredMember()) {
      this.stage.set('member-check');
      return;
    }
    this.openSignIn();
  }

  protected backToPlans(): void {
    this.registrationMessage.set('');
    this.stage.set('plans');
  }

  protected startRegisteredChat(): void {
    if (!this.isRegisteredMember()) {
      this.openSignIn();
      return;
    }
    if (!this.canStartRegistered()) {
      this.registrationMessage.set(
        'Your Community profile needs a display name and profile photo before a registered Live Chat can start.',
      );
      return;
    }
    this.registeredStarted.emit({ name: this.memberName(), avatar: this.memberPhoto() });
  }

  private openSignIn(): void {
    // Trigger the photo computed to make a new random selection when this form opens again.
    this.signInPhotoSelection.update((selection) => selection + 1);
    this.stage.set('sign-in');
  }

  /**
   * Supplies a fresh photograph from the selected model's own album for every opening of the
   * registration form, without changing it while the member completes their sign-in.
   */
  protected readonly modelAlbumBackdrop = computed(() => {
    const model = this.model();
    const albumPhotos = model.photos.filter((photo) => photo.src && photo.src !== model.cover);
    const candidates = albumPhotos.length ? albumPhotos : model.photos;
    if (!candidates.length) return model.cover;

    // Depend on the opening counter so the memoized computed picks one new photo per form visit,
    // while it remains stable for the complete sign-in interaction.
    this.signInPhotoSelection();
    return candidates[Math.floor(Math.random() * candidates.length)].src;
  });

  protected modelLocation(): string {
    return this.modelLocationParts().join(' · ');
  }

  /** The top profile treatment keeps city and country distinct instead of flattening them into one line. */
  protected modelCity(): string {
    return this.modelLocationParts()[0] ?? '';
  }

  protected modelCountry(): string {
    const places = this.modelLocationParts();
    return places.length > 1 ? places[places.length - 1] : '';
  }

  private modelLocationParts(): string[] {
    return this.model()
      .location.split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}
