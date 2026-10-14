import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ModelLiveChatService } from '../../services/model-live-chat.service';

/**
 * The split transparent pill beside a model's Live Chat button — on her card in the directory and
 * on her own profile page. Left half: the chats live with her right now (a green pulse while there
 * are any, a quiet grey dot while there are none). Right half: her whole past-chat total, behind a
 * small translucent white chat bubble. Both numbers come from {@link ModelLiveChatService}, so the
 * two places always agree; the page that shows the pill loads and polls the counts.
 *
 * Its height comes from the `--card-chat-height` custom property of the row it stands in, so it is
 * exactly as tall as the button beside it.
 */
@Component({
  selector: 'app-model-live-chat-pill',
  templateUrl: './model-live-chat-pill.html',
  styleUrl: './model-live-chat-pill.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelLiveChatPill {
  private readonly liveChats = inject(ModelLiveChatService);

  readonly slug = input.required<string>();
  readonly name = input.required<string>();

  protected readonly liveNow = computed(() => this.liveChats.countsFor(this.slug())?.liveNow ?? 0);
  protected readonly pastChats = computed(
    () => this.liveChats.countsFor(this.slug())?.pastChats ?? 0,
  );
  protected readonly hasLiveNow = computed(() => this.liveNow() > 0);

  protected readonly accessibleLabel = computed(() => {
    const past = this.pastChats();
    return `${this.formatTotal(this.liveNow())} live now and ${this.formatTotal(past)} past ${past === 1 ? 'chat' : 'chats'} with ${this.name()}`;
  });

  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }
}
