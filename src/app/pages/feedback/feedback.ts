import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
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

function atLeastTwoWordsValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').toString().trim();
  if (!raw) {
    return { required: true };
  }
  const words = raw.split(/\s+/).filter((w: string) => w.length > 0);
  if (words.length >= 2) {
    return null;
  }
  return { minWords: { requiredWords: 2, actualWords: words.length } };
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
    name: ['', [Validators.required, atLeastTwoWordsValidator, Validators.maxLength(80)]],
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
