import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Moves the element it sits on to the end of `<body>` while it is rendered.
 *
 * Admin pop-ups (confirmation dialogs, erase / publish modals) are often opened from inside
 * a side drawer such as User Management → Manage. Rendering them at the body root means no
 * ancestor stacking context, `transform`, `overflow` or z-index can ever put them behind the
 * page or panel that opened them: together with `z-index: 2000` they are always on top.
 *
 * Bindings and listeners keep working (Angular tracks the node, not its position), emulated
 * component styles still match (the `_ngcontent` attribute travels with the node) and Angular's
 * renderer removes it with `node.remove()` when the `@if` block is destroyed.
 */
@Directive({ selector: '[appOverlayPortal]' })
export class OverlayPortal implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly doc = inject(DOCUMENT);

  ngOnInit(): void {
    this.doc.body.appendChild(this.el);
  }

  ngOnDestroy(): void {
    this.el.remove();
  }
}
