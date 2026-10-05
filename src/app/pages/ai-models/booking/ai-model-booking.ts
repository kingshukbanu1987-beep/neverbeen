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
import { BookingTerm, ModelBookingService } from '../../../services/model-booking.service';

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

  protected readonly terms = computed<BookingTerm[]>(() => this.model().rates);
  protected readonly selectedTerm = signal<BookingTerm | null>(null);
  protected readonly today = startOfToday();
  protected readonly viewMonth = signal<Date>(startOfMonth(startOfToday()));
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly status = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');
  protected readonly resultMessage = signal('');
  protected readonly resultReference = signal('');
  protected readonly serverFields = signal<string[]>([]);

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

  protected readonly total = computed(() => {
    const term = this.selectedTerm();
    if (!term) return '';
    return `$${term.usd.toLocaleString('en-US')}`;
  });

  protected readonly showFieldErrors = signal(false);

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private lastFocused: HTMLElement | null = null;

  constructor() {
    // The first rate is the default selection, matching the highlighted card.
    effect(() => {
      const first = this.terms()[0] ?? null;
      if (this.selectedTerm() === null && first) this.selectedTerm.set(first);
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

  protected selectTerm(term: BookingTerm): void {
    this.selectedTerm.set(term);
  }

  protected selectDate(day: CalendarDay): void {
    if (!day.selectable) return;
    this.selectedDate.set(day.iso);
    this.serverFields.set([]);
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

  protected async submit(): Promise<void> {
    if (this.status() === 'sending') return;

    this.showFieldErrors.set(true);
    const term = this.selectedTerm();
    const date = this.selectedDate();

    if (this.form.invalid || !term || !date) {
      this.form.markAllAsTouched();
      this.status.set('error');
      this.resultMessage.set('Add the missing details so the studio can reply.');
      this.serverFields.set([
        ...Object.entries(this.form.controls)
          .filter(([, control]) => control.invalid)
          .map(([key]) => key),
        ...(term ? [] : ['term']),
        ...(date ? [] : ['date']),
      ]);
      return;
    }

    this.status.set('sending');
    this.serverFields.set([]);

    const profile = this.model();
    const value = this.form.getRawValue();
    const response = await this.bookings.send({
      model: {
        name: profile.name,
        handle: profile.handle,
        slug: profile.slug,
        location: profile.location,
      },
      term,
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
      page: typeof location !== 'undefined' ? location.href : '',
    });

    if (response.ok) {
      this.status.set('sent');
      this.resultMessage.set(response.message);
      this.resultReference.set(response.reference);
      return;
    }

    this.status.set('error');
    this.resultMessage.set(response.message);
    this.resultReference.set(response.reference);
    this.serverFields.set(
      response.error === 'validation'
        ? Object.keys(this.form.controls).filter((key) => response.error)
        : [],
    );
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
