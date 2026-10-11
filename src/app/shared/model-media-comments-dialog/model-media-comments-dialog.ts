import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MediaKind } from '../../services/model-media-engagement.service';
import { ModelMediaComments } from '../model-media-comments/model-media-comments';

/**
 * Page-level comments pop-up for a portfolio tile: the shared thread of one photograph or clip
 * wrapped in a centred dialog. The photo and video pop-ups embed the same thread directly; this
 * dialog is what the Comments icon of a tile opens when the visitor is signed in.
 */
@Component({
  selector: 'app-model-media-comments-dialog',
  imports: [ModelMediaComments],
  templateUrl: './model-media-comments-dialog.html',
  styleUrl: './model-media-comments-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class ModelMediaCommentsDialog {
  readonly modelSlug = input.required<string>();
  readonly mediaType = input.required<MediaKind>();
  readonly mediaSrc = input.required<string>();

  readonly closed = output<void>();

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.closed.emit();
  }
}
