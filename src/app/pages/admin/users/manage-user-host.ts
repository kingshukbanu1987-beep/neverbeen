import { Component, HostListener, inject } from '@angular/core';
import { AdminUserDrawer } from './user-drawer';
import { ManageUserService } from '../shared/manage-user.service';

/** Renders the global User 360° "Manage" drawer opened by any `<app-manage-user-btn>`. */
@Component({
  selector: 'app-admin-manage-user-host',
  imports: [AdminUserDrawer],
  template: `
    @if (manage.openId(); as id) {
      <app-admin-user-drawer [userId]="id" (closed)="manage.close()" />
    }
  `,
})
export class AdminManageUserHost {
  protected readonly manage = inject(ManageUserService);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    // Let open confirmation dialogs (portaled to <body>) handle Escape first.
    if (document.querySelector('.g-modal-backdrop, .g-modal')) return;
    this.manage.close();
  }
}
