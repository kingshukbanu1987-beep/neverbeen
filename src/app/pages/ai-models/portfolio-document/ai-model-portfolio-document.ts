import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { map } from 'rxjs';
import { founderWhatsAppLink } from '../../../services/whatsapp-link';
import { aiModelProfiles } from '../ai-model-data';

/**
 * The model's generated portfolio document — the PDF that CreatePortfolio.mjs writes into
 * `<album>/Portfolio/`. "Watch Portfolio" on the model page opens this viewer; "Download
 * Portfolio" saves the same file.
 *
 * A model whose Portfolio folder holds no document gets a deliberately plain white page that
 * says the portfolio is not available yet and points at the NeverBeen support team.
 */
@Component({
  selector: 'app-ai-model-portfolio-document',
  imports: [RouterLink],
  templateUrl: './ai-model-portfolio-document.html',
  styleUrl: './ai-model-portfolio-document.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelPortfolioDocumentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  /** The published portfolio document, or null while the model has none. */
  protected readonly document = computed(() => this.model()?.portfolio ?? null);

  /** The PDF trusted for the embedded viewer. */
  protected readonly viewerSrc = computed<SafeResourceUrl | null>(() => {
    const file = this.document();
    return file ? this.sanitizer.bypassSecurityTrustResourceUrl(file.url) : null;
  });

  /** Prefilled WhatsApp chat with the studio, asking for this model's portfolio. */
  protected supportLink(modelName: string): string {
    return founderWhatsAppLink(
      `Hello NeverBeen, please share the model portfolio of ${modelName}.`,
    );
  }
}
