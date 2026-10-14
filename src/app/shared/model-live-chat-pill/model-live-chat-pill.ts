import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { compactCount, exactCount } from '../exact-count-popover/count-format';
import { ModelLiveChatService } from '../../services/model-live-chat.service';

/**
 * The split transparent pill a model's Live Chat button keeps company with: on her card in the
 * directory it comes on the line under the button, on her own profile page beside it. Left half:
 * the chats live with her right now (a green pulse while there are any, a quiet grey dot while
 * there are none). Right half: her whole past-chat total, behind a small translucent white chat
 * bubble. Both numbers come from {@link ModelLiveChatService}, so the two places always agree; the
 * page that shows the pill loads and polls the counts.
 *
 * Both totals are written compactly — `1.4K`, `1.7M`, `1.4B`, `1.9T` — exactly as the engagement
 * counters of the card are, so a long total never widens the pill. The exact figure stays where an
 * exact figure belongs: in the words read out by assistive tech and in the tool-tip on hover.
 *
 * Its height comes from the `--card-chat-height` custom property of the row it stands in, so it is
 * exactly as tall as the button sharing that row with it.
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

  /** The two readouts on the pill, in their compact form: `1.4K`, `21.4K`, `1.47T`. */
  protected readonly liveNowText = computed(() => compactCount(this.liveNow()));
  protected readonly pastChatsText = computed(() => compactCount(this.pastChats()));

  /** The exact figure the compact one stands for, for the tool-tip. */
  protected readonly liveNowTitle = computed(() => {
    const live = this.liveNow();
    return `${exactCount(live)} ${live === 1 ? 'chat' : 'chats'} live right now`;
  });
  protected readonly pastChatsTitle = computed(() => {
    const past = this.pastChats();
    return `${exactCount(past)} past ${past === 1 ? 'chat' : 'chats'} in all`;
  });

  protected readonly accessibleLabel = computed(() => {
    const past = this.pastChats();
    return `${exactCount(this.liveNow())} live now and ${exactCount(past)} past ${
      past === 1 ? 'chat' : 'chats'
    } with ${this.name()}`;
  });
}
