/* NeverBeen Ludo AI worker: tactical move selection kept off the UI thread. */
self.onmessage = ({ data }) => {
  if (!data || data.type !== 'choose') return;
  const { tokens, roll, player, allTokens, players, difficulty, legalTokens } = data;
  const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const global = progress => (player * 13 + progress) % 52;
  const options = legalTokens.map(token => {
    const before = tokens[token];
    const after = before < 0 ? 0 : before + roll;
    let value = Math.random() * (difficulty === 'Easy' ? 130 : difficulty === 'Medium' ? 45 : 12);
    if (after === 57) value += 15000;
    else if (before < 0) value += 1500;
    else value += after * (difficulty === 'Hard' ? 9 : 5);
    if (after < 52 && !safe.has(global(after))) {
      for (let rival = 0; rival < players; rival++) {
        if (rival === player) continue;
        for (const pos of allTokens[rival] || []) {
          if (pos >= 0 && pos < 52 && (rival * 13 + pos) % 52 === global(after)) value += difficulty === 'Hard' ? 2800 : 1200;
        }
      }
    }
    if (after >= 52) value += 100;
    return { token, value };
  }).sort((a, b) => b.value - a.value);
  self.postMessage({ type: 'move', token: options[0]?.token ?? legalTokens[0] ?? 0 });
};
