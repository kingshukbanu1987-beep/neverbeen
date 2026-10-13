/**
 * Everything a model knows (requirement A).
 *
 * One dossier per model, built from her own record — her details, her whole fictional Multiverse
 * biography, her photographs and videos — plus the NeverBeen website itself: the directory of every
 * other model, the pricing plans, the FAQ, how it works, the destinations, the privacy promises and
 * the studio's policies. The dossier is what the reply engine searches for an answer, and it is what
 * is handed to OpenAI when the studio has a key configured (see `docs/ai-model-chat.md`).
 *
 * The world outside NeverBeen lives next door in `chat-world.ts` (every country's capital, currency
 * and continent) and this model's own copy of the facts she was asked about most.
 */
import {
  destinations,
  faqItems,
  howItWorksSteps,
  pricingPlans,
  privacyPromises,
} from '../../../models/site-content';
import { AiModelProfile, AiModelVideo } from '../ai-model-data';
import { AI_CHAT_REMINDER_MARKS, AI_CHAT_SESSION_MS } from './chat-types';

/** The model's own card, flattened into the values her answers quote. */
export interface AiChatPersona {
  slug: string;
  name: string;
  /** Her model id, e.g. `@alisha.bhattacharya`. */
  handle: string;
  city: string;
  country: string;
  /** "City, Country" as published. */
  location: string;
  age: string;
  height: string;
  weight: string;
  bodyShape: string;
  bust: string;
  waist: string;
  hip: string;
  photoRate: number;
  availability: string;
  tags: readonly string[];
  bio: string;
  cover: string;
  photoCount: number;
  videoCount: number;
  hasBiography: boolean;
  hasPortfolio: boolean;
}

export interface AiChatFact {
  /** Short label, e.g. "Education". */
  label: string;
  text: string;
}

/** `"Darjeeling, India"` → city `Darjeeling`, country `India`. */
export function splitLocation(location: string): { city: string; country: string } {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { city: '', country: '' };
  if (parts.length === 1) return { city: parts[0], country: '' };
  return { city: parts[0], country: parts.slice(1).join(', ') };
}

export function chatPersona(model: AiModelProfile): AiChatPersona {
  const { city, country } = splitLocation(model.location);
  return {
    slug: model.slug,
    name: model.name,
    handle: model.handle,
    city,
    country,
    location: model.location,
    age: model.age,
    height: model.height,
    weight: model.weight,
    bodyShape: model.bodyShape,
    bust: model.bust,
    waist: model.waist,
    hip: model.hip,
    photoRate: model.photoRate,
    availability: model.availability,
    tags: model.tags,
    bio: model.bio,
    cover: model.cover,
    photoCount: model.photos.length,
    videoCount: model.videos.length,
    hasBiography: Boolean(model.biography),
    hasPortfolio: Boolean(model.portfolio),
  };
}

/** Her full name, as the introduction gives it. */
export function fullName(model: AiModelProfile): string {
  return model.name;
}

/**
 * The NeverBeen facts that are not in a data file: the studio, its founder, how to reach it, and the
 * rules that apply to every model and every visitor. Kept as short, quotable sentences so an answer
 * can repeat one verbatim.
 */
export const NEVERBEEN_SITE_FACTS: readonly string[] = [
  'NeverBeen is an AI travel-photography studio. You send a clear portrait, choose a place you have never been, and the studio composes editorial travel photographs that look like you were there.',
  'The founder of NeverBeen is Kingshuk, a Senior Software Engineer. He built the studio and the AI models who live in it.',
  'NeverBeen is reachable on WhatsApp at +91 90518 88116, and every request form on the site hands the message to that same number.',
  'The website has a home page, a destination guide per place, the Collection gallery, the AI Models studio, a Community for members, a travel-feeds page, feedback, help, privacy, terms, and a brochure under /documentation.',
  'The AI Models studio lists every NeverBeen model at /ai-models, and each model has a portfolio at /ai-models/<model-id>, a fictional biography at /ai-models/<model-id>/biography, a complete photo album at /ai-models/<model-id>/photos and a portfolio document at /ai-models/<model-id>/portfolio.',
  'Every NeverBeen model is AI-generated. None of them exists in reality outside the NeverBeen Multiverse, and every biography detail is fictional.',
  'A model can be rented for a shoot: pick a delivery date, an order of photographs and a package in the booking window on her portfolio page.',
  'Ten photographs is the minimum order. Each model quotes her own rate per photograph, and travel, styling and usage buyout are quoted separately.',
  'The photograph packages are Starter at ₹499, Economy Class at ₹999, Business Class at ₹1999 and First Class at ₹4999; they decide how many destination looks you receive.',
  'A booking is priced at the model’s rate per photograph and carries a 5% service tax. A valid flat coupon comes off the subtotal before the tax, and the payable amount never goes below zero.',
  'Payment is taken only at delivery, and NeverBeen refunds 100% if you do not like the delivery.',
  'NeverBeen deletes your photographs after the contract ends, never resells them and never trains its own models on your face.',
  'Creating photographs of celebrities, or placing a member in a scene built to impersonate someone else, is against NeverBeen policy. ID verification protects real people from identity misuse.',
  'Vulgarity, sexuality and nudity are not part of any NeverBeen package, and neither are revealing-outfit requests beyond what the studio allows.',
  'Unauthorised copying, downloading or reuse of NeverBeen model photographs and videos — personal or commercial — is prohibited, and the studio names the Copyright Act, 1957 and the Information Technology Act, 2000 in its legal notice.',
  'NeverBeen members can join the Community, where they keep a profile, add companions, travel circles, a journey feed, a message book and private chats.',
];

