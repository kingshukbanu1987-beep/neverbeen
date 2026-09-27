/** Travel hashtags members can pick, plus anything already used in the community. */

export const HASHTAG_CATALOG = [
  'alps', 'amalfi', 'aurora', 'backpacking', 'bali', 'beach', 'boutiquehotel', 'citybreak',
  'coastline', 'desert', 'foodtrail', 'fuji', 'glamping', 'hiking', 'honeymoon', 'islandhopping',
  'japanrail', 'jungle', 'kashmir', 'kolkata', 'kyoto', 'lakelife', 'localfood', 'marketwalk',
  'monsoon', 'mountains', 'neverbeen', 'nightmarket', 'northernlights', 'offgrid', 'paris',
  'passport', 'photography', 'pilgrimage', 'roadtrip', 'safari', 'santorini', 'slowtravel',
  'snow', 'solo', 'streetfood', 'sunrise', 'sunset', 'templetrail', 'trainwindow', 'trekking',
  'unesco', 'vanlife', 'volcano', 'wanderlust', 'weekendescape', 'wildlife', 'winetrail',
  'yoga', 'zanzibar', 'himalaya', 'sahara', 'patagonia', 'iceland', 'morocco', 'vietnam',
  'rajasthan', 'kerala', 'darjeeling', 'goa', 'varanasi', 'cappadocia', 'petra', 'machu',
  'amazon', 'fjords', 'tuscany', 'provence', 'scotland', 'ireland', 'newzealand', 'canada',
  'familytrip', 'digitalnomad', 'budgettravel', 'luxuryescape', 'hiddengem',
  'nighttrain', 'ferry', 'cycling', 'diving', 'snorkeling', 'camping', 'stargazing',
] as const;

const TAG_RE = /#([\p{L}\p{N}_]{1,40})/gu;

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(TAG_RE)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}

export function hashtagAtCursor(text: string, cursor: number): { start: number; query: string } | null {
  const upto = text.slice(0, Math.max(0, cursor));
  const match = upto.match(/#([\p{L}\p{N}_]{0,40})$/u);
  if (!match) return null;
  return { start: upto.length - match[0].length, query: match[1].toLowerCase() };
}

export function suggestHashtags(query: string, used: string[], limit = 8): { tag: string; isNew: boolean }[] {
  const q = query.toLowerCase().replace(/^#/, '');
  const pool = [...new Set([...HASHTAG_CATALOG, ...used.map((t) => t.toLowerCase())])];
  const matches = pool
    .filter((tag) => !q || tag.includes(q))
    .sort((a, b) => {
      const as = a.startsWith(q) ? 0 : 1;
      const bs = b.startsWith(q) ? 0 : 1;
      return as - bs || a.localeCompare(b);
    })
    .slice(0, limit)
    .map((tag) => ({ tag, isNew: false }));
  if (q.length >= 2 && !pool.includes(q) && /^[\p{L}\p{N}_]+$/u.test(q)) {
    matches.unshift({ tag: q, isNew: true });
  }
  return matches.slice(0, limit);
}

export function insertHashtag(text: string, start: number, cursor: number, tag: string): { text: string; cursor: number } {
  const next = `${text.slice(0, start)}#${tag} ${text.slice(cursor)}`;
  const caret = start + tag.length + 2;
  return { text: next, cursor: caret };
}
