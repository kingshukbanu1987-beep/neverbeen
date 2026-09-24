import { Component, computed, inject, signal } from '@angular/core';
import { CommunityService } from '../../../services/community.service';
import type { Companion, CurrentUser } from '../../../models/community';

interface MemberRow {
  id: number;
  fullName: string;
  profilePhotoUrl: string;
  profession: string;
  location: string;
  isOnline: boolean;
  status: Companion['status'];
  isVerified: boolean;
  isProfileLocked: boolean;
  postCount: number;
  isCurrentUser: boolean;
}

type FilterKey = 'all' | 'online' | 'verified' | 'locked' | 'pending';

/**
 * Admin > User Management — community member profile management:
 * search, filter and verify / lock / delete any member profile.
 * Mutations persist to the same localStorage datasets the community uses.
 */
@Component({
  selector: 'app-admin-users',
  template: `
    <div class="admin-page-head">
      <h2>User Profile Management</h2>
      <p>Review, verify, lock or remove community member profiles.</p>
    </div>

    <!-- Toolbar -->
    <div class="user-toolbar">
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
        </svg>
        <input
          type="search"
          placeholder="Search by name, profession or city…"
          [value]="searchTerm()"
          (input)="onSearch($event)"
          aria-label="Search members"
        />
      </label>

      <div class="filter-chips" role="group" aria-label="Filter members">
        @for (chip of filterChips; track chip.key) {
          <button
            type="button"
            class="chip"
            [class.active]="filter() === chip.key"
            (click)="filter.set(chip.key)"
          >
            {{ chip.label }}
            <span class="chip-count">{{ chipCount(chip.key) }}</span>
          </button>
        }
      </div>
    </div>

    <div class="user-panel">
      @if (filteredMembers().length === 0) {
        <p class="empty-note">No members match this search or filter.</p>
      } @else {
        <div class="user-table-wrap">
          <table class="user-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Location</th>
                <th>Status</th>
                <th>Posts</th>
                <th>Flags</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (member of filteredMembers(); track member.id) {
                <tr [class.current-user]="member.isCurrentUser">
                  <td class="member-cell">
                    <img [src]="member.profilePhotoUrl" [alt]="'Photo of ' + member.fullName" />
                    <div class="member-meta">
                      <strong>
                        {{ member.fullName }}
                        @if (member.isCurrentUser) {
                          <span class="you-tag">YOU</span>
                        }
                      </strong>
                      <small>{{ member.profession }}</small>
                    </div>
                  </td>
                  <td class="muted">{{ member.location }}</td>
                  <td><span class="status-chip" [attr.data-status]="member.status">{{ statusLabel(member.status) }}</span></td>
                  <td class="muted">{{ member.postCount }}</td>
                  <td class="flags-cell">
                    @if (member.isVerified) {
                      <span class="flag ok" title="Identity verified">✓ Verified</span>
                    } @else {
                      <span class="flag" title="Not verified">– Unverified</span>
                    }
                    @if (member.isProfileLocked) {
                      <span class="flag warn" title="Profile locked">🔒 Locked</span>
                    }
                  </td>
                  <td class="actions-cell">
                    <button
                      type="button"
                      class="action-btn"
                      [class.active]="member.isVerified"
                      (click)="toggleVerify(member)"
                      [title]="member.isVerified ? 'Remove verification' : 'Verify this member'"
                    >
                      {{ member.isVerified ? 'Unverify' : 'Verify' }}
                    </button>
                    <button
                      type="button"
                      class="action-btn"
                      [class.active]="member.isProfileLocked"
                      (click)="toggleLock(member)"
                      [title]="member.isProfileLocked ? 'Unlock profile' : 'Lock profile'"
                    >
                      {{ member.isProfileLocked ? 'Unlock' : 'Lock' }}
                    </button>
                    <button
                      type="button"
                      class="action-btn danger"
                      (click)="deleteMember(member)"
                      [disabled]="member.isCurrentUser"
                      title="Delete member profile"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (confirmation(); as member) {
      <div class="modal-backdrop" (click)="closeConfirm()">
        <div class="modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <h3>Delete member profile?</h3>
          <p>
            <strong>{{ member.fullName }}</strong> ({{ member.location }}) will be permanently removed
            from the companion directory. This cannot be undone.
          </p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="closeConfirm()">Cancel</button>
            <button type="button" class="btn-danger" (click)="confirmDelete()">Yes, delete profile</button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as message) {
      <div class="admin-toast" role="status">{{ message }}</div>
    }
  `,
  styleUrl: './users.css',
})
export class AdminUsers {
  private readonly community = inject(CommunityService);

