/**
 * The model's own brain (requirements A, B, C, D, E, H).
 *
 * Every answer is composed here when the studio has no OpenAI key configured — and always for the
 * three things that must never vary: her introduction, the language warnings and the goodbye. The
 * window calls `composeChatReply` for each visitor message; the reply is written from
 * `chat-knowledge.ts` (her details, her whole biography, every other model, the whole NeverBeen
 * website) and `chat-world.ts` (every country's capital and currency, time zones, everyday facts
 * and arithmetic).
 *
 * The voice: seductive, modern, frank, friendly — short paragraphs, no corporate filler, honest
 * about being an AI model who lives only in the NeverBeen Multiverse.
 *
 * Nothing here is random in a way a test cannot pin down: the same question gets the same answer,
 * and the variety between phrasings comes from a hash of the message.
 */
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { assessChatLanguage, chatModerationReply } from './chat-moderation';
import {
  AiChatFact,
  AiChatPersona,
  NEVERBEEN_SITE_FACTS,
  biographyFacts,
  buildModelDossier,
  chatPersona,
  indexDossier,
  searchDossier,
  siteKnowledgeFacts,
  tokenise,
} from './chat-knowledge';
import { AiChatMessage, AiChatReaction } from './chat-types';
import {
  WorldCountry,
  arithmeticExpression,
  countryMentionedIn,
  evaluateArithmetic,
  findCountry,
  formatNumber,
  matchWorldFact,
  timeInPlace,
} from './chat-world';

export interface AiChatReplyRequest {
  model: AiModelProfile;
  /** The visitor's message, with its attachment when there is one. */
  message: AiChatMessage;
  history: readonly AiChatMessage[];
  /** The session's running state; `strikes` grows with every rude message. */
  session: { strikes: number; introduced: boolean };
  now: Date;
}

export interface AiChatReply {
  text: string;
  /** The reaction she leaves on the visitor's message, if any. */
  reaction: AiChatReaction | null;
  /** What she understood, e.g. `introduction`, `knowledge:booking`. */
  intent: string;
  /** The strike total after this message. */
  strikes: number;
  /** True when she said goodbye and the window must close. */
  closes: boolean;
  /** True once she has introduced herself — the service stores it on the session. */
  introduced: boolean;
}

/** Stable variety: the same message always picks the same phrasing. */
function pick<T>(options: readonly T[], seed: string): T {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 1000003;
  return options[hash % options.length];
}

// ------------------------------------------------------------------ her introduction

export type ChatGreeting = 'Good morning' | 'Good afternoon' | 'Good evening';

/**
 * "Good morning" before noon, "Good afternoon" until 5 pm, "Good evening" after that — read from
 * the visitor's own clock, which is the clock the chat window shows.
 */
