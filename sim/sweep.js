// Win rate by player count at one or more starting HP values.
// usage: node sim/sweep.js [mode=full|quick|intro] [hp,hp,...] [games=1500]
//   e.g. node sim/sweep.js full 40,46,52
const { play, rng, TEAMS, D } = require('./bot');
const mode = process.argv[2] || 'full';
const hps = (process.argv[3] || String(mode === 'full' ? D.hp.full[1].Analyst : D.hp[mode][1])).split(',').map(Number);
const N = +(process.argv[4] || 1500);
let seed = 3;
for (const hp of hps) {
  const row = [1, 2, 3, 4].map(n => {
    let w = 0; for (let g = 0; g < N; g++) w += play(TEAMS[n][g % TEAMS[n].length], mode, { hp, rnd: rng(seed++ * 2654435761) }).win;
    return `${n}p ${Math.round(w / N * 100)}%`;
  });
  console.log(`${mode} HP ${hp} | ${row.join(' · ')}`);
}
