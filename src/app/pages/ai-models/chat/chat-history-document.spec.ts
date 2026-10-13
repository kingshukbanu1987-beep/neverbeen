import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  buildChatHistory,
  chatHistoryPrintHtml,
  escapeHtml,
  historySizeLabel,
} from './chat-history-document';
import { AiChatMessage, AiChatSession, AI_CHAT_SESSION_MS } from './chat-types';

const model = aiModelProfiles.find((profile) => profile.slug === 'alisha-bhattacharya')!;
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function message(partial: Partial<AiChatMessage> & { id: string }): AiChatMessage {
  return {
    author: 'user',
    text: '',
    at: Date.UTC(2026, 9, 12, 14, 32),
    kind: 'message',
    attachment: null,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: 0,
    sources: [],
    replyTo: null,
    intent: '',
    ...partial,
  };
}

function session(messages: AiChatMessage[], extra: Partial<AiChatSession> = {}): AiChatSession {
  return {
    slug: model.slug,
    identity: { name: 'Rahul Verma', avatar: PNG },
    startedAt: Date.UTC(2026, 9, 12, 14, 30),
    endsAt: Date.UTC(2026, 9, 12, 14, 30) + AI_CHAT_SESSION_MS,
    messages,
    strikes: 0,
    closed: '',
    reminders: [],
    introduced: true,
    followUpAt: 0,
    followUps: 0,
    lastVisitorAt: 0,
    pitches: 0,
    closedAt: 0,
    feedback: null,
    language: '',
    ...extra,
  } as AiChatSession;
}

describe('chat history document', () => {
  it('keeps every line of the session in order, with replies, reactions and sources', () => {
    const history = session([
      message({ id: 'notice', author: 'system', kind: 'notice', text: 'Private chat started.' }),
      message({ id: 'hi', author: 'model', text: 'Hello Rahul' }),
      message({
        id: 'reply',
        author: 'user',
        text: 'Nice to meet you',
        replyTo: { id: 'hi', author: 'model', text: 'Hello Rahul', at: 1, photo: false },
        reaction: 'love',
        reactionBy: 'model',
      }),
      message({
        id: 'answer',
        author: 'model',
        text: 'Here is a link',
        sources: [{ title: 'NeverBeen', url: 'https://example.com/a' }],
      }),
    ]);

    const entries = buildChatHistory(history, model);

    expect(entries.map((entry) => entry.id)).toEqual(['notice', 'hi', 'reply', 'answer']);
    expect(entries[0].kind).toBe('notice');
    expect(entries[1].authorName).toBe(model.name);
    expect(entries[2].authorName).toBe('Rahul Verma');
    expect(entries[2].quote).toEqual({
      author: model.name.split(' ')[0],
      text: 'Hello Rahul',
      photo: false,
    });
    expect(entries[2].reaction).toBe('❤️');
    expect(entries[2].reactionBy).toBe(model.name.split(' ')[0]);
    expect(entries[3].sources).toEqual([{ title: 'NeverBeen', url: 'https://example.com/a' }]);
    // The day is named once, on the first line of the day; the lines after it carry no label.
    expect(entries[0].dayLabel).not.toBe('');
    expect(entries[1].dayLabel).toBe('');
    expect(entries[2].dayLabel).toBe('');
  });

  it('carries pictures and documents, and says so when their bytes are no longer in this tab', () => {
    const history = session([
      message({
        id: 'photo',
        attachment: {
          kind: 'photo',
          name: 'beach.png',
          type: 'image/png',
          size: 2048,
          source: 'upload',
          preview: PNG,
        },
      }),
      message({
        id: 'selfie-gone',
        author: 'model',
        attachment: {
          kind: 'photo',
          name: 'selfie.png',
          type: 'image/png',
          size: 1,
          source: 'camera',
          selfie: true,
          preview: '',
        },
      }),
      message({
        id: 'file',
        attachment: {
          kind: 'document',
          name: 'passport.pdf',
          type: 'application/pdf',
          size: 3 * 1024 * 1024,
          source: 'file',
          preview: '',
          fileData: 'data:application/pdf;base64,JVBERi0=',
        },
      }),
      message({
        id: 'file-gone',
        attachment: {
          kind: 'document',
          name: 'notes.txt',
          type: 'text/plain',
          size: 300,
          source: 'file',
          preview: '',
          fileData: '',
        },
      }),
    ]);

    const [photo, selfie, file, fileGone] = buildChatHistory(history, model);
    expect(photo.photo).toEqual({ src: PNG, name: 'beach.png', selfie: false });
    expect(selfie.photo).toEqual({ src: '', name: 'selfie.png', selfie: true });
    expect(file.document).toEqual({
      name: 'passport.pdf',
      size: '3.0 MB',
      type: 'application/pdf',
      href: 'data:application/pdf;base64,JVBERi0=',
    });
    expect(fileGone.document?.href).toBe('');

    const printed = chatHistoryPrintHtml(history, model);
    expect(printed).toContain(`src="${PNG}"`);
    expect(printed).toContain('passport.pdf');
    expect(printed).toContain('Photograph — deleted when this chat session ended');
    expect(printed).not.toContain('data:application/pdf');
  });

  it('escapes what the visitor wrote, so the printed page cannot run markup', () => {
    const history = session([
      message({
        id: 'evil',
        text: '<img src=x onerror="alert(1)"> & <script>bad()</script>',
      }),
    ]);

    const printed = chatHistoryPrintHtml(history, model);

    expect(printed).not.toContain('<script>bad()</script>');
    expect(printed).not.toContain('<img src=x');
    expect(printed).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(printed).toContain('&amp;');
  });

  it('only writes picture data URLs into the printed page', () => {
    const history = session([
      message({
        id: 'svg',
        attachment: {
          kind: 'photo',
          name: 'x.svg',
          type: 'image/svg+xml',
          size: 10,
          source: 'upload',
          preview: 'data:image/svg+xml;base64,PHN2Zy8+',
        },
      }),
    ]);

    expect(chatHistoryPrintHtml(history, model)).not.toContain('<img class="photo"');
  });

  it('titles the printed page after the model, the visitor and the day, and states the chat status', () => {
    const now = new Date(Date.UTC(2026, 9, 13, 10, 0));
    const printed = chatHistoryPrintHtml(
      session([message({ id: 'a', text: 'hi' })], { closed: 'visitor' }),
      model,
      now,
    );

    expect(printed).toContain(`<title>Chat with ${model.name} - Rahul Verma - 13 Oct 2026</title>`);
    expect(printed).toContain('Ended by the visitor');
    expect(printed).toContain('<dd>1</dd>');
  });

  it('formats file sizes like the chat window does', () => {
    expect(historySizeLabel(512)).toBe('512 B');
    expect(historySizeLabel(38 * 1024)).toBe('38 KB');
    expect(historySizeLabel(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});