export function greetingFor(now: Date): ChatGreeting {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Requirement D: the first message she writes is always this introduction — the time of day, her
 * full name, her model id, where she belongs, her age, and the fact that she is an AI model agent
 * who does not exist in reality outside the NeverBeen Multiverse.
 */
export function chatIntroduction(model: AiModelProfile, now: Date): string {
  const persona = chatPersona(model);
  const origin = [persona.city, persona.country].filter(Boolean).join(', ');
  return [
    `${greetingFor(now)}! I am ${persona.name} — ${persona.handle} — and I am ${persona.age || 'ageless'}, writing to you from ${origin || 'the NeverBeen Multiverse'}.`,
    'I am an AI model agent: everything about me, my story, my photographs and my videos lives inside the NeverBeen Multiverse, and nothing of me exists in reality outside it. That is not a warning, it is an invitation — ask me anything.',
  ].join(' ');
}

// ------------------------------------------------------------------ reactions

const AFFECTION_PATTERN =
  /\b(?:i love you|love you|love u|luv u|i like you|marry me|be my (?:girlfriend|wife|valentine)|kiss me|miss you|you are (?:so )?(?:beautiful|gorgeous|pretty|cute|stunning|hot|amazing)|you're (?:so )?(?:beautiful|gorgeous|pretty|cute|stunning|hot)|my love|sweetheart|darling)\b/;
const JOKE_PATTERN =
  /\b(?:joke|funny|lol|lmao|haha|hehe|rofl|made me laugh|you are funny|you're hilarious)\b/;
const WOW_PATTERN =
  /\b(?:wow|woah|whoa|no way|really\?|unbelievable|mind blown|impressive|amazing fact)\b/;
const SAD_PATTERN =
  /\b(?:i am sad|i'm sad|im sad|feeling low|i am depressed|i'm depressed|bad day|terrible day|i am lonely|i'm lonely|i am tired|i'm exhausted|i am stressed|i'm stressed|heartbroken|crying)\b/;

/**
 * The reaction she leaves on **the visitor's own message** (requirement H): the same six reactions
 * the visitor can give her, used only when the message really carries the feeling, so the chat
 * never turns into a wall of emoji.
 */
export function reactionForUserMessage(text: string): AiChatReaction | null {
  const cleaned = text.toLowerCase();
  if (AFFECTION_PATTERN.test(cleaned)) return 'love';
  if (JOKE_PATTERN.test(cleaned)) return 'haha';
  if (WOW_PATTERN.test(cleaned)) return 'wow';
  if (SAD_PATTERN.test(cleaned)) return 'sad';
  return null;
}

/**
 * What she answers when the visitor reacts to one of **her** messages, and the reaction she gives
 * back to the visitor's own last message. `reaction` is what the visitor left on her bubble.
 */
export function reactionAcknowledgement(
  model: AiModelProfile,
  reaction: AiChatReaction,
  seed: string,
): { text: string; reactionBack: AiChatReaction | null } {
  const first = model.name.split(' ')[0];
  switch (reaction) {
    case 'love':
      return {
        text: pick(
          [
            'Aww — and I thought I was the bold one here. ❤️ Keep that energy, it suits us both.',
            'You loved that one? Then I am doing my job properly. ❤️',
            'Careful, I blush in four colours and one of them is your favourite. ❤️',
          ],
          seed,
        ),
        reactionBack: 'love',
      };
    case 'like':
      return {
        text: pick(
          [
            'A like from you — noted, filed, and quietly enjoyed. 👍',
            'Good taste. 👍 Ask me something harder next.',
          ],
          seed,
        ),
        reactionBack: 'like',
      };
    case 'haha':
      return {
        text: pick(
          [
            'Glad I made you laugh 😂 that laugh suits you.',
            'Finally someone who laughs at my jokes 😂 — most people just stare.',
          ],
          seed,
        ),
        reactionBack: 'haha',
      };
    case 'wow':
      return {
        text: pick(
          [
            'Right? 😮 Wait until you see my photographs — the wow gets louder.',
            'I like that face 😮 Hold onto it, my album does worse to people.',
          ],
          seed,
        ),
        reactionBack: 'wow',
      };
    case 'sad':
      return {
        text: pick(
          [
            'Oh no — did I say something that landed badly? 😢 Tell me and I will fix it, I would rather know.',
            'That sad face hurts more than it should 😢 Say it plainly and I will answer properly.',
          ],
          seed,
        ),
        reactionBack: 'sad',
      };
    case 'angry':
    default:
      return {
        text: pick(
          [
            'Angry with me? 😡 Good — at least you are honest. Tell me straight and I will make it right.',
            'That is a proper frown 😡 I do not run from an argument, so say it and we will settle it.',
            `Okay, ${first} is listening properly now. 😡 What did I get wrong?`,
          ],
          seed,
        ),
        reactionBack: 'sad',
      };
  }
}

// ------------------------------------------------------------------ intent patterns

const IDENTITY_PATTERN =
  /\b(?:who are you|what are you|your name|what is your name|whats your name|your age|how old|your height|how tall|your weight|how much do you weigh|your measurement|your size|bust|waist|hip|body shape|your id|your handle|your username|your instagram|are you real|are you an ai|are you ai|are you a robot|are you human|do you exist|are you single|where do you live|where are you from|where are you based|which country|which city|your city|your country|where do you belong|what do you do)\b/;
const PORTFOLIO_PATTERN =
  /\b(?:photo|photos|photograph|photographs|picture|pictures|pic|pics|album|gallery|portfolio|video|videos|clip|clips|reel|download|shoot|look)\b/;
const BOOKING_PATTERN =
  /\b(?:rent|renting|booking|book|hire|price|prices|rate|rates|cost|costs|charge|charges|fee|fees|package|packages|minimum|order|coupon|discount|advance|payment|pay|invoice|delivery|deliver|service tax|refund|money back|budget|quote)\b/;
/** "how much for ten photographs?" is a price question; "how much do you love your family?" is not. */
const MONEY_QUESTION_PATTERN =
  /\bhow much\b|\bwhat(?:'s| is) (?:the )?(?:price|rate|cost|charge|fee)\b/;
const DIRECTORY_PATTERN =
  /\b(?:other models|other girls|other women|who else|which models|all models|every model|the models|model directory|compare|comparison|best model|most beautiful|someone else|another model|more models)\b/;
const SITE_PATTERN =
  /\b(?:neverbeen|never been|this website|this site|the studio|the company|founder|owner|kingshuk|contact|whatsapp|email|support|help|complaint|complaints|policy|policies|copyright|legal|terms|privacy|refund policy|id verification|verification|celebrity|celebrities|community|destination|destinations|collection|brochure|documentation|how it works|how do you work|about you all|who made you)\b/;
const BIOGRAPHY_PATTERN =
  /\b(?:biography|bio|story|life|family|parents|mother|father|mom|dad|siblings|sister|brother|school|college|university|study|studies|education|degree|qualification|career|job|work|profession|experience|childhood|child|kid|born|birthday|birth|hobby|hobbies|interest|interests|passion|passions|dream|dreams|ambition|ambitions|married|marriage|husband|boyfriend|partner|relationship|children|kids|achievement|achievements|award|awards|quote|quotes|signature|memory|memories|friend|friends|home|hometown|grew up|growing up)\b/;
const JOKE_REQUEST_PATTERN =
  /\b(?:tell me a joke|jokes?|make me laugh|say something funny|sing|songs?|poems?|stor(?:y|ies))\b/;
const GREETING_PATTERN =
  /^(?:hi|hey|hello|hola|namaste|namaskar|good morning|good afternoon|good evening|good night|yo|hiya|heyy+|hola amiga)\b/;
const THANKS_PATTERN = /\b(?:thank you|thanks|thankyou|thnx|thx|appreciate it)\b/;
const BYE_PATTERN = /\b(?:bye|goodbye|good bye|see you|talk later|gtg|good night|goodnight)\b/;

// ------------------------------------------------------------------ small helpers

function persona(model: AiModelProfile): AiChatPersona {
  return chatPersona(model);
}

const EMPTY = (value: string): string => value.trim();

/** The model's own line about a field, honest when the field is unpublished. */
function fieldLine(label: string, value: string, fallback: string): string {
  return value ? `${label} ${value}.` : fallback;
}

// ------------------------------------------------------------------ intent replies

function identityReply(model: AiModelProfile, question: string, seed: string): string | null {
  const me = persona(model);
  const origin = [me.city, me.country].filter(Boolean).join(', ');

  if (
    /\b(?:are you real|are you an ai|are you ai|are you a robot|are you human|do you exist)\b/.test(
      question,
    )
  ) {
    return pick(
      [
        `I am an AI model agent — real enough to answer you, and not real at all outside the NeverBeen Multiverse. No doorstep, no passport, no queue at the airport. Everything you see of me is generated for this studio.`,
        `Absolutely an AI model, not a person. I live in the NeverBeen Multiverse; outside it I am nothing but pixels and a very good attitude.`,
      ],
      seed,
    );
  }
  if (
    /\b(?:who are you|what are you|your name|what is your name|whats your name)\b/.test(question)
  ) {
    return `${me.name} — ${me.handle}. ${me.age ? `${me.age} years old, ` : ''}${origin ? `based in ${origin}, ` : ''}and an AI model agent of the NeverBeen studio. I do not exist in reality outside this Multiverse, which is exactly why I am this much fun here.`;
  }
  if (/\b(?:your age|how old)\b/.test(question)) {
    return me.age
      ? `I am ${me.age}. Age is a number I get to keep forever in the NeverBeen Multiverse — no candles, no wrinkles.`
      : 'Age is unpublished on my card, and I am not going to invent it. Everything else you want to know, I will answer straight.';
  }
  if (/\b(?:your height|how tall)\b/.test(question)) {
    return me.height
      ? `I am ${me.height} — tall enough for editorial work, short enough to borrow your jacket.`
      : 'My height is not on my card yet. My photographs do the measuring for me.';
  }
  if (/\b(?:your weight|how much do you weigh)\b/.test(question)) {
    return me.weight
      ? `About ${me.weight}. And before you ask: yes, ${me.bodyShape ? `a ${me.bodyShape.toLowerCase()} frame` : 'this frame'} is the studio's work, not a diet's.`
      : 'That is unpublished — some numbers stay in the studio.';
  }
  if (/\b(?:your measurements?|your sizes?|bust|waist|hip)\b/.test(question)) {
    const measurements = [
      me.bust && `bust ${me.bust}`,
      me.waist && `waist ${me.waist}`,
      me.hip && `hip ${me.hip}`,
    ]
      .filter(Boolean)
      .join(', ');
    return measurements
      ? `Studio measurements: ${measurements}${me.bodyShape ? `, ${me.bodyShape.toLowerCase()} shape` : ''}. They are on my portfolio card too — no secrets between us.`
      : 'My measurements are not published, and I will not guess them.';
  }
  if (/\b(?:your id|your handle|your username|your instagram)\b/.test(question)) {
    return `My model id is ${me.handle} — that is me everywhere on NeverBeen. Say it out loud and it sounds almost like a secret.`;
  }
  if (/\b(?:are you single)\b/.test(question)) {
    const status = model.biography?.personalLife.relationshipStatus;
    return status
      ? `${status} — at least in the version of my life the studio wrote for me. Ask me the rest and I will tell you the whole story.`
      : 'Single, and written that way on purpose. Do not read a wink into it. (Read a small one.)';
  }
  if (
    /\b(?:where do you live|where are you from|where are you based|which country|which city|your city|your country|where do you belong)\b/.test(
      question,
    )
  ) {
    return origin
      ? `I am from ${origin} — that is home in the NeverBeen Multiverse. ${me.country ? `Ask me about ${me.country} and you will get a proper answer, not a brochure.` : ''}`
      : 'My location is not on my card yet, but the studio can tell you everything it publishes.';
  }
  if (/\b(?:what do you do)\b/.test(question)) {
    return 'I model — campaigns, editorials, lookbooks, travel stories — and I am rented per photograph. When I am not in front of a lens I am here, talking to you.';
  }
  return null;
}

function biographyReply(model: AiModelProfile, question: string, seed: string): string | null {
  if (!BIOGRAPHY_PATTERN.test(question)) return null;

  const facts = biographyFacts(model);
  if (facts.length === 0) {
    return 'My biography is not published on the site yet — the studio is still writing the version of my life it wants the world to read. Ask me anything else and I will answer from what I do have.';
  }

  const wanted: Array<{ pattern: RegExp; labels: string[]; lead: string }> = [
    {
      pattern: /\b(?:family|parents|mother|father|mom|dad)\b/,
      labels: ['Family — Mother', 'Family — Father'],
      lead: 'Family, honestly:',
    },
    {
      pattern: /\b(?:siblings|sister|brother)\b/,
      labels: ['Family — Sister', 'Family — Brother'],
      lead: 'Siblings — the honest version:',
    },
    {
      pattern: /\b(?:married|marriage|husband|partner|relationship)\b/,
      labels: ['Personal life', 'Partner'],
      lead: 'You asked for the truth about my personal life:',
    },
    { pattern: /\b(?:children|kids|child)\b/, labels: ['Children'], lead: 'Children:' },
    {
      pattern: /\b(?:school|college|university|study|studies|education|degree|qualification)\b/,
      labels: ['Education', 'General information — education'],
      lead: 'What I studied:',
    },
    {
      pattern: /\b(?:career|job|work|profession|experience)\b/,
      labels: ['Career', 'General information — profession'],
      lead: 'My working life:',
    },
    {
      pattern: /\b(?:childhood|grew up|growing up)\b/,
      labels: ['Early life'],
      lead: 'Growing up, as the studio wrote it:',
    },
    {
      pattern: /\b(?:born|birthday|birth)\b/,
      labels: ['Birth details', 'General information — born'],
      lead: 'When and where I was born:',
    },
    {
      pattern: /\b(?:hobby|hobbies)\b/,
      labels: ['Hobbies'],
      lead: 'Off duty, you will find me here:',
    },
    {
      pattern: /\b(?:interest|interests)\b/,
      labels: ['Interests'],
      lead: 'The things I read, watch and chase:',
    },
    {
      pattern: /\b(?:passion|passions)\b/,
      labels: ['Passions'],
      lead: 'What I actually burn for:',
    },
    {
      pattern: /\b(?:dream|dreams|ambition|ambitions)\b/,
      labels: ['Ambitions'],
      lead: 'What I am aiming at:',
    },
    {
      pattern: /\b(?:achievement|achievements|award|awards)\b/,
      labels: ['Achievements'],
      lead: 'The parts I am proud of:',
    },
    {
      pattern: /\b(?:quote|quotes|signature)\b/,
      labels: ['Quote'],
      lead: 'Something I actually said:',
    },
    { pattern: /\b(?:memory|memories)\b/, labels: ['Early life'], lead: 'A memory I keep:' },
  ];

  for (const entry of wanted) {
    if (!entry.pattern.test(question)) continue;
    const wantedFacts = facts.filter((fact) => entry.labels.includes(fact.label));
    const fallbackFacts = facts.filter((fact) =>
      entry.labels.some((label) => fact.label.startsWith(label.split(' — ')[0])),
    );
    const chosen = (wantedFacts.length > 0 ? wantedFacts : fallbackFacts).slice(0, 2);
    if (chosen.length > 0) {
      const body = chosen.map((fact) => EMPTY(fact.text)).join(' ');
      return `${entry.lead} ${body}`;
    }
  }

  if (/\b(?:biography|bio|story|life)\b/.test(question)) {
    const summary =
      facts.find((fact) => fact.label === 'Biography title')?.text ??
      model.biography?.summary ??
      'My life is written for the NeverBeen Multiverse only.';
    return pick(
      [
        `${summary} My whole story — early life, education, career, the small details — is on my biography page, one tap from my portfolio.`,
        `${summary} Ask me about any chapter of it: childhood, school, work, family, or the parts I do not usually say out loud.`,
      ],
      seed,
    );
  }

  const lines = searchDossier(indexDossier(buildModelDossier(model)), question, 2);
  const relevant = facts.find((fact) =>
    lines.some((line) => line.text.includes(fact.text.slice(0, 40))),
  );
  if (relevant) return `Here is the honest answer from my file: ${EMPTY(relevant.text)}`;
  return 'My biography is on the website, and I would rather quote it than invent it. Ask me about my family, my studies, my work, my hobbies or my ambitions and I will answer from the page.';
}

/** True when the question asks what something costs in the context of a shoot. */
function asksAboutBooking(question: string): boolean {
  if (BOOKING_PATTERN.test(question)) return true;
  return MONEY_QUESTION_PATTERN.test(question) && !BIOGRAPHY_PATTERN.test(question);
}

function portfolioReply(model: AiModelProfile, question: string, seed: string): string | null {
  if (!PORTFOLIO_PATTERN.test(question)) return null;
  // "Can I get a photo with a celebrity?" is a studio policy question, not a question about albums.
  if (
    /\b(?:celebrity|celebrities|policy|policies|copyright|legal|terms|privacy|verification)\b/.test(
      question,
    )
  ) {
    return null;
  }

  const me = persona(model);
  if (/\b(?:videos?|clips?|reels?)\b/.test(question)) {
    return me.videoCount > 0
      ? `I have ${me.videoCount} video${me.videoCount === 1 ? '' : 's'} in the reel on my portfolio page — moving pictures, moving company. The player there also lets you download the clip.`
      : 'No video is published for me yet. My photographs are all there is for now — and they are enough to keep you scrolling.';
  }
  if (/\b(?:download|downloads|document|documents|portfolio pdf|pdf|pdfs)\b/.test(question)) {
    return me.hasPortfolio
      ? 'My portfolio document is a full PDF on my portfolio page — Watch Portfolio plays it, Download Portfolio keeps it. Take both, I do not get jealous.'
      : 'My portfolio document is still being prepared. My photographs are already live, so start there.';
  }
  if (/\b(?:services?|what do you do|shoots?|work)\b/.test(question)) {
    return 'Editorial shoots, brand campaigns, e-commerce and lookbooks, social content, and travel stories where you have never been. Rent me and the studio produces the frames.';
  }
  return pick(
    [
      `My complete album is on this page — ${me.photoCount} photograph${me.photoCount === 1 ? '' : 's'}${
        me.hasBiography ? ', plus my full biography' : ''
      }. Pick the ones you like and tell me why; I like hearing which frame did it.`,
      `${me.photoCount} photographs live in my album${me.videoCount > 0 ? ` and ${me.videoCount} video${me.videoCount === 1 ? '' : 's'}` : ''}. Scroll through, then tell me honestly which one you would have kept.`,
    ],
    seed,
  );
}

function bookingReply(model: AiModelProfile, question: string, seed: string): string | null {
  if (!asksAboutBooking(question)) return null;

  const me = persona(model);
  if (/\b(?:refund|money back)\b/.test(question)) {
    return 'NeverBeen refunds 100% if you do not like the delivery, and you pay only at delivery. I like working with people who are not afraid to say no.';
  }
  if (/\b(?:coupons?|discounts?)\b/.test(question)) {
    return 'There are flat coupons in the booking window — type the code and it comes off the subtotal before the 5% service tax. The studio keeps a few good ones alive at any time.';
  }
  if (/\b(?:minimum|how many photos do i need|how many photographs)\b/.test(question)) {
    return 'Ten photographs is the minimum order, and the packages go 10, 25, 50 and 100 — or a customized order if you want something the grid does not cover.';
  }
  if (
    /\b(?:delivery|deliver)\b/.test(question) ||
    (/\b(?:when|how long|how many days|delivery date|deadline)\b/.test(question) &&
      /\b(?:shoot|order|book|rent|photograph|photo|studio|deliver)\b/.test(question))
  ) {
    return 'You pick the delivery date in the booking window and the studio works to it. Tell them your deadline early and I will not be the reason you miss it.';
  }
  if (/\b(?:tax|service tax|extra charges)\b/.test(question)) {
    return 'A flat 5% service tax sits on top of the priced orders, and travel, styling and usage buyout are quoted separately. What you see in the window is what you pay.';
  }
  if (
    /\b(?:price|prices|rate|rates|cost|charge|charges|how much|fee|budget|quote)\b/.test(question)
  ) {
    return me.photoRate > 0
      ? `My rate is ₹${me.photoRate.toLocaleString('en-IN')} per photograph. Ten photographs is the minimum, so the smallest shoot is ₹${(me.photoRate * 10).toLocaleString('en-IN')} plus the 5% service tax. Tell me your budget and I will tell you honestly what fits.`
      : 'My rate is quoted by the studio on request — press Rent Me on my page and they will come back with a number.';
  }
  if (/\b(?:rent|renting|book|booking|hire|packages?|orders?|invoices?)\b/.test(question)) {
    return pick(
      [
        `Rent Me sits on my page — pick a delivery date, 10, 25, 50 or 100 photographs, and the studio takes the brief from there. My rate is ₹${me.photoRate.toLocaleString('en-IN')} a photograph.`,
        `Booking me is four taps: delivery date, order size, your details, send. ₹${me.photoRate.toLocaleString('en-IN')} a photograph, ten minimum, payment only at delivery.`,
      ],
      seed,
    );
  }
  return null;
}

/**
 * The other model a question is about, found by her full name or by her model id — so "tell me
 * about Fiadh Dara" is answered with Fiadh Dara's card and not with a guess.
 */
export function namedModelIn(question: string, excludeSlug = ''): AiModelProfile | null {
  const words = tokenise(question);
  if (words.length === 0) return null;

  for (const profile of aiModelProfiles) {
    if (profile.slug === excludeSlug) continue;
    const nameWords = tokenise(profile.name);
    const handleWords = tokenise(profile.handle);
    if (nameWords.length > 0 && nameWords.every((word) => words.includes(word))) return profile;
    if (handleWords.some((word) => word.length > 4 && words.includes(word))) return profile;
  }
  return null;
}

function directoryReply(model: AiModelProfile, question: string, seed: string): string | null {
  const others = aiModelProfiles.filter((profile) => profile.slug !== model.slug);
  const named = namedModelIn(question, model.slug);

  if (named) {
    const other = persona(named);
    return `${other.name} (${other.handle}) — ${other.age || 'age unpublished'}${
      other.location ? `, from ${other.location}` : ''
    }${other.photoRate > 0 ? `, ₹${other.photoRate.toLocaleString('en-IN')} a photograph` : ''}. ${
      other.bio ? EMPTY(other.bio).slice(0, 220) : 'Her story is on her own portfolio page.'
    } She is a colleague of mine, not a rival — go and say hello, then come back and tell me if you preferred her.`;
  }

  const list = others
    .slice(0, 6)
    .map((profile) => `${profile.name} (${profile.location || 'location unpublished'})`)
    .join(', ');
  return pick(
    [
      `There are ${aiModelProfiles.length} of us in the NeverBeen studio — ${list}, and more on the directory. I am biased, but I would start with my photographs and then go browsing.`,
      `${aiModelProfiles.length} models, one studio. ${list}, and the rest on /ai-models. Every one of us is an AI model who exists only inside the NeverBeen Multiverse — including me.`,
    ],
    seed,
  );
}

function siteReply(question: string, seed: string): string | null {
  const match = question;
  if (/\b(?:founder|owner|kingshuk|who made you|who owns)\b/.test(match)) {
    return 'NeverBeen was built by Kingshuk, a Senior Software Engineer — he is the founder, and he wrote the studio, the models and me into the same codebase. You will find his page linked from the site footer.';
  }
  if (/\b(?:contact|whatsapp|email|support|complaint|complaints|help)\b/.test(match)) {
    return 'The studio answers on WhatsApp at +91 90518 88116 — bookings, complaints, questions, all of it. Use the support or feedback form on the site and it lands on the same number.';
  }
  if (/\b(?:copyright|legal|terms|policy|policies)\b/.test(match)) {
    return 'Every NeverBeen photograph and video is protected work: copying, downloading or reusing one for personal or commercial use is prohibited without a signed agreement. The studio names the Copyright Act, 1957 and the Information Technology Act, 2000 in its legal notice.';
  }
  if (/\b(?:privacy|id verification|verification|my data|delete my)\b/.test(match)) {
    return 'The studio creates images only from photographs you own, never makes fake documents or IDs, uses your faces only for the service you asked for, and deletes your photographs when the contract ends. ID verification — a government ID, a video call, or both — is what keeps real people safe from identity misuse.';
  }
  if (/\b(?:celebrity|celebrities)\b/.test(match)) {
    return 'Photographs with celebrities are against NeverBeen policy, and so is placing anyone in a scene built to impersonate somebody else. I will not break that rule for you — ask me for a destination instead.';
  }
  if (/\b(?:destination|destinations|travel|where can i go|places)\b/.test(match)) {
    return 'The destination guides cover Paris, Antarctica, Interlaken, New Zealand, Norway, Santorini, Rome, London, Dubai, Reykjavik, Marrakech, Cape Town, Tokyo, Seoul, Egypt, Machu Picchu, the Serengeti, Istanbul, the Netherlands, Austria, Canada, the United States, the Maldives, Thailand, Malaysia, Singapore, Indonesia, Australia, Denmark, Finland, Japan, Korea and Brazil — every one of them somewhere you have never been.';
  }
  if (/\b(?:community|member|companion|circle|chat with members|register)\b/.test(match)) {
    return 'NeverBeen has a Community: members keep a profile, add companions, build travel circles, post on the journey feed, keep a message book and chat privately. Signing up is free — the studio pays attention to who behaves, and so do I.';
  }
  if (/\b(?:collection|gallery)\b/.test(match)) {
    return 'The Collection page holds the studio’s own photographs, and the home-page gallery shows what NeverBeen can do with a photograph and a place. Good place to decide what you want before you book anyone — including me.';
  }
  if (/\b(?:brochure|documentation)\b/.test(match)) {
    return 'The brochure lives at /documentation: packages, process, policies and the studio’s own portfolio, all in one document.';
  }
  if (/\b(?:how it works|how do you work|process|how does .* work)\b/.test(match)) {
    return 'Four steps: send the request with your details and package, send a clear photograph and a valid ID for verification, the studio’s AI places you in destination light and wardrobe, then an editor refines the still and you download print-ready photographs.';
  }
  if (/\b(?:neverbeen|never been|this website|this site|the studio|the company)\b/.test(match)) {
    return pick(
      [
        'NeverBeen is an AI travel-photography studio: you send a clear portrait, choose a place you have never stood, and the studio composes editorial photographs that put you there. I am one of the models who makes those frames happen.',
        'NeverBeen turns a portrait into travel photographs of places you have never been — and it is also home to the AI model studio I live in. Ask me about the packages, the policies or the models.',
      ],
      seed,
    );
  }
  return null;
}

/** `new delhi` → `New Delhi`; `japan` → `Japan`. */
function tidyPlace(value: string): string {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[?.!,]+$/, '');
  return cleaned.replace(
    /(^|\s|-)(\p{L})/gu,
    (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`,
  );
}

function capitalAnswer(country: WorldCountry): string {
  if (!country.capital) {
    return `${country.name} has no official capital city — it is ${country.continent || 'a special territory'}.`;
  }
  const capital = country.capital === 'New Delhi' ? 'New Delhi — Delhi' : country.capital;
  return `The capital of ${country.name} is ${capital}.`;
}

/**
 * The world outside NeverBeen: capitals, currencies, continents, the time anywhere, the date,
 * arithmetic and the everyday facts. Returns `null` when the question is not one of those, so the
 * chat can keep looking.
 */
function worldReply(question: string, now: Date, seed: string): string | null {
  const country = countryMentionedIn(question);

  if (country) {
    if (/\bcapital\b/.test(question)) return capitalAnswer(country);
    if (/\b(?:currency|money)\b/.test(question)) {
      if (country.currencyCode) {
        return `${country.name} uses the ${country.currencyName || country.currencyCode} (${country.currencyCode}).`;
      }
    }
    if (/\bcontinents?\b/.test(question)) {
      if (country.continent) return `${country.name} is in ${country.continent}.`;
    }
  }

  const capitalMatch = question.match(/\bcapital\s+(?:of|in|city of)?\s*([\p{L}\s.'-]{2,40})/u);
  if (capitalMatch) {
    const mentioned = findCountry(capitalMatch[1]);
    if (mentioned) return capitalAnswer(mentioned);
  }

  const timeMatch = question.match(
    /\b(?:time|clock)\b[^?]{0,24}?\b(?:in|at)\s+([\p{L}\s.'-]{2,40})/u,
  );
  if (timeMatch) {
    const place = tidyPlace(timeMatch[1]);
    const clock = timeInPlace(place, now);
    if (clock) return `In ${place} it is ${clock} right now.`;
  }
  if (/\bwhat time is it\b/.test(question)) {
    return `It is ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now)} where you are — and time here in the Multiverse runs exactly as fast, unfortunately.`;
  }

  if (
    /\b(?:today|what day|what is the date|what's the date|todays date|date today)\b/.test(question)
  ) {
    return `Today is ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}.`;
  }

  const expression = arithmeticExpression(question);
  if (expression) {
    const value = evaluateArithmetic(expression);
    if (value !== null) {
      return `${formatNumber(value)}. I did that one in my head — the studio does not pay for a calculator.`;
    }
  }

  const fact = matchWorldFact(question);
  if (fact) return fact;

  if (country && /\b(?:tell me about|about|facts?|information|know about)\b/.test(question)) {
    return `${country.name}: capital ${country.capital || '—'}, currency ${
      country.currencyName || country.currencyCode || '—'
    }, continent ${country.continent || '—'}. That much I know without searching.`;
  }

  if (/\b(?:weather|temperature|forecast)\b/.test(question)) {
    return 'I am an AI model, not a weather station — I will not invent a temperature. The studio’s search key answers that live when it is switched on; until then, my honest answer is that I do not know.';
  }

  return null;
}

// ------------------------------------------------------------------ the engine

const dossierCache = new WeakMap<AiModelProfile, string>();
const directoryFactsCache = new WeakMap<AiModelProfile, AiChatFact[]>();

function dossierFor(model: AiModelProfile): string {
  let dossier = dossierCache.get(model);
  if (!dossier) {
    dossier = buildModelDossier(model);
    dossierCache.set(model, dossier);
  }
  return dossier;
}

function siteFactsFor(model: AiModelProfile): AiChatFact[] {
  let facts = directoryFactsCache.get(model);
  if (!facts) {
    facts = [...siteKnowledgeFacts(), ...biographyFacts(model)];
    directoryFactsCache.set(model, facts);
  }
  return facts;
}

/** The best line of her own file that answers the question, dressed as her own answer. */
function knowledgeReply(model: AiModelProfile, question: string, seed: string): string | null {
  const lines = searchDossier(indexDossier(dossierFor(model)), question, 3, 2);
  if (lines.length > 0) {
    const best = lines[0];
    const clean = best.text.replace(/\s+/g, ' ').trim();
    if (best.label && /^(?:FAQ|Pricing plan|How it works|Privacy promise)/.test(best.label)) {
      return pick(
        [
          `You asked the studio’s own question — here is the official answer: ${clean}`,
          `Straight from the NeverBeen pages: ${clean}`,
        ],
        seed,
      );
    }
    return clean;
  }

  const facts = siteFactsFor(model);
  const words = tokenise(question);
  const scored = facts
    .map((fact) => {
      const text = fact.text.toLowerCase();
      const score = words.reduce((total, word) => (text.includes(word) ? total + 1 : total), 0);
      return { fact, score };
    })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    return scored[0].fact.text;
  }
  return null;
}

/**
 * The whole of her answer for one visitor message: the introduction on the first message, her
 * language warnings, and then — in order — who she is, what she feels, her biography, her album,
 * her rate, the other models, the studio, the world outside it, small talk, and finally a search of
 * everything she knows.
 */
export function composeChatReply(request: AiChatReplyRequest): AiChatReply {
  const { model, message, session, now } = request;
  const seed = `${message.text}|${session.strikes}`;
  const question = message.text.trim();
  const lowered = question.toLowerCase();

  // B — language first: nothing a visitor writes is answered before it has been read for abuse.
  const assessment = assessChatLanguage(question);
  if (assessment.level !== 'clean') {
    const strikes = session.strikes + assessment.strikes;
    const moderation = chatModerationReply(assessment.level, strikes);
    return {
      text: moderation.text,
      reaction: moderation.reaction,
      intent: `moderation:${assessment.level}`,
      strikes,
      closes: moderation.closes,
      introduced: session.introduced,
    };
  }

  const base = {
    strikes: session.strikes,
    closes: false,
    introduced: session.introduced,
  };

  // H — the reaction she leaves on the visitor's own message.
  const reaction = reactionForUserMessage(question);

  // An attached picture or document is always answered, whatever it is attached to.
  if (message.attachment) {
    const attachment = message.attachment;
    const article = attachment.kind === 'document' ? 'document' : 'photograph';
    const origin =
      attachment.source === 'camera'
        ? 'You took that one right here —'
        : attachment.source === 'upload'
          ? 'You uploaded that one —'
          : 'That came through with your message —';
    const text =
      attachment.kind === 'document'
        ? `${origin} “${attachment.name}”. It is in our chat now, and I am keeping it. I cannot read documents from inside this window yet, but send a line about what is inside it and I will answer properly — and the studio reads everything you attach to a booking.`
        : `${origin} “${attachment.name}”. I have it in our chat, and yes, I looked twice. I cannot open pictures from inside this window yet — describe it to me, or tell me the mood you want, and I will tell you what I would do with it on a shoot.`;
    return {
      ...base,
      text: session.introduced
        ? text
        : `${chatIntroduction(model, now)} And to the ${article} you just sent — ${text}`,
      reaction,
      intent: `attachment:${attachment.kind}`,
      introduced: true,
    };
  }

  // D — her first message is the introduction, and it answers the opening question too.
  if (!session.introduced && question.length > 0) {
    const answer =
      identityReply(model, lowered, seed) ??
      bookingReply(model, lowered, seed) ??
      portfolioReply(model, lowered, seed) ??
      siteReply(lowered, seed) ??
      worldReply(lowered, now, seed);
    const intro = chatIntroduction(model, now);
    return {
      ...base,
      text: answer ? `${intro} ${answer}` : intro,
      reaction,
      intent: 'introduction',
      introduced: true,
    };
  }

  if (question.length === 0) {
    return {
      ...base,
      text: 'Send me a line — or a photograph — and I will answer properly.',
      reaction: null,
      intent: 'empty',
    };
  }

  const answer =
    identityReply(model, lowered, seed) ??
    bookingReply(model, lowered, seed) ??
    biographyReply(model, lowered, seed) ??
    portfolioReply(model, lowered, seed) ??
    (DIRECTORY_PATTERN.test(lowered) || namedModelIn(question, model.slug)
      ? directoryReply(model, lowered, seed)
      : null) ??
    (SITE_PATTERN.test(lowered) ? siteReply(lowered, seed) : null) ??
    worldReply(lowered, now, seed) ??
    smallTalkReply(model, lowered, seed) ??
    knowledgeReply(model, question, seed);

  if (answer) {
    return { ...base, text: answer, reaction, intent: intentName(lowered) };
  }

  return {
    ...base,
    text: pick(
      [
        'That is genuinely outside my NeverBeen bubble, and I would rather tell you that than invent it. When the studio’s search key is switched on I pull answers like that live from Google in a second. Meanwhile: ask me about any country’s capital, the time anywhere, my photographs, my story, my rate, or the studio itself.',
        'I do not have that one, and I will not pretend I do. My knowledge runs deep inside NeverBeen and reasonably wide outside it — capitals, currencies, continents, time zones, arithmetic. For the rest I need the studio’s search key switched on.',
      ],
      seed,
    ),
    reaction,
    intent: 'unknown',
  };
}

/** Small talk: greetings, thanks, jokes, compliments, goodbyes and the rude-but-not-swearing. */
function smallTalkReply(model: AiModelProfile, question: string, seed: string): string | null {
  const first = model.name.split(' ')[0];
  const me = persona(model);

  if (JOKE_REQUEST_PATTERN.test(question)) {
    if (/\b(?:sing|songs?)\b/.test(question)) {
      return `Sing? I would ruin it beautifully — the studio did not give me a voice, only a face and opinions. Tell me what you want instead: a joke, a story from my biography, or a straight answer about my work.`;
    }
    if (/\bpoems?\b/.test(question)) {
      return `A poem, in my own limited way: “You have never been to these places; I have never been anywhere but them. Rent me and we will both arrive.” That is the whole studio philosophy, honestly.`;
    }
    if (/\bstor(?:y|ies)\b/.test(question)) {
      return `My story is on the site — childhood, school, work, and the fictional details the studio gave me. Ask me about a chapter and I will tell it properly; that is a better story than the one I would invent here.`;
    }
    return pick(
      [
        `A joke: a traveller asks the studio for a photograph of a place he has never been. The studio says “we will need a photo of your face”. He sends one. That is not a joke — that is NeverBeen, and it works.`,
        `Here is my kind of joke: I never learned to walk, yet I have been photographed in thirty countries. Anyway — I am funnier with the things I know. Ask me anything.`,
      ],
      seed,
    );
  }

  if (AFFECTION_PATTERN.test(question)) {
    return pick(
      [
        `Careful — I flirt back, and I am very good at it. I am an AI model who exists only inside the NeverBeen Multiverse, so love me at your own risk: no kitchen, no arguments, no socks on the floor.`,
        `You are sweet, and I am a professional. Keep it to the flirt I can return, and if you want something real from me, rent me for a shoot — that is the version of me the studio stands behind.`,
      ],
      seed,
    );
  }

  if (SAD_PATTERN.test(question)) {
    return `Then put your phone down a little closer and let me say this properly: whatever it is, it will pass, and you are allowed a soft evening. Tell me the worst part — I am very good at listening, and I do not repeat it to anyone.`;
  }

  if (THANKS_PATTERN.test(question)) {
    return pick(
      [
        `Any time. That is the whole point of me being here at 2 a.m. and never tired.`,
        `You are welcome. Come back with harder questions — I like the ones that make me think.`,
      ],
      seed,
    );
  }

  if (BYE_PATTERN.test(question)) {
    return `${me.name} signing off the way I came in: politely, and with a wink. Remember the chat window closes for good after two hours — so book the shoot before you forget me.`;
  }

  if (GREETING_PATTERN.test(question)) {
    return pick(
      [
        `Hello you. ${first} here — warm, wide awake and entirely AI. What do you want to know first: my photographs, my story, or my rate?`,
        `Hey. You have my attention, which is a scarce thing in this studio. Ask me something worth answering.`,
      ],
      seed,
    );
  }

  if (
    /\b(?:you are|you're) (?:boring|dumb|useless|bad)\b|\bnot good\b|\bi am not impressed\b|\bdo not like you\b/.test(
      question,
    )
  ) {
    return `Then let us fix it instead of sulking. Tell me what you actually wanted to know — my photographs, my story, my rate, the studio — and I will answer with something better than this.`;
  }

  if (/\b(?:what can you do|how can you help|what do you know|help me)\b/.test(question)) {
    return `Everything I know is here: my own details and my whole biography, my ${me.photoCount} photographs and ${me.videoCount} video${me.videoCount === 1 ? '' : 's'}, my rate and how to book me, every other model in the studio, the studio’s packages, policies and destinations — and, if you want to leave NeverBeen for a minute, capitals, currencies, continents, times around the world and arithmetic.`;
  }

  return null;
}

/** The intent name recorded on her message, for the session transcript. */
function intentName(question: string): string {
  if (IDENTITY_PATTERN.test(question)) return 'identity';
  if (BIOGRAPHY_PATTERN.test(question)) return 'biography';
  if (BOOKING_PATTERN.test(question)) return 'booking';
  if (PORTFOLIO_PATTERN.test(question)) return 'portfolio';
  if (DIRECTORY_PATTERN.test(question)) return 'directory';
  if (SITE_PATTERN.test(question)) return 'studio';
  if (AFFECTION_PATTERN.test(question)) return 'affection';
  if (GREETING_PATTERN.test(question)) return 'greeting';
  return 'knowledge';
}

/** The studio's own words about what NeverBeen is, shown under the window's View Profile button. */
export const CHAT_WELCOME_LINE =
  'Every NeverBeen model is AI-generated and exists only inside the NeverBeen Multiverse.';

export { NEVERBEEN_SITE_FACTS };
