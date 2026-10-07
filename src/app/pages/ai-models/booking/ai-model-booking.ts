import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AiModelProfile } from '../ai-model-data';
import {
  BOOKING_SERVICE_TAX_PERCENT,
  BookingCoupon,
  BookingPhotoOrder,
  BookingRequest,
  ModelBookingService,
  formatInr,
  photoOrdersFor,
  serviceTaxFor,
} from '../../../services/model-booking.service';
import { FOUNDER_WHATSAPP_DISPLAY } from '../../../services/whatsapp-link';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
  isSelected: boolean;
  label: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PROJECT_TYPES = [
  'Editorial shoot',
  'Brand campaign',
  'E-commerce / catalogue',
  'Social content',
  'Runway or showroom',
  'Something else',
];

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Component({
  selector: 'app-ai-model-booking',
  imports: [ReactiveFormsModule],
  templateUrl: './ai-model-booking.html',
  styleUrl: './ai-model-booking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AiModelBookingDialog implements OnDestroy {
  private readonly bookings = inject(ModelBookingService);
  private readonly formBuilder = inject(FormBuilder);

  readonly model = input.required<AiModelProfile>();
  readonly closed = output<void>();

  protected readonly projectTypes = PROJECT_TYPES;
  protected readonly weekdayLabels = WEEKDAY_LABELS;
  protected readonly founderWhatsAppDisplay = FOUNDER_WHATSAPP_DISPLAY;

  /** Packages sized at the model's own per-photo rate, plus the customized order. */
  protected readonly orders = computed<BookingPhotoOrder[]>(() => {
    const rate = this.model().photoRate;
    return rate > 0 ? photoOrdersFor(rate) : [];
  });
  protected readonly selectedOrder = signal<BookingPhotoOrder | null>(null);
  protected readonly ratePerPhoto = computed(() => this.model().photoRate);
  protected readonly formatInr = formatInr;
  protected readonly today = startOfToday();
  protected readonly viewMonth = signal<Date>(startOfMonth(startOfToday()));
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly status = signal<'idle' | 'ready' | 'error'>('idle');
  protected readonly resultMessage = signal('');
  protected readonly whatsappLink = signal('');
  protected readonly couponCode = signal('');
  protected readonly couponStatus = signal<'idle' | 'valid' | 'expired' | 'unavailable' | 'empty'>(
    'idle',
  );
  protected readonly appliedCoupon = signal<BookingCoupon | null>(null);
  protected readonly couponEligible = computed(() => {
    const order = this.selectedOrder();
    return Boolean(order && !order.custom);
  });
  protected readonly couponMessage = computed(() => {
    switch (this.couponStatus()) {
      case 'valid':
        return 'Congratulations! Coupon Applied Successfully!';
      case 'expired':
        return 'Coupon Expired!';
      case 'unavailable':
        return 'Coupon not available!';
      case 'empty':
        return 'Enter a coupon code.';
      default:
        return '';
    }
  });
  protected readonly serviceTaxPercent = BOOKING_SERVICE_TAX_PERCENT;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+()\d][\d\s()+.-]{5,}$/)]],
    company: ['', [Validators.maxLength(120)]],
    location: ['', [Validators.maxLength(160)]],
    project: [PROJECT_TYPES[0], [Validators.required]],
    usage: ['', [Validators.maxLength(160)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      this.viewMonth(),
    ),
  );

  protected readonly selectedDateLabel = computed(() => {
    const iso = this.selectedDate();
    if (!iso) return '';
    return this.formatLongDate(iso);
  });

  protected readonly canGoBack = computed(
    () => this.viewMonth().getTime() > startOfMonth(this.today).getTime(),
  );

  protected readonly canGoForward = computed(() => {
    const limit = new Date(Date.UTC(this.today.getUTCFullYear(), this.today.getUTCMonth() + 13, 1));
    return this.viewMonth().getTime() < limit.getTime();
  });

  protected readonly calendar = computed<CalendarDay[][]>(() => {
    const month = this.viewMonth();
    const first = startOfMonth(month);
    // Monday-first grid: shift Sunday (0) to the end of the week.
    const lead = (first.getUTCDay() + 6) % 7;
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - lead);

    const selected = this.selectedDate();
    const todayIso = isoOf(this.today);
    const weeks: CalendarDay[][] = [];

    for (let week = 0; week < 6; week += 1) {
      const days: CalendarDay[] = [];
      for (let index = 0; index < 7; index += 1) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + week * 7 + index);
        const iso = isoOf(date);
        days.push({
          iso,
          day: date.getUTCDate(),
          inMonth: date.getUTCMonth() === month.getUTCMonth(),
          selectable: date.getTime() >= this.today.getTime(),
          isToday: iso === todayIso,
          isSelected: iso === selected,
          label: this.formatLongDate(iso),
        });
      }
      weeks.push(days);
    }

    return weeks;
  });

  protected readonly subtotal = computed(() => {
    const order = this.selectedOrder();
    return order && !order.custom ? order.amount : 0;
  });
  protected readonly discountAmount = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon || !this.couponEligible()) return 0;
    return Math.min(coupon.discountInr, this.subtotal());
  });
  protected readonly discountedSubtotal = computed(() =>
    Math.max(0, this.subtotal() - this.discountAmount()),
  );
  protected readonly serviceTax = computed(() =>
    this.couponEligible() ? serviceTaxFor(this.discountedSubtotal()) : 0,
  );
  protected readonly finalTotal = computed(
    () => Math.round((this.discountedSubtotal() + this.serviceTax() + Number.EPSILON) * 100) / 100,
  );
  protected readonly total = computed(() => {
    const order = this.selectedOrder();
    if (!order) return '';
    return order.custom ? '' : formatInr(this.finalTotal());
  });

  protected readonly showFieldErrors = signal(false);

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private lastFocused: HTMLElement | null = null;

  constructor() {
    // Start with the 25-photo editorial package, falling back if a model has a different catalogue.
    effect(() => {
      const availableOrders = this.orders();
      const defaultOrder =
        availableOrders.find((order) => order.photos === 25) ?? availableOrders[0] ?? null;
      if (this.selectedOrder() === null && defaultOrder) this.selectedOrder.set(defaultOrder);
    });

    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    effect(() => {
      this.closeButton()?.nativeElement.focus({ preventScroll: true });
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  protected selectOrder(order: BookingPhotoOrder): void {
    this.selectedOrder.set(order);
    if (order.custom) {
      this.appliedCoupon.set(null);
      this.couponStatus.set('idle');
    }
  }

  protected onCouponInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.couponCode.set(input?.value ?? '');
    this.appliedCoupon.set(null);
    this.couponStatus.set('idle');
  }

  protected validateCoupon(): void {
    if (!this.couponEligible()) return;

    const code = this.couponCode().trim().toUpperCase();
    this.couponCode.set(code);
    const result = this.bookings.validateCoupon(code);
    this.couponStatus.set(result.status);
    this.appliedCoupon.set(result.status === 'valid' ? result.coupon : null);
  }

  protected selectDate(day: CalendarDay): void {
    if (!day.selectable) return;
    this.selectedDate.set(day.iso);
  }

  protected previousMonth(): void {
    if (!this.canGoBack()) return;
    this.viewMonth.update(
      (month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)),
    );
  }

  protected nextMonth(): void {
    if (!this.canGoForward()) return;
    this.viewMonth.update(
      (month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)),
    );
  }

  protected fieldError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.showFieldErrors());
  }

  protected dateMissing(): boolean {
    return this.showFieldErrors() && !this.selectedDate();
  }

  protected submit(): void {
    if (this.status() === 'ready') return;

    this.showFieldErrors.set(true);
    const order = this.selectedOrder();
    const date = this.selectedDate();

    if (this.form.invalid || !order || !date) {
      this.form.markAllAsTouched();
      this.status.set('error');
      this.resultMessage.set('Add the missing details so the studio can reply.');
      return;
    }

    const profile = this.model();
    const value = this.form.getRawValue();
    const request: BookingRequest = {
      model: {
        name: profile.name,
        handle: profile.handle,
        slug: profile.slug,
        location: profile.location,
      },
      order,
      pricing: {
        subtotal: this.subtotal(),
        discountedSubtotal: this.discountedSubtotal(),
        serviceTax: this.serviceTax(),
        couponCode: this.appliedCoupon()?.code ?? '',
        discount: this.discountAmount(),
        total: this.finalTotal(),
      },
      booking: {
        date,
        project: value.project,
        location: value.location,
        usage: value.usage,
        notes: value.notes,
      },
      client: {
        name: value.name,
        email: value.email,
        phone: value.phone,
        company: value.company,
      },
      page: typeof window !== 'undefined' ? window.location.href : '',
    };
    const url = this.bookings.createWhatsAppLink(request);

    this.whatsappLink.set(url);
    this.resultMessage.set('Your booking details are ready to send in WhatsApp.');
    this.status.set('ready');
    window.open(url, '_blank', 'noopener');
  }

  protected openWhatsApp(): void {
    const url = this.whatsappLink();
    if (url) window.open(url, '_blank', 'noopener');
  }

  protected close(): void {
    this.closed.emit();
    this.lastFocused?.focus?.({ preventScroll: true });
    this.lastFocused = null;
  }

  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.booking-panel, button, input, select, textarea, a')) return;
    this.close();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.close();
  }

  private formatLongDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  }
}
