import { Component, computed, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { AuthorInfo, Companion, UserActiveStatus } from '../../models/community';
import { CommunityService } from '../../services/community.service';

/**
 * The same coloured presence dot used in the My Companions side panel,
 * so Journey feeds, chats and companion cards share one status language.
 */
@Component({
  selector: 'app-presence-dot',
  standalone: true,
  imports: [NgClass],
  template: `<span class="pd" [ngClass]="klass()" [title]="label()" [attr.aria-label]="label()"></span>`,
  styles: `
    :host {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 2;
      display: block;
      width: 11px;
      height: 11px;
      pointer-events: none;
    }
    .pd {
      display: block;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 2px solid var(--ct-sf, #fff);
      box-sizing: border-box;
      background: #94a3b8;
    }
    .status-icon-active {
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.28);
    }
    .status-icon-busy {
      background: #ef4444;
    }
    .status-icon-dnd {
      background: #b91c1c;
    }
    .status-icon-away {
      background: #f59e0b;
    }
    .status-icon-inactive {
      background: #94a3b8;
    }
    .status-icon-custom {
      background: #8b5cf6;
    }
  `,
})
export class PresenceDot {
  private readonly community = inject(CommunityService);
  readonly user = input<AuthorInfo | Companion | null | undefined>(null);
  readonly userId = input<number | null | undefined>(null);

  protected readonly presence = computed(() => {
    const explicit = this.user();
    const id = this.userId() ?? explicit?.id;
    return this.community.presenceFor(id, explicit ?? undefined);
  });

  protected readonly klass = computed(() => this.presence().klass);
  protected readonly label = computed(() => this.presence().label);
}

export function statusIconClass(status?: string): string {
  switch (status as UserActiveStatus | undefined) {
    case 'Active':
      return 'status-icon-active';
    case 'Busy':
      return 'status-icon-busy';
    case "Don't Disturb":
      return 'status-icon-dnd';
    case 'Away':
      return 'status-icon-away';
    case 'Inactive':
      return 'status-icon-inactive';
    case 'Custom':
      return 'status-icon-custom';
    default:
      return 'status-icon-inactive';
  }
}
