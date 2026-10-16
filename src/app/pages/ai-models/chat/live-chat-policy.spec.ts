import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { LiveChatPlan } from './chat-types';
import {
  EXCLUSIVE_PREMIUM_CHAT_PRICE,
  allowsLiveChatPlan,
  modelChatTier,
  premiumChatPrice,
  requiresRegisteredChat,
} from './live-chat-policy';

/** The tiers exactly as the Live Chat plan brief lists every NeverBeen model. */
const premiumPrices: Readonly<Record<string, number>> = {
  'fiadh-dara': 129,
  'nourhan-durrani': 119,
  'alisha-bhattacharya': 199,
  'nour-el-sherif': 99,
  'priyanka-chatterjee': 129,
  'tasneem-al-rifai': 99,
  'fatima-sana-hussaini': 109,
  'ziba-nazrin': 179,
};

const exclusiveSlugs = [
  'rozalin-el-masry',
  'reema-ganguly',
  'fatima-al-mansoor',
  'shirina-o-brien',
];

const freeSlugs = [
  'sereenah-noorzai',
  'amira-bint-tariq-al-sayed',
  'zeina-al-sabbagh',
  'toulene-arslan',
  'caoimhe-niloufar-rahimi',
  'salma-ahmadzai',
  'nermin-akhundzada',
  'rasha-fakhoury',
  'lana-mahvash-kennedy',
  'donya-caoimhe-yazdani',
  'ava-amira-gallagher',
  'banafsheh-saoirse-yazdani',
  'aoife-pahlavi',
  'sorcha-golsa-maccarthy',
  'aisha-bint-mohammed-al-husseini',
  'nirvana-noorzai',
  'zahra-mahmoud-al-khatib',
  'soha-haddad',
  'ameera-lone',
  'saoirse-rezaei',
  'farah-al-shaar',
  'florencia-fontana-gatti',
  'zaynab-jones',
  'maeve-anahita',
  'lucia-gomensoro-rossi',
  'nazanin-maeve-al-farsi',
  'soraya-smith',
  'zeina-al-atassi',
  'amina-el-maghraby',
  'valentina-rodriguez-silva',
];

function profileOf(slug: string) {
  const model = aiModelProfiles.find((profile) => profile.slug === slug);
  expect(model, `missing model ${slug}`).toBeDefined();
  return model!;
}

describe('Live Chat model tiers and Premium amounts', () => {
  it('prices every Premium model with its own rupee amount', () => {
    for (const [slug, amount] of Object.entries(premiumPrices)) {
      const model = profileOf(slug);
      expect(modelChatTier(model)).toBe('premium');
      expect(premiumChatPrice(model)).toBe(amount);
    }
  });

  it('prices every Exclusive model at ₹99 on the Premium plan', () => {
    expect(EXCLUSIVE_PREMIUM_CHAT_PRICE).toBe(99);
    for (const slug of exclusiveSlugs) {
      const model = profileOf(slug);
      expect(modelChatTier(model)).toBe('exclusive');
      expect(premiumChatPrice(model)).toBe(99);
    }
  });

  it('keeps every listed Free model open to guests, with no Premium amount', () => {
    for (const slug of freeSlugs) {
      const model = profileOf(slug);
      expect(modelChatTier(model)).toBe('free');
      expect(requiresRegisteredChat(model)).toBe(false);
      expect(premiumChatPrice(model)).toBeNull();
    }
  });

  it('accounts for all 42 models across the three tiers', () => {
    const premium = Object.keys(premiumPrices);
    const known = new Set([...premium, ...exclusiveSlugs, ...freeSlugs]);
    expect(known.size).toBe(42);
    expect(aiModelProfiles.length).toBe(42);
    for (const model of aiModelProfiles) expect(known.has(model.slug)).toBe(true);
  });

  it('requires Community registration for both Exclusive and Premium models — the blue-tick models', () => {
    for (const slug of [...exclusiveSlugs, ...Object.keys(premiumPrices)]) {
      expect(requiresRegisteredChat(profileOf(slug))).toBe(true);
    }
  });
});

describe('plan-to-model access matrix', () => {
  const free = profileOf('sereenah-noorzai');
  const exclusive = profileOf('rozalin-el-masry');
  const premium = profileOf('fiadh-dara');

  const matrix: ReadonlyArray<[LiveChatPlan, boolean, boolean, boolean]> = [
    // plan          free model  exclusive model  premium model
    ['free', true, false, false],
    ['registered', false, true, false],
    ['premium', false, true, true],
  ];

  it.each(matrix)(
    'the %s plan reaches the right model tiers',
    (plan, freeOk, exclusiveOk, premiumOk) => {
      expect(allowsLiveChatPlan(free, plan)).toBe(freeOk);
      expect(allowsLiveChatPlan(exclusive, plan)).toBe(exclusiveOk);
      expect(allowsLiveChatPlan(premium, plan)).toBe(premiumOk);
    },
  );

  it('keeps a Free model on the Free Chat plan alone', () => {
    expect(allowsLiveChatPlan(free, 'free')).toBe(true);
    expect(allowsLiveChatPlan(free, 'registered')).toBe(false);
    expect(allowsLiveChatPlan(free, 'premium')).toBe(false);
  });
});
