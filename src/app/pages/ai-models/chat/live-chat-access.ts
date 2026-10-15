import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
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
  DESKTOP_CHAT_START_DELAY_MS,
  DESKTOP_PAYMENT_NOTE,
  PREMIUM_PAYMENT_NOTE,
  UPI_APPS,
  UpiApp,
  normalizeUpiId,
  premiumPriceLabel,
  upiIdError,
  upiQrPayload,
} from './premium-payment';
import { findPaymentCoupon, PaymentCoupon } from './payment-coupons';
import {
  PAYMENT_PACKAGES,
  PaymentPackageId,
  PREMIUM_CONTENT_COVERAGES,
  PremiumContentCoverageId,
  paymentBreakdown,
  paymentDurationMs,
  premiumContentCoveragePrice,
} from './payment-packages';
import { UpiAppLauncher } from './upi-app-launcher';
import { UpiQrCode, upiQrCode } from './upi-qr';

type AccessStage = 'plans' | 'sign-in' | 'member-check' | 'payment';

/**
 * `opening` — a phone/tablet is handing off to its payment app; `scanning` — a laptop/desktop
 * shows the payment QR code and counts down to the chat. Neither asserts a payment was received.
 */
type PaymentState = 'idle' | 'opening' | 'scanning' | 'continuing' | 'error';

type PlanFeature = LiveChatPlanFeature;

/** The three Live Chat plans in the order their blocks are laid out. */
const PLAN_ORDER: readonly LiveChatPlan[] = ['free', 'registered', 'premium'];

