// Full balance report at the shipped HP for a mode/difficulty.
// usage: node sim/stats.js [mode=full] [difficulty=Analyst] [games=1200]
const { play, rng, TEAMS, D, E } = require('./bot');
const mode = process.argv[2] || 'full', diff = process.argv[3] || 'Analyst', N = +(process.argv[4] || 1200);
const hpOf = n => mode === 'full' ? D.hp.full[n][diff] : D.hp[mode][n];
const burns = {}; const ob = E.burn;
E.burn = function (G, k, i) { const c = G.held[k][i]; const r = ob.apply(this, arguments); if (r && c) burns[c.type] = (burns[c.type] || 0) + 1; return r; };
let seed = 11; const rows = [];
for (const n of [1, 2, 3, 4]) {
  let w = 0, wn = 0, early = 0, loss = 0, back = 0, chained = 0, rounds = 0; const low = [];
  for (let g = 0; g < N; g++) {
    const t = TEAMS[n][g % TEAMS[n].length], hp = hpOf(n);
    const G = play(t, mode, { hp, rnd: rng(seed++ * 2654435761) });
    w += G.win; if (!G.win) { loss++; if (!G.bossIn) early++; }
    back += G.stats.back; chained += G.stats.chained || 0; rounds += G.stats.rounds; if (G.win) low.push(Math.min(...G.hps) / G.max);
    wn += play(t, mode, { hp, noAgents: true, rnd: rng(seed++ * 2654435761) }).win;
  }
  low.sort((a, b) => a - b);
  rows.push({ players: n, hp: hpOf(n), win: pct(w / N), noKit: pct(wn / N), lossesBeforeBoss: loss ? pct(early / loss) : '-', comebacks: (back / N).toFixed(1), chainRolls: (chained / N).toFixed(1), combatRounds: (rounds / N).toFixed(1), winnersLowestHP: low.length ? pct(low[low.length >> 1]) : '-' });
}
function pct(x) { return Math.round(x * 100) + '%'; }
console.log(`${mode} · ${mode === 'full' ? diff : ''} · ${N} games per player count`);
console.table(rows);
console.log('burns per 1000 games:', Object.fromEntries(Object.entries(burns).map(([k, v]) => [k, Math.round(v / (N * 4) * 1000)])));
