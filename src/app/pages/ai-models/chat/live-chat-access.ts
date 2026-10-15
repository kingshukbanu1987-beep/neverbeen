import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { PREMIUM_PAYMENT_NOTE, UPI_APPS, UpiApp, premiumPriceLabel } from './premium-payment';
import {
  PAYMENT_PACKAGES,
  PaymentPackageId,
  paymentBreakdown,
  paymentDurationMs,
} from './payment-packages';
import { UpiAppLauncher } from './upi-app-launcher';

type AccessStage = 'plans' | 'sign-in' | 'member-check' | 'payment';

type PlanFeature = LiveChatPlanFeature;

/** The three Live Chat plans in the order their blocks are laid out. */
const PLAN_ORDER: readonly LiveChatPlan[] = ['free', 'registered', 'premium'];

/**
 * The deliberate access step placed in front of every Live Chat. It presents the three
 * entitlements — Free Chat, Registered User and the paid Premium plan — then passes Free Chat to
 * the existing identity form, or checks a Community member and, for a priced Premium chat,
 * opens their chosen UPI app. Payment verification is temporarily disabled by the owner:
 * returning from that app opens the chat without claiming payment was successful.
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

  /** Temporary app handoff only: none of these states assert that a payment was received. */
  protected readonly upiApps = UPI_APPS;
  protected readonly paymentNote = PREMIUM_PAYMENT_NOTE;
  protected readonly paymentMethod = signal<UpiApp>('gpay');
  protected readonly paymentState = signal<'idle' | 'opening' | 'continuing' | 'error'>('idle');
  protected readonly paymentBusy = computed(
    () => this.paymentState() === 'opening' || this.paymentState() === 'continuing',
  );
  protected readonly paymentAppName = computed(
    () => UPI_APPS.find((app) => app.id === this.paymentMethod())!.label,
  );
  protected readonly paymentPackages = PAYMENT_PACKAGES;
  protected readonly selectedPackage = signal<PaymentPackageId>('basic');
  protected readonly breakdown = computed(() =>
    paymentBreakdown(this.premiumPrice() ?? 0, this.selectedPackage()),
  );
  protected readonly durationMinutes = computed(
    () => paymentDurationMs(this.selectedPackage()) / 60_000,
  );
  protected money(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }
  protected packageDuration(id: PaymentPackageId): number {
    return paymentDurationMs(id) / 60_000;
  }
  protected packageExtra(id: PaymentPackageId): number {
    return paymentBreakdown(this.premiumPrice() ?? 0, id).upgrade;
  }
  protected selectPackage(id: PaymentPackageId): void {
    if (this.paymentBusy()) return;
    this.selectedPackage.set(id);
    this.resetPayment();
  }
  protected readonly paymentError = signal('');

  private readonly community = inject(CommunityService);
  private readonly upiLauncher = inject(UpiAppLauncher);
  private activePayment: AbortController | null = null;
  private resumeHandled = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopPaymentHandoff());
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
      this.resetPayment();
      this.selectedPackage.set('basic');
      this.stage.set('payment');
      return;
    }
    this.registeredStarted.emit(identity);
  }

  protected startRegisteredChat(): void {
    this.startMemberChat();
  }

  protected backToReview(): void {
    this.resetPayment();
    this.stage.set('member-check');
  }

  protected close(): void {
    this.resetPayment();
    this.closed.emit();
  }

  protected selectUpiApp(method: UpiApp): void {
    if (this.paymentBusy()) return;
    this.paymentMethod.set(method);
    this.resetPayment();
  }

  /**
   * The owner explicitly opted out of payment verification for now. A return from the app opens
   * the chat automatically, even if payment was cancelled there. Do not label this as verified or
   * use this return signal as evidence of payment when a merchant gateway is added later.
   */
  protected payAndChat(): void {
    if (this.stage() !== 'payment' || this.paymentBusy()) return;
    if (!this.canStartRegistered()) {
      this.failPayment(
        'Your Community session has changed. Go back to chat details and sign in again.',
      );
      return;
    }
    const amount = this.premiumPrice() === null ? null : this.breakdown().total;
    const paymentPackageId = this.selectedPackage();
    if (this.selected() !== 'premium' || amount === null) return;
    const modelSlug = this.model().slug;
    const memberId = this.community.currentUser()?.id;
    const controller = new AbortController();
    this.activePayment = controller;
    this.paymentState.set('opening');
    this.paymentError.set('');

    void this.upiLauncher
      .open({ modelSlug, amount, method: this.paymentMethod() }, controller.signal)
      .then(() => {
        if (this.activePayment !== controller || controller.signal.aborted) return;
        this.activePayment = null;
        if (
          this.stage() !== 'payment' ||
          this.model().slug !== modelSlug ||
          this.community.currentUser()?.id !== memberId ||
          !this.canStartRegistered()
        ) {
          this.failPayment(
            'Your chat details or Community session changed. Review them before trying again.',
          );
          return;
        }
        this.paymentState.set('continuing');
        this.premiumStarted.emit({
          name: this.memberName(),
          avatar: this.memberPhoto(),
          paymentPackageId,
        });
      })
      .catch((error: unknown) => {
        if (this.activePayment !== controller || controller.signal.aborted) return;
        this.activePayment = null;
        this.failPayment(
          error instanceof Error
            ? error.message
            : 'The payment app could not be opened. Try again.',
        );
      });
  }

  protected cancelPayment(): void {
    this.stopPaymentHandoff();
    this.failPayment('The payment app handoff was cancelled. Try again when you are ready.');
  }

  private failPayment(message: string): void {
    this.paymentState.set('error');
    this.paymentError.set(message);
  }

  private stopPaymentHandoff(): void {
    this.activePayment?.abort();
    this.activePayment = null;
  }

  private resetPayment(): void {
    this.stopPaymentHandoff();
    this.paymentState.set('idle');
    this.paymentError.set('');
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
