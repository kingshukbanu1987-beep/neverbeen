/**
 * The whole chat history of one session, in the two shapes the visitor can see it in: the
 * on-screen history sheet (`chat-history.ts`) and the printable page that Print and Save as PDF
 * hand to the browser (`chatHistoryPrintHtml` below). Both read the same entries, so the page
 * they print is exactly the history they were looking at.
 *
 * Nothing here stores anything. The transcript is the session the chat window already holds in
 * this tab, and the printed page is generated from it on demand and discarded.
 */
import type { AiModelProfile } from '../ai-model-data';
import type { AiChatMessage, AiChatSession } from './chat-types';
import { reactionEmoji } from './chat-types';

/** One line of the history: a bubble, a reminder or a studio notice, in the order they happened. */
export interface ChatHistoryEntry {
  id: string;
  kind: 'message' | 'reminder' | 'notice';
  /** Who the line belongs to: her, the visitor, or NeverBeen itself. */
  author: 'model' | 'user' | 'system';
  /** The name shown above the line — her name, the visitor's name, or `NeverBeen`. */
  authorName: string;
  text: string;
  /** Epoch milliseconds the message was written. */
  at: number;
  /** `Today`, `Yesterday` or the date — set on the first line of each day, `''` otherwise. */
  dayLabel: string;
  /** `14:32` */
  timeLabel: string;
  /** `12 Oct 2026, 14:32` */
  stampLabel: string;
  /** A picture that went between them. `src` is `''` once its bytes are gone from this tab. */
  photo: { src: string; name: string; selfie: boolean } | null;
  /** A document that went between them. `href` is `''` once its bytes are gone from this tab. */
  document: { name: string; size: string; type: string; href: string } | null;
  /** The message this line replied over, quoted as the chat shows it. */
  quote: { author: string; text: string; photo: boolean } | null;
  /** The reaction left on this line, as an emoji, and who left it. */
  reaction: string;
  reactionBy: string;
  /** The Google results behind her answer, if any. */
  sources: { title: string; url: string }[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** `512 B`, `38 KB`, `2.4 MB` — the same sizes the chat window shows on a file. */
export function historySizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Builds every line of a session's history, oldest first. Pure: the same input gives the same output. */
export function buildChatHistory(
  session: AiChatSession,
  model: AiModelProfile,
  now: Date = new Date(),
): ChatHistoryEntry[] {
  const modelName = model.name;
  const modelFirstName = modelName.split(' ')[0];
  const visitorName = session.identity?.name?.trim() || 'You';

  const authorNameOf = (author: AiChatMessage['author']): string => {
    if (author === 'model') return modelName;
    if (author === 'user') return visitorName;
    return 'NeverBeen';
  };
  const quoteAuthorOf = (author: AiChatMessage['author']): string => {
    if (author === 'user') return 'You';
    if (author === 'model') return modelFirstName;
    return 'NeverBeen';
  };

  let previousDay = '';
  return session.messages.map((message) => {
    const day = new Date(message.at);
    const dayKey = day.toDateString();
    const dayLabel = dayKey === previousDay ? '' : dayLabelOf(day, now);
    previousDay = dayKey;

    const attachment = message.attachment;
    const photo =
      attachment?.kind === 'photo'
        ? {
            src: attachment.preview || '',
            name: attachment.name,
            selfie: attachment.selfie === true,
          }
        : null;
    const document =
      attachment?.kind === 'document'
        ? {
            name: attachment.name,
            size: historySizeLabel(attachment.size),
            type: attachment.type,
            href: attachment.fileData || '',
          }
        : null;

    const quote = message.replyTo
      ? {
          author: quoteAuthorOf(message.replyTo.author),
          text: message.replyTo.text || (message.replyTo.photo ? 'Photograph' : 'Message'),
          photo: message.replyTo.photo === true,
        }
      : null;

    return {
      id: message.id,
      kind: message.kind,
      author: message.author,
      authorName: authorNameOf(message.author),
      text: message.text,
      at: message.at,
      dayLabel,
      timeLabel: TIME_FORMAT.format(day),
      stampLabel: `${DATE_FORMAT.format(day)}, ${TIME_FORMAT.format(day)}`,
      photo,
      document,
      quote,
      reaction: message.reaction ? reactionEmoji(message.reaction) : '',
      reactionBy: message.reaction ? (message.reactionBy === 'user' ? 'You' : modelFirstName) : '',
      sources: (message.sources ?? []).map((source) => ({ title: source.title, url: source.url })),
    };
  });
}

function dayLabelOf(day: Date, now: Date): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day.toDateString() === now.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return DATE_FORMAT.format(day);
}

/** Escapes text for an HTML element or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only picture data URLs are written into the printed page; anything else is left out rather
 * than trusted into an `src` attribute.
 */
function safeImageSource(src: string): string {
  return /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : '';
}

function statusLabel(session: AiChatSession): string {
  if (!session.closed) return 'Active';
  switch (session.closed) {
    case 'timeout':
      return 'Two hours ended';
    case 'blocked':
      return 'Ended by the model';
    case 'inactive':
      return 'Closed for inactivity';
    case 'restarted':
      return 'Replaced by a new chat';
    case 'visitor':
      return 'Ended by the visitor';
    default:
      return 'Ended';
  }
}

/**
 * The printable page of a session's history: a standalone HTML document with its own styles, the
 * pictures inline and every line in order. The browser prints it, or saves it as a PDF from the
 * print dialog. The title is the file name a browser proposes for the PDF.
 */
export function chatHistoryPrintHtml(
  session: AiChatSession,
  model: AiModelProfile,
  now: Date = new Date(),
): string {
  const entries = buildChatHistory(session, model, now);
  const visitorName = session.identity?.name?.trim() || 'Visitor';
  const started = session.startedAt
    ? `${DATE_FORMAT.format(new Date(session.startedAt))}, ${TIME_FORMAT.format(new Date(session.startedAt))}`
    : 'Not started';
  const generated = `${DATE_FORMAT.format(now)}, ${TIME_FORMAT.format(now)}`;
  const title = `Chat with ${model.name} - ${visitorName} - ${DATE_FORMAT.format(now)}`;
  const messageCount = entries.filter((entry) => entry.kind === 'message').length;

  const lines = entries
    .map((entry) => {
      const day = entry.dayLabel ? `<p class="day">${escapeHtml(entry.dayLabel)}</p>` : '';
      if (entry.kind === 'reminder') {
        return `${day}<p class="reminder">${escapeHtml(entry.text)}</p>`;
      }
      if (entry.kind === 'notice') {
        return `${day}<p class="notice">${escapeHtml(entry.text)}</p>`;
      }

      const quote = entry.quote
        ? `<p class="quote"><b>${escapeHtml(entry.quote.author)}</b> ${escapeHtml(entry.quote.text)}</p>`
        : '';

      let attachment = '';
      if (entry.photo) {
        const src = safeImageSource(entry.photo.src);
        attachment = src
          ? `<img class="photo" src="${src}" alt="${escapeHtml(entry.photo.name)}">`
          : `<p class="gone">Photograph — deleted when this chat session ended</p>`;
        if (entry.photo.selfie && src) attachment += `<p class="tag">Selfie</p>`;
      } else if (entry.document) {
        attachment = `<p class="file"><b>${escapeHtml(entry.document.name)}</b> ${escapeHtml(
          entry.document.size,
        )}</p>`;
      }

      const text = entry.text ? `<p class="text">${escapeHtml(entry.text)}</p>` : '';
      const sources = entry.sources.length
        ? `<ul class="sources">${entry.sources
            .map((source) => `<li>${escapeHtml(source.title)} — ${escapeHtml(source.url)}</li>`)
            .join('')}</ul>`
        : '';
      const reaction = entry.reaction
        ? `<p class="reaction">${escapeHtml(entry.reaction)} ${escapeHtml(entry.reactionBy)} reacted</p>`
        : '';

      return `${day}<div class="line ${entry.author}">
  <p class="who">${escapeHtml(entry.authorName)} <span>${escapeHtml(entry.stampLabel)}</span></p>
  ${quote}${attachment}${text}${sources}${reaction}
</div>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Inter, system-ui, -apple-system, sans-serif; color: #111; background: #fff; font-size: 12px; line-height: 1.45; }
  header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 14px; }
  header .eyebrow { margin: 0; font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: #777; }
  header h1 { margin: 4px 0 4px; font-size: 20px; }
  header dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 6px 0 0; font-size: 11px; }
  header dt { color: #777; }
  header dd { margin: 0; }
  .day { text-align: center; color: #777; font-size: 10px; margin: 16px 0 8px; letter-spacing: .04em; }
  .reminder, .notice { text-align: center; color: #555; font-size: 11px; margin: 8px 0; font-style: italic; }
  .line { max-width: 78%; margin: 0 0 10px; padding: 8px 11px; border-radius: 14px; page-break-inside: avoid; break-inside: avoid; }
  .line.model { background: #f0f0f3; margin-right: auto; }
  .line.user { background: #e7e0f7; margin-left: auto; }
  .who { margin: 0 0 3px; font-weight: 700; font-size: 11px; }
  .who span { font-weight: 400; color: #777; margin-left: 6px; }
  .text { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
  .quote { margin: 0 0 6px; padding-left: 8px; border-left: 3px solid #bbb; color: #555; font-size: 11px; }
  .photo { display: block; max-width: 100%; max-height: 300px; border-radius: 10px; margin: 4px 0; }
  .tag, .reaction { font-size: 10px; color: #666; margin: 3px 0 0; }
  .gone { color: #777; font-style: italic; margin: 2px 0; }
  .file { margin: 2px 0; }
  .sources { margin: 6px 0 0; padding-left: 16px; font-size: 10px; color: #555; }
  footer { margin-top: 18px; border-top: 1px solid #ddd; padding-top: 6px; font-size: 9px; color: #888; }
</style>
</head>
<body>
<header>
  <p class="eyebrow">NeverBeen · AI model live chat history</p>
  <h1>${escapeHtml(model.name)} &amp; ${escapeHtml(visitorName)}</h1>
  <dl>
    <dt>Started</dt><dd>${escapeHtml(started)}</dd>
    <dt>Status</dt><dd>${escapeHtml(statusLabel(session))}</dd>
    <dt>Messages</dt><dd>${messageCount}</dd>
    <dt>Printed</dt><dd>${escapeHtml(generated)}</dd>
  </dl>
</header>
<main>
${lines || '<p class="notice">No messages in this chat yet.</p>'}
</main>
<footer>Private AI-model chat from NeverBeen. Nothing here is real outside NeverBeen.</footer>
</body>
</html>`;
}

/**
 * Prints a history page through a hidden frame, so the app's own layout never reaches the printed
 * sheet. Browsers offer Save as PDF from their print dialog.
 */
export function printHtmlDocument(html: string): void {
  if (typeof document === 'undefined') return;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) {
      frame.remove();
      return;
    }
    target.focus();
    target.print();
    // Give the print dialog time to read the page before the frame goes.
    setTimeout(() => frame.remove(), 1000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
