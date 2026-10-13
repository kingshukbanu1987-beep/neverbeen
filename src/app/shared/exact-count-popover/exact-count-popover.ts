import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ExactCountPopoverService } from './exact-count-popover.service';

/**
 * The exact-count pop-up: the small rounded card a big counter opens to reveal its exact figure —
 * `21.4K` on the counter, `21,400` in the pop-up. One instance per page, mounted outside the
 * cards so no overflow or stacking context can clip it; `ExactCountPopoverService` decides when it
 * is on screen and where it sits.
 */
@Component({
  selector: 'app-exact-count-popover',
  imports: [],
  templateUrl: './exact-count-popover.html',
  styleUrl: './exact-count-popover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExactCountPopover {
  private readonly popover = inject(ExactCountPopoverService);

  /** The open pop-up, or null while it is closed. */
  protected readonly state = this.popover.state;
}
