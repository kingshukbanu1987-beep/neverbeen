import { Component, computed, inject, signal } from '@angular/core';
import { AdminUserOpsService, PERMISSIONS, ROLES, UserRole } from '../shared/admin-user-ops.service';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';

/** Role-based access control: role distribution + editable permission matrix. */
@Component({
  selector: 'app-admin-roles-matrix',
  imports: [AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './users.css'],
  template: `
    <section class="g-panel">
      <div class="ss-panel-head">
        <div>
          <h3>Roles</h3>
          <p>Assign roles from a user's profile or with bulk actions in the directory.</p>
        </div>
      </div>
      <div class="rm-roles">
        @for (r of roles; track r.key) {
          <article class="rm-role">
            <header>
              <h4>{{ r.icon }} {{ r.label }}</h4>
              <span class="g-badge" [class]="'g-badge ' + r.tone">{{ grantedCount(r.key) }}/{{ permissions.length }}</span>
            </header>
            <p>{{ r.description }}</p>
            <strong>{{ counts()[r.key] }}</strong> <span class="g-muted">users</span>
          </article>
        }
      </div>
    </section>

    <section class="g-panel" style="margin-top: 1rem">
      <div class="ss-panel-head">
        <div>
          <h3>Permission matrix</h3>
          <p>Changes apply instantly to everyone in the role and are recorded in the audit log. Administrator permissions are locked.</p>
        </div>
        <button type="button" class="g-icon-btn" (click)="confirmReset.set(true)">↺ Reset to defaults</button>
      </div>
      <div class="g-table-wrap">
        <table class="g-table rm-matrix">
          <thead>
            <tr>
              <th>Permission</th>
              @for (r of roles; track r.key) {
                <th>{{ r.icon }} {{ r.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (g of groups; track g.name) {
              <tr class="rm-group">
                <td [attr.colspan]="roles.length + 1">{{ g.name }}</td>
              </tr>
              @for (p of g.items; track p.key) {
                <tr>
                  <td>{{ p.label }}</td>
                  @for (r of roles; track r.key) {
                    <td>
                      <button
                        type="button"
                        class="rm-toggle"
                        role="switch"
                        [class.on]="isOn(r.key, p.key)"
                        [attr.aria-checked]="isOn(r.key, p.key)"
                        [attr.aria-label]="r.label + ': ' + p.label"
                        [disabled]="r.key === 'admin'"
                        (click)="toggle(r.key, p.key)"
                      ></button>
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (confirmReset()) {
      <app-admin-confirm-dialog
        heading="Reset all permissions?"
        message="Every role goes back to the default NeverBeen permission set."
        confirmLabel="Reset permissions"
        tone="dark"
        [withReason]="false"
        (confirmed)="reset()"
        (cancelled)="confirmReset.set(false)"
      />
    }
  `,
})
export class AdminRolesMatrix {
  private readonly ops = inject(AdminUserOpsService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly roles = ROLES;
  protected readonly permissions = PERMISSIONS;
  protected readonly groups = [...new Set(PERMISSIONS.map((p) => p.group))].map((name) => ({
    name,
    items: PERMISSIONS.filter((p) => p.group === name),
  }));
  protected readonly counts = this.ops.roleCounts;
  protected readonly confirmReset = signal(false);
  private readonly matrix = computed(() => this.ops.state().matrix);

  protected isOn(role: UserRole, permission: (typeof PERMISSIONS)[number]['key']): boolean {
    return this.matrix()[role]?.[permission] ?? false;
  }

  protected grantedCount(role: UserRole): number {
    return PERMISSIONS.filter((p) => this.isOn(role, p.key)).length;
  }

  protected toggle(role: UserRole, permission: (typeof PERMISSIONS)[number]['key']): void {
    this.ops.togglePermission(role, permission);
  }

  protected reset(): void {
    this.ops.resetPermissions();
    this.confirmReset.set(false);
    this.insights.notify('Permissions reset to defaults.');
  }
}
