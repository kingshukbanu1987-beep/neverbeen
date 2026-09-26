import { AfterViewChecked, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Keeps a `<select [value]="…">` showing the bound value when its `<option>`s are rendered
 * with `@for`.
 *
 * Why: Angular writes the `value` property on the `<select>` *before* the `@for` block has
 * created the options. The browser cannot select an option that doesn't exist yet, so it falls
 * back to the first one (e.g. the Manage drawer showed "Member" for a Moderator even though
 * the badge said Moderator). This directive takes over the `value` binding and re-applies it
 * after the view — including the options — has been rendered, and whenever it changes.
 */
@Directive({ selector: 'select[value]' })
export class SelectValueSync implements AfterViewChecked {
  readonly value = input<unknown>();
  private readonly el = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;

  ngAfterViewChecked(): void {
    const v = this.value();
    const wanted = v === null || v === undefined ? '' : String(v);
    if (this.el.value !== wanted) this.el.value = wanted;
  }
}