/**
 * The deliberate access step placed in front of every Live Chat. It presents the three
 * entitlements — Free Chat, Registered User and the paid Premium plan — then passes Free Chat to
 * the existing identity form, or checks a Community member and, for a priced Premium chat,
 * opens their chosen UPI app — or, on a laptop or desktop, takes their UPI ID and shows a UPI QR
 * code to scan with their phone, opening the chat ten seconds later. Payment verification is
 * temporarily disabled by the owner: neither path claims that a payment was successful.
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

  /** Temporary, unverified payment only: none of these states assert a payment was received. */
  protected readonly upiApps = UPI_APPS;
  /**
   * Laptops and desktops cannot open a phone's payment app (and NPCI no longer allows a website
   * to send a collect request to a typed UPI ID), so they pay by scanning a UPI QR code instead.
   */
  protected readonly desktopPayment = inject(UpiAppLauncher).platform() === null;
  protected readonly paymentNote = this.desktopPayment
    ? DESKTOP_PAYMENT_NOTE
    : PREMIUM_PAYMENT_NOTE;
  protected readonly chatStartDelayMs = DESKTOP_CHAT_START_DELAY_MS;
  protected readonly chatStartSeconds = DESKTOP_CHAT_START_DELAY_MS / 1000;
  /** Phones start on Google Pay; a desktop's UPI ID field appears once an app is chosen. */
  protected readonly paymentMethod = signal<UpiApp | null>(this.desktopPayment ? null : 'gpay');
  protected readonly paymentState = signal<PaymentState>('idle');
  protected readonly paymentBusy = computed(() => {
    const state = this.paymentState();
    return state === 'opening' || state === 'scanning' || state === 'continuing';
  });
  protected readonly selectedUpiApp = computed(
    () => UPI_APPS.find((app) => app.id === this.paymentMethod()) ?? null,
  );
  protected readonly paymentAppName = computed(
    () => this.selectedUpiApp()?.label ?? 'your UPI app',
  );
  protected readonly paymentMethodError = signal('');
  /** The desktop payer's own UPI ID — mandatory before the payment QR code is shown. */
  protected readonly payerUpiId = signal('');
  protected readonly payerUpiIdError = signal('');
  protected readonly paymentQr = signal<UpiQrCode | null>(null);
  /** Whole seconds until a desktop's Live Chat opens, while its payment QR code is showing. */
  protected readonly chatCountdown = signal(0);
  protected readonly paymentPackages = PAYMENT_PACKAGES;
  protected readonly selectedPackage = signal<PaymentPackageId>('basic');
  /**
   * The Premium Content Coverage choice of the checkout. `None` is selected by default; the
   * coverage itself adds the Base Price + ₹51 to the package subtotal, under the same taxes.
   */
  protected readonly premiumCoverages = PREMIUM_CONTENT_COVERAGES;
  protected readonly premiumCoverage = signal<PremiumContentCoverageId>('none');
  /** The rupee amount the selected coverage adds — ₹0 while `None` stays selected. */
  protected readonly coverageAmount = computed(() =>
    premiumContentCoveragePrice(this.premiumPrice() ?? 0, this.premiumCoverage()),
  );
  /** The coverage's own price card: the Base Price + ₹51, exactly what selecting it adds. */
  protected readonly coveragePrice = computed(() =>
    premiumContentCoveragePrice(this.premiumPrice() ?? 0, 'coverage'),
  );
  protected readonly couponCode = signal('');
  protected readonly appliedCoupon = signal<PaymentCoupon | null>(null);
  protected readonly couponError = signal('');
  protected readonly breakdown = computed(() =>
    paymentBreakdown(
      this.premiumPrice() ?? 0,
      this.selectedPackage(),
      this.appliedCoupon()?.percentOff ?? 0,
      this.coverageAmount(),
    ),
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
  protected selectCoverage(id: PremiumContentCoverageId): void {
    if (this.paymentBusy()) return;
    this.premiumCoverage.set(id);
    this.resetPayment();
  }
  protected onCouponCodeInput(event: Event): void {
    this.couponCode.set((event.target as HTMLInputElement).value);
    this.couponError.set('');
  }
  protected applyCoupon(): void {
    if (this.paymentBusy()) return;
    const code = this.couponCode().trim();
    if (!code) {
      this.couponError.set('Enter a coupon code to apply it.');
      return;
    }
    const coupon = findPaymentCoupon(code);
    if (!coupon) {
      this.couponError.set('That coupon code isn’t valid.');
      return;
    }
    this.appliedCoupon.set(coupon);
    this.couponCode.set('');
    this.couponError.set('');
    this.resetPayment();
  }
  protected removeCoupon(): void {
    if (this.paymentBusy()) return;
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.couponError.set('');
    this.resetPayment();
  }
  protected readonly paymentError = signal('');

  private readonly community = inject(CommunityService);
  private readonly upiLauncher = inject(UpiAppLauncher);
  private readonly injector = inject(Injector);
  private readonly accessBackdrop = viewChild<ElementRef<HTMLElement>>('accessBackdrop');
  private readonly upiIdInput = viewChild<ElementRef<HTMLInputElement>>('upiIdInput');
  private readonly paymentQrPanel = viewChild<ElementRef<HTMLElement>>('paymentQrPanel');
  private activePayment: AbortController | null = null;
  private chatCountdownTimer: ReturnType<typeof setTimeout> | undefined;
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
      // Every fresh checkout starts with no coverage: 'None' is selected by default.
      this.premiumCoverage.set('none');
      // A fresh album photograph becomes the checkout's background on every visit.
      this.paymentPhotoSelection.update((selection) => selection + 1);
      this.stage.set('payment');
      this.scrollAccessToTop();
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
    const revealsUpiIdField = this.desktopPayment && this.paymentMethod() === null;
    this.paymentMethod.set(method);
    this.resetPayment();
    if (revealsUpiIdField && !this.payerUpiId()) this.focusUpiIdInput();
  }

  protected onPayerUpiIdInput(event: Event): void {
    this.payerUpiId.set((event.target as HTMLInputElement).value);
    this.payerUpiIdError.set('');
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
    const method = this.paymentMethod();
    if (!method) {
      this.paymentMethodError.set('Choose Google Pay or PhonePe to continue.');
      return;
    }
    if (this.desktopPayment) {
      this.showPaymentQr(method, amount, paymentPackageId);
      return;
    }
    const modelSlug = this.model().slug;
    const memberId = this.community.currentUser()?.id;
    const controller = new AbortController();
    this.activePayment = controller;
    this.paymentState.set('opening');
    this.paymentError.set('');

    void this.upiLauncher
      .open({ modelSlug, amount, method }, controller.signal)
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

  /**
   * Laptop/desktop payment: the mandatory UPI ID is checked, then a UPI QR code with the exact
   * amount is shown for the member to scan with Google Pay or PhonePe on their phone or tablet.
   * The chat opens automatically ten seconds later. No collect request is sent to the UPI ID
   * (NPCI no longer permits one from a desktop website), and the timer is not payment proof.
   */
  private showPaymentQr(method: UpiApp, amount: number, paymentPackageId: PaymentPackageId): void {
    const problem = upiIdError(this.payerUpiId());
    if (problem) {
      this.payerUpiIdError.set(problem);
      this.focusUpiIdInput();
      return;
    }
    const payerUpiId = normalizeUpiId(this.payerUpiId());
    const modelSlug = this.model().slug;
    const memberId = this.community.currentUser()?.id;
    let qr: UpiQrCode;
    try {
      qr = upiQrCode(upiQrPayload({ modelSlug, amount, method, payerUpiId }));
    } catch (error: unknown) {
      this.failPayment(
        error instanceof Error ? error.message : 'The payment QR code could not be created.',
      );
      return;
    }

    this.payerUpiId.set(payerUpiId);
    this.payerUpiIdError.set('');
    this.paymentError.set('');
    this.paymentQr.set(qr);
    this.paymentState.set('scanning');
    this.revealPaymentQr();

    const deadline = Date.now() + DESKTOP_CHAT_START_DELAY_MS;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0) {
        this.chatCountdown.set(Math.ceil(remaining / 1000));
        this.chatCountdownTimer = setTimeout(tick, remaining % 1000 || 1000);
        return;
      }
      this.chatCountdownTimer = undefined;
      this.chatCountdown.set(0);
      if (
        this.paymentState() !== 'scanning' ||
        this.stage() !== 'payment' ||
        this.model().slug !== modelSlug ||
        this.community.currentUser()?.id !== memberId ||
        !this.canStartRegistered()
      ) {
        this.paymentQr.set(null);
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
    };
    tick();
  }

  protected cancelPayment(): void {
    const scanning = this.paymentState() === 'scanning';
    this.stopPaymentHandoff();
    this.paymentQr.set(null);
    this.failPayment(
      scanning
        ? 'The payment QR code was cancelled before your Live Chat opened. Press Pay and Chat for a new code when you are ready.'
        : 'The payment app handoff was cancelled. Try again when you are ready.',
    );
  }

  private failPayment(message: string): void {
    this.paymentState.set('error');
    this.paymentError.set(message);
  }

  private stopPaymentHandoff(): void {
    this.activePayment?.abort();
    this.activePayment = null;
    clearTimeout(this.chatCountdownTimer);
    this.chatCountdownTimer = undefined;
  }

  private resetPayment(): void {
    this.stopPaymentHandoff();
    this.paymentState.set('idle');
    this.paymentError.set('');
    this.paymentMethodError.set('');
    this.payerUpiIdError.set('');
    this.paymentQr.set(null);
  }

  /**
   * The payment step opens at its top — heading and photograph first — wherever the member had
   * scrolled the chat details to when they continued.
   */
  private scrollAccessToTop(): void {
    afterNextRender(
      () => {
        const backdrop = this.accessBackdrop()?.nativeElement;
        if (backdrop) backdrop.scrollTop = 0;
      },
      { injector: this.injector },
    );
  }

  /** Puts the cursor in the desktop UPI ID field, once it has rendered. */
  private focusUpiIdInput(): void {
    const input = this.upiIdInput()?.nativeElement;
    if (input) {
      input.focus();
      return;
    }
    afterNextRender(() => this.upiIdInput()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Brings the new QR code into view and moves keyboard / screen-reader focus to it. */
  private revealPaymentQr(): void {
    afterNextRender(
      () => {
        const panel = this.paymentQrPanel()?.nativeElement;
        if (!panel) return;
        const reduceMotion = panel.ownerDocument.defaultView?.matchMedia?.(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        panel.focus({ preventScroll: true });
        panel.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      },
      { injector: this.injector },
    );
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
    // Depend on the opening counter so the memoized computed picks one new photo per form visit,
    // while it remains stable for the complete sign-in interaction.
    this.signInPhotoSelection();
    return this.randomAlbumPhoto();
  });

  /** Incremented as the payment step opens, so its photograph background is newly chosen. */
  private readonly paymentPhotoSelection = signal(0);

  /**
   * The Premium checkout's background: one of the model's own album photographs, layered at 90%
   * opacity behind the white checkout and kept for the whole payment visit.
   */
  protected readonly paymentBackdrop = computed(() => {
    this.paymentPhotoSelection();
    return this.randomAlbumPhoto();
  });

  private randomAlbumPhoto(): string {
    const model = this.model();
    const albumPhotos = model.photos.filter((photo) => photo.src && photo.src !== model.cover);
    const candidates = albumPhotos.length ? albumPhotos : model.photos;
    if (!candidates.length) return model.cover;
    return candidates[Math.floor(Math.random() * candidates.length)].src;
  }

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
