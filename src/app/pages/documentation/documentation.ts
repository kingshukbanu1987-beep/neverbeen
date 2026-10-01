import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/** The one document this page presents. */
interface DocumentationFile {
  title: string;
  description: string;
  /** Public URL of the PDF (served from `public/assets/documentation`). */
  url: string;
  /** Suggested file name when the visitor downloads the PDF. */
  fileName: string;
  pages: number;
}

/**
 * Documentation page.
 *
 * It shows a single wide landscape document — the Neverbeen Brochure — in an embedded viewer,
 * with "Open Brochure" (new tab) and "Download Brochure" actions.
 */
@Component({
  selector: 'app-documentation-page',
  imports: [RouterLink],
  templateUrl: './documentation.html',
  styleUrl: './documentation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentationPage {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly brochure: DocumentationFile = {
    title: 'Neverbeen Brochure',
    description:
      'Why Neverbeen exists, how to place a Neverbeen Request, what each package costs and how the process works — from your first message to a vacation photograph you can share.',
    url: '/assets/documentation/Neverbeen_Brochure.pdf',
    fileName: 'Neverbeen_Brochure.pdf',
    pages: 22,
  };

  /** The PDF is a fixed, first-party file, so it is safe to trust as an embeddable resource. */
  protected readonly viewerUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `${this.brochure.url}#view=FitH&navpanes=0`,
  );
}
