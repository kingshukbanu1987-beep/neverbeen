/**
 * Test-only helpers for the chat service — the counterpart of `community-demo.testing.ts`.
 *
 * The service paces every message the way a person types (requirements A, C, D and F of the second
 * brief): seconds of waiting, random pauses, several messages per answer. A test cannot sit through
 * that, so this switches every wait off at once. With all of them at zero the service recognises the
 * state (`silent`) and writes her messages in one go, which also keeps the tests deterministic.
 */
import { AiModelChatService } from './ai-model-chat.service';

/** Switches off every wait of the pacing table, leaving an instant, deterministic chat. */
export function silenceChatPacing(chat: AiModelChatService): void {
  Object.assign(chat.pacing, {
    perCharMs: 0,
    floorMs: 0,
    ceilingMs: 0,
    jitterMs: 0,
    awayChance: 0,
    awayMinMs: 0,
    awayMaxMs: 0,
    midPauseChance: 0,
    midPauseMinMs: 0,
    midPauseMaxMs: 0,
    gapMinMs: 0,
    gapMaxMs: 0,
    selfieMinMs: 0,
    selfieMaxMs: 0,
    introMinMs: 0,
    introMaxMs: 0,
    // Long enough that no test answer is split unless the test asks for it.
    bubbleMaxChars: 4_000,
  });
}
