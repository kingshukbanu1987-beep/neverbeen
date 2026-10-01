import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

type DocumentationLayout = 'wide' | 'mobile';

interface DocumentationFile {
  key: DocumentationLayout;
  label: string;
  shortLabel: string;
  description: string;
  url: string;
  pages: string;
  size: string;
}

const DOCUMENTS: Record<DocumentationLayout, DocumentationFile> = {
  wide: {
    key: 'wide',
    label: 'Wide screen edition',
    shortLabel: 'Wide',
    description: 'Landscape documentation designed for tablet, laptop and desktop viewing.',
    url: '/assets/documentation/NeverBeen_Documentation_Wide.pdf',
    pages: 'Wide / landscape',
    size: 'Desktop & tablet',
  },
  mobile: {
    key: 'mobile',
    label: 'Mobile edition',
    shortLabel: 'Mobile',
    description: 'Portrait documentation designed for phone-sized screens and comfortable vertical reading.',
    url: '/assets/documentation/NeverBeen_Documentation_Mobile.pdf',
    pages: 'Mobile / portrait',
    size: 'Phone-first',
  },
};

@Component({
  selector: 'app-documentation-page',
  imports: [RouterLink],
  templateUrl: './documentation.html',
  styleUrl: './documentation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentationPage implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private mediaQuery: MediaQueryList | null = null;

  /** The choice follows the current display until a visitor deliberately switches editions. */
  protected readonly selectedLayout = signal<DocumentationLayout>('wide');
  protected readonly followsScreen = signal(true);

  protected readonly documents = [DOCUMENTS.wide, DOCUMENTS.mobile];
  protected readonly activeDocument = computed(() => DOCUMENTS[this.selectedLayout()]);
  protected readonly activePdf = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.activeDocument().url),
  );

  ngOnInit(): void {
    // Keep the wide edition as a safe baseline for server rendering and older browsers.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    // Phones are normally below 640 CSS pixels; the second branch also recognises
    // a phone held landscape without treating standard tablet dimensions as mobile.
    this.mediaQuery = window.matchMedia('(max-width: 640px), (max-height: 640px) and (max-width: 960px)');
    this.applyViewportChoice();

    const onChange = () => this.applyViewportChoice();
    this.mediaQuery.addEventListener?.('change', onChange);
    this.destroyRef.onDestroy(() => this.mediaQuery?.removeEventListener?.('change', onChange));
  }

  protected choose(layout: DocumentationLayout): void {
    this.followsScreen.set(false);
    this.selectedLayout.set(layout);
  }

  protected restoreAutomaticChoice(): void {
    this.followsScreen.set(true);
    this.applyViewportChoice();
  }

  private applyViewportChoice(): void {
    if (!this.followsScreen()) return;
    this.selectedLayout.set(this.mediaQuery?.matches ? 'mobile' : 'wide');
  }
}
