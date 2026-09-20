import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

/** The kinds of feedback a visitor can choose from. */
export const feedbackTypes = [
  'Appreciation Notes',
  'Testimonials',
  'Improvement Ideas',
  'General Query',
  'Urgent Query',
  'Grievance',
  'Reviews',
] as const;

export type FeedbackType = (typeof feedbackTypes)[number];

/** Where feedback is delivered: the NeverBeen studio WhatsApp. */
export const feedbackWhatsAppDisplay = '+91 90518 88116';
export const feedbackWhatsAppDial = '919051888116';

/** Longest feedback note we accept. */
export const feedbackNotesLimit = 2500;

/** Fewest words we accept as a name, so a nickname on its own is not enough. */
export const feedbackNameWords = 2;

/** Requires at least `count` words, ignoring extra spaces between them. */
export function minWords(count: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const words = String(control.value ?? '')
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    return words.length >= count
      ? null
      : { minWords: { requiredWords: count, actualWords: words.length } };
  };
}

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Feedback {
  private readonly fb = inject(FormBuilder);

  protected readonly types = feedbackTypes;
  protected readonly notesLimit = feedbackNotesLimit;
  protected readonly whatsappDisplay = feedbackWhatsAppDisplay;

  protected readonly sent = signal(false);
  protected readonly whatsappLink = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, minWords(feedbackNameWords), Validators.maxLength(80)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/),
      ],
    ],
    type: ['', Validators.required],
    notes: ['', [Validators.required, Validators.maxLength(feedbackNotesLimit)]],
  });

  /** Live character count for the notes field, so the limit is visible while typing. */
  private readonly notesValue = toSignal(this.form.controls.notes.valueChanges, {
    initialValue: this.form.controls.notes.value,
  });
  private readonly typeValue = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  protected readonly notesLength = computed(() => this.notesValue().length);
  protected readonly notesOverLimit = computed(() => this.notesLength() > feedbackNotesLimit);
  protected readonly notesRemaining = computed(() => feedbackNotesLimit - this.notesLength());
  protected readonly counterPercent = computed(() =>
    Math.min(100, Math.round((this.notesLength() / feedbackNotesLimit) * 100)),
  );
  protected readonly selectedType = computed(() => this.typeValue());

  protected readonly name = this.form.controls.name;
  protected readonly email = this.form.controls.email;
  protected readonly notes = this.form.controls.notes;

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const details = this.form.getRawValue();
    const message = [
      'New feedback for NeverBeen',
      '',
      `Type of Feedback: ${details.type}`,
      `Name: ${details.name}`,
      `Email: ${details.email}`,
      '',
      'Feedback Notes:',
      details.notes,
      '',
      '— sent from the NeverBeen website feedback page',
    ].join('\n');

    const url = `https://wa.me/${feedbackWhatsAppDial}?text=${encodeURIComponent(message)}`;
    this.whatsappLink.set(url);
    this.sent.set(true);
    window.open(url, '_blank', 'noopener');
  }

  /** Re-opens the prefilled WhatsApp chat if the first attempt was blocked. */
  protected openWhatsApp(): void {
    window.open(this.whatsappLink(), '_blank', 'noopener');
  }

  /** Clears the message and lets the visitor write another one. */
  protected writeAnother(): void {
    const { name, email } = this.form.getRawValue();
    this.form.reset({ name, email, type: '', notes: '' });
    this.sent.set(false);
    this.whatsappLink.set('');
  }

  protected invalid(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && control.touched;
  }
}
