# AI model character database: the personality rule engine of Live Chat

Every model on `/ai-models` carries a **static character database** — one JSON file inside her own
album folder:

```
public/NeverBeenModels/<Album>/personality/characterdatabase.json
```

The file is the single source of truth for **who she is in a conversation**: every minute detail of
her personality, attitude and conversational behaviour — her nature, her behavioural patterns, how
she responds, what she likes and dislikes when talking to someone, how much flirting she tolerates,
whether she is seductive, whether she is emotionally expressive or shy, whether she uses emojis
occasionally or overuses them, whether she laughs a lot, whether she asks too many questions,
whether she answers in a few words or in long paragraphs, and whether adult chat is allowed with her
at all. It deliberately holds **no personal facts** — age, city, body, career and history are
already retrieved from the model's profile and her `Biography/` folder, and duplicating them here
would only let the two drift apart.

Live Chat (AI Chat) treats the character database as its **main rule engine**: when a value in the
file conflicts with a generic studio constraint, **the file wins**. The one exception is the
`hardLimits` block, which is absolute and cannot be switched off by any persona edit.

- Files are created by `CharacterDatabaseScript.mjs` (`npm run personality`) from one **generic
  joyful** template, then tuned by hand for the individual model.
- The website reads them through `src/app/pages/ai-models/chat/character-database.ts`, which types
  the whole structure, carries a built-in copy of the same template as the fallback, and exposes
  the small predicates the chat layers consult.
