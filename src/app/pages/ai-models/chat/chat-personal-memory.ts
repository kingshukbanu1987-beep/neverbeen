import { AiModelProfile } from '../ai-model-data';
import { modelVoice } from './chat-voice';
import { seededPick } from './chat-random';

export const PERSONAL_QUESTION_GAP_MS = 2 * 60 * 1000;
export const PERSONAL_TOPICS = [
  'age',
  'country',
  'city',
  'profession',
  'education',
  'married',
  'gender',
  'girlfriend',
  'boyfriend',
  'spouse',
  'children',
  'childrenDetails',
  'company',
  'designation',
  'business',
  'photo',
  'choice',
  'founder',
] as const;
export type PersonalTopic = (typeof PERSONAL_TOPICS)[number];

export interface ChatPersonalMemory {
  /** Visitor's own words, not inferred facts. Survives transcript trimming within this session. */
  answers: Partial<Record<PersonalTopic, string>>;
  asked: PersonalTopic[];
  pending: PersonalTopic | '';
  lastAskedAt: number;
  lastAskedTurn: number;
}

export function newPersonalMemory(): ChatPersonalMemory {
  return { answers: {}, asked: [], pending: '', lastAskedAt: 0, lastAskedTurn: 0 };
}

export function restorePersonalMemory(value: unknown): ChatPersonalMemory {
  const memory = newPersonalMemory();
  if (!value || typeof value !== 'object') return memory;
  const raw = value as Partial<ChatPersonalMemory>;
  for (const topic of PERSONAL_TOPICS) {
    const answer = raw.answers?.[topic];
    if (typeof answer === 'string') memory.answers[topic] = answer.slice(0, 1000);
  }
  memory.asked = Array.isArray(raw.asked)
    ? raw.asked.filter((topic) => PERSONAL_TOPICS.includes(topic))
    : [];
  memory.pending = PERSONAL_TOPICS.includes(raw.pending as PersonalTopic) ? raw.pending! : '';
  memory.lastAskedAt = typeof raw.lastAskedAt === 'number' ? raw.lastAskedAt : 0;
  memory.lastAskedTurn = typeof raw.lastAskedTurn === 'number' ? raw.lastAskedTurn : 0;
  return memory;
}

