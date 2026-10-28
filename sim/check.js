// CI balance gate. Fails if win rates drift out of the target bands.
// Bands are deliberately loose: the bot is a stand-in for people, and runs are seeded.
const { play, rng, TEAMS, D } = require('./bot');
const N = +(process.env.GAMES || 600);
const BANDS = { // [min, max] win rate per mode/difficulty, every player count
  'full/Recruit': [0.55, 0.85], 'full/Analyst': [0.38, 0.65], 'full/Veteran': [0.22, 0.52],
  'quick': [0.45, 0.78], 'intro': [0.55, 0.88],
};
let bad = 0, seed = 7;
for (const [key, [lo, hi]] of Object.entries(BANDS)) {
  const [mode, diff] = key.split('/');
  const res = [1, 2, 3, 4].map(n => {
    const hp = mode === 'full' ? D.hp.full[n][diff] : D.hp[mode][n]; let w = 0;
    for (let g = 0; g < N; g++) w += play(TEAMS[n][g % TEAMS[n].length], mode, { hp, rnd: rng(seed++ * 2654435761) }).win;
    return w / N;
  });
  const ok = res.every(r => r >= lo && r <= hi); if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${key.padEnd(13)} ${res.map((r, i) => `${i + 1}p ${Math.round(r * 100)}%`).join(' · ')}   band ${Math.round(lo * 100)}–${Math.round(hi * 100)}%`);
}
if (bad) { console.error(`\n${bad} balance band(s) out of range. Retune HP in data/cards.json or widen a band on purpose.`); process.exit(1); }
