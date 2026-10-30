// Chapter dice prototype: the same cut-down shift played two ways, to decide whether a d6 symbol system
// (Escape the Dark Castle's chapter dice) beats the current d20 + bonus ≥ Defense system.
//   d20: today's rules. Hit = d20 + bonus ≥ Defense; 18–20 is two hits and blocks; a 14+ crew die can guard.
//   d6:  each analyst rolls their own d6 of response symbols (Detect, Contain, Eradicate). A mob's hits are a row
//        of symbols. A matching face removes one; a double face removes two of that symbol OR guards (blocks).
// Shared: the real mobs, bosses, keywords, damage, persistence row (d20 ranges), crew-size scaling, kit economy,
// one bot brain that scores every legal dice allocation the same way in both systems.
// Throwaway: nothing in src/, data/ or ui/ reads this. Usage: node prototypes/chapter-dice/sim.js
const D = require('../../data/cards.json');

const SYM = ['D', 'C', 'E']; // Detect, Contain, Eradicate
// A mob's symbol row: its main response first. Domain sets the mix (identity is found, network is cut off...).
const MIX = { Identity: 'DCE', Endpoint: 'ECD', Network: 'CDE', Cloud: 'DEC' };
function symbolsFor(domain, n) { const [a, b, c] = MIX[domain] || 'DCE', pat = [a, a, b, c, b, a, c, a, b, c, a, b, c]; return pat.slice(0, n); }
// Analyst dice: six faces, [symbol, count]. Two doubles each (three for the Engineer, whose identity is doubles).
const DICE = {
  HUN: [['D', 2], ['D', 1], ['D', 1], ['C', 1], ['E', 1], ['E', 2]],
  RES: [['C', 2], ['C', 1], ['C', 1], ['D', 1], ['E', 1], ['D', 2]],
  ENG: [['E', 2], ['E', 2], ['E', 1], ['D', 1], ['C', 1], ['C', 2]],
  SOA: [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 1]],
  PAT: [['C', 1], ['D', 1], ['E', 1], ['C', 2], ['D', 1], ['E', 2]],
};
if (process.env.DICE_JSON) Object.assign(DICE, JSON.parse(process.env.DICE_JSON));
const CREW_DIE = [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 2]];
const AGENT_DIE = [['D', 1], ['C', 1], ['E', 1], ['D', 1], ['C', 1], ['E', 1]];
const KIT = ['triage', 'enrich', 'contain', 'recover'];

function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function newGame(sys, team, opt) {
  const r = opt.rnd, n = team.length;
  const mk = (m, boss) => {
    const hits = boss ? m.hitsBase + D.bossAdd[n] : Math.max(1, m.hits + (D.mobAdd[n] || 0));
    const domain = boss ? 'Identity' : m.domain;
    return { id: m.id, name: m.name, boss, def: m.def, dmg: m.dmg, kw: boss ? m.id : m.ability, persist: m.persist, hits, left: hits, need: sys === 'd6' ? symbolsFor(domain, hits) : null, domain, back: 0, up: 0 };
  };
  const mobs = shuffle(D.mobs, r).slice(0, opt.deal || 6).map(m => mk(m));
  return { sys, team, n, r, hp: team.map(() => opt.hp), max: opt.hp, feed: mobs, boss: mk(D.bosses[Math.floor(r() * 3)], true),
    row: [], play: [], kit: shuffle(KIT.flatMap(t => [t, t]), r), discard: [], tray: [], point: 0, over: false, win: false,
    stats: { rounds: 0, choice: 0, back: 0 }, smart: opt.smart !== false };
}
const d20 = G => 1 + Math.floor(G.r() * 20), d6 = G => Math.floor(G.r() * 6);
const on = (G, id) => G.team.includes(id);
const active = (G, t) => G.play.some(m => m.boss && m.kw === 'ai') ? 0 : G.tray.filter(x => x === t).length;
const dmgOf = (G, m) => m.boss && m.kw === 'wyrm' && m.left > m.hits - 2 ? m.dmg + 2 : m.dmg + (m.kw === 'ramp' ? m.up : 0);
function hurt(G, k, n) { if (n <= 0 || G.over) return; G.hp[k] = Math.max(0, G.hp[k] - n); if (!G.hp[k]) { G.over = true; G.win = false; } }

