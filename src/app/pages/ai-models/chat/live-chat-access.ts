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
  /** Free Chat is the open default; selecting either card updates the summary in the top centre. */
  protected readonly selected = signal<LiveChatPlan>('free');
  protected readonly registrationMessage = signal('');

  private readonly community = inject(CommunityService);
  private resumeHandled = false;

  constructor() {
    // The Google callback and Community registration return to this same component. Once the
    // member session is available, take them straight to the requested profile review rather than
    // making them choose the plan a second time.
    effect(() => {
      if (!this.resumeRegistered() || this.resumeHandled || !this.isRegisteredMember()) return;
      this.resumeHandled = true;
      this.selected.set('registered');
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
    () => this.isRegisteredMember() && Boolean(this.memberPhoto()) && this.memberName() !== 'Community member',
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
    this.selected.set(plan);
  }

  protected start(plan: LiveChatPlan): void {
    this.selected.set(plan);
    this.registrationMessage.set('');
    if (plan === 'free') {
      this.freeStarted.emit();
      return;
    }

    if (this.isRegisteredMember()) {
      this.stage.set('member-check');
      return;
    }
    this.stage.set('sign-in');
  }

  protected backToPlans(): void {
    this.registrationMessage.set('');
    this.stage.set('plans');
  }

  protected startRegisteredChat(): void {
    if (!this.isRegisteredMember()) {
      this.stage.set('sign-in');
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

  protected modelLocation(): string {
    return this.model()
      .location.split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' · ');
  }
}