/** The plans, the FAQ, the steps, the destinations and the privacy promises, as quotable lines. */
export function siteKnowledgeFacts(): AiChatFact[] {
  const facts: AiChatFact[] = [];

  for (const plan of pricingPlans) {
    facts.push({
      label: `Pricing plan — ${plan.name}`,
      text: `${plan.name} costs ${plan.price} ${plan.cadence} — ${plan.description} Includes: ${plan.features.join('; ')}.`,
    });
  }

  for (const step of howItWorksSteps) {
    facts.push({
      label: `How it works — ${step.number}`,
      text: `${step.title}: ${step.description}`,
    });
  }

  for (const item of faqItems) {
    facts.push({ label: 'FAQ', text: `${item.question} ${item.answer}` });
  }

  for (const promise of privacyPromises) {
    facts.push({
      label: `Privacy promise ${promise.number}`,
      text: `${promise.title}: ${promise.description}`,
    });
  }

  facts.push({
    label: 'Destinations',
    text: `The destination guides cover ${destinations.map((destination) => `${destination.name} (${destination.country})`).join(', ')}.`,
  });

  facts.push({
    label: 'Chat session rules',
    text: `A chat with a model lasts at most two hours (${Math.round(AI_CHAT_SESSION_MS / 60000)} minutes). She announces the remaining time at the ${AI_CHAT_REMINDER_MARKS.join(', ')}-minute marks, and the window closes when the time is up.`,
  });

  return facts;
}

/** Her fictional biography, chapter by chapter, as quotable lines. */
export function biographyFacts(model: AiModelProfile): AiChatFact[] {
  const biography = model.biography;
  if (!biography) return [];

  const facts: AiChatFact[] = [
    { label: 'Biography title', text: `${biography.title} — ${biography.summary}` },
    {
      label: 'Birth details',
      text: `Born ${biography.birthDetails.date} at ${biography.birthDetails.time} ${biography.birthDetails.timeZone} in ${biography.birthDetails.neighborhood}, ${biography.birthDetails.city}, ${biography.birthDetails.country} (${biography.birthDetails.facility}).`,
    },
  ];

  for (const [key, value] of Object.entries(biography.generalInformation)) {
    facts.push({ label: `General information — ${key}`, text: `${key}: ${value}` });
  }
  for (const paragraph of biography.earlyLife) {
    facts.push({ label: 'Early life', text: paragraph });
  }
  for (const entry of biography.educationalBackground) {
    facts.push({
      label: 'Education',
      text: `${entry.period} — ${entry.qualification}, ${entry.institution}, ${entry.location}. ${entry.description}`,
    });
  }
  for (const entry of biography.career) {
    facts.push({
      label: 'Career',
      text: `${entry.period} — ${entry.role} at ${entry.organization}, ${entry.location} (${entry.employmentType}). ${entry.description}`,
    });
  }
  for (const achievement of biography.achievements) {
    facts.push({ label: 'Achievements', text: achievement });
  }

  const personal = biography.personalLife;
  facts.push({
    label: 'Personal life',
    text: `${personal.relationshipStatus} (${personal.relationshipType}). ${personal.narrative}`,
  });
  if (personal.partner) {
    facts.push({
      label: 'Partner',
      text: `${personal.partner.name} — met ${personal.partner.met}, married ${personal.partner.married}. ${personal.partner.note}`,
    });
  }
  for (const relative of [...personal.parents, ...personal.siblings]) {
    facts.push({
      label: `Family — ${relative.relationship}`,
      text: `${relative.name}${relative.age ? `, ${relative.age}` : ''}. ${relative.note}`,
    });
  }
  for (const child of personal.children) {
    facts.push({ label: 'Children', text: `${child.name}, ${child.age}. ${child.note}` });
  }

  for (const hobby of biography.hobbies) facts.push({ label: 'Hobbies', text: hobby });
  for (const interest of biography.interests) facts.push({ label: 'Interests', text: interest });
  for (const passion of biography.passions) facts.push({ label: 'Passions', text: passion });
  for (const ambition of biography.ambitions) facts.push({ label: 'Ambitions', text: ambition });
  for (const note of biography.finalNotes) facts.push({ label: 'Final notes', text: note });
  for (const quote of biography.quotes) {
    facts.push({ label: 'Quote', text: `“${quote.text}” — ${quote.by}` });
  }

  return facts;
}

