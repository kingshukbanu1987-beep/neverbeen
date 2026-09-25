import { Injectable, signal } from '@angular/core';

export const ADMIN_AUDIT_KEY = 'neverbeen_admin_audit_log';
const MAX_ENTRIES = 1000;

export type AuditCategory = 'moderation' | 'account' | 'role' | 'security' | 'data' | 'privacy' | 'website' | 'operations';

export interface AuditEntry {
  id: number;
  atUtc: string;
  actor: string;
  category: AuditCategory;
  action: string;
  targetId?: number;
  targetLabel?: string;
  details?: string;
}

export const AUDIT_CATEGORY_META: Record<AuditCategory, { label: string; icon: string }> = {
  moderation: { label: 'Moderation', icon: '🛡️' },
  account: { label: 'Account', icon: '👤' },
  role: { label: 'Roles', icon: '🎖️' },
  security: { label: 'Security', icon: '🔐' },
  data: { label: 'Data', icon: '💾' },
  privacy: { label: 'Privacy', icon: '🧾' },
  website: { label: 'Website', icon: '🌐' },
  operations: { label: 'Operations', icon: '🚧' },
};

/**
 * Immutable-style audit trail of every Admin Console action (who did what, to whom, when).
 * Stored in localStorage and capped to the most recent entries.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  readonly entries = signal<AuditEntry[]>(this.load());
  private seq = Date.now();

  log(entry: Omit<AuditEntry, 'id' | 'atUtc' | 'actor'> & { actor?: string }): void {
    const full: AuditEntry = {
      id: ++this.seq,
      atUtc: new Date().toISOString(),
      actor: entry.actor ?? 'admin',
      ...entry,
    };
    this.entries.update((list) => [full, ...list].slice(0, MAX_ENTRIES));
    this.persist();
  }

  /** Replace the whole log (used by retention policies). */
  replace(list: AuditEntry[]): void {
    this.entries.set(list.slice(0, MAX_ENTRIES));
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ADMIN_AUDIT_KEY, JSON.stringify(this.entries()));
      } catch {
        /* storage full — keep the in-memory log */
      }
    }
  }

  private load(): AuditEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(ADMIN_AUDIT_KEY);
      return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    } catch {
      return [];
    }
  }
}
