import { Injectable, signal } from '@angular/core';

const ADMIN_SESSION_KEY = 'neverbeen_admin_session';

export interface AdminSession {
  username: string;
  loggedInAtUtc: string;
}

function readSession(): AdminSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed && typeof parsed.username === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * NeverBeen Admin Console authentication.
 *
 * The demo admin account is fixed:
 *   username: admin
 *   password: adminadmin
 * The session persists in localStorage so a page refresh keeps the admin
 * signed in until "Log out" is used inside the panel.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly session = signal<AdminSession | null>(readSession());

  readonly isAuthed = this.session.asReadonly();

  /** @returns true when the credentials are the demo admin credentials. */
  login(username: string, password: string): boolean {
    const ok = username.trim().toLowerCase() === 'admin' && password === 'adminadmin';
    if (!ok) return false;
    this.session.set({
      username: 'admin',
      loggedInAtUtc: new Date().toISOString(),
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify(this.session()),
      );
    }
    return true;
  }

  logout(): void {
    this.session.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  }

  get username(): string {
    return this.session()?.username ?? 'admin';
  }

  get loggedInAtUtc(): string | null {
    return this.session()?.loggedInAtUtc ?? null;
  }
}
