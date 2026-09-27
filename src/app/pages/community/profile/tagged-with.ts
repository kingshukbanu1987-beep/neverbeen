import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AuthorInfo } from '../../../models/community';
import { UserPreviewDirective } from '../../../shared/user-hover-card';

/**
 * "is with Maya with 10 others" — only the first tagged name is written out.
 * The count opens a small list of everyone else.
 */
@Component({
  selector: 'app-tagged-with',
  standalone: true,
  imports: [UserPreviewDirective],
  template: `
    @if (people.length > 0) {
      <span class="tagged-with-text"> is with </span>
      <strong
        class="tagged-companion-link clickable-user"
        [nbUserPreview]="people[0]"
        (click)="openPerson.emit(people[0]); $event.stopPropagation()"
      >{{ people[0].fullName }}</strong>
      @if (people.length > 1) {
        <span class="tagged-with-text"> with </span>
        <span class="tagged-others-wrap">
          <button
            type="button"
            class="tagged-others-btn"
            (click)="toggle($event)"
            [attr.aria-expanded]="open()"
            [title]="othersTitle()"
          >{{ othersLabel() }}</button>
          @if (open()) {
            <span class="tagged-others-pop" (click)="$event.stopPropagation()">
              @for (person of people.slice(1); track person.id) {
                <button type="button" class="tagged-other-person" [nbUserPreview]="person" (click)="pick(person, $event)">
                  {{ person.fullName }}
                </button>
              }
            </span>
          }
        </span>
      }
    }
  `,
  styles: `
    :host {
      display: inline;
    }
    .tagged-others-wrap {
      position: relative;
      display: inline-block;
    }
    .tagged-others-btn {
      border: none;
      background: none;
      padding: 0;
      margin: 0;
      font: inherit;
      font-weight: 800;
      color: var(--ct-ac, #2563eb);
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .tagged-others-btn:hover {
      color: var(--ct-ink, #0f172a);
    }
    .tagged-others-pop {
      position: absolute;
      z-index: 30;
      top: calc(100% + 6px);
      left: 0;
      min-width: 180px;
      max-width: 240px;
      max-height: 220px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.4rem;
      border-radius: 14px;
      background: rgb(var(--ct-sf-rgb, 255 255 255) / 0.98);
      border: 1px solid var(--ct-ln, #e2e8f0);
      box-shadow: 0 18px 40px -18px rgba(2, 8, 23, 0.45);
    }
    .tagged-other-person {
      border: none;
      background: transparent;
      text-align: left;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 650;
      color: var(--ct-ink, #0f172a);
      padding: 0.4rem 0.5rem;
      border-radius: 10px;
      cursor: pointer;
    }
    .tagged-other-person:hover {
      background: rgb(var(--ct-ac-rgb, 37 99 235) / 0.08);
    }
  `,
})
export class TaggedWith {
  @Input() people: AuthorInfo[] = [];
  @Output() openPerson = new EventEmitter<AuthorInfo>();

  protected readonly open = signal(false);

  protected othersLabel(): string {
    const n = Math.max(0, this.people.length - 1);
    return n === 1 ? '1 other' : `${n} others`;
  }

  protected othersTitle(): string {
    return this.people
      .slice(1)
      .map((p) => p.fullName)
      .filter(Boolean)
      .join(', ');
  }

  protected toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected pick(person: AuthorInfo, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.open.set(false);
    this.openPerson.emit(person);
  }
}