// Row roll: anything in range comes back at full hits; the two highest-Damage comebacks strike on arrival.
function rollRow(G, strike) {
  if (!G.row.length) return []; const r = d20(G), back = G.row.filter(m => r >= m.persist[0] && r <= m.persist[1]);
  G.row = G.row.filter(m => !back.includes(m)); back.forEach(m => { m.left = m.hits; m.need = G.sys === 'd6' ? symbolsFor(m.domain, m.hits) : null; m.back++; m.up = 0; });
  G.stats.back += back.length;
  if (strike) for (const m of back.slice().sort((a, b) => b.dmg - a.dmg).slice(0, 2)) G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m)));
  return back;
}
function enter(G, m) { G.play.push(m); if (m.kw === 'beacon') for (const b of rollRow(G, true)) enter(G, b); }

// The dice of one round: crew dice (one each, two on point, three solo), plus a die per running Triage Agent.
function roll(G) {
  const dice = [];
  G.team.forEach((id, k) => { const nd = G.n === 1 ? D.soloDice : k === G.point ? 2 : 1;
    for (let i = 0; i < nd; i++) dice.push(G.sys === 'd20' ? { k, crew: true, r: d20(G) } : { k, crew: true, f: (process.env.SOLO === 'mixed' && G.n === 1 && i === nd - 1 ? CREW_DIE : DICE[id])[d6(G)] }); });
  for (let i = 0; i < active(G, 'triage'); i++) dice.push(G.sys === 'd20' ? { k: G.point, crew: false, r: d20(G) } : { k: G.point, crew: false, f: AGENT_DIE[d6(G)] });
  return dice;
}
// What one die can do: a list of { mob, hits removed } targets, and whether it can guard. d20 doubles block on their own.
function options(G, d, m, enrichLeft) {
  if (!d.crew && (m.boss || m.kw === 'noagent')) return 0;
  if (G.sys === 'd20') {
    const id = G.team[d.k], dbl = d.crew && d.r >= (id === 'ENG' ? D.perks.ENG.dbl : 18);
    if (m.kw === 'hardened' && d.r < 12) return 0;
    let b = (d.boost || 0) + (d.crew ? active(G, 'enrich') * D.enrichBonus + (id === 'HUN' && m.back ? D.perks.HUN.back : 0) + (id === 'RES' && m === top(G) ? D.perks.RES.top : 0) : D.triageBonus);
    return dbl || d.r >= 18 ? 2 : d.r !== 1 && d.r + b >= m.def ? 1 : 0;
  }
  // d6: the face must match a symbol still needed. Hunter: any face is wild against comebacks; Responder: Contain
  // faces are wild against the biggest hitter. A running Enrichment Agent turns one die a round into any symbol.
  const [s, c] = d.f, id = d.crew ? G.team[d.k] : null;
  if (m.kw === 'hardened' && c < 2) return 0;
  const wild = d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && s === 'C' && m === top(G)) || enrichLeft;
  const need = wild ? m.need.length : m.need.filter(x => x === s).length;
  return Math.min(c, need);
}
const top = G => G.play.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0];
const canGuard = (G, d) => d.crew && (G.sys === 'd20' ? d.r >= D.guard.min && d.r < (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18) : d.f[1] === 2);
const autoBlock = (G, d) => G.sys === 'd20' && d.crew && d.r >= (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18);

