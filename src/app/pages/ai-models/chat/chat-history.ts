import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AiModelProfile } from '../ai-model-data';
import { AiChatSession } from './chat-types';
import { buildChatHistory, chatHistoryPrintHtml, printHtmlDocument } from './chat-history-document';

/**
 * The whole chat history, opened from the chat window: every message of the session — her
 * answers, the visitor's own, the pictures and documents that went between them, the replies, the
 * reactions and the studio's notices — from the first line to the last.
 *
 * The sheet covers the chat window and is read straight from the session the window already
 * holds in this tab. Nothing is saved anywhere new. Print and Save as PDF hand a printable copy of
 * the same lines to the browser's print dialog (see `chat-history-document.ts`).
 */
@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.html',
  styleUrl: './chat-history.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistory {
  readonly model = input.required<AiModelProfile>();
  readonly session = input.required<AiChatSession>();
  /** Back to the conversation. */
  readonly closed = output<void>();

  protected readonly entries = computed(() => buildChatHistory(this.session(), this.model()));
  protected readonly messageCount = computed(
    () => this.entries().filter((entry) => entry.kind === 'message').length,
  );

  /** Opens the browser's print dialog on a printable copy of this history. */
  protected print(): void {
    printHtmlDocument(chatHistoryPrintHtml(this.session(), this.model()));
  }

  /** Saves a file the visitor shared to their own device, straight from the bytes this tab holds. */
  protected download(href: string, name: string): void {
    if (!href || typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
