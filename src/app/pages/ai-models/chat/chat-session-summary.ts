import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { AiModelProfile } from '../ai-model-data';
import { ChatIdentity } from './chat-identity';
import { ChatSessionSummary } from './chat-summary';

/**
 * K — the card that appears when a chat session ends: the two faces, the time they spent together,
 * what the conversation was about, and her honest paragraph about it. The Close button puts it
 * away; the window behind it stays closed to new messages.
 */
@Component({
  selector: 'app-chat-session-summary',
  templateUrl: './chat-session-summary.html',
  styleUrl: './chat-session-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSessionSummaryCard {
  readonly model = input.required<AiModelProfile>();
  readonly summary = input.required<ChatSessionSummary>();
  readonly visitor = input<ChatIdentity | null>(null);

  readonly closed = output<void>();

  protected readonly stars = computed(() => [1, 2, 3, 4, 5]);

  protected readonly visitorPhoto = computed(() => this.visitor()?.avatar ?? '');

  protected readonly visitorName = computed(() => this.visitor()?.name ?? 'You');
}
