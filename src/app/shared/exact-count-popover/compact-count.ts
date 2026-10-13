import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { compactCount, exactCount } from './count-format';
import { ExactCountPopoverService } from './exact-count-popover.service';

/**
 * One big engagement counter — seen, likes, comments or shares — written compactly (21.4K) and
 * clickable: the click opens the exact-count pop-up with the full figure (21,400). The button
 * inherits its type, colour and size from the statistic it sits in, so it is a drop-in replacement
 * for the plain number.
 */
@Component({
  selector: 'app-compact-count',
  imports: [],
  templateUrl: './compact-count.html',
  styleUrl: './compact-count.css',
  host: { class: 'compact-count-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompactCount {
  /** The exact value of the statistic, e.g. 21400. */
  readonly value = input.required<number>();
  /** What the number counts, e.g. "Seen" — read out by assistive tech. */
  readonly label = input.required<string>();
  /** Whose number it is, e.g. the model's name — read out by assistive tech. */
  readonly subject = input('');

  private readonly popover = inject(ExactCountPopoverService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The compact readout, e.g. `21.4K`. */
  protected readonly compact = computed(() => compactCount(this.value()));
  /** The exact readout the pop-up shows, e.g. `21,400`. */
  protected readonly exact = computed(() => exactCount(this.value()));
  /** True while this counter's own pop-up is on screen. */
  protected readonly open = computed(() => this.popover.isOpenFor(this.host.nativeElement));
  /** What the pop-up means, e.g. `Seen for Fiadh Dara`. */
  protected readonly description = computed(() => {
    const subject = this.subject().trim();
    return subject ? `${this.label()} for ${subject}` : this.label();
  });
  /** The button's accessible name: the compact figure, spelled out exactly. */
  protected readonly accessibleName = computed(
    () => `${this.description()}: ${this.exact()} — show the exact number`,
  );

  protected onToggle(event: Event): void {
    // A counter sits inside cards and tiles that may listen for clicks of their own.
    event.stopPropagation();
    this.popover.toggle(this.host.nativeElement, {
      value: this.value(),
      description: this.description(),
    });
  }
}
