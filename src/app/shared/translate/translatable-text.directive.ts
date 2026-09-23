import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  effect,
  inject,
} from '@angular/core';
import { TranslationService, isSameLanguage } from '../../services/translation.service';

const HAS_LETTER = /[\p{L}]/u;

/**
 * Marks user-generated content so the site-wide translator NEVER touches it —
 * the original language of Journey posts, MessageBook entries, comments,
 * chats, About me and Intro is always preserved — and injects a small
 * "Translate" toggle (like Facebook / Flickr "See translation") right after
 * the content.
 *
 * The toggle only appears when the detected language of the content differs
 * from the language currently selected on the login page dropdown; clicking
 * it renders the text in the selected language, and "Original" switches back.
 *
 * Usage:
 *   <p class="post-body-text" [nbTranslatable]="post.text">{{ post.text }}</p>
 */
@Directive({
  selector: '[nbTranslatable]',
  standalone: true,
})
export class TranslatableTextDirective implements OnInit, OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly translation = inject(TranslationService);
  private readonly zone = inject(NgZone);

  /** Original text exactly as authored, in the author's own language. */
  @Input({ alias: 'nbTranslatable', required: true }) text = '';

  /** The text node Angular binds to (safe to write back into on toggle). */
  private bindingNode: Text | null = null;
  private original = '';
  private detected: string | null = null;
  private translated: string | null = null;
  private busy = false;
  private button: HTMLButtonElement | null = null;
  private unlisten: (() => void) | null = null;
  private initialized = false;
  private destroyed = false;
  private detectionToken = 0;
  private lastLanguage: string | null = null;

  constructor() {
    // Re-evaluate whenever the user picks another language on the dropdown.
    effect(() => {
      const lang = this.translation.language();
      if (this.initialized) {
        this.onLanguageChange(lang);
      }
    });
  }

  ngOnInit(): void {
    this.initialized = true;
    this.lastLanguage = this.translation.language();
    this.host.setAttribute('data-no-translate', '');
    this.bindingNode = this.resolveBindingNode();
    this.original = this.text ?? '';
    // If the site-wide layer already ran, force the source language back.
    this.writeText(this.original);
    this.runDetection();
  }

  ngOnChanges(): void {
    // The authored text changed (edit saved, dynamic binding…) — reset state.
    this.original = this.text ?? '';
    this.translated = null;
    this.detected = null;
    if (!this.initialized) return;
    this.writeText(this.original);
    this.runDetection();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detectionToken += 1;
    this.unlisten?.();
    this.unlisten = null;
    if (this.button) {
      this.renderer.removeChild(this.button.parentElement, this.button);
      this.button = null;
    }
  }

  // -------------------------------------------------------------------------
  // Detection / visibility
  // -------------------------------------------------------------------------

  private runDetection(): void {
    const token = ++this.detectionToken;
    const src = this.original;
    this.translation
      .detectLanguage(src)
      .then((code) => {
        if (this.destroyed || token !== this.detectionToken) return;
        this.detected = code;
        this.refreshButton();
      })
      .catch(() => {
        // Unknown → treat as different so Translate is never wrongly hidden.
        if (this.destroyed || token !== this.detectionToken) return;
        this.detected = '';
        this.refreshButton();
      });
  }

  private onLanguageChange(lang: string): void {
    if (this.destroyed || lang === this.lastLanguage) return;
    this.lastLanguage = lang;
    if (this.translated !== null) {
      // Content reverts to the author's original language first…
      this.translated = null;
      this.writeText(this.original);
    }
    // …then the toggle reappears only if the languages still differ.
    this.refreshButton();
  }

  private shouldShowToggle(): boolean {
    if (this.destroyed || !this.bindingNode) return false;
    const src = this.original.trim();
    if (src.length < 6 || !HAS_LETTER.test(src)) return false;
    if (this.detected === null) return false; // detection still pending
    // '' means "unknown" — treat as different so Translate is never hidden.
    return !isSameLanguage(this.detected, this.translation.language());
  }

  private refreshButton(): void {
    if (this.destroyed) return;
    const show = this.shouldShowToggle();
    if (show && !this.button) this.createButton();
    if (!show && this.button) this.removeButton();
    if (this.button) this.updateButtonLabel();
  }

  // -------------------------------------------------------------------------
  // Toggle button (injected sibling — styled globally via .nb-translate-btn)
  // -------------------------------------------------------------------------

  private createButton(): void {
    const parent = this.host.parentElement;
    if (!parent) return;
    const btn = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(btn, 'type', 'button');
    this.renderer.setAttribute(btn, 'data-no-translate', '');
    this.renderer.setAttribute(btn, 'aria-label', 'Translate content');
    this.renderer.setAttribute(btn, 'title', 'Translate this into the language selected on the login page');
    this.renderer.addClass(btn, 'nb-translate-btn');
    this.unlisten = this.renderer.listen(btn, 'click', (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.zone.run(() => void this.toggle());
    });
    this.renderer.insertBefore(parent, btn, this.host.nextSibling);
    this.button = btn;
    this.updateButtonLabel();
  }

  private removeButton(): void {
    if (!this.button) return;
    this.unlisten?.();
    this.unlisten = null;
    this.renderer.removeChild(this.button.parentElement, this.button);
    this.button = null;
  }

  private updateButtonLabel(): void {
    if (!this.button) return;
    const label = this.busy ? 'Translating…' : this.translated !== null ? 'Original' : 'Translate';
    // setValue() only works on Text nodes — write the element's text directly.
    this.button.textContent = label;
  }

  private async toggle(): Promise<void> {
    if (this.busy) return;
    if (this.translated !== null) {
      this.translated = null;
      this.writeText(this.original);
      this.refreshButton();
      return;
    }

    const target = this.translation.language();
    this.busy = true;
    this.updateButtonLabel();
    let out: string | null = null;
    try {
      out = await this.translation.translateContent(this.original, target);
    } catch {
      out = null;
    } finally {
      this.busy = false;
    }
    if (this.destroyed) return;
    if (this.translation.language() !== target) {
      this.refreshButton();
      return;
    }
    if (out) {
      this.translated = out;
      this.writeText(out);
    }
    this.refreshButton();
  }

  // -------------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------------

  /** The text node Angular's interpolation writes to (or the first text node). */
  private resolveBindingNode(): Text | null {
    const nodes: ChildNode[] = Array.from(this.host.childNodes) as ChildNode[];
    const nonEmpty = nodes.find(
      (n) => n.nodeType === Node.TEXT_NODE && ((n as Text).nodeValue ?? '').trim().length > 0,
    );
    if (nonEmpty) return nonEmpty as Text;
    const firstText = nodes.find((n) => n.nodeType === Node.TEXT_NODE);
    if (firstText) return firstText as Text;
    const created = this.renderer.createText('');
    this.renderer.insertBefore(this.host, created, this.host.firstChild);
    return created as unknown as Text;
  }

  /** Write `value` into the bound text node, preserving Angular's own node reference. */
  private writeText(value: string): void {
    if (!this.bindingNode) this.bindingNode = this.resolveBindingNode();
    if (!this.bindingNode) return;
    if (this.bindingNode.nodeValue !== value) {
      this.renderer.setValue(this.bindingNode, value);
    }
  }
}