/** A clip of hers, described in words (she talks about her videos, she does not play them here). */
export function videoSummary(video: AiModelVideo): string {
  const caption = video.caption || video.fileName;
  return caption;
}

/**
 * The whole grounding document for one model: her card, her biography and the website, as plain
 * text. Handed to the reply engine to search, and to the studio's OpenAI request as context.
 */
export function buildModelDossier(model: AiModelProfile): string {
  const persona = chatPersona(model);
  const lines: string[] = [];

  lines.push(`# ${persona.name} (${persona.handle})`);
  lines.push(
    `Location: ${persona.location} — city ${persona.city || 'unpublished'}, country ${persona.country || 'unpublished'}`,
  );
  lines.push(`Age: ${persona.age || 'unpublished'}`);
  lines.push(
    `Height: ${persona.height || 'unpublished'} · Weight: ${persona.weight || 'unpublished'} · Body shape: ${persona.bodyShape || 'unpublished'}`,
  );
  lines.push(
    `Bust: ${persona.bust || 'unpublished'} · Waist: ${persona.waist || 'unpublished'} · Hip: ${persona.hip || 'unpublished'}`,
  );
  lines.push(`Rate: ₹${persona.photoRate} per photograph`);
  if (persona.availability) lines.push(`Availability: ${persona.availability}`);
  if (persona.tags.length > 0) lines.push(`Tags: ${persona.tags.join(', ')}`);
  lines.push(`Portfolio: ${persona.photoCount} photographs, ${persona.videoCount} videos.`);
  if (persona.bio) lines.push(`Her introduction: ${persona.bio}`);

  const biography = biographyFacts(model);
  if (biography.length > 0) {
    lines.push('');
    lines.push('## Her fictional Multiverse biography');
    for (const fact of biography) lines.push(`- ${fact.label}: ${fact.text}`);
  }

  if (model.videos.length > 0) {
    lines.push('');
    lines.push('## Her videos');
    for (const video of model.videos) lines.push(`- ${videoSummary(video)}`);
  }

  lines.push('');
  lines.push('## NeverBeen, the studio');
  for (const fact of NEVERBEEN_SITE_FACTS) lines.push(`- ${fact}`);
  for (const fact of siteKnowledgeFacts()) lines.push(`- ${fact.label}: ${fact.text}`);

  return lines.join('\n');
}

/** One line of the dossier, kept with the words the engine scores against. */
export interface DossierLine {
  label: string;
  text: string;
  words: Set<string>;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'at',
  'for',
  'with',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'i',
  'you',
  'your',
  'yours',
  'me',
  'my',
  'mine',
  'we',
  'our',
  'she',
  'her',
  'hers',
  'he',
  'his',
  'they',
  'their',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'from',
  'about',
  'as',
  'by',
  'so',
  'if',
  'then',
  'than',
  'there',
  'here',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'when',
  'where',
  'why',
  'how',
  'can',
  'could',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'not',
  'no',
  'yes',
  'tell',
  'know',
  'want',
  'like',
  'please',
  'give',
  'get',
  'got',
  'make',
  'just',
  'also',
  'any',
]);

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[-']+|[-']+$/g, ''))
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/** Splits a dossier into searchable lines. */
export function indexDossier(dossier: string): DossierLine[] {
  return dossier
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf(':');
      const label = separator > 0 ? line.slice(0, separator) : '';
      const text = separator > 0 ? line.slice(separator + 1).trim() : line.replace(/^-\s*/, '');
      return { label, text, words: new Set(tokenise(`${label} ${text}`)) };
    })
    .filter((line) => line.text.length > 0);
}

/**
 * The dossier lines that answer a question, best first. Simple overlap scoring: every question word
 * that also appears in a line scores, and a word that appears in the line's label scores double
 * (so "height" finds the height line and not the paragraph that mentions it in passing). A caller
 * that wants only a confident match raises `minScore`.
 */
export function searchDossier(
  lines: readonly DossierLine[],
  question: string,
  limit = 3,
  minScore = 1,
): DossierLine[] {
  const words = tokenise(question);
  if (words.length === 0) return [];

  const scored = lines
    .map((line) => {
      let score = 0;
      for (const word of words) {
        if (line.words.has(word)) score += 1;
        else if (
          [...line.words].some((candidate) => candidate.startsWith(word) && word.length > 3)
        ) {
          score += 0.5;
        }
        if (tokenise(line.label).includes(word)) score += 1;
      }
      return { line, score };
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.line);
}
