import { Injectable, signal } from '@angular/core';

/**
 * Opens the User 360° "Manage" drawer (the same side window used in User Management)
 * from anywhere in the Admin Console. The drawer itself is rendered once by
 * `<app-admin-manage-user-host>` in the Admin Console shell.
 */
@Injectable({ providedIn: 'root' })
export class ManageUserService {
  /** Member id whose Manage drawer is open, or null. */
  readonly openId = signal<number | null>(null);

  open(id: number | string | null | undefined): void {
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) this.openId.set(n);
  }

  close(): void {
    this.openId.set(null);
  }
}