  protected readonly searchTerm = signal('');
  protected readonly filter = signal<FilterKey>('all');
  protected readonly confirmation = signal<MemberRow | null>(null);
  protected readonly toast = signal<string | null>(null);

  protected readonly filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online' },
    { key: 'verified', label: 'Verified' },
    { key: 'locked', label: 'Locked' },
    { key: 'pending', label: 'Pending' },
  ];

  protected readonly allMembers = computed<MemberRow[]>(() => {
    const current = this.community.currentUser();
    const rows: MemberRow[] = this.community
      .companions()
      .map((c) => this.toRow(c, c.id === current?.id));

    // Make sure the signed-in community member is manageable even if absent from the directory.
    if (current && !rows.some((r) => r.id === current.id)) {
      rows.unshift(this.toRow(current as unknown as Companion, true));
    }
    return rows;
  });

  protected readonly filteredMembers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    return this.allMembers().filter((m) => {
      if (filter === 'online' && !m.isOnline) return false;
      if (filter === 'verified' && !m.isVerified) return false;
      if (filter === 'locked' && !m.isProfileLocked) return false;
      if (filter === 'pending' && m.status !== 'pending_incoming' && m.status !== 'pending_outgoing') return false;
      if (!term) return true;
      return (
        m.fullName.toLowerCase().includes(term) ||
        m.profession.toLowerCase().includes(term) ||
        m.location.toLowerCase().includes(term)
      );
    });
  });

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  chipCount(key: FilterKey): number {
    const members = this.allMembers();
    switch (key) {
      case 'online':
        return members.filter((m) => m.isOnline).length;
      case 'verified':
        return members.filter((m) => m.isVerified).length;
      case 'locked':
        return members.filter((m) => m.isProfileLocked).length;
      case 'pending':
        return members.filter((m) => m.status === 'pending_incoming' || m.status === 'pending_outgoing').length;
      default:
        return members.length;
    }
  }

  statusLabel(status: Companion['status']): string {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending_incoming':
        return 'Request received';
      case 'pending_outgoing':
        return 'Request sent';
      default:
        return 'No request';
    }
  }

  toggleVerify(member: MemberRow): void {
    this.community.adminPatchCompanion(member.id, { isVerified: !member.isVerified });
    this.showToast(`${member.fullName} ${member.isVerified ? 'unverified' : 'verified'}.`);
  }

  toggleLock(member: MemberRow): void {
    this.community.adminPatchCompanion(member.id, { isProfileLocked: !member.isProfileLocked });
    this.showToast(`${member.fullName}'s profile ${member.isProfileLocked ? 'unlocked' : 'locked'}.`);
  }

  deleteMember(member: MemberRow): void {
    this.confirmation.set(member);
  }

  closeConfirm(): void {
    this.confirmation.set(null);
  }

  confirmDelete(): void {
    const member = this.confirmation();
    if (!member) return;
    this.community.adminDeleteCompanion(member.id);
    this.confirmation.set(null);
    this.showToast(`${member.fullName} was removed from the directory.`);
  }

  private toRow(companion: Companion, isCurrentUser: boolean): MemberRow {
    return {
      id: companion.id,
      fullName: companion.fullName ?? 'Unnamed member',
      profilePhotoUrl: companion.profilePhotoUrl ?? '',
      profession: companion.profession ?? '—',
      location: [companion.city, companion.country].filter(Boolean).join(', ') || '—',
      isOnline: companion.isOnline === true,
      status: companion.status ?? 'none',
      isVerified: companion.isVerified === true,
      isProfileLocked: companion.isProfileLocked === true,
      postCount: this.community.journeyPostCountFor(companion.id),
      isCurrentUser,
    };
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) this.toast.set(null);
    }, 2600);
  }
}
