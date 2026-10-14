import { AiModelProfile } from '../ai-model-data';

/** Exclusive models require the existing verified Community member access flow. */
const REGISTERED_ONLY_MODELS = new Set([
  'fiadh-dara',
  'alisha-bhattacharya',
  'rozalin-el-masry',
  'nour-el-sherif',
  'priyanka-chatterjee',
]);

export function requiresRegisteredChat(model: Pick<AiModelProfile, 'slug'>): boolean {
  return REGISTERED_ONLY_MODELS.has(model.slug);
}