// Damage the crew takes at the end of the round, given who is blocking.
function incoming(G, blocks) {
  const out = G.team.map(() => 0); const cut = active(G, 'contain');
  const dm = new Map(G.play.map(m => [m, dmgOf(G, m)]));
  for (let i = 0; i < cut; i++) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
  for (const m of G.play) {
    const d = dm.get(m), pierce = m.kw === 'noblock';
    if (m.kw === 'onpoint') { if (pierce || !blocks[G.point]) out[G.point] += d * 2; continue; }
    let ts = G.team.map((_, k) => k); if (m.kw === 'lowest') { const lo = Math.min(...G.hp); ts = ts.filter(k => G.hp[k] === lo); }
    for (const k of ts) if (pierce || !blocks[k]) out[k] += d;
  }
  return out;
}
// Every legal way to use this round's dice: each die goes on a mob it can hit, guards, or sits out.
// Returns the end states with the bot's score. The same scorer judges both systems.
function allocations(G, dice) {
  if (Math.pow(G.play.length + 2, dice.length) > 40000) return greedy(G, dice);
  const res = [], hasEnrich = G.sys === 'd6' && active(G, 'enrich') > 0;
  const rec = (i, left, blocks, enrichUsed, plan) => {
    if (i === dice.length) { res.push({ plan: plan.slice(), left: new Map(left), blocks: blocks.slice(), score: score(G, left, blocks) }); return; }
    const d = dice[i]; let any = false;
    for (const m of G.play) {
      const L = left.get(m); if (!L.n) continue;
      for (const useE of hasEnrich && !enrichUsed && d.crew ? [false, true] : [false]) {
        const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, useE);
        if (!h) continue; any = true;
        const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, useE));
        const nb = blocks.slice(); if (autoBlock(G, d)) nb[d.k] = true;
        plan.push([i, m, useE]); rec(i + 1, nl, nb, enrichUsed || useE, plan); plan.pop();
      }
    }
    if (canGuard(G, d) && !blocks[d.k]) { const nb = blocks.slice(); nb[d.k] = true; plan.push([i, 'guard']); rec(i + 1, left, nb, enrichUsed, plan); plan.pop(); any = true; }
    const nb = blocks.slice(); if (autoBlock(G, d)) nb[d.k] = true;
    plan.push([i, 'idle', any]); rec(i + 1, left, nb, enrichUsed, plan); plan.pop();
  };
  rec(0, new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), G.team.map(() => false), false, []);
  return res;
}
// Too many dice to enumerate (big Triage turns): place dice one at a time, each where it scores best.
function greedy(G, dice) {
  let left = new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), blocks = G.team.map(() => false);
  for (const d of dice) {
    if (autoBlock(G, d)) blocks[d.k] = true;
    let best = { s: score(G, left, blocks), left, blocks };
    for (const m of G.play) { const L = left.get(m); if (!L.n) continue; const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, false); if (!h) continue;
      const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, false)); const sc = score(G, nl, blocks); if (sc > best.s) best = { s: sc, left: nl, blocks }; }
    if (canGuard(G, d) && !blocks[d.k]) { const nb = blocks.slice(); nb[d.k] = true; const sc = score(G, left, nb); if (sc > best.s) best = { s: sc, left, blocks: nb }; }
    left = best.left; blocks = best.blocks;
  }
  return [{ plan: [], left, blocks, score: score(G, left, blocks), greedy: true }];
}
function takeHits(G, m, L, d, h, wild) {
  if (G.sys === 'd20') return { n: L.n - h, need: null };
  const need = L.need.slice(); const id = d.crew ? G.team[d.k] : null;
  for (let j = 0; j < h; j++) { let i = need.indexOf(d.f[0]); if (i < 0 && (wild || d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && d.f[0] === 'C' && m === top(G)))) i = 0; if (i < 0) break; need.splice(i, 1); }
  return { n: need.length, need };
}
// The bot's judgement of an end state: kills weighted by damage, progress, then damage taken (lethal is a disaster).
function score(G, left, blocks) {
  let s = 0; const alive = [];
  for (const m of G.play) { const L = left.get(m), w = dmgOf(G, m) + 1; if (!L.n) s += 10 * w + 5; else { s += (m.left - L.n) * w; alive.push(m); } }
  const saved = G.play; G.play = alive; const inc = incoming(G, blocks); G.play = saved;
  inc.forEach((x, k) => { s -= 3 * x; if (x >= G.hp[k]) s -= 1000; });
  return s;
}