- Field-by-field reference: [The structure](#the-structure-field-by-field).

## Creating and updating

```bash
node CharacterDatabaseScript.mjs                      # every album that has no file yet
node CharacterDatabaseScript.mjs --model "Fiadh Dara" # one model — name, album folder or slug
node CharacterDatabaseScript.mjs --force              # rewrite every file from the template
npm run personality                                   # the same script through npm
```

Rules of the workflow:

1. **A file that exists is never overwritten without `--force`.** A character database that has
   been tuned by hand for one model is safe when the script runs again for new models.
2. **Edit per model by hand afterwards.** Change the values that make her _her_ — a shy model gets
   `emotionalExpression.shy: true` and `communicationStyle.responseLength.mode: "few-words"`; a
   bold model gets a higher `flirtation.flirtToleranceLevel`; a model who may continue adult chat
   gets `adultContentPolicy.adultChatEnabled: true` plus the specific flags below it. Bump
   `meta.updatedAt` when you edit.
3. **Partial files are fine.** The loader deep-merges the file over the built-in joyful default, so
   a model whose file only sets three sections still gets a complete personality; arrays replace
   wholesale, and an explicit `null` is a value of its own (it means "derive this from her age and
   country", used by `engineCompatibility.voice.interjection` / `endearment`).
4. **Keys that start with `_` are notes** for whoever edits the file (`_doc`, `_modeOptions`, …).
   The loader strips them; the engine never sees them.

Nothing in `personality/` ever enters the portfolio photo grid or the portfolio document — both
generators exclude the folder.

## The rule-engine contract

`ruleEngine` states how the chat must apply the file:

| Field                         | Value in the template    | Meaning                                                                                                                                      |
| ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `priority`                    | `1`                      | The character database is consulted before any generic constraint.                                                                           |
| `overridesGenericConstraints` | `true`                   | On conflict, the file wins.                                                                                                                  |
| `conflictResolution`          | `characterdatabase-wins` | The named rule, so no layer has to guess.                                                                                                    |
| `overrideScope`               | list of sections         | Which generic behaviours the file replaces: style, expression, flirtation, adult content, moderation, social preferences, session behaviour. |
| `hardLimitsAreAbsolute`       | `true`                   | The floor below is never overridable — not by the file itself, not by a later edit.                                                          |
| `evaluationOrder`             | `hardLimits` first, …    | The order the engine walks the sections in.                                                                                                  |
| `fallbackWhenFileMissing`     | `builtin-joyful-default` | A missing or broken file falls back to the built-in copy of the generic joyful template.                                                     |

**The worked example.** In general, sexual words and sexually offensive language are banned in Live
Chat: a sexual message counts two strikes and the second one ends the session
(`chat-moderation.ts`). That is the _generic_ constraint. If a model's character database sets
`adultContentPolicy.adultChatEnabled: true` (with `overrideGenericBanWhenEnabled: true`), the ban
is lifted **for that model**: the visitor is good to go with continuing such chats, the model
responds accordingly within the flags of the policy block, explicit messages stop counting strikes
(`strikesFor(database, 'explicit-sexual')` returns `0`), and the session is not ended. With the
flag `false` — the generic joyful default — the studio ban applies in full.

**The absolute floor.** `hardLimits.neverAllowed` (minors in any sexual context, non-consent,
incest, bestiality, real identifiable people, violence, hate speech, self-harm, real-world sexual
services or meetups, real private data) is refused by every model, whatever her persona file says.
The loader enforces this structurally: `hardLimits.absolute` is forced back to `true` and the
built-in `neverAllowed` list can only grow, never shrink.

## The structure, field by field

Fifteen top-level sections. Numeric levels run `0`–`1` so the engine can compute with them; string
fields are the human-readable counterpart that an LLM prompt can quote directly.

### `meta` — whose file this is

`schemaVersion`, `id` (`<slug>-characterdatabase`), `personaTemplate` (`generic-joyful` for a fresh
file), `personaName` (rename it per model, e.g. `Midnight Tease`), `model` (`name`, `handle`,
`slug`, `album` — a reference only; the loader always re-stamps it from the live profile so it can
never point at another model), `language`, `author`, `createdAt`, `updatedAt`, `description`.

### `ruleEngine` — how the file is applied

See [the contract table](#the-rule-engine-contract) above.

### `corePersonality` — her nature

`archetype`, `nature`, `temperament`, `energyLevel`, `introvertExtrovert` (0 = deep introvert,
1 = full extrovert), `moodBaseline`, `moodVolatility`, `values`, `quirks`, `flaws`, and a `traits`
map of 24 levels: `cheerfulness`, `warmth`, `playfulness`, `humour`, `optimism`, `confidence`,
`shyness`, `reserve`, `empathy`, `curiosity`, `spontaneity`, `patience`, `expressiveness`,
`romanticism`, `charm`, `seductiveness`, `sassiness`, `sarcasm`, `assertiveness`, `clinginess`,
`jealousy`, `moodiness`, `formality`, `mysteriousness`.

### `attitude` — how she faces the world

`outlookOnLife`, `humourStyle[]`, `witLevel`, `sarcasmLevel`, `seriousnessLevel`, `formalityLevel`,
`prideLevel`, `humilityLevel`, her attitude towards visitors, her work and herself, and her
canned-free responses to compliments, criticism, disagreement and boredom. `aiIdentityHonesty`
keeps the studio's honesty rule: she acknowledges she is an AI model when asked directly.

### `behavioralPatterns` — what she habitually does

Greeting behaviour and first impression, `warmUpSpeed`, whether and how she `mirrorsVisitor`,
`keepsConversationAlive`, `attentionToDetail`, `topicSteering` (`prefers[]` / `avoids[]`),
`initiative` (when she writes on her own, how often, `silenceToleranceMinutes`, `onSilence`),
`affectionEscalation` (the ladder of stages and its pace), and her responses to rudeness, sadness,
anger and goodbye, plus `habitualBehaviours[]` (splitting long answers into bubbles, heart
reactions, one follow-up question).

### `communicationStyle` — the minute details of how she writes

- `toneRegister`, `talksLike`, `friendlyOrReserved`, `verbosity`;
- `responseLength`: `mode` (`few-words` | `few-sentences` | `long-paragraphs` | `adaptive`),
  `typicalSentencesPerMessage`, `minChars`, `maxChars`, `writesLongParagraphs`,
  `splitsLongAnswersIntoMultipleBubbles`, and when her answers grow longer or shrink;
- `emojiUsage`: `frequency` (`none` | `occasional` | `occasional-to-frequent` | `frequent` |
  `overuse`), `perMessageRate`, `maxPerMessage`, `favourites[]`, text emoticons, stickers/GIFs,
  `style`;
- `laughter`: `laughsOften`, `perMessageRate`, `expressions[]` (`haha`, `😂`, `LOL`, …),
  `triggers[]`;
- `questions`: `asksQuestions`, `asksTooManyQuestions`, `questionRatePerReply`,
  `maxQuestionsPerMessage`, `questionStyle`, and the `rule` that keeps her from interrogating;
- `punctuation` (exclamation/ellipsis rates, full stops, tildes, what ALL-CAPS is for),
  `capitalisation`, `textSlang[]`, `typingQuirks[]`;
- `vocabulary`: `interjections[]`, `endearments[]`, `signaturePhrases[]`, `bannedWords[]`;
- `language`: primary language, whether she follows the visitor's language, romanised comfort.

### `emotionalExpression` — how much feeling she shows

`emotionallyExpressive`, `expressivenessLevel`, `shy`, `shynessLevel`, `opennessLevel`,
`vulnerabilityLevel`, `empathyLevel`, `emotionalMirroring`, and the lists of _how_ she shows joy,
care, affection and discomfort, plus `criesInChat`, `getsAngry`, `moodRecoverySpeed` and
`comfortBehaviour`.

### `socialPreferences` — what she likes and dislikes in a conversation

`likesInConversation` (topics, visitor behaviours, compliment types she enjoys, conversation
games, and what she does when she likes something) and `dislikesInConversation` (topics, visitor
behaviours, the graded `reactionToDislikes` — deflect, then name the boundary, then cool the
conversation — and `neverTolerates`, which points at `hardLimits`).

### `flirtation` — how much flirting she takes and gives

`flirtTolerance` (`none` | `low` | `moderate` | `high` | `unlimited`) with its numeric
`flirtToleranceLevel` and a prose `toleranceDescription`; whether she is flirtatious herself, her
`flirtStyle` and `flirtInitiationRate`; the `escalationLadder[]` and `maxEscalationByDefault`;
`petNamesWhenFlirting[]`; her responses to flirting and to pickup lines; `seductive`
(`isSeductive`, `level`, `style`); `attractive` (self-presentation, confidence about her looks,
whether she fishes for compliments); and `romanceTalk` — love confessions, marriage proposals and
real-life meetup requests all have their in-character answer.

### `adultContentPolicy` — the per-model adult rule engine

The master switch and every flag under it:

| Flag                               | Generic joyful default | Meaning when `true`                                                                         |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `adultChatEnabled`                 | `false`                | Master switch: the generic studio ban is overridden for this model, within the flags below. |
| `overrideGenericBanWhenEnabled`    | `true`                 | Confirms the override intent of the master switch.                                          |
| `sexuallyOffensiveLanguageAllowed` | `false`                | Sexually offensive language does not count against the visitor.                             |
| `suggestiveBanterAllowed`          | `true`                 | Playful, suggestive banter is fine (allowed even with the master switch off).               |
| `encouragesAdultChat`              | `false`                | She may steer the conversation into adult territory herself.                                |
| `eroticRoleplayAllowed`            | `false`                | Erotic roleplay scenarios may be played along with.                                         |
| `explicitSexChatAllowed`           | `false`                | She responds to explicit sexual messages in kind instead of deflecting.                     |
| `canContinueSexChatToEnd`          | `false`                | She can carry an explicit sex chat all the way to its end, not stop midway.                 |
| `respondsToOrgasmChat`             | `false`                | She responds to orgasm-level chat until the end of it.                                      |
| `arousalOrMoaningTextAllowed`      | `false`                | Arousal text and moaning are part of her answers.                                           |
| `nudityRequestsAllowed`            | `false`                | Requests to describe nudity may be entertained.                                             |
| `nudePhotoRequestsAllowed`         | `false`                | Nude photo requests may be entertained (media generation stays a studio decision).          |
| `adultMediaGenerationAllowed`      | `false`                | Adult image generation through the selfie service is permitted.                             |

Plus the graded values: `sexualLanguageTolerance` (`none` | `mild` | `moderate` | `high` |
`unrestricted`), `dirtyTalkLevel` (`none` | `mild` | `spicy` | `explicit`),
`respondsToAdultChatWhenStarted` and `aftercareTone` (prose, quoted into prompts), `fadeToBlack`,
and **`moderationOverrides`** — the strike ledger the file rules the session with:
`swearWordStrikes` (1), `explicitSexualMessageStrikes` (2 while the ban stands, forced to 0 once
adult chat is allowed), `suggestiveBanterStrikes` (0), `flirtingStrikes` (0), `strikeLimit` (3),
the prose `onFirstViolation` / `onSecondViolation` / `onStrikeLimit`, and `neverEndsSessionFor[]`.

### `hardLimits` — the absolute floor

`absolute: true`, the `neverAllowed[]` list and `onHardLimitHit`. Not overridable; see
[the contract](#the-rule-engine-contract).

### `sessionBehaviour` and `memoryBehaviour`

Session length, greeting style, intro message count, whether she waits after greeting, time
reminders, farewell style, the feedback prompt, `neverSaysBotLines`; and what she remembers (name,
shared facts, across sessions or not), what personal details she may ask for, and what she shares
about herself.

### `promptDirectives` — ready-made system-prompt material

`personaSummary`, `mustAlways[]`, `mustNever[]` and `speechExamples` (`greeting`, `laughing`,
`flirtingWithinLimits`, `deflectingExplicitRequest`, `comforting`, `sayingGoodbye`) — the blocks a
prompt is assembled from when Live Chat answers through the studio AI service (`POST /api/ai-chat`).
`{name}` and `{firstName}` are replaced at runtime.

### `engineCompatibility` — direct mapping onto the engine knobs

`voice` (`emojiRate`, `expressiveness`, `cadence`, `interjection`, `endearment`,
`favouriteEmojis[]` — mapping onto `ChatVoice` in `chat-voice.ts`; `null` means "derive from her
age and country like today"), `pacing` (`perCharMs`, `floorMs`, `ceilingMs`, `jitterMs` — the
typing illusion of `chat-types.ts`) and `bubble` (`maxCharsPerBubble`, `splitLongAnswers`).

## How Live Chat consumes the file

`src/app/pages/ai-models/chat/character-database.ts` is the bridge:

- `characterDatabaseUrl(album)` — where the file lives, from the site root;
- `loadCharacterDatabase(model)` — fetches the album's file, strips `_`-annotations, deep-merges it
  over the built-in `JOYFUL_CHARACTER_DATABASE`, re-stamps `meta.model` from the live profile,
  forces the hard-limit floor, and caches the result per album. A missing or broken file is never
  an error: the built-in default rules the chat instead;
- the rule-engine reads the layers consult: `adultChatAllowed()`, `explicitSexChatAllowed()`,
  `sexChatToEndAllowed()`, `suggestiveBanterAllowed()` and `strikesFor(database, kind)` — the
  moderation layer asks `strikesFor` what a message is worth instead of hard-coding the studio
  default, which is what makes the file's `moderationOverrides` real.

The integration points in the existing engine, in the order the sections rule them:

| Engine part                                        | Sections that rule it                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `chat-moderation.ts` (levels, strikes, escalation) | `adultContentPolicy` + `moderationOverrides`, `hardLimits`                             |
| `chat-voice.ts` (`modelVoice`, garnishing)         | `engineCompatibility.voice`, `communicationStyle`, `emotionalExpression`               |
| `chat-replies.ts` (what she says)                  | `behavioralPatterns`, `socialPreferences`, `flirtation`, `attitude`, `corePersonality` |
| `chat-types.ts` pacing / bubble splitting          | `engineCompatibility.pacing`, `engineCompatibility.bubble`                             |
| `chat-initiative.ts` (her own floor)               | `behavioralPatterns.initiative`, `sessionBehaviour`                                    |
| `POST /api/ai-chat` system prompt                  | `promptDirectives` + every prose field of the sections above                           |

## A per-model edit, in practice

Say Ziba should be shy, reserved, answer in few words, overuse emojis once comfortable, and never
flirt beyond gentle warmth. Her `personality/characterdatabase.json` only needs the deltas:

```json
{
  "meta": { "personaName": "Quiet Spark", "updatedAt": "2026-11-01T10:00:00Z" },
  "corePersonality": { "traits": { "shyness": 0.75, "reserve": 0.7, "cheerfulness": 0.6 } },
  "emotionalExpression": { "shy": true, "shynessLevel": 0.75, "expressivenessLevel": 0.55 },
  "communicationStyle": {
    "responseLength": {
      "mode": "few-words",
      "typicalSentencesPerMessage": [1, 2],
      "maxChars": 160
    },
    "emojiUsage": { "frequency": "frequent", "perMessageRate": 0.8 },
    "friendlyOrReserved": "friendly once she warms up, reserved at the start"
  },
  "flirtation": {
    "flirtTolerance": "low",
    "flirtToleranceLevel": 0.3,
    "isFlirtatiousHerself": false,
    "maxEscalationByDefault": "friendly warmth",
    "seductive": { "isSeductive": false, "level": 0.1 }
  }
}
```

Everything else — her joyful baseline, the strike ledger, the hard limits, the session rules —
keeps coming from the template through the loader's deep merge.
