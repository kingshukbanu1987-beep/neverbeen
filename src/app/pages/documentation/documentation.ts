import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/** The single document the Documentation Centre publishes. */
export interface Brochure {
  /** Heading shown above the viewer. */
  label: string;
  /** Short name used in the action labels ("Open …", "Download …"). */
  shortLabel: string;
  /** One-line description of what the document contains. */
  description: string;
  /** Public URL of the PDF. */
  url: string;
  /** File name offered by the download action. */
  fileName: string;
  /** Orientation note shown next to the heading. */
  orientation: string;
  /** Screens the landscape layout is composed for. */
  audience: string;
}

/**
 * The wide landscape edition is the only brochure: one document, no
 * screen-dependent switching, always openable and downloadable.
 */
export const WIDE_BROCHURE: Brochure = {
  label: 'Wide landscape brochure',
  shortLabel: 'Brochure',
  description:
    'The whole NeverBeen story — public pages, Community and Admin Console — in one wide landscape document composed for tablet, laptop and desktop reading.',
  url: '/assets/documentation/NeverBeen_Documentation_Wide.pdf',
  fileName: 'NeverBeen_Documentation_Wide.pdf',
  orientation: 'Wide / landscape',
  audience: 'Tablet, laptop & desktop',
};

@Component({
  selector: 'app-documentation-page',
  imports: [RouterLink],
  templateUrl: './documentation.html',
  styleUrl: './documentation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentationPage {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly brochure = WIDE_BROCHURE;

  /** The same brochure, trusted for the embedded viewer below the actions. */
  protected readonly brochureViewer: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(WIDE_BROCHURE.url);
}
