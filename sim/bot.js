// A simple, careful bot that plays the engine. Used for balance sims and tests.
// It is deliberately conservative (rests early, heals often), so human crews may do better or worse.
const DTD12 = require('../src/engine.js');
const D = require('../data/cards.json');
const E = DTD12(D);

function step(G) {
  if (G.phase === 'point') { const k = G.hps.indexOf(Math.max(...G.hps)); E.setPoint(G, k); return E.flip(G); }
  if (G.phase === 'sit') {
    const c = G.cur; let o = 0;
    if (c.id === 'blast') o = G.hps[G.point] > 8 && G.team.length >= 3 ? 1 : 0;
    if (c.id === 'patch') o = G.hps.reduce((a, b) => a + b, 0) / G.team.length < G.max * 0.7 ? 0 : 1;
    return E.resolveSit(G, o);
  }
  if (G.phase === 'loot') {
    if (G.held[0].length < E.slots(G, 0)) return E.takeLoot(G, 0, 0);
    const rank = t => ({ enrich: 8, triage: 7, recover: 6, contain: 5, decoy: 4, hunt: 3, patch: 2, recon: 1 })[t];
    const c = G.loot[0];
    const worst = G.held[0].map((x, i) => [rank(x.type), i]).sort((a, b) => a[0] - b[0])[0];
    return worst && rank(c.type) > worst[0] ? E.takeLoot(G, 0, 0, worst[1]) : E.takeLoot(G, 0, null);
  }
  if (G.phase === 'combat') {
    if (!G.rolled) {
      if (G.team.length > 1) { const lo = G.hps.indexOf(Math.min(...G.hps)); if (G.hps[lo] <= G.max * 0.35) E.setRest(G, lo); }
      burns(G, 'pre'); E.rollAll(G); if (G.over) return; burns(G, 'roll');
      for (let pass = 0; pass < 40 && !G.over && G.phase === 'combat'; pass++) {
        const pri = m => (m.kind === 'boss' ? 30 : 0) + (m.left <= 2 ? 15 : 0) + E.dmgOf(G, m) * 8 + (m.ability === 'regen' ? 6 : 0) - m.left;
        let best = null;
        G.dice.forEach((d, i) => {
          if (d.used) return;
          const can = G.play.filter(m => E.beats(G, d, m)); if (!can.length) return;
          const m = can.sort((a, b) => pri(b) - pri(a))[0];
          const sc = pri(m) * 100 - can.length * 10 - (E.total(G, d, m) - m.def);
          if (!best || sc > best.sc) best = { i, uid: m.uid, sc };
        });
        if (!best) break; E.assign(G, best.i, best.uid);
      }
      if (G.phase !== 'combat' || G.over) return;
      burns(G, 'post');
      if (!G.decoyUsed && E.active(G, 'decoy').length && E.incoming(G)[G.point] >= 3) E.decoy(G);
    }
    return E.endRound(G);
  }
}

// When to burn a kit card instead of keeping it running.
function burns(G, when) {
  const boss = G.play.some(m => m.kind === 'boss');
  G.held.forEach((h, k) => {
    for (let i = h.length - 1; i >= 0; i--) {
      const c = h[i]; if (G.over || G.phase !== 'combat') return;
      const t = c.type, low = Math.min(...G.hps) <= G.max * 0.4;
      if (when === 'pre' && t === 'recover' && low) E.burn(G, k, i);
      else if (when === 'pre' && t === 'patch' && G.row.length >= 3) E.burn(G, k, i, G.row.slice().sort((a, b) => b.dmg - a.dmg)[0].uid);
      else if (when === 'pre' && t === 'contain' && (G.play.length >= 3 || boss && G.play.length >= 2)) E.burn(G, k, i);
      else if (when === 'roll' && (t === 'triage' || t === 'enrich') && boss) E.burn(G, k, i);
      else if (when === 'post' && t === 'hunt') { const m = G.play.find(x => x.kind !== 'boss' && x.left <= 2); if (m) E.burn(G, k, i, m.uid); }
      else if (when === 'post' && t === 'decoy') { const inc = E.incoming(G); if (inc.some((d, j) => d >= G.hps[j] || d >= G.max * 0.25)) E.burn(G, k, i); }
    }
  });
}

function play(team, mode, opt) { const G = E.newGame(team, mode, opt); let n = 0; while (!G.over && n++ < 2000) step(G); return G; }

// Seeded RNG so runs are repeatable.
function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Representative crews per player count.
const TEAMS = {
  1: [['HUN'], ['RES'], ['ENG'], ['SOA'], ['PAT']],
  2: [['HUN', 'RES'], ['ENG', 'SOA'], ['RES', 'PAT'], ['HUN', 'PAT'], ['SOA', 'PAT'], ['HUN', 'ENG']],
  3: [['HUN', 'RES', 'SOA'], ['ENG', 'SOA', 'PAT'], ['HUN', 'RES', 'ENG'], ['RES', 'SOA', 'PAT'], ['HUN', 'ENG', 'PAT']],
  4: [['HUN', 'RES', 'ENG', 'SOA'], ['HUN', 'RES', 'SOA', 'PAT'], ['RES', 'ENG', 'SOA', 'PAT'], ['HUN', 'RES', 'ENG', 'PAT']],
};

module.exports = { play, step, E, D, rng, TEAMS };
