import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/** The single brochure the Documentation Centre publishes. */
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
  /** Length note shown next to the heading. */
  length: string;
  /** Screens the landscape layout is composed for. */
  audience: string;
}

/**
 * The visitor brochure: how NeverBeen works, how to place a Neverbeen Request,
 * the photo kit, packages, and the destination atlas. It is written for the
 * people who use the website — nothing about the Admin Console or how the site
 * is built. Regenerate it with `npm run generate:brochure`.
 */
export const VISITOR_BROCHURE: Brochure = {
  label: 'The NeverBeen brochure',
  shortLabel: 'Brochure',
  description:
    'A vibrant 50-page tour of everything a visitor needs: the idea behind NeverBeen, how to place a Neverbeen Request, what to send, the packages, the whole destination atlas, and twenty-four traveller reviews and quotations.',
  url: '/assets/documentation/NeverBeen_Brochure.pdf',
  fileName: 'NeverBeen_Brochure.pdf',
  orientation: 'Wide / landscape',
  length: '50 pages',
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

  protected readonly brochure = VISITOR_BROCHURE;

  /** The same brochure, trusted for the embedded viewer below the actions. */
  protected readonly brochureViewer: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(VISITOR_BROCHURE.url);
}
