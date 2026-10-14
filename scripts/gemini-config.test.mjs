import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  GEMINI_DEFAULT_MODEL,
  buildGeminiReadBody,
  validateReadRequest,
} from '../worker/ai-read-core.mjs';
import { GEMINI_DEFAULT_IMAGE_MODEL } from '../worker/ai-selfie-core.mjs';
import { geminiGenerateContentUrl } from '../worker/gemini-http.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('production pins agree with defaults and use separate text/image models', () => {
  const config = readFileSync(join(root, 'wrangler.jsonc'), 'utf8');
  assert.equal(config.match(/"GEMINI_MODEL":\s*"([^"]+)"/)[1], GEMINI_DEFAULT_MODEL);
  assert.equal(config.match(/"GEMINI_IMAGE_MODEL":\s*"([^"]+)"/)[1], GEMINI_DEFAULT_IMAGE_MODEL);
  assert.equal(GEMINI_DEFAULT_MODEL, 'gemini-3.6-flash');
  assert.equal(GEMINI_DEFAULT_IMAGE_MODEL, 'gemini-3.1-flash-image');
});

test('native URLs accept ListModels resource names without a doubled models prefix', () => {
  assert.equal(
    geminiGenerateContentUrl(' models/gemini-3.6-flash '),
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
  );
});

test('reading uses Gemini 3 reasoning settings without breaking explicit legacy overrides', () => {
  const { turn } = validateReadRequest({ text: 'Hello' });
  const config = buildGeminiReadBody(turn, null).generationConfig;
  assert.deepEqual(config.thinkingConfig, { thinkingLevel: 'low' });
  assert.equal(config.responseMimeType, 'application/json');
  assert.equal(config.maxOutputTokens, 2048);
  assert.equal(
    buildGeminiReadBody(turn, null, 'gemini-2.5-flash').generationConfig.thinkingConfig,
    undefined,
  );
});

test('incremental Azure migration applies after both the original and her-voice service patches', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neverbeen-gemini-'));
  try {
    for (const name of ['Services', 'Controllers', 'Dtos']) mkdirSync(join(directory, name));
    const apply = (name) =>
      execFileSync(
        'git',
        [
          'apply',
          '--include=Services/*.cs',
          '--include=Controllers/*.cs',
          '--include=Dtos/*.cs',
          join(root, 'docs/patches', name),
        ],
        { cwd: directory },
      );
    apply('neverbeen-api-ai-chat-gemini.patch');
    apply('neverbeen-api-ai-chat-biography.patch');
    apply('neverbeen-api-ai-chat-her-voice.patch');
    apply('neverbeen-api-ai-chat-model-migration.patch');
    const service = readFileSync(join(directory, 'Services/GeminiChatService.cs'), 'utf8');
    assert.match(service, /ChatModel = "gemini-3.6-flash"/);
    assert.match(service, /thinkingLevel = "low"/);
    assert.doesNotMatch(service, /thinkingBudget =/);
    assert.match(
      readFileSync(join(directory, 'Controllers/AiChatController.cs'), 'utf8'),
      /InHerVoice/,
    ); // preserve reply processing
    assert.match(service, /request.Headers.Add\("x-goog-api-key", apiKey\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
