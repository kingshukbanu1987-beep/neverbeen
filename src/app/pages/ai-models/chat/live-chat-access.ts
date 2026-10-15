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
import { ModelVerifiedTick } from '../../../shared/model-verified-tick/model-verified-tick';
import { AiModelProfile } from '../ai-model-data';
import { ChatIdentity } from './chat-identity';
import {
  allowsLiveChatPlan,
  modelChatTier,
  premiumChatPrice,
  requiresRegisteredChat,
} from './live-chat-policy';
import {
  LIVE_CHAT_PLANS,
  LiveChatPlan,
  LiveChatPlanFeature,
  LiveChatPlanDefinition,
} from './chat-types';
import {
  NEVERBEEN_UPI_ID,
  PREMIUM_PAYMENT_GATEWAY_NOTE,
  UPI_APPS,
  UpiApp,
  isValidUpiTransactionId,
  premiumPriceLabel,
  verifyPremiumTransaction,
} from './premium-payment';

type AccessStage = 'plans' | 'sign-in' | 'member-check' | 'payment';

type PlanFeature = LiveChatPlanFeature;

/** The three Live Chat plans in the order their blocks are laid out. */
const PLAN_ORDER: readonly LiveChatPlan[] = ['free', 'registered', 'premium'];

/**
 * The deliberate access step placed in front of every Live Chat. It presents the three
 * entitlements — Free Chat, Registered User and the paid Premium plan — then passes Free Chat to
 * the existing identity form, or verifies a Community member and, for a Premium chat with a
 * priced model, verifies the UPI payment before the chat opens.
 */