function fight(G, mobs) {
  G.play = []; mobs.forEach(m => enter(G, m)); let round = 0;
  while (!G.over && G.play.length) {
    round++; G.stats.rounds++; if (round > 1) for (const b of rollRow(G, true)) enter(G, b); if (G.over) return;
    const boss = G.play.some(m => m.boss);
    if (G.tray.includes('contain') && (G.play.length >= 3 || boss && G.play.length >= 2)) burn(G, 'contain');
    if (G.tray.includes('recover') && Math.min(...G.hp) <= G.max * 0.4) burn(G, 'recover');
    let dice = roll(G);
    if (boss && G.tray.includes('triage')) { burn(G, 'triage'); for (let i = 0; i < 3; i++) dice.push(G.sys === 'd20' ? { k: G.point, crew: true, r: d20(G) } : { k: G.point, crew: true, f: DICE[G.team[G.point]][d6(G)] }); }
    let wildAll = false; if (boss && G.tray.includes('enrich')) { burn(G, 'enrich'); wildAll = true; }
    if (G.over || !G.play.length) break;
    if (wildAll) dice = dice.map(d => G.sys === 'd20' ? { ...d, r: d.r, boost: 5 } : d);
    const all = allocations(G, wildAll && G.sys === 'd6' ? dice.map(d => ({ ...d, wildAll: true })) : dice);
    // A real choice: two allocations that use every usable die end in states the bot scores differently.
    const full = all.filter(a => a.plan.every(p => p[1] !== 'idle' || !p[2]));
    if (full.length > 1 && Math.max(...full.map(a => a.score)) - Math.min(...full.map(a => a.score)) > 0.5) G.stats.choice++;
    const pick = G.smart ? all.reduce((a, b) => b.score > a.score ? b : a) : full[Math.floor(G.r() * full.length)] || all[0];
    for (const m of G.play) { const L = pick.left.get(m); m.left = L.n; m.need = L.need; }
    const beaten = G.play.filter(m => !m.left), alive = G.play.filter(m => m.left);
    for (const m of beaten) {
      if (m.boss) { if (m.kw === 'apt' && !m.rose) { m.rose = true; m.left = 2; m.need = G.sys === 'd6' ? ['D', 'C'] : null; alive.push(m); continue; } G.over = true; G.win = true; return; }
      const gone = on(G, 'HUN') && m.back > 0; if (!gone && m.back < 1) G.row.push(m);
    }
    G.play = alive;
    const inc = incoming(G, pick.blocks); inc.forEach((x, k) => hurt(G, k, x)); if (G.over) return;
    for (const m of G.play) { m.up++; if (m.kw === 'regen' && m.left < m.hits) { m.left++; if (m.need) m.need.push(symbolsFor(m.domain, m.hits)[m.need.length]); } }
  }
  // Won fight: heals, then kit.
  if (on(G, 'PAT')) spread(G, D.perks.PAT.fight);
  spread(G, G.tray.filter(x => x === 'recover').length * (D.recoverHeal + (on(G, 'PAT') ? D.perks.PAT.recover : 0)));
  draw(G, (G.n === 1 ? D.kitSolo : D.kitPerFight) + (on(G, 'SOA') ? D.perks.SOA.draw : 0));
}
function spread(G, n) { for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) return; G.hp[k]++; } }
function burn(G, t) {
  G.tray.splice(G.tray.indexOf(t), 1); G.discard.push(t);
  if (t === 'contain') for (const m of G.play.slice()) { if (m.boss) { m.left = Math.max(1, m.left - 1); if (m.need) m.need.pop(); continue; } m.left--; if (m.need) m.need.pop(); if (!m.left) { G.play = G.play.filter(x => x !== m); if (m.back < 1) G.row.push(m); } }
  if (t === 'recover') spread(G, D.recoverBurn);
}
function draw(G, n) {
  const cap = D.sharedKit + (on(G, 'SOA') ? D.perks.SOA.slot : 0);
  for (let i = 0; i < n; i++) { if (!G.kit.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; } const c = G.kit.pop(); if (!c) return; if (G.tray.length < cap) G.tray.push(c); else G.discard.push(c); }
}
function play(sys, team, opt) {
  const G = newGame(sys, team, opt);
  for (const q of G.team.map((_, i) => i).slice(0, G.n === 1 ? D.quickStartSolo : D.quickStartAgent)) draw(G, 1);
  while (!G.over && G.feed.length) { G.point = G.hp.indexOf(Math.max(...G.hp)); const m = G.feed.pop(); const back = rollRow(G, true); if (G.over) break; fight(G, [m, ...back]); }
  if (!G.over) { const back = rollRow(G, false); fight(G, [G.boss, ...back]); }
  return G;
}

