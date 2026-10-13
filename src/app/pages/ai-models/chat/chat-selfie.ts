/**
 * E — she sends a selfie.
 *
 * She is a model with a whole album of photographs already in the studio, so a selfie is one of
 * her own frames sent the way a person sends one: taken on a phone, badly lit, slightly crooked,
 * with the background of wherever she is standing. The frame is picked from her album, the moment
 * and the flaw come from the seeded lists here, and the window dresses it like a phone photograph
 * (`.is-selfie` in `ai-model-chat.css`): portrait crop, a tilt, grain, a glare and a timestamp.
 *
 * J's video rule lives next to it, in `videoRefusal()`.
 */
import { AiModelProfile } from '../ai-model-data';
import { seededPick } from './chat-random';

/** Asking for a picture of her rather than about the studio's work. */
export const SELFIE_REQUEST_PATTERN =
  /\bselfies?\b|\b(?:send|share|show|give|post|see)\b[^?]{0,28}\b(?:your|ur)\b[^?]{0,12}\b(?:photo|photos|pic|pics|picture|pictures|face|self)\b|\b(?:photo|pic|picture|selfie)s?\s+of\s+(?:you|yourself)\b|\bshow me (?:you|yourself)\b/;

/** Asking her for a video. */
export const VIDEO_REQUEST_PATTERN =
  /\b(?:send|share|give|post|make|record|shoot|show)\b[^?]{0,28}\b(?:video|videos|clip|clips|reel|reels)\b|\b(?:video|videos|clip|clips|reel|reels)\b[^?]{0,18}\b(?:of you|yours)\b|\byour videos?\b|\b(?:any|some|more|another)\s+(?:video|videos|clip|clips|reel|reels)\b|\b(?:video|videos|clip|clips|reels?)\s*\?/;

export interface ChatSelfie {
  /** One of her own photographs, sent as if it had just been taken on her phone. */
  photo: string;
  /** Where she says she is. */
  place: string;
  /** The flaw she admits to. */
  flaw: string;
}

const SELFIE_MOMENTS: readonly { place: string; flaw: string }[] = [
  {
    place: 'in my room, the lamp is on and it is too warm in here',
    flaw: 'no filter, no makeup, this is the real thing',
  },
  { place: 'on the balcony, it is far too bright out here', flaw: 'I am squinting like an idiot' },
  {
    place: 'in the kitchen waiting for the coffee',
    flaw: 'my hair is doing whatever it wants today',
  },
  {
    place: 'in the car before a shoot',
    flaw: 'it came out slightly crooked and I left it that way',
  },
  {
    place: 'on the studio stairs, terrible light in that stairwell',
    flaw: 'the light went straight across my face',
  },
  {
    place: 'on the roof, it is almost dark already',
    flaw: 'grainy, my phone is old and I refuse to replace it',
  },
  {
    place: 'in a café corner, hiding from the afternoon',
    flaw: 'I moved while it was taking, so it is a little blurred',
  },
  {
    place: 'in the lift of my building, the lighting there is a crime',
    flaw: 'I did not even check it before sending',
  },
  {
    place: 'lying down, which is a bad idea for a photograph',
    flaw: 'this is a terrible angle and I am sending it anyway',
  },
  {
    place: 'by the window with the curtain half closed',
    flaw: 'half of my face is in shadow, sorry',
  },
];

const SELFIE_OPENERS: readonly string[] = [
  'Fine, here — one from just now.',
  'Okay, okay. Only because you asked nicely.',
  'You are lucky I am in a good mood.',
  'One, and then you owe me a photograph of you.',
  'Alright — but this one is not the polished version of me.',
];

/** Picks the frame she sends, the moment she is in and the flaw she admits to. */
export function pickChatSelfie(
  model: AiModelProfile,
  seed: string,
  exclude: readonly string[] = [],
): ChatSelfie | null {
  const sources = model.photos.map((photo) => photo.src);
  const album = (sources.length > 0 ? sources : model.cover ? [model.cover] : []).filter(
    (photo) => !exclude.includes(photo),
  );
  const pool = album.length > 0 ? album : sources;
  if (pool.length === 0) return null;

  const moment = seededPick(SELFIE_MOMENTS, `${seed}|moment`);
  // Counted, so two selfies in one session are never the same photograph.
  const photo = seededPick(pool, `${seed}|photo|${exclude.length}`);
  return { photo, place: moment.place, flaw: moment.flaw };
}

/** Her words when the frame goes out — the phone-photograph apology a person always adds. */
export function selfieCaption(
  model: AiModelProfile,
  selfie: ChatSelfie,
  seed: string,
  name: string,
): string {
  const first = model.name.split(' ')[0];
  const opener = seededPick(SELFIE_OPENERS, `${seed}|opener`);
  const who = name ? ` ${name},` : '';
  const aside = seededPick(
    [
      `${first} at home, in other words.`,
      `You can see my whole life in the background, which is embarrassing.`,
      `Not for anyone else, alright?`,
      `Do not judge the wall behind me.`,
    ],
    `${seed}|aside`,
  );
  return `${opener}${who} I took it a minute ago, ${selfie.place}. ${selfie.flaw} 🙈 ${aside}`;
}