const REFUSAL =
  /\b(?:prefer not|rather not|none of your business|keep (?:that|it|this) private|that is private|skip|don't want to (?:say|share|answer)|do not want to (?:say|share|answer)|not comfortable)\b/i;

/** Read explicit self-disclosures; never deduce age, gender or location from a name/photo. */
export function rememberPersonalAnswer(
  memory: ChatPersonalMemory,
  text: string,
  photo = false,
): void {
  const answer = text.trim().slice(0, 1000);
  const pending = memory.pending;
  if (pending) {
    // Asking another question is not an answer. Ignore a declined/ignored question without nagging.
    if (REFUSAL.test(answer)) memory.answers[pending] = '[declined]';
    else if (pending === 'photo' && photo) memory.answers.photo = '[photo shared]';
    else if (pending !== 'photo' && answer && !answer.includes('?'))
      memory.answers[pending] = answer;
    memory.pending = '';
  }
  if (REFUSAL.test(answer)) return;
  const disclosures: Partial<Record<PersonalTopic, RegExp>> = {
    age: /\b(?:i am|i'm|im)\s+(\d{1,3})\s*(?:years? old|yo)\b/i,
    country: /\b(?:my country is|i live in the country of|i am from the country of)\s+([^.!?]+)/i,
    city: /\b(?:my city is|i live in the city of|i am from the city of)\s+([^.!?]+)/i,
    profession: /\b(?:i work as|my profession is|i am a|i'm a)\s+([^.!?]+)/i,
    education: /\b(?:i study|i'm studying|i am studying)\s+([^.!?]+)/i,
    married: /\b(i(?: am|'m) (?:not )?married|i(?: am|'m) single|i have a (?:wife|husband))\b/i,
    gender: /\b(i(?: am|'m) (?:a )?(?:male|female|man|woman|nonbinary|non-binary))\b/i,
    girlfriend: /\b(i (?:have|don't have|do not have) a girlfriend)\b/i,
    boyfriend: /\b(i (?:have|don't have|do not have) a boyfriend)\b/i,
    children: /\b(i (?:have|don't have|do not have) (?:\d+ |any |no )?(?:kids|children))\b/i,
    company: /\b(?:i work at|i work for|my company is)\s+([^.!?]+)/i,
    designation: /\b(?:my designation is|my job title is)\s+([^.!?]+)/i,
    business: /\b(?:my business is|i run a business|i own a business)\s*([^.!?]+)/i,
  };
  for (const [key, pattern] of Object.entries(disclosures)) {
    const match = answer.match(pattern);
    if (match) {
      if (
        key === 'profession' &&
        /^(?:male|female|man|woman|non.binary|single|married)\b/i.test(match[1])
      )
        continue;
      memory.answers[key as PersonalTopic] = match[1].trim().slice(0, 1000);
    }
  }
  if (/\bi(?: am|'m) (?:a )?student\b/i.test(answer)) memory.answers.profession = 'student';
}

function negative(value = ''): boolean {
  return (
    /\b(?:no|not|never|single|unmarried|divorced|widowed|don't|do not)\b/i.test(value) ||
    value === '[declined]'
  );
}

function eligible(topic: PersonalTopic, answers: ChatPersonalMemory['answers']): boolean {
  const profession = answers.profession ?? '';
  const student = /\b(?:student|school|college|university|studying)\b/i.test(profession);
  const business = /\b(?:business(?:man|woman|person)?|entrepreneur|self.employed|owner)\b/i.test(
    profession,
  );
  const working =
    Boolean(profession) &&
    profession !== '[declined]' &&
    !student &&
    !business &&
    !/\b(?:unemployed|retired|not working|homemaker)\b/i.test(profession);
  const married =
    /\b(?:yes|married|wife|husband)\b/i.test(answers.married ?? '') && !negative(answers.married);
  const unmarried =
    Boolean(answers.married) && negative(answers.married) && answers.married !== '[declined]';
  switch (topic) {
    case 'education':
      return student;
    case 'company':
    case 'designation':
      return working;
    case 'business':
      return business;
    case 'spouse':
    case 'children':
      return married;
    case 'childrenDetails':
      return Boolean(answers.children) && !negative(answers.children);
    case 'girlfriend':
      return unmarried && /\b(?:male|man)\b/i.test(answers.gender ?? '');
    case 'boyfriend':
      return unmarried && /\b(?:female|woman)\b/i.test(answers.gender ?? '');
    default:
      return true;
  }
}

/** One optional question at a time, after the chat has warmed up, not in the welcome. */
export function nextPersonalTopic(
  memory: ChatPersonalMemory,
  startedAt: number,
  now: number,
  visitorTurns: number,
): PersonalTopic | '' {
  if (
    memory.pending ||
    now - (memory.lastAskedAt || startedAt) < PERSONAL_QUESTION_GAP_MS ||
    visitorTurns < 3 ||
    visitorTurns - memory.lastAskedTurn < 2
  )
    return '';
  return (
    PERSONAL_TOPICS.find(
      (topic) =>
        !memory.asked.includes(topic) && !memory.answers[topic] && eligible(topic, memory.answers),
    ) ?? ''
  );
}

const QUESTIONS: Record<PersonalTopic, readonly string[]> = {
  age: [
    'If you are comfortable saying, how old are you?',
    'We have been talking a little while — what age are you, if you do not mind me asking?',
  ],
  country: [
    'Which country do you call home?',
    'Where in the world are you chatting from — which country?',
  ],
  city: [
    'And which city is home for you?',
    'What city are you in? I am trying to picture your day.',
  ],
  profession: [
    'What keeps you busy most days — work, studying, a business, or something else?',
    'What do you do for a living, or are you studying at the moment?',
  ],
  education: [
    'What are you studying, and at which school or college? Only if you feel like sharing.',
    'Tell me a little about your studies — your subject and school or college?',
  ],
  married: [
    'Are you married, or not? You can keep that private, of course.',
    'May I ask whether you are married? No pressure to answer.',
  ],
  gender: [
    'How do you describe your gender — male, female, or something else? Only if you want to share.',
    'What gender do you identify with, if you are comfortable telling me?',
  ],
  girlfriend: [
    'Do you have a girlfriend, if you do not mind me asking?',
    'Is there a girlfriend in your life? You can skip that one.',
  ],
  boyfriend: [
    'Do you have a boyfriend, if you do not mind me asking?',
    'Is there a boyfriend in your life? You can skip that one.',
  ],
  spouse: [
    "What is your spouse's name, if you feel like telling me?",
    'What should I call your other half? Only if you want to share their name.',
  ],
  children: [
    'Do you have any children? You do not have to share family details.',
    'Are there kids in your family? Happy to leave that private.',
  ],
  childrenDetails: [
    'If you want to tell me about your kids, what are their first names or nicknames, ages, and what do they enjoy doing? No identifying details needed.',
    'What are your kids like — their nicknames, ages, and what they do? Only share what you are comfortable with.',
  ],
  company: [
    'Where do you work, if you are comfortable sharing the company?',
    'Which company do you work with? Fine to keep that private.',
  ],
  designation: [
    'What is your role there?',
    'What is your job title — what do you get to do there?',
  ],
  business: [
    'What sort of business do you run? I would love to hear a little about it.',
    'Tell me about your business — what kind of work does it do?',
  ],
  photo: [
    'Would you like to share a clearer photo of yourself? Absolutely fine to keep the one you started with.',
    'Would you feel like sending a clearer photo sometime? No pressure.',
  ],
  choice: [
    'Out of all the models on NeverBeen, what made you choose me to chat with?',
    'I am curious — what caught your eye about me rather than the other NeverBeen models?',
  ],
  founder: [
    "Do you know NeverBeen's founder, Mr. Kingshuk? In our fictional studio story, I would tease him that he is too busy with other work to look after me!",
    'Have you heard of the founder, Mr. Kingshuk? My little studio-story complaint is that he is always busy with other work and forgets about me!',
  ],
};

export function personalQuestionFor(
  model: AiModelProfile,
  topic: PersonalTopic,
  seed: string,
): string {
  const voice = modelVoice(model);
  const question = seededPick(QUESTIONS[topic], `${model.slug}|${seed}|${topic}`);
  // The offline engine uses her existing age/country/personality voice; the AI can rephrase freely.
  return voice.cadence === 'bubbly' ? `${voice.interjection} ${question}` : question;
}

export function markPersonalQuestion(
  memory: ChatPersonalMemory,
  topic: PersonalTopic,
  now: number,
  turn: number,
): void {
  if (!memory.asked.includes(topic)) memory.asked.push(topic);
  memory.pending = topic;
  memory.lastAskedAt = now;
  memory.lastAskedTurn = turn;
}

/** Local engine can recall an answer even after that exchange has left the transcript window. */
export function personalRecall(memory: ChatPersonalMemory, text: string): string {
  if (!/\b(?:remember|recall|what (?:is|was|are)|how old am i|where (?:am i|do i))\b/i.test(text))
    return '';
  const subjects: Partial<Record<PersonalTopic, RegExp>> = {
    age: /\b(?:my age|how old am i)\b/i,
    country: /\b(?:my country|country am i|where am i from)\b/i,
    city: /\b(?:my city|city (?:am i|do i)|where do i live)\b/i,
    profession: /\b(?:my (?:job|profession)|what (?:do i do|i do))\b/i,
    education: /\b(?:my (?:school|college|studies|subject))\b/i,
    spouse: /\b(?:my (?:spouse|wife|husband))\b/i,
    childrenDetails: /\b(?:my (?:kids|children))\b/i,
    company: /\b(?:my company|where (?:do i|i) work)\b/i,
    designation: /\bmy (?:role|designation|job title)\b/i,
    business: /\bmy business\b/i,
  };
  for (const [topic, pattern] of Object.entries(subjects)) {
    const answer = memory.answers[topic as PersonalTopic];
    if (pattern.test(text) && answer && answer !== '[declined]') {
      return `I remember — you told me: “${answer}”.`;
    }
  }
  return '';
}