module.exports = { play, rng, DICE, symbolsFor };

if (require.main === module) {
  const N = +(process.env.N || 600), TEAMS = { 1: [['HUN'], ['RES'], ['ENG'], ['SOA'], ['PAT']], 2: [['HUN', 'RES'], ['ENG', 'SOA'], ['RES', 'PAT'], ['HUN', 'PAT'], ['SOA', 'PAT'], ['HUN', 'ENG']], 4: [['HUN', 'RES', 'ENG', 'SOA'], ['HUN', 'RES', 'SOA', 'PAT'], ['RES', 'ENG', 'SOA', 'PAT'], ['HUN', 'RES', 'ENG', 'PAT']] };
  const run = (sys, teams, hp, smart = true) => { let w = 0, rounds = 0, choice = 0, back = 0, seed = 5; for (let g = 0; g < N; g++) { const G = play(sys, teams[g % teams.length], { hp, rnd: rng(seed++ * 2654435761), smart }); w += G.win; rounds += G.stats.rounds; choice += G.stats.choice; back += G.stats.back; } return { win: w / N, choice: choice / rounds, rounds: rounds / N, back: back / N }; };
  // Tune HP per system so the smart bot wins about half its two-player games: spreads only compare at equal odds.
  const tune = sys => { let lo = 5, hi = 200; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (run(sys, TEAMS[2], mid).win < 0.5) lo = mid; else hi = mid; } return hi; };
  const pct = x => Math.round(x * 100) + '%';
  for (const sys of (process.env.SYS || 'd20,d6').split(',')) {
    const hp = tune(sys); console.log(`\n== ${sys} · HP ${hp} (tuned to ~50% at 2p) ==`);
    for (const n of [1, 2, 4]) { const s = run(sys, TEAMS[n], hp), r = run(sys, TEAMS[n], hp, false); console.log(`${n}p  win ${pct(s.win)} | random placement ${pct(r.win)} (skill gap ${Math.round((s.win - r.win) * 100)} pts) | rounds with a real dice choice ${pct(s.choice)} | rounds ${s.rounds.toFixed(1)} | comebacks ${s.back.toFixed(1)}`); }
    const solo = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'].map(id => [id, run(sys, [[id]], hp).win]);
    console.log('solo by analyst: ' + solo.map(([id, w]) => `${id} ${pct(w)}`).join(' · ') + `  (spread ${Math.round((Math.max(...solo.map(x => x[1])) - Math.min(...solo.map(x => x[1]))) * 100)} pts)`);
    const ids = ['HUN', 'RES', 'ENG', 'SOA', 'PAT'], pairs = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push([[ids[i], ids[j]], run(sys, [[ids[i], ids[j]]], hp).win]);
    pairs.sort((a, b) => a[1] - b[1]); console.log(`pairs: ${pct(pairs[0][1])} (${pairs[0][0].join('+')}) to ${pct(pairs[pairs.length - 1][1])} (${pairs[pairs.length - 1][0].join('+')})`);
  }
}