@Component({
  selector: 'app-live-chat-access',
  imports: [RouterLink, CommunitySignInCard, ModelVerifiedTick],
  templateUrl: './live-chat-access.html',
  styleUrl: './live-chat-access.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveChatAccess {
  readonly model = input.required<AiModelProfile>();
  /**
   * Safe same-origin destination held across the Google / registration round trip. The plan being
   * resumed travels in its `liveChatPlan` query parameter, appended when the sign-in opens.
   */
  readonly returnTo = input.required<string>();
  /** The plan a member has just completed Community access for, resumed after the round trip. */
  readonly resumePlan = input<LiveChatPlan | null>(null);

  readonly closed = output<void>();
  readonly freeStarted = output<void>();
  readonly registeredStarted = output<ChatIdentity>();
  readonly premiumStarted = output<ChatIdentity>();

  protected readonly plans = LIVE_CHAT_PLANS;
  protected readonly planOrder = PLAN_ORDER;
  protected readonly stage = signal<AccessStage>('plans');
  protected readonly tier = computed(() => modelChatTier(this.model()));
  /** Exclusive and Premium models carry the blue tick and require Community registration. */
  protected readonly registeredOnly = computed(() => requiresRegisteredChat(this.model()));
  protected readonly preferredPlan = signal<LiveChatPlan>('free');
  protected readonly selected = computed<LiveChatPlan>(() => {
    const preferred = this.preferredPlan();
    if (allowsLiveChatPlan(this.model(), preferred)) return preferred;
    return PLAN_ORDER.find((plan) => allowsLiveChatPlan(this.model(), plan)) ?? 'premium';
  });
  protected readonly registrationMessage = signal('');

  /** The rupee amount of a Premium Live Chat with this model — `null` when she has no price. */
  protected readonly premiumPrice = computed(() => premiumChatPrice(this.model()));
  protected readonly premiumPriceLabel = computed(() => {
    const amount = this.premiumPrice();
    return amount === null ? '' : premiumPriceLabel(amount);
  });

  /** Incremented as the member sign-in form opens, so its album backdrop is newly randomised. */
  private readonly signInPhotoSelection = signal(0);

  /** The Premium payment step: chosen UPI app, its transaction reference and the verification. */
  protected readonly upiApps = UPI_APPS;
  protected readonly upiId = NEVERBEEN_UPI_ID;
  protected readonly gatewayNote = PREMIUM_PAYMENT_GATEWAY_NOTE;
  protected readonly paymentMethod = signal<UpiApp>('gpay');
  protected readonly transactionId = signal('');
  protected readonly paymentState = signal<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  protected readonly paymentError = signal('');

  private readonly community = inject(CommunityService);
  private resumeHandled = false;

  constructor() {
    // The Google callback and Community registration return to this same component. Once the
    // member session is available, take them straight to the requested profile review rather than
    // making them choose the plan a second time.
    effect(() => {
      const plan = this.resumePlan();
      if (!plan || this.resumeHandled || !this.isRegisteredMember()) return;
      this.resumeHandled = true;
      this.preferredPlan.set(plan);
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

  protected planAvailable(plan: LiveChatPlan): boolean {
    return allowsLiveChatPlan(this.model(), plan);
  }

  protected planDefinition(plan: LiveChatPlan): LiveChatPlanDefinition {
    return LIVE_CHAT_PLANS[plan];
  }

  protected featuresOf(plan: LiveChatPlan): readonly PlanFeature[] {
    return LIVE_CHAT_PLANS[plan].features;
  }

  /** The plan name shown on the sign-in card's note line, with its duration. */
  protected planNote(plan: LiveChatPlan): string {
    const definition = LIVE_CHAT_PLANS[plan];
    return `${definition.label} Live Chat · profile registration required · ${definition.durationLabel}`;
  }

  protected choose(plan: LiveChatPlan): void {
    if (!this.planAvailable(plan)) return;
    this.preferredPlan.set(plan);
  }

  protected start(plan: LiveChatPlan): void {
    if (!this.planAvailable(plan)) return;
    this.preferredPlan.set(plan);
    this.registrationMessage.set('');
    if (plan === 'free') {
      this.freeStarted.emit();
      return;
    }

    // Registered User and Premium both continue as a verified Community member.
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

  /** From the profile review: straight into the chat, or on to the Premium payment step. */
  protected startMemberChat(): void {
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
    const identity: ChatIdentity = { name: this.memberName(), avatar: this.memberPhoto() };
    const plan = this.selected();
    if (plan === 'premium') {
      if (this.premiumPrice() === null) {
        // A Premium session with an unpriced model acts exactly like the Registered User flow.
        this.premiumStarted.emit(identity);
        return;
      }
      this.paymentState.set('idle');
      this.paymentError.set('');
      this.stage.set('payment');
      return;
    }
    this.registeredStarted.emit(identity);
  }

  protected startRegisteredChat(): void {
    this.startMemberChat();
  }

  protected backToReview(): void {
    this.paymentError.set('');
    this.paymentState.set('idle');
    this.stage.set('member-check');
  }

  protected selectUpiApp(method: UpiApp): void {
    this.paymentMethod.set(method);
  }

  protected onTransactionId(event: Event): void {
    this.transactionId.set((event.target as HTMLInputElement).value.slice(0, 40));
  }

  /**
   * Verifies the UPI transaction the member paid with. Only a verified payment opens the Premium
   * chat; the Razorpay gateway replaces this check later without changing the screen.
   */
  protected verifyPayment(): void {
    if (this.paymentState() === 'verifying') return;
    const amount = this.premiumPrice();
    const reference = this.transactionId().trim();
    if (!isValidUpiTransactionId(reference)) {
      this.paymentState.set('error');
      this.paymentError.set(
        'Enter the UPI transaction reference (6–32 letters and digits) shown in your payment app.',
      );
      return;
    }
    this.paymentState.set('verifying');
    this.paymentError.set('');
    void verifyPremiumTransaction({
      modelSlug: this.model().slug,
      amount: amount ?? 0,
      method: this.paymentMethod(),
      transactionId: reference,
    })
      .then(() => {
        this.paymentState.set('verified');
      })
      .catch((error: unknown) => {
        this.paymentState.set('error');
        this.paymentError.set(
          error instanceof Error ? error.message : 'That payment could not be verified. Try again.',
        );
      });
  }

  /** The chat opens only after a verified payment. */
  protected startPremiumChat(): void {
    if (this.paymentState() !== 'verified') {
      this.verifyPayment();
      return;
    }
    if (!this.canStartRegistered()) return;
    this.premiumStarted.emit({ name: this.memberName(), avatar: this.memberPhoto() });
  }

  private openSignIn(): void {
    // Trigger the photo computed to make a new random selection when this form opens again.
    this.signInPhotoSelection.update((selection) => selection + 1);
    this.stage.set('sign-in');
  }

  /**
   * The sign-in card returns here with the plan that opened it in the query string, so a Premium
   * guest resumes the payment flow and a Registered guest resumes their profile review.
   */
  protected readonly signInReturnTo = computed(() => {
    const base = this.returnTo();
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}liveChatPlan=${encodeURIComponent(this.selected())}`;
  });

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
