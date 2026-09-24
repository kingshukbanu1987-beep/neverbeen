import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

export type AdminLoginView = 'signin' | 'apply';

const MAX_RESUME_BYTES = 2 * 1024 * 1024; // 2 MB attachment cap
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];

/** Volunteer application Full Name must contain at least `count` words (e.g. First Last). */
function minWords(count: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    const words = value.trim().split(/\s+/).filter((w) => w.length > 0);
    return words.length >= count ? null : { minWords: { required: count, actual: words.length } };
  };
}

/**
 * Volunteer application password policy: minimum 10 characters including at least
 * one capital letter, one number and one special character.
 */
function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  if (!value) {
    return null; // Validators.required reports the empty case.
  }
  const errors: ValidationErrors = {};
  if (value.length < 10) {
    errors['passwordLength'] = true;
  }
  if (!/[A-Z]/.test(value)) {
    errors['passwordUppercase'] = true;
  }
  if (!/[0-9]/.test(value)) {
    errors['passwordNumber'] = true;
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    errors['passwordSpecial'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * NeverBeen Admin Console — administrator-only sign in, plus the
 * "Join as a Volunteer Admin" application form.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly adminAuth = inject(AdminAuthService);

  /** Toggles between the admin sign-in card and the volunteer application form. */
  protected readonly view = signal<AdminLoginView>('signin');
  protected readonly adminError = signal<string | null>(null);
  protected readonly applySubmitted = signal(false);

  protected readonly resumeName = signal<string | null>(null);
  protected readonly resumeError = signal<string | null>(null);
  private resumeDataUrl: string | null = null;

  protected readonly MAX_RESUME_LABEL = '2 MB';

  /**
   * Demo admin account (Requirement B):
   *   username: admin
   *   password: adminadmin
   */
  protected readonly adminForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Basic mandatory details — mirroring the community sign-in identity fields.
   *  Full Name: at least 2 words. Password: ≥10 chars with a capital, a number and a special character. */
  protected readonly applyForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, minWords(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPassword]],
  });

  // ---------------------------------------------------------------------------
  // View switching
  // ---------------------------------------------------------------------------

  constructor() {
    // Already signed in? Skip the sign-in card and open the console.
    if (this.adminAuth.isAuthed()) {
      this.router.navigate(['/admin']);
    }
  }

  showApply(): void {
    this.view.set('apply');
    this.adminError.set(null);
  }

  showSignIn(): void {
    this.view.set('signin');
    this.applySubmitted.set(false);
  }

  // ---------------------------------------------------------------------------
  // Admin sign in
  // ---------------------------------------------------------------------------

  submit(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }
    const { username, password } = this.adminForm.getRawValue();
    if (this.adminAuth.login(username, password)) {
      this.adminError.set(null);
      this.router.navigate(['/admin']);
    } else {
      this.adminError.set(
        'Invalid credentials. Use the demo admin account — username: admin, password: adminadmin.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Volunteer Admin application
  // ---------------------------------------------------------------------------

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const typeOk = file.type ? RESUME_TYPES.includes(file.type) : RESUME_EXTENSIONS.includes(ext);
    if (!typeOk || !RESUME_EXTENSIONS.includes(ext)) {
      this.resumeError.set('Resume must be a PDF, DOC or DOCX attachment.');
      input.value = '';
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      this.resumeError.set(`Resume attachment size is restricted to ${this.MAX_RESUME_LABEL}.`);
      input.value = '';
      return;
    }

    this.resumeError.set(null);
    this.resumeName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      this.resumeDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearResume(): void {
    this.resumeName.set(null);
    this.resumeDataUrl = null;
    this.resumeError.set(null);
    const input = document.getElementById('resumeInput') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  isApplyInvalid(controlName: string): boolean {
    const ctrl = this.applyForm.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  /** Live password-policy checklist for the volunteer application form. */
  passwordRuleState(): { length: boolean; capital: boolean; number: boolean; special: boolean } {
    const value = this.applyForm.get('password')?.value ?? '';
    return {
      length: value.length >= 10,
      capital: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }

  /** Combined helper message when the volunteer password fails the policy. */
  applyPasswordError(): string | null {
    const ctrl = this.applyForm.get('password');
    if (!ctrl || ctrl.valid || !(ctrl.dirty || ctrl.touched)) {
      return null;
    }
    if (ctrl.errors && Object.prototype.hasOwnProperty.call(ctrl.errors, 'required')) {
      return 'Password is mandatory (minimum 10 characters with a capital letter, a number and a special character).';
    }
    return 'Password must be at least 10 characters and include a capital letter, a number and a special character.';
  }

  isAdminInvalid(controlName: string): boolean {
    const ctrl = this.adminForm.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  submitApplication(): void {
    if (this.applyForm.invalid || !this.resumeName()) {
      this.applyForm.markAllAsTouched();
      if (!this.resumeName()) {
        this.resumeError.set('Resume is mandatory for the Volunteer Admin application.');
      }
      return;
    }
    // Preview build — the application is acknowledged locally for now.
    this.applySubmitted.set(true);
  }
}
