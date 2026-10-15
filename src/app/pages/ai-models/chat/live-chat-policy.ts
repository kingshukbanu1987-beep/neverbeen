import { AiModelProfile } from '../ai-model-data';
import type { LiveChatPlan } from './chat-types';

/**
 * The Live Chat tier every NeverBeen model belongs to.
 *
 * - `free` — any visitor may chat with her on the Free Chat plan.
 * - `exclusive` — a Registered User (Community) chat, or a Premium chat at ₹99: the Free Chat
 *   plan cannot reach her.
 * - `premium` — a paid Premium Live Chat at her own price: only the Premium plan reaches her.
 *
 * Both Exclusive and Premium models carry the blue verified tick beside their name.
 */
export type ModelChatTier = 'free' | 'exclusive' | 'premium';

/** Exclusive models require the verified Community member (Registered User) flow. */
const EXCLUSIVE_MODELS = new Set([
  'rozalin-el-masry',
  'reema-ganguly',
  'fatima-al-mansoor',
  'shirina-o-brien',
]);

/**
 * Premium models and the amount a Premium Live Chat with each of them costs, in rupees. The
 * amount varies with the model selected for chat; a Free model outside these tables owes nothing.
 */
const PREMIUM_MODEL_PRICES = new Map<string, number>([
  ['fiadh-dara', 129],
  ['nourhan-durrani', 119],
  ['alisha-bhattacharya', 199],
  ['nour-el-sherif', 99],
  ['priyanka-chatterjee', 129],
  ['tasneem-al-rifai', 99],
  ['fatima-sana-hussaini', 109],
]);

/** Every Exclusive model unlocks on the Premium plan at this one amount. */
export const EXCLUSIVE_PREMIUM_CHAT_PRICE = 99;

/** Which of the three Live Chat tiers this model belongs to. */
export function modelChatTier(model: Pick<AiModelProfile, 'slug'>): ModelChatTier {
  if (PREMIUM_MODEL_PRICES.has(model.slug)) return 'premium';
  if (EXCLUSIVE_MODELS.has(model.slug)) return 'exclusive';
  return 'free';
}

/**
 * The rupee amount of a Premium Live Chat with this model: her own listed price, ₹99 for every
 * Exclusive model, or `null` when she is a Free model and the Premium session owes nothing.
 */
export function premiumChatPrice(model: Pick<AiModelProfile, 'slug'>): number | null {
  const listed = PREMIUM_MODEL_PRICES.get(model.slug);
  if (listed !== undefined) return listed;
  if (EXCLUSIVE_MODELS.has(model.slug)) return EXCLUSIVE_PREMIUM_CHAT_PRICE;
  return null;
}

/**
 * True for the models that no guest may chat with — Exclusive and Premium models both demand a
 * verified Community registration first, and both carry the blue tick beside their name.
 */
export function requiresRegisteredChat(model: Pick<AiModelProfile, 'slug'>): boolean {
  return modelChatTier(model) !== 'free';
}

/**
 * Whether this plan may start a chat with this model: the Free Chat plan reaches Free models
 * only, the Registered User plan reaches Free and Exclusive models, and the Premium plan — once
 * paid — reaches every NeverBeen model.
 */
export function allowsLiveChatPlan(
  model: Pick<AiModelProfile, 'slug'>,
  plan: LiveChatPlan,
): boolean {
  const tier = modelChatTier(model);
  switch (plan) {
    case 'free':
      return tier === 'free';
    case 'registered':
      return tier === 'free' || tier === 'exclusive';
    case 'premium':
      return true;
  }
}
