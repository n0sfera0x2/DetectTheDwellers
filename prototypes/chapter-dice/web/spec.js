// Chapter dice web prototype tests: node --test prototypes/chapter-dice/web/spec.js
// Engine rules, then (if jsdom is installed) a headless click-through of the built page and a card parity check.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const E = require('./engine');
const CARDS = require('../cards');
const D = require('../../../data/cards.json');
const SIM = require('../sim');

// ---- Fixtures: a game with chosen mobs in the fight and chosen dice ------------------------------------------------
function fight(team, ids, { seed = 1, dice = [], point = 0 } = {}) {
  const G = E.newGame({ team, seed });
  G.point = point; G.fight = 1; G.round = 1; G.phase = 'assign';
  G.play = ids.map(id => { if (id === 'boss') return G.boss; const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; });
  setDice(G, dice);
  return G;
}
// dice: [k, 3] rolls a 3 on analyst k's own die (their doubles apply); ['agent', 6] is an agent die showing 6.
function setDice(G, dice) {
  G.dice = dice.map((x, i) => x[0] === 'agent'
    ? { i, k: G.point, crew: false, src: 'agent', ...E.pipDie(x[1], 'AGENT'), used: null, takes: [], turned: false }
    : { i, k: x[0], crew: true, src: 'own', ...E.pipDie(x[1], G.team[x[0]]), used: null, takes: [], turned: false });
  G.blocks = G.team.map(() => false); G.undo = []; G.wildAll = false; G.enrichLeft = G.tray.filter(c => c.t === 'enrich').length;
  G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = E.dmgOf(G, m); });
}
const mob = (G, id) => G.play.find(m => m.id === id);
const offCount = m => m.off.filter(Boolean).length;
const throwsRule = (fn, re) => assert.throws(fn, e => e.rule && (!re || re.test(e.message)));
const setTray = (G, types) => { G.tray = types.map((t, i) => ({ uid: 'x' + i, t })); };
const slotOf = (m, n) => m.slots.findIndex((v, i) => v === n && !m.off[i]);
const hitsOn = (G, di, m) => E.targets(G, di).hits.filter(h => h.uid === m.uid).map(h => m.slots[h.p]);
// The printed dice of the six paper mobs and the boss (sorted low to high), and their + die.
// Clustered round each mob's main number; the + die is always a 6.
const PRINTED = { mailer: [[2, 2], 6], spray: [[4, 4], 6], imp: [[1, 1], 6], druid: [[2, 3, 3], 6], wyrmling: [[4, 5, 5], 6], mimic: [[5, 5, 6, 6], 6], wyrm: [[2, 2, 3, 3, 3, 3, 3, 4], 6] };
const otherSlot = (m, n, p) => m.slots.findIndex((v, i) => v === n && !m.off[i] && i !== p);

test('mob dice come from the sim’s numbersFor, one fewer than the d20 hits (boss two fewer); HP 12', () => {
  for (const m of CARDS.mobs()) {
    const d = CARDS.diceFor(m); assert.deepEqual([d.base, d.extra], PRINTED[m.id], m.id);
    assert.deepEqual(d.base, SIM.numbersFor(m.id, m.hits - 1).slice().sort((a, b) => a - b));
  }
  const b = CARDS.boss(), bd = CARDS.diceFor(b, true);
  assert.equal(bd.base.length, b.hitsBase + D.bossAdd[2] - 2); assert.deepEqual([bd.base, bd.extra], PRINTED.wyrm);
  // Clustered: the main number repeats, e.g. 1 2 2 2 3 for five dice.
  assert.deepEqual(SIM.numbersFor('mailer', 5).sort(), [1, 2, 2, 2, 3]); assert.deepEqual(SIM.numbersFor('imp', 5).sort(), [1, 1, 1, 2, 2]);
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 3 });
  assert.equal(G.hp[0], 12); assert.equal(E.HP, 12); assert.equal(G.tray.length, D.quickStartAgent);
  assert.equal(E.newGame({ team: ['ENG'], seed: 3 }).tray.length, D.quickStartSolo);
  assert.equal(E.newGame({ team: ['SOA', 'HUN'], seed: 3 }).cap, D.sharedKit + 1);
});
test('scaling: a 6 per player past three; solo to 3 players play the printed dice', () => {
  const spray = n => E.newGame({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).feed.find(m => m.id === 'spray').slots;
  assert.deepEqual(spray(1), [4, 4]); assert.deepEqual(spray(2), [4, 4]); assert.deepEqual(spray(3), [4, 4]); assert.deepEqual(spray(4), [4, 4, 6]);
  const boss = n => E.newGame({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).boss;
  assert.equal(boss(1).hits, 8); assert.equal(boss(3).hits, 8); assert.equal(boss(4).hits, 9); assert.deepEqual(boss(4).slots.slice(8), [6]);
  assert.equal(SIM.XFROM, CARDS.PAST);
  // The sim sets the same dice (in its own order) for every crew size.
  const sorted = a => a.slice().sort((x, y) => x - y);
  for (const n of [1, 2, 3, 4]) for (const m of CARDS.mobs()) assert.deepEqual(sorted(SIM.slotsFor({ id: m.id, base: m.hits - 1 }, n)), sorted(CARDS.slotsFor(m, false, n)), `${m.id} ${n}p`);
});
test('doubles by analyst; every other die doubles only on a 6', () => {
  const want = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6] };
  for (const [id, ns] of Object.entries(want)) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, id).dbl, ns.includes(n), `${id} ${n}`);
  for (const who of ['CREW', 'AGENT']) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, who).dbl, n === 6, `${who} ${n}`);
  assert.deepEqual(CARDS.DOUBLES, SIM.DOUBLES);
});

test('exact numbers: a die takes one die showing exactly its number, never one off', () => {
  const G = fight(['ENG', 'SOA'], ['wyrmling'], { dice: [[1, 5], [1, 3], [1, 4]] }); // wyrmling: 4 5 5; SOA doubles 1, 6
  const w = mob(G, 'wyrmling');
  assert.deepEqual(hitsOn(G, 0, w), [5, 5]); assert.deepEqual(hitsOn(G, 1, w), []);
  throwsRule(() => E.assign(G, 1, w.uid, slotOf(w, 4)), /No 3 left/);
  throwsRule(() => E.assign(G, 0, w.uid, slotOf(w, 4)), /can’t take the 4/);
  E.assign(G, 0, w.uid, slotOf(w, 5)); assert.deepEqual(E.remaining(w), [4, 5]);
  throwsRule(() => E.assign(G, 0, w.uid, slotOf(w, 5)), /already used/); // a single takes one
  E.assign(G, 2, w.uid); assert.deepEqual(E.remaining(w), [5]);
});
test('a double counts as two dice showing its number, on one mob or two, or guards, never both', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'druid'], { dice: [[0, 4], [0, 2], [1, 3]] }); // ENG 4 and 2 are doubles
  const s = mob(G, 'spray'), dr = mob(G, 'druid'); // spray 4 4; druid 2 3 3 (Evasive)
  E.assign(G, 0, s.uid, slotOf(s, 4), otherSlot(s, 4, slotOf(s, 4))); assert.equal(E.left(s), 0); // both 4s in one go
  assert.ok(G.dice[0].used); assert.equal(E.takesLeft(G.dice[0]), 0);
  // The double 2 takes the druid's 2; it has a take left, but no other 2 to take and it can't take a 3.
  E.assign(G, 1, dr.uid, slotOf(dr, 2)); assert.equal(G.dice[1].used, null); assert.equal(E.takesLeft(G.dice[1]), 1);
  assert.deepEqual(hitsOn(G, 1, dr), []); throwsRule(() => E.assign(G, 1, dr.uid, slotOf(dr, 3)), /No 2 left/);
  throwsRule(() => E.guard(G, 1), /already used/); // half spent: it can't guard now
  E.unassign(G); assert.equal(E.takesLeft(G.dice[1]), 2); E.guard(G, 1); assert.equal(G.blocks[0], true);
  throwsRule(() => E.assign(G, 1, dr.uid, slotOf(dr, 2)), /already used/);
  throwsRule(() => E.guard(G, 2), /double/);
  // A single can't take two.
  setDice(G, [[1, 3]]); G.play = [mob(G, 'druid')]; throwsRule(() => E.assign(G, 0, dr.uid, slotOf(dr, 3), otherSlot(dr, 3, slotOf(dr, 3))), /Evasive|Only a double/);
  // Across two mobs: the Hunter's double 2 takes the mailer's 2 and the druid's 2.
  const H = fight(['HUN', 'ENG'], ['mailer', 'druid'], { dice: [[0, 2]] }), ma = mob(H, 'mailer'), hd = mob(H, 'druid');
  assert.deepEqual(E.moreSlots(H, H.dice[0], ma, slotOf(ma, 2)), [otherSlot(ma, 2, slotOf(ma, 2))]);
  E.assign(H, 0, ma.uid, slotOf(ma, 2)); E.assign(H, 0, hd.uid, slotOf(hd, 2));
  assert.deepEqual(E.remaining(ma), [2]); assert.deepEqual(E.remaining(hd), [3, 3]); assert.ok(H.dice[0].used);
  throwsRule(() => E.assign(H, 0, ma.uid, slotOf(ma, 2)), /already used/);
  E.unassign(H); assert.equal(E.takesLeft(H.dice[0]), 1); assert.deepEqual(E.remaining(hd), [2, 3, 3]);
  const S = fight(['ENG', 'SOA'], ['spray'], { dice: [[1, 4]] }), ss = mob(S, 'spray');
  throwsRule(() => E.assign(S, 0, ss.uid, slotOf(ss, 4), otherSlot(ss, 4, slotOf(ss, 4))), /Only a double/);
});
test('no one-higher-or-lower matches: the Hunter against a comeback, the Responder against the top hitter', () => {
  const G = fight(['HUN', 'RES'], ['spray', 'mimic'], { dice: [[0, 3], [1, 5]] }); // spray 4 4; mimic D4: 5 5 6 6
  const s = mob(G, 'spray'); s.back = 1;
  assert.deepEqual(hitsOn(G, 0, s), []); // a 3 can't take a 4, comeback or not
  assert.deepEqual(hitsOn(G, 1, mob(G, 'mimic')), [5, 5]); // exact only, even on the highest-Damage mob
  assert.ok(E.targets(G, 1).hits.every(h => !h.near));
  assert.doesNotMatch(CARDS.analystCard('HUN') + CARDS.analystCard('RES'), /one higher|gone for good/);
});
test('reroll: once a round each player rerolls one of their own unused dice; it can’t be undone', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 3], [0, 4], [1, 2], ['agent', 5]] }); // ENG 4 is a double
  G.rerolled = [false, false]; const s = mob(G, 'spray');
  throwsRule(() => E.reroll(G, 3), /Agent dice/);
  E.assign(G, 1, s.uid, slotOf(s, 4)); throwsRule(() => E.reroll(G, 1), /already used/); // half-used double
  assert.ok(E.canReroll(G, G.dice[0])); E.reroll(G, 0);
  assert.ok(G.dice[0].n >= 1 && G.dice[0].n <= 6); assert.equal(G.dice[0].dbl, CARDS.DOUBLES.ENG.includes(G.dice[0].n));
  assert.equal(G.undo.length, 0, 'a reroll clears undo'); throwsRule(() => E.reroll(G, 0), /already rerolled/);
  assert.ok(E.canReroll(G, G.dice[2])); E.reroll(G, 2); assert.equal(G.rerolled.join(), 'true,true');
  // A new round resets it; the engine rolls fresh.
  const H = E.newGame({ team: ['HUN', 'RES'], seed: 9 }); E.flip(H); if (H.phase === 'roll') E.roll(H);
  assert.equal(H.rerolled.join(), 'false,false'); assert.match(CARDS.legend, /reroll one of your own dice/);
});
test('Evasive: only a double can hit it', () => {
  const G = fight(['PAT', 'SOA'], ['druid'], { dice: [[1, 3], [0, 3]] }); // druid: 2 3 3; PAT doubles 3, 6
  const dr = mob(G, 'druid');
  throwsRule(() => E.assign(G, 0, dr.uid, slotOf(dr, 3)), /Evasive/);
  E.assign(G, 1, dr.uid, slotOf(dr, 3), otherSlot(dr, 3, slotOf(dr, 3))); assert.deepEqual(E.remaining(dr), [2]);
});
test('agent dice: only a 6 doubles; they can’t guard or hit the boss', () => {
  const G = fight(['ENG', 'SOA'], ['boss', 'imp'], { dice: [['agent', 6], ['agent', 1]] });
  assert.equal(G.dice[0].dbl, true); assert.equal(G.dice[1].dbl, false);
  throwsRule(() => E.guard(G, 0), /guard/);
  throwsRule(() => E.assign(G, 0, 'boss'), /boss/);
  E.assign(G, 1, mob(G, 'imp').uid, slotOf(mob(G, 'imp'), 1)); assert.equal(offCount(mob(G, 'imp')), 1);
});
test('Enrichment run turns one crew die to any number, keeping double or single; burn matches anything', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], {});
  setTray(G, ['enrich']); setDice(G, [[0, 4], [1, 3], ['agent', 3]]);
  throwsRule(() => E.enrichTurn(G, 2, 2), /crew die/);
  E.enrichTurn(G, 0, 5); assert.equal(G.dice[0].n, 5); assert.equal(G.dice[0].dbl, true);
  throwsRule(() => E.enrichTurn(G, 1, 2), /No Enrichment/);
  const s = mob(G, 'spray'); assert.deepEqual(hitsOn(G, 1, s), []);
  E.burn(G, 'enrich'); assert.equal(G.wildAll, true);
  assert.deepEqual(hitsOn(G, 1, s), [4, 4]);
  E.assign(G, 1, s.uid, slotOf(s, 4)); assert.equal(offCount(s), 1);
});
test('the row: comebacks return with all their dice; only the two highest-Damage hit on arrival', () => {
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 2 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const row = ['imp', 'druid', 'wyrmling', 'mimic'].map(take); // Damage 3, 3, 4, 4
  row.forEach(m => { m.top = 12; m.off[0] = true; });
  G.row = row; G.feed.unshift(take('spray'));
  E.flip(G);
  assert.equal(G.play.length, 5); assert.equal(G.row.length, 0);
  assert.ok(row.every(m => m.back === 1 && E.left(m) === m.hits));
  assert.deepEqual(G.hp, [E.HP - 8, E.HP - 8]);
  assert.equal(G.lastRow.strikes.length, 2);
  assert.equal(G.lastRow.pair.length, 2); assert.equal(G.lastRow.roll, G.lastRow.pair[0] + G.lastRow.pair[1]);
});

test('the row on 2d6: tiers from the d20 ranges; a mob comes back if the sum is at most its number', () => {
  for (const [N, k] of [[13, 5], [12, 5], [11, 4], [10, 4], [9, 3], [8, 3], [7, 2], [5, 2]]) { assert.equal(CARDS.rowTop(N), k); assert.equal(SIM.rowTop(N), k); }
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 2 });
  const tops = Object.fromEntries(G.feed.map(m => [m.id, m.top]));
  assert.deepEqual(tops, { mailer: 5, spray: 5, druid: 4, imp: 3, mimic: 3, wyrmling: 3 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const imp = take('imp'), spray = take('spray'), druid = take('druid'); // back on 2–3, 2–5, 2–4
  G.row = [imp, spray, druid];
  const seq = [1.5 / 6, 1.5 / 6]; G.r = () => seq.shift(); // the amber pair rolls 2 + 2 = 4
  const back = E.rollRow(G, false, 'test');
  assert.deepEqual(G.lastRow.pair, [2, 2]); assert.equal(G.lastRow.roll, 4);
  assert.deepEqual(back.map(m => m.id).sort(), ['druid', 'spray']); assert.deepEqual(G.row, [imp]);
  // The printed card says the same number.
  assert.match(CARDS.mobCard(D.mobs.find(m => m.id === 'imp')), /back on 2–3/);
});

test('Beacon rolls the row when it arrives; the boss arrives with no arrival hits', () => {
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 4 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const mailer = take('mailer'), imp = take('imp'); imp.top = 12;
  G.feed = [mailer]; G.row = []; G.sits = []; // no situation between these two flips
  E.flip(G); assert.equal(G.rows.length, 0); // nothing on the row: no roll
  G.phase = 'flip'; G.feed = [mailer]; G.play = []; G.row = [imp];
  E.flip(G); assert.ok(G.rows.length >= 1); // the flip rolls, and the Beacon rolls again (empty row by then)
  const B = E.newGame({ team: ['ENG', 'SOA'], seed: 4 }); const m = B.feed.find(x => x.id === 'mimic'); m.top = 12;
  B.row = [m]; B.feed = []; E.flip(B);
  assert.ok(B.play.includes(B.boss) && B.play.includes(m)); assert.deepEqual(B.hp, [E.HP, E.HP]);
});

test('after a fight: every beaten mob goes back to the row, comebacks too, whoever beat it', () => {
  const G = fight(['HUN', 'ENG'], ['spray', 'imp'], { dice: [[1, 4]] }); // ENG 4 is a double: both of spray's 4s; the Hunter is on the crew
  const s = mob(G, 'spray'), i = mob(G, 'imp'); i.back = 2; i.off = i.off.map(() => true);
  E.assign(G, 0, s.uid, slotOf(s, 4)); E.assign(G, 0, s.uid, slotOf(s, 4));
  E.endRound(G);
  assert.ok(G.row.includes(s)); assert.ok(G.row.includes(i)); assert.equal(G.gone.length, 0); assert.equal(G.play.length, 0);
  assert.ok(['flip', 'loot'].includes(G.phase));
});

test('end of round: mobs hit back; Piercing ignores blocks; Targeted hits only on point, doubled', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[0, 4], [1, 6]], point: 1 });
  setTray(G, []);
  E.guard(G, 0); E.guard(G, 1);
  const inc = E.incoming(G);
  assert.deepEqual(inc.total, [1, 1]); // spray pierces (1 each); imp is blocked by on point
  G.blocks = [false, false];
  assert.deepEqual(E.incoming(G).total, [1, 1 + 6]);
  setTray(G, ['contain']); assert.deepEqual(E.incoming(G).total, [1, 1 + 2]); // imp 3 → 1, doubled
});

test('Lockjaw +2 until it has lost two dice; Regen puts back the die it lost; Escalating at round end', () => {
  const G = fight(['ENG', 'SOA'], ['boss'], {});
  assert.equal(E.dmgOf(G, G.boss), 11); G.boss.off[0] = true; assert.equal(E.dmgOf(G, G.boss), 11);
  G.boss.off[1] = true; assert.equal(E.dmgOf(G, G.boss), 9);
  const H = fight(['ENG', 'SOA'], ['mimic', 'wyrmling'], { dice: [[1, 5], [1, 6]] }); // SOA 6 is a double
  const mi = mob(H, 'mimic'), p = slotOf(mi, 5);
  E.assign(H, 0, mi.uid, p); E.assign(H, 1, mi.uid, slotOf(mi, 6)); H.hp = [99, 99]; E.endRound(H);
  assert.equal(offCount(mi), 1); assert.equal(mi.off[p], true); assert.deepEqual(E.remaining(mi), [5, 6, 6]); // the 6 it lost last is back; the 5 stays taken
  assert.ok(H.log.some(l => /regenerates: its 6 goes back/.test(l.text)));
  assert.equal(E.dmgOf(H, mob(H, 'wyrmling')), 5);
});

test('roll: on point rolls two; solo rolls two of their own plus the crew die; Triage rolls an agent die', () => {
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 9 }); setTray(G, ['triage']); G.point = 1; E.flip(G); if (G.phase === 'roll') E.roll(G);
  assert.equal(G.dice.filter(d => d.k === 1 && d.crew).length, 2); assert.equal(G.dice.filter(d => d.k === 0).length, 1);
  assert.equal(G.dice.filter(d => !d.crew).length, 1);
  const S = E.newGame({ team: ['ENG'], seed: 9 }); S.tray = []; E.flip(S); if (S.phase === 'roll') E.roll(S);
  assert.equal(S.dice.length, D.soloDice); assert.deepEqual(S.dice.map(d => d.src), ['own', 'own', 'crew']);
  for (const d of S.dice) assert.ok(d.n >= 1 && d.n <= 6);
  assert.equal(S.dice[2].dbl, S.dice[2].n === 6); // only a 6 doubles on the crew die
  assert.equal(S.dice[0].dbl, CARDS.DOUBLES.ENG.includes(S.dice[0].n));
  assert.ok(G.dice.filter(d => !d.crew).every(d => d.dbl === (d.n === 6)));
});

test('cards: the dice strip along the bottom, no symbols, no “players add”; analysts show doubles as pip faces', () => {
  const pips = html => [...html.matchAll(/class="pip"[^>]*aria-label="(\d)"/g)].map(x => +x[1]);
  const strip = html => { const i = html.indexOf('class="dice"'), j = html.indexOf('class="base"'); assert.ok(i > 0, 'dice strip'); return html.slice(i, j > i ? j : undefined); };
  for (const m of CARDS.mobs()) {
    const h = CARDS.mobCard(m), d = CARDS.diceFor(m);
    assert.deepEqual(pips(strip(h)), [...d.base, d.extra]); assert.match(h, /per player past 3/); assert.equal(d.extra, 6);
    assert.ok(h.lastIndexOf('class="dice"') > h.indexOf('class="fl"'), 'the strip comes after the flavour: the bottom edge');
  }
  const bh = CARDS.bossCard(CARDS.boss()), bd = CARDS.diceFor(CARDS.boss(), true); assert.deepEqual(pips(strip(bh)), [...bd.base, bd.extra]);
  const all = [...CARDS.mobs().map(CARDS.mobCard), bh, CARDS.legend, ...CARDS.ANALYST_IDS.map(CARDS.analystCard), ...CARDS.AGENT_IDS.map(CARDS.agentCard)].join('');
  assert.doesNotMatch(all, /players add/i); assert.doesNotMatch(all, /Detect|Contain(?!ment)|Eradicate|symbol/);
  for (const id of CARDS.ANALYST_IDS) { const h = CARDS.analystCard(id); assert.match(h, /Your doubles/); assert.deepEqual(pips(h), CARDS.DOUBLES[id]); }
  assert.match(CARDS.legend, /exactly/); assert.match(CARDS.legend, /counts as <b>two<\/b> dice showing its number/); assert.match(CARDS.legend, /only a .* is a double/);
  assert.doesNotMatch(all, /any one more/); assert.match(CARDS.legend, /4 players: add the card’s \+ die/); assert.match(CARDS.legend, /sum is at most its number/);
});

test('cards carry the game’s Ink & Static scenes: mob by id, boss print scene, analyst portrait, agent kit scene', () => {
  const ART = require('../../../data/art.json'), PRINT = require('../../../data/art-print.json');
  const scene = html => { const m = /<div class="art">([\s\S]*?<\/svg>)<\/div>/.exec(html); assert.ok(m, 'art panel'); return m[1]; };
  for (const m of CARDS.mobs()) { const h = CARDS.mobCard(m); assert.equal(scene(h), ART[m.id], m.id); assert.ok(h.indexOf('class="art"') < h.indexOf('class="nm"'), 'art on top'); }
  assert.equal(scene(CARDS.bossCard(CARDS.boss())), PRINT['boss_' + CARDS.BOSS_ID].replace(/\{\{SID\}\}/g, 'cd'));
  for (const id of CARDS.ANALYST_IDS) assert.equal(scene(CARDS.analystCard(id)), ART[id], id);
  for (const t of CARDS.AGENT_IDS) assert.equal(scene(CARDS.agentCard(t)), ART['kit_' + t], t);
  // The web build inlines exactly the scenes the cards use (plus the page's own), so the page cards match print.
  const k = CARDS.artKeys(); assert.ok(k.art.every(x => ART[x]) && k.print.every(x => PRINT[x]));
});

test('burns: Triage adds three on-point dice; Containment takes a die off every mob; Recovery heals 6', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'wyrmling', 'boss'], { point: 1 });
  setTray(G, ['triage', 'contain', 'recover']); setDice(G, []);
  E.burn(G, 'triage'); assert.equal(G.dice.length, 3); assert.ok(G.dice.every(d => d.k === 1 && d.crew && d.dbl === CARDS.DOUBLES.SOA.includes(d.n)));
  G.boss.off = G.boss.off.map((x, i) => i > 0);
  E.burn(G, 'contain'); assert.deepEqual(E.remaining(mob(G, 'spray')), [4]); assert.equal(E.left(G.boss), 1);
  assert.deepEqual(E.remaining(mob(G, 'wyrmling')), [4, 5]); // a repeated number goes first
  G.hp = [6, 11]; E.burn(G, 'recover'); assert.equal(G.hp[0] + G.hp[1], 23); assert.deepEqual(G.hp, [12, 11]); // one at a time onto the lowest
  throwsRule(() => E.burn(G, 'enrich'), /No such agent/);
});

test('won fight: Recovery heals (the Fixer no longer does); draw two; a full tray means you choose what to discard', () => {
  const G = fight(['PAT', 'ENG'], ['spray'], { dice: [[1, 4]] }); // ENG 4 is a double
  setTray(G, ['recover', 'triage', 'triage', 'contain', 'contain']); G.hp = [10, 10];
  const s = mob(G, 'spray'); E.assign(G, 0, s.uid, slotOf(s, 4), otherSlot(s, 4, slotOf(s, 4))); E.endRound(G);
  assert.equal(G.hp[0] + G.hp[1], 20 + D.recoverHeal);
  assert.equal(G.phase, 'loot'); assert.equal(G.tray.length, 7);
  E.discardKit(G, G.tray[0].uid); assert.equal(G.phase, 'loot');
  E.discardKit(G, G.tray[0].uid); assert.equal(G.phase, 'flip'); assert.equal(G.tray.length, 5);
});

test('an empty kit deck reshuffles the discards', () => {
  const G = E.newGame({ team: ['ENG', 'HUN'], seed: 1 });
  G.discard = [...G.kit.splice(0), ...G.tray]; G.tray = [];
  G.phase = 'assign'; G.play = []; G.fight = 1; G.round = 1; G.dice = []; E.endRound(G);
  assert.equal(G.tray.length, D.kitPerFight); assert.equal(G.kit.length + G.discard.length + G.tray.length, 8);
  assert.ok(G.log.some(l => /shuffled the discards/.test(l.text)));
});

test('deterministic given a seed, and a scripted game reaches an end', () => {
  const run = seed => { const G = E.newGame({ team: ['HUN', 'RES'], seed }); let n = 0;
    while (!G.over && n++ < 3000) {
      if (G.phase === 'flip') E.flip(G); else if (G.phase === 'roll') E.roll(G); else if (G.phase === 'loot') E.discardKit(G, G.tray[0].uid);
      else if (G.phase === 'sit') E.resolveSit(G, ...(G.sit.id === 'chatter' ? ['dig', 1] : [E.SIT_OPTS[G.sit.id][G.feed.length ? 1 : 0]]));
      else { for (const d of G.dice) { const t = E.targets(G, d.i); if (t.hits.length) E.assign(G, d.i, t.hits[0].uid, t.hits[0].p); else if (t.guard) E.guard(G, d.i); } E.endRound(G); }
    } return G; };
  const a = run(11), b = run(11);
  assert.ok(a.over); assert.deepEqual(a.log, b.log);
});

// ---- Situations, conditions, the Hunter's 1s and the Engineer's turn (sim.js situation(), choose(), incoming()) ----
// A game between fights 1 and 2 with situation id on top; dice: the d6 rolls to come (G.r stubbed), then the seed.
function atSit(team, id, { seed = 1, point = 0, dice = [] } = {}) {
  const G = E.newGame({ team, seed }); G.fight = 1; G.phase = 'flip'; G.point = point; G.sits = [id];
  const r = G.r, seq = dice.map(v => (v - .5) / 6); G.r = () => seq.length ? seq.shift() : r();
  E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.sit.id, id); return G;
}
const kits = G => G.tray.length;

test('situations: none before fight 1; one before every later flip, the boss’s too; on point is set', () => {
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 6 }); assert.equal(G.sits.length, 6); assert.deepEqual(G.sits.slice().sort(), CARDS.SIT_IDS.slice().sort());
  E.flip(G); assert.equal(G.fight, 1); assert.notEqual(G.phase, 'sit'); assert.equal(G.sit, null);
  G.play = []; G.phase = 'flip'; G.sits = ['patch', 'pager'];
  E.setPoint(G, 1); E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.fight, 1, 'the mob is not flipped yet'); assert.equal(G.sit.id, 'pager');
  throwsRule(() => E.flip(G), /Not time/); throwsRule(() => E.resolveSit(G, 'heal'), /Not an option/);
  E.resolveSit(G, 'mute'); assert.equal(G.phase, 'flip'); assert.ok(G.sitDone && G.sit.done); assert.match(G.sit.text, /one more threat die/);
  throwsRule(() => E.setPoint(G, 0), /On point is set/);
  E.flip(G); assert.equal(G.fight, 2); assert.equal(G.sit, null); assert.equal(G.sitDone, false);
  // The boss's flip gets one too.
  G.play = []; G.phase = 'flip'; G.feed = []; E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.sit.id, 'patch'); assert.equal(G.bossOut, false);
  E.resolveSit(G, 'agent'); E.flip(G); assert.ok(G.bossOut);
  // None left: straight to the mob.
  const H = E.newGame({ team: ['HUN', 'RES'], seed: 6 }); H.fight = 1; H.sits = []; E.flip(H); assert.equal(H.fight, 2);
  assert.ok(G.log.some(l => l.kind === 'sit' && /Situation: Pager Storm/.test(l.text)));
});
test('The Badge That Wasn’t: hold the room (Exposed, an extra agent for the win) or fall back (it hits, goes on the row)', () => {
  const G = atSit(['ENG', 'RES'], 'insider', { point: 1 }), top = G.feed[0];
  assert.equal(G.sit.top, top.uid); assert.equal(G.sit.topName, top.name);
  E.resolveSit(G, 'stay'); assert.equal(G.cond[1].exposed, true); assert.equal(G.cond[0].exposed, false); assert.equal(G.bonusDraw, 1);
  E.flip(G); assert.equal(G.play[0], top);
  // Win the fight: the usual draw plus one, and Exposed is discarded.
  G.phase = 'assign'; G.dice = []; G.play.forEach(m => { m.off = m.off.map(() => true); }); G.tray = []; E.endRound(G);
  assert.equal(kits(G), D.kitPerFight + 1); assert.equal(G.bonusDraw, 0); assert.equal(G.cond[1].exposed, false);
  const R = atSit(['ENG', 'SOA'], 'insider'), t2 = R.feed[0], next = R.feed[1], hp = R.hp.slice();
  E.resolveSit(R, 'run'); assert.ok(R.row.includes(t2)); assert.equal(t2.back, 0, 'not a comeback'); assert.ok(!R.feed.includes(t2));
  assert.deepEqual(R.hp, hp.map(h => h - t2.dmg)); assert.match(R.sit.text, /unfought/);
  R.row = []; E.flip(R); assert.equal(R.play[0], next, 'the next flip flips the following mob');
  const B = E.newGame({ team: ['ENG', 'SOA'], seed: 1 }); B.fight = 5; B.feed = []; B.sits = ['insider']; E.flip(B);
  assert.equal(B.sit.top, 'boss'); assert.ok(B.sit.boss); throwsRule(() => E.resolveSit(B, 'run'), /boss is next/); assert.equal(B.phase, 'sit');
});
test('Pager Storm: ride it out (everyone loses 2) or mute it (one more threat die, a 6, dropped when beaten)', () => {
  const G = atSit(['ENG', 'SOA'], 'pager'); E.resolveSit(G, 'ride'); assert.deepEqual(G.hp, [E.HP - 2, E.HP - 2]);
  const M = atSit(['ENG', 'SOA'], 'pager'), m = M.feed[0], was = m.slots.slice(), hits = m.hits;
  E.resolveSit(M, 'mute'); M.row = []; E.flip(M);
  assert.deepEqual(m.slots, [...was, 6]); assert.equal(m.hits, hits + 1); assert.equal(E.left(m), hits + 1); assert.ok(m.slots.length - 1 >= m.printed, 'shown as an extra die');
  M.phase = 'assign'; M.dice = []; m.off = m.off.map(() => true); M.tray = []; E.endRound(M);
  assert.ok(M.row.includes(m)); assert.deepEqual(m.slots, was); assert.equal(m.hits, hits); assert.equal(m.off.length, hits);
  // A comeback has its printed dice only.
  m.top = 12; const back = E.rollRow(M, false, 'test'); assert.ok(back.includes(m)); assert.equal(E.left(m), hits);
});
test('The Janitor’s USB: a pair draws 2 and Focuses; no pair Rattles; leave it does nothing', () => {
  const G = atSit(['ENG', 'SOA'], 'usb', { dice: [2, 5, 2] }), n = kits(G);
  E.resolveSit(G, 'grab'); assert.deepEqual(G.sit.dice, [2, 5, 2]); assert.equal(G.sit.won, true);
  assert.equal(kits(G), n + 2); assert.equal(G.cond[0].focused, true); assert.equal(G.cond[0].rattled, false);
  const L = atSit(['ENG', 'SOA'], 'usb', { dice: [1, 2, 3] }), ln = kits(L);
  E.resolveSit(L, 'grab'); assert.equal(L.sit.won, false); assert.equal(kits(L), ln); assert.equal(L.cond[0].rattled, true);
  // Can't hold two of the same.
  L.cond[0].rattled = true; L.phase = 'sit'; L.sits = []; E.resolveSit(L, 'grab'); assert.equal(L.cond[0].rattled, true);
  const N = atSit(['ENG', 'SOA'], 'usb'), before = JSON.stringify([N.hp, N.tray, N.cond]); E.resolveSit(N, 'leave'); assert.equal(JSON.stringify([N.hp, N.tray, N.cond]), before);
});
test('Dark Web Chatter: dig in with 1–4 dice; a 6 draws 2, no 6 costs on point 1 HP a die', () => {
  const G = atSit(['ENG', 'SOA'], 'chatter', { point: 1, dice: [3, 6] }), n = kits(G);
  throwsRule(() => E.resolveSit(G, 'dig', 5), /1 to 4/); throwsRule(() => E.resolveSit(G, 'dig'), /1 to 4/);
  E.resolveSit(G, 'dig', 2); assert.deepEqual(G.sit.dice, [3, 6]); assert.equal(G.sit.won, true); assert.equal(kits(G), n + 2); assert.deepEqual(G.hp, [E.HP, E.HP]);
  const L = atSit(['ENG', 'SOA'], 'chatter', { point: 1, dice: [1, 2, 5] });
  E.resolveSit(L, 'dig', 3); assert.equal(L.sit.won, false); assert.deepEqual(L.hp, [E.HP, E.HP - 3]); assert.match(L.sit.text, /loses 3 HP/);
});
test('Lateral Whispers rolls the row now; comebacks hit on arrival and join the next fight', () => {
  const G = atSit(['ENG', 'SOA'], 'lateral'), imp = G.feed.find(m => m.id === 'imp'); G.feed = G.feed.filter(m => m !== imp);
  imp.top = 12; G.row = [imp];
  E.resolveSit(G, 'ok'); assert.deepEqual(G.pending, [imp]); assert.equal(G.row.length, 0); assert.equal(imp.back, 1);
  assert.deepEqual(G.hp, [E.HP - imp.dmg, E.HP - imp.dmg]); assert.equal(G.lastRow.why, 'Lateral Whispers');
  E.flip(G); assert.ok(G.play.includes(imp)); assert.equal(G.play.length, 2); assert.deepEqual(G.pending, []);
});
test('Patch Tuesday: take a breather (everyone +2, capped) or raid the supply closet (draw 1); over the tray limit, discard', () => {
  const G = atSit(['ENG', 'SOA'], 'patch'); G.hp = [10, E.HP - 1]; E.resolveSit(G, 'heal'); assert.deepEqual(G.hp, [12, E.HP]);
  const A2 = atSit(['ENG', 'RES'], 'patch'); setTray(A2, ['triage', 'triage', 'contain', 'contain', 'recover']);
  E.resolveSit(A2, 'agent'); assert.equal(kits(A2), 6); assert.equal(A2.phase, 'loot');
  E.discardKit(A2, A2.tray[0].uid); assert.equal(A2.phase, 'flip'); assert.ok(A2.sitDone); E.flip(A2); assert.equal(A2.fight, 2);
});
test('Rattled: that player’s next roll has no doubles, then it’s gone', () => {
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 2 }); E.flip(G); G.cond[0].rattled = true; G.tray = [];
  const seq = [0, 0, 0, 0, 0, 0, 0, 0].map(() => .5 / 6); G.r = () => seq.length ? seq.shift() : .5 / 6; // every die a 1
  G.phase = 'roll'; G.round = 1; E.roll(G);
  assert.ok(G.dice.filter(d => d.k === 0).every(d => d.n === 1 && !d.dbl && d.rattled), 'the Hunter’s 1s are single');
  assert.equal(G.cond[0].rattled, false); assert.ok(G.dice.filter(d => d.k === 1).every(d => !d.dbl), 'RES 1s are single anyway');
  G.phase = 'roll'; E.roll(G); assert.ok(G.dice.filter(d => d.k === 0).every(d => d.dbl), 'next roll: doubles again');
});
test('Exposed: +1 at round end only when something hits you', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[1, 6]], point: 1 }); setTray(G, []); // spray 1 pierces; imp 3 hits on point, doubled
  G.cond[0].exposed = true; G.cond[1].exposed = true;
  assert.deepEqual(E.incoming(G).total, [1 + 1, 1 + 6 + 1]); assert.deepEqual(E.incoming(G).exposed, [0, 1]);
  G.play = [mob(G, 'imp')]; assert.deepEqual(E.incoming(G).total, [0, 6 + 1], 'not hit: no extra');
  E.guard(G, 0); assert.deepEqual(E.incoming(G).total, [0, 0], 'blocked: no extra');
  G.blocks = [false, false]; G.dice[0].used = null; E.endRound(G); assert.deepEqual(G.hp, [E.HP, E.HP - 7]);
});
test('Focused: once, turn one of your own dice to any number; it reads as that number and spends the card', () => {
  const G = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 5], [1, 5], ['agent', 5], [0, 3]] }); G.cond[0].focused = true; // spray 4 4
  const s = mob(G, 'spray'); G.undo = [{}];
  assert.ok(E.canFocus(G, G.dice[0])); assert.ok(!E.canFocus(G, G.dice[1]), 'RES isn’t Focused'); assert.ok(!E.canFocus(G, G.dice[2]), 'not an agent die');
  throwsRule(() => E.focus(G, 1, 4), /isn’t Focused/); throwsRule(() => E.focus(G, 2, 4), /not an agent die/); throwsRule(() => E.focus(G, 0, 7), /1 to 6/);
  assert.ok(E.targets(G, 0).focus);
  E.focus(G, 0, 4); assert.equal(G.dice[0].n, 4); assert.equal(G.dice[0].dbl, false); assert.equal(G.cond[0].focused, false); assert.equal(G.undo.length, 0, 'not undoable');
  assert.deepEqual(hitsOn(G, 0, s), [4, 4]);
  throwsRule(() => E.focus(G, 3, 2), /isn’t Focused/); // spent
  G.cond[0].focused = true; E.focus(G, 3, 2); assert.equal(G.dice[3].dbl, true, 'a Hunter 2 is a double');
});
test('Hunter: their 1s match any free die under a mob that came back, and a 1 is a double', () => {
  const G = fight(['HUN', 'RES'], ['wyrmling', 'spray', 'druid'], { dice: [[0, 1], [1, 1], [0, 4]] }); // wyrmling 4 5 5; spray 4 4; druid 2 3 3 Evasive
  const w = mob(G, 'wyrmling'), s = mob(G, 'spray'), dr = mob(G, 'druid');
  assert.deepEqual(hitsOn(G, 0, w), [], 'a fresh mob: exact numbers only');
  w.back = 1; dr.back = 2;
  assert.deepEqual(hitsOn(G, 0, w), [4, 5, 5]); assert.ok(E.targets(G, 0).hits.filter(h => h.uid === w.uid).every(h => h.wild));
  assert.deepEqual(hitsOn(G, 0, s), [], 'not on a mob that hasn’t come back'); assert.deepEqual(hitsOn(G, 1, w), [], 'only the Hunter’s 1s');
  assert.deepEqual(hitsOn(G, 0, dr), [2, 3, 3], 'Evasive: a Hunter 1 is a double');
  E.assign(G, 0, w.uid, 1); E.assign(G, 0, dr.uid, 0); assert.ok(G.dice[0].used); assert.deepEqual(E.remaining(w), [4, 5]);
  assert.deepEqual(hitsOn(G, 2, w), [4], 'the Hunter’s other numbers stay exact');
  // Rattled, a Hunter 1 is single: it can't hit an Evasive comeback.
  const R = fight(['HUN', 'RES'], ['druid'], { dice: [[0, 1]] }), rd = mob(R, 'druid'); rd.back = 1; R.dice[0].rattled = true; R.dice[0].dbl = false;
  assert.deepEqual(hitsOn(R, 0, rd), []);
  assert.equal(CARDS.PERK.HUN, 'Your 1s match any number on an alarm that has come back from the row.');
});
test('Engineer: once a fight, turn one of their dice to its opposite side; it counts as one die', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 3], [0, 5], [1, 3]] }); G.rerolled = [false, false]; G.undo = [{}]; G.engUsed = false;
  assert.ok(E.canEng(G, G.dice[0])); assert.ok(!E.canEng(G, G.dice[2]), 'only the Engineer’s dice');
  throwsRule(() => E.engTurn(G, 2), /Engineer’s own/);
  E.engTurn(G, 0); const d = G.dice[0];
  assert.equal(d.n, 4); assert.equal(d.dbl, false, 'a turned die counts as one, even on an Engineer double'); assert.ok(d.flipped); assert.equal(G.undo.length, 0);
  assert.equal(E.canGuard(G, d), false); throwsRule(() => E.guard(G, 0), /can’t guard/); assert.equal(E.canReroll(G, d), false);
  throwsRule(() => E.reroll(G, 0), /turned/);
  assert.deepEqual(hitsOn(G, 0, mob(G, 'spray')), [4, 4]); throwsRule(() => E.assign(G, 0, mob(G, 'spray').uid, 0, 1), /Only a double/);
  E.assign(G, 0, mob(G, 'spray').uid, 0); assert.ok(G.dice[0].used, 'one take and it is spent');
  throwsRule(() => E.engTurn(G, 1), /this fight already/); assert.ok(!E.canEng(G, G.dice[1]));
  // Next round, same fight: still used. A new flip resets it.
  const H = E.newGame({ team: ['ENG', 'SOA'], seed: 4 }); E.flip(H); H.engUsed = true; H.play = []; H.phase = 'flip'; H.sits = []; E.flip(H); assert.equal(H.engUsed, false);
  assert.match(CARDS.PERK.ENG, /opposite side/);
});
test('Responder: once a fight, after the roll, stand a mob down: it deals no damage this round', () => {
  const G = fight(['RES', 'SOA'], ['spray', 'wyrmling'], { dice: [[0, 1]] }); G.undo = [{}];
  const w = mob(G, 'wyrmling'), before = E.incoming(G), wb = before.by.find(x => x.uid === w.uid);
  assert.ok(E.canStand(G)); E.stand(G, w.uid);
  const after = E.incoming(G); assert.ok(!after.by.some(x => x.uid === w.uid), 'it deals nothing');
  assert.deepEqual(after.total, before.total.map((x, k) => x - (wb.to.includes(k) ? wb.dmg : 0))); assert.equal(G.undo.length, 0);
  assert.ok(!E.canStand(G)); throwsRule(() => E.stand(G, mob(G, 'spray').uid), /this fight already/);
  const hp = G.hp.slice(); E.endRound(G); assert.deepEqual(G.hp, hp.map((h, k) => h - after.total[k])); assert.equal(G.stand, null);
  const S = fight(['SOA', 'ENG'], ['spray'], { dice: [[0, 1]] }); assert.ok(!E.canStand(S)); throwsRule(() => E.stand(S, mob(S, 'spray').uid), /Only the Responder/);
  assert.match(CARDS.PERK.RES, /deals no damage this round/);
});
test('Fixer: once a fight, turn one of their dice one up or down; it reads as its new number', () => {
  const G = fight(['PAT', 'ENG'], ['spray'], { dice: [[0, 2], [0, 6], [1, 3]] });
  assert.ok(E.canNudge(G, G.dice[0])); assert.ok(!E.canNudge(G, G.dice[2]), 'only the Fixer’s dice');
  throwsRule(() => E.nudge(G, 0, 2), /one up or one down/); throwsRule(() => E.nudge(G, 1, 1), /from 1 to 6/);
  E.nudge(G, 0, 1); assert.equal(G.dice[0].n, 3); assert.equal(G.dice[0].dbl, true, 'a Fixer 3 is a double');
  throwsRule(() => E.nudge(G, 1, -1), /this fight already/);
  assert.match(CARDS.PERK.PAT, /one up or one down/);
});
test('Soarcerer: the first agent burned each fight stays in the tray', () => {
  const G = fight(['SOA', 'ENG'], ['spray', 'wyrmling'], {}); setTray(G, ['recover', 'recover']); G.hp = [5, 5];
  E.burn(G, 'recover'); assert.equal(G.tray.length, 2); E.burn(G, 'recover'); assert.equal(G.tray.length, 1);
  assert.match(CARDS.PERK.SOA, /stays in the tray/);
});
test('Evasive: a double of its number takes two; a double of another number takes any one die and is spent', () => {
  const G = fight(['HUN', 'RES'], ['druid'], { dice: [[1, 4], [0, 2], [1, 5]] }), m = mob(G, 'druid');
  assert.deepEqual(hitsOn(G, 2, m), [], 'a single never hits it');
  assert.ok(E.targets(G, 0).hits.every(h => h.evade), 'a Responder 4 isn’t a druid number');
  throwsRule(() => E.assign(G, 0, m.uid, 0, 1), /Only a double/);
  E.assign(G, 0, m.uid, 0); assert.ok(G.dice[0].used); assert.equal(G.dice[0].takes.length, 1);
  assert.match(G.log[G.log.length - 1].text, /Evasive: a double of another number takes one die/);
  const k = m.slots.findIndex((v, i) => !m.off[i] && v === 2);
  if (k >= 0) { E.assign(G, 1, m.uid, k); assert.ok(!G.dice[1].used, 'a matching double keeps its second take'); }
  assert.match(CARDS.kwText.hardened, /another number takes out one die/);
});
test('baseline it: four more dice before the first roll, on a fresh flip only; beaten, it tucks under an agent', () => {
  // Flip until the feed's first alarm is up with no situation in the way.
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 3 }); E.flip(G); const m = G.play.find(x => x.uid === G.flipped);
  assert.ok(E.canBaseline(G, m)); const n = m.slots.length, v = CARDS.baseDie(m.id);
  E.baseline(G, m.uid); assert.equal(m.slots.length, n + 4); assert.deepEqual(m.slots.slice(-4), [v, v, v, v]); assert.equal(m.hits, n + 4);
  throwsRule(() => E.baseline(G, m.uid), /already/);
  // Beat it: every die off, end the round, then tuck.
  G.phase = 'assign'; G.round = 1; G.dice = []; G.undo = []; G.play = [m]; m.off = m.off.map(() => true); setTray(G, ['triage', 'contain']);
  E.endRound(G); assert.equal(G.phase, 'tuck'); assert.equal(m.slots.length, n, 'it goes on the row with its printed dice');
  throwsRule(() => E.tuck(G, 'nope'), /agent in the tray/);
  E.tuck(G, 'x1'); assert.ok(E.aug(G, m.id)); assert.ok(['flip', 'loot'].includes(G.phase)); assert.ok(G.row.includes(m));
  // Discarding or burning the host ends it.
  G.phase = 'loot'; G.tray.push({ uid: 'y', t: 'recover' }, { uid: 'z', t: 'recover' }, { uid: 'w', t: 'recover' }, { uid: 'v', t: 'recover' });
  E.discardKit(G, 'x1'); assert.ok(!E.aug(G, m.id));
  // Not on a comeback, not after the first roll, not the boss.
  const H = E.newGame({ team: ['HUN', 'RES'], seed: 3 }); E.flip(H); const c = H.play.find(x => x.uid === H.flipped); c.back = 1; assert.ok(!E.canBaseline(H, c));
  c.back = 0; E.roll(H); throwsRule(() => E.baseline(H, c.uid), /before the first roll/);
  assert.equal(Object.keys(CARDS.BASE).length, 6); assert.ok(CARDS.mobs().every(x => CARDS.mobCard(x).includes('Baseline it')));
});
test('baselined lines: each works while its agent is in the tray', () => {
  const G = fight(['HUN', 'RES'], ['spray', 'wyrmling'], {}); setTray(G, ['recover', 'triage']);
  const with_ = (id, fn) => { G.aug = [{ id, name: id, host: 'x0' }]; const r = fn(); G.aug = []; return r; };
  // Mailer Daemon: the highest-Damage alarm deals 1 less.
  const base = E.incoming(G).total[0]; assert.equal(with_('mailer', () => E.incoming(G).total[0]), base - 1);
  // Grifter: on point rolls one more die.
  const dice = H => { H.phase = 'roll'; H.round = 0; E.roll(H); return H.dice.filter(d => d.k === H.point && d.crew).length; };
  const a = fight(['HUN', 'RES'], ['spray'], {}); setTray(a, ['recover']); const b = fight(['HUN', 'RES'], ['spray'], {}); setTray(b, ['recover']); b.aug = [{ id: 'imp', name: 'imp', host: 'x0' }];
  assert.equal(dice(b), dice(a) + 1);
  // Password Sprayer: one more reroll a round.
  const r = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 3], [0, 5]] }); r.rerolled = [true, false]; setTray(r, ['recover']); r.augReroll = true;
  assert.ok(E.canReroll(r, r.dice[0])); E.reroll(r, 0); assert.equal(r.augReroll, false); assert.ok(!E.canReroll(r, r.dice[1]));
  // Scavenger: comebacks don't hit on arrival. Exfil Courier: +1 to the row roll.
  const q = fight(['HUN', 'RES'], ['spray'], {}); setTray(q, ['recover']); const w = mob(G, 'wyrmling'); q.row = [{ ...w, uid: 'r1', top: 12, off: [], hits: 0 }];
  q.aug = [{ id: 'druid', name: 'druid', host: 'x0' }]; const hp = q.hp.slice(); E.rollRow(q, true, 'test'); assert.deepEqual(q.hp, hp);
  const u = fight(['HUN', 'RES'], ['spray'], {}); setTray(u, ['recover']); u.row = [{ ...w, uid: 'r2', top: 1, off: [], hits: 0 }]; u.aug = [{ id: 'wyrmling', name: 'w', host: 'x0' }];
  E.rollRow(u, false, 'test'); assert.equal(u.lastRow.plus, 1); assert.equal(u.lastRow.roll, u.lastRow.pair[0] + u.lastRow.pair[1] + 1);
  // Rootkit: heal 5 after a won fight.
  const k = fight(['HUN', 'RES'], ['spray'], {}); setTray(k, ['triage']); k.aug = [{ id: 'mimic', name: 'mimic', host: 'x0' }]; k.hp = [5, 5]; k.play = []; k.dice = []; E.endRound(k); assert.equal(k.hp[0] + k.hp[1], 15);
});
// ---- The built page in jsdom -------------------------------------------------------------------------------------
let JSDOM = null; try { ({ JSDOM } = require('../../../node_modules/jsdom')); } catch (e) { /* jsdom not installed */ }
const PAGE = path.join(__dirname, 'index.html');
const load = seed => {
  execFileSync(process.execPath, [path.join(__dirname, 'build.js')]);
  const dom = new JSDOM(fs.readFileSync(PAGE, 'utf8'), { runScripts: 'dangerously', url: 'file:///chapter-dice/index.html?seed=' + seed, pretendToBeVisual: true });
  return dom.window;
};
// Card parity: the card element on the page, minus live-state classes, equals the shared card function's output.
function cardParity(w, slot) {
  const k = slot.dataset.card, want = k === 'boss' ? CARDS.bossCard(CARDS.boss()) : k === 'legend' ? CARDS.legend
    : k.startsWith('mob:') ? CARDS.mobCard(D.mobs.find(m => m.id === k.slice(4))) : k.startsWith('analyst:') ? CARDS.analystCard(k.slice(8))
    : k.startsWith('sit:') ? CARDS.sitCard(k.slice(4)) : k.startsWith('cond:') ? CARDS.condCard(k.slice(5)) : CARDS.agentCard(k.slice(6));
  const got = slot.querySelector('.card').cloneNode(true);
  got.querySelectorAll('[class]').forEach(el => { [...el.classList].filter(c => c.startsWith('x-')).forEach(c => el.classList.remove(c)); if (!el.classList.length) el.removeAttribute('class'); });
  const t = w.document.createElement('div'); t.innerHTML = want;
  assert.equal(got.outerHTML, t.firstElementChild.outerHTML, `card ${k} differs from the shared card markup`);
}

test('page: every card in the gallery matches the shared paper card markup', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(5), d = w.document;
  assert.match(d.body.textContent, /See all 26 cards/);
  d.querySelector('[data-a="cards"]').click();
  const slots = [...d.querySelectorAll('.t-gslot[data-card]')];
  assert.equal(slots.length, 6 + 1 + 1 + 5 + 4 + 6 + 3);
  slots.forEach(s => cardParity(w, s));
});

test('page: a 2-player game clicked through to the end screen, cards in parity throughout', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(21), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  assert.match(d.body.textContent, /Tuned for 2 players/);
  click('[data-a="start"]');
  let n = 0, slotHits = 0, twos = 0, guards = 0, sits = 0, bases = 0, tucks = 0, checked = new Set(), sawRow = false;
  while (!w.CDUI.UI.G.over && n++ < 4000) {
    const G = w.CDUI.UI.G;
    d.querySelectorAll('[data-card]').forEach(s => { const key = s.dataset.card + ':' + G.phase; if (!checked.has(key)) { checked.add(key); cardParity(w, s); } });
    if (d.querySelector('.t-rowroll[data-roll]')) sawRow = true;
    if (G.phase === 'flip') { if (!G.sitDone) click(`[data-a="point"][data-n="${G.fight % 2}"]`); click('[data-a="flip"]'); }
    else if (G.phase === 'sit') { sits++; click('[data-a="sit"]:not(:disabled)'); }
    else if (G.phase === 'roll') { if (d.querySelector('[data-a="baseline"]')) { bases++; click('[data-a="baseline"]'); } click('[data-a="roll"]'); }
    else if (G.phase === 'tuck') { tucks++; click('[data-a="tuck"]'); }
    else if (G.phase === 'loot') click('[data-a="discard"]');
    else {
      const tgt = d.querySelector('.t-td.tgt');
      if (tgt) { slotHits++; tgt.click(); continue; }
      if (d.querySelector('[data-a="guard"]')) { click('[data-a="guard"]'); guards++; continue; }
      twos += G.dice.filter(x => x.takes && x.takes.length === 2).length;
      click('[data-a="end"]');
    }
  }
  const G = w.CDUI.UI.G;
  assert.ok(G.over, 'game should end'); assert.ok(slotHits > 0, 'tapping a die under a card assigns the rolled die');
  assert.ok(twos > 0, 'a double took two');
  assert.doesNotMatch(d.body.innerHTML, /players add/i);
  assert.ok(sawRow, 'a row roll was shown'); assert.ok(sits > 0, 'situations flipped between fights'); assert.ok(bases > 0, 'alarms baselined'); console.log('page play-through: baselined', bases, 'tucked', tucks, 'won', w.CDUI.UI.G.win);
  assert.match(d.querySelector('.t-end h2').textContent, /Shift (survived|lost)/);
  assert.match(w.CDUI.resultLine(), /chapter dice prototype/);
  assert.ok(checked.size > 5);
});

test('page: a double stays selected for its second take; undo takes one back; keyboard picks dice', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]'); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
  const G = w.CDUI.UI.G; assert.equal(G.phase, 'assign');
  // Put a known double in hand, and two dice showing its number under the first mob.
  const m = G.play[0], id = G.team[0], n = CARDS.DOUBLES[id][0];
  m.slots[0] = n; m.slots[1] = n; m.off[0] = false; m.off[1] = false;
  G.dice[0] = { ...G.dice[0], k: 0, crew: true, src: 'own', ...E.pipDie(n, id), used: null, takes: [], turned: false };
  w.CDUI.UI.sel = 0; w.CDUI.render();
  assert.match(d.querySelector('[data-k="die0"]').textContent, /Double ×2/);
  d.querySelector(`.t-slot[data-uid="${m.uid}"] .t-td.tgt`).click();
  assert.equal(w.CDUI.UI.sel, 0, 'the double stays selected'); assert.equal(G.dice[0].used, null); assert.equal(G.dice[0].takes.length, 1);
  assert.ok(d.querySelector('[data-k="die0"]').classList.contains('half')); assert.match(d.querySelector('.status').textContent, /one more/);
  assert.ok(!d.querySelector('[data-a="guard"]'), 'half spent: no guard');
  click('[data-a="undo"]'); assert.equal(G.dice[0].takes.length, 0);
  w.CDUI.UI.sel = 0; w.CDUI.render(); d.querySelector(`.t-slot[data-uid="${m.uid}"] .t-td.tgt`).click();
  d.querySelector(`.t-slot[data-uid="${m.uid}"] .t-td.tgt`).click(); assert.equal(G.dice[0].takes.length, 2); assert.ok(G.dice[0].used);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '2', bubbles: true })); assert.equal(w.CDUI.UI.sel, 1);
});

test('page: agents sit on the mat; a Triage Agent’s die lands under its own card, not in the dice tray', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]');
  const G = w.CDUI.UI.G; G.tray = [{ uid: 'k1', t: 'triage' }, { uid: 'k2', t: 'recover' }, { uid: 'k3', t: 'triage' }]; w.CDUI.render();
  assert.ok(d.querySelector('.table .t-agents [data-kuid="k1"]'), 'agents are on the play mat'); assert.ok(!d.querySelector('.t-side .t-kslot'), 'not in the side panel');
  assert.equal(d.querySelectorAll('.t-agents .t-dph').length, 2, 'a spot under each Triage card before the roll');
  click('[data-a="flip"]'); if (G.phase === 'roll') click('[data-a="roll"]'); assert.equal(G.phase, 'assign');
  const ag = G.dice.filter(x => !x.crew); assert.equal(ag.map(x => x.kuid).join(), 'k1,k3');
  for (const x of ag) assert.ok(d.querySelector(`[data-kuid="${x.kuid}"] .t-adice [data-k="die${x.i}"]`), 'under its card');
  assert.equal(d.querySelectorAll('.dock .t-die').length, G.dice.length - ag.length, 'the tray holds only crew dice');
  assert.equal(d.querySelectorAll('[data-kuid="k2"] .t-die').length, 0, 'only Triage rolls');
  // Picking the agent die under its card works like any die.
  d.querySelector(`[data-k="die${ag[0].i}"]`).click(); assert.equal(w.CDUI.UI.sel, ag[0].i);
});

test('page: hovering a small card on the mat shows it full size, with the shared card markup', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document; d.querySelector('[data-a="start"]').click();
  const slot = d.querySelector('.t-cslot[data-card^="analyst:"]'), id = slot.dataset.card.slice(8);
  slot.querySelector('.card .nm').dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
  const pk = d.querySelector('.t-peek'); assert.ok(pk.classList.contains('on'), 'peek shows');
  const t = d.createElement('div'); t.innerHTML = CARDS.analystCard(id); assert.equal(pk.querySelector('.card').outerHTML, t.firstElementChild.outerHTML);
  d.querySelector('.top').dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true })); assert.ok(!pk.classList.contains('on'), 'peek hides off the card');
});

test('page: a situation flips on the mat, its choice resolves, its condition shows by the HP; Focused and Engineer controls', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); }, key = k => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  w.CDUI.UI.setup.team = ['ENG', 'HUN']; click('[data-a="start"]');
  const G = w.CDUI.UI.G; click('[data-a="flip"]');
  G.play = []; G.phase = 'flip'; G.sits = ['usb']; const r = G.r, seq = [2, 2, 5].map(v => (v - .5) / 6); G.r = () => seq.length ? seq.shift() : r(); w.CDUI.render();
  assert.match(d.querySelector('.dock [data-a="flip"]').textContent, /Flip a situation/);
  click('[data-a="flip"]'); assert.equal(G.phase, 'sit');
  const slot = d.querySelector('.table .t-sslot[data-card="sit:usb"]'); assert.ok(slot, 'the situation card is on the mat'); cardParity(w, slot);
  assert.deepEqual([...d.querySelectorAll('[data-a="sit"]')].map(b => b.dataset.o), ['grab', 'leave']);
  assert.match(d.querySelector('[data-a="sit"]').textContent, /Grab it/);
  key('1'); assert.equal(G.phase, 'flip'); assert.ok(G.sitDone);
  assert.equal(d.querySelectorAll('.sit-dice .t-die').length, 3); assert.ok(d.querySelector('.sit-dice.won')); assert.match(d.querySelector('.sit-res').textContent, /takes Focused/);
  const cond = d.querySelector('[data-hp="0"] [data-card="cond:focused"]'); assert.ok(cond, 'Focused sits by the on-point HP'); cardParity(w, cond);
  click('[data-k="sitflip"]'); assert.equal(G.fight, 2); if (G.phase === 'roll') click('[data-a="roll"]'); assert.equal(G.phase, 'assign');
  // The Engineer's die: an Opposite side button and the Focused picker.
  const i = G.dice.findIndex(x => x.k === 0 && x.crew); G.dice[i] = { ...G.dice[i], n: 2, dbl: true, used: null, takes: [], turned: false }; w.CDUI.UI.sel = i; w.CDUI.render();
  assert.match(d.querySelector('[data-a="eng"]').textContent, /Opposite side \(→ 5\)/); assert.equal(d.querySelectorAll('[data-a="focus"]').length, 5);
  assert.match(d.querySelector('.dock .status').textContent, /Focused: turn it to any number/);
  click('[data-k="focus6"]'); assert.equal(G.dice[i].n, 6); assert.equal(G.cond[0].focused, false); assert.ok(!d.querySelector('[data-card="cond:focused"]'));
  key('o'); assert.equal(G.dice[i].n, 1); assert.ok(G.dice[i].flipped); assert.ok(!d.querySelector('[data-a="eng"]'));
  assert.match(d.querySelector(`[data-k="die${i}"]`).textContent, /OPP/);
  // The Badge That Wasn’t before the boss: Fall back is disabled with the reason.
  G.play = []; G.phase = 'flip'; G.feed = []; G.sits = ['insider']; G.sitDone = false; w.CDUI.render(); click('[data-a="flip"]');
  const run = d.querySelector('[data-a="sit"][data-o="run"]'); assert.ok(run.disabled); assert.match(d.querySelector('.sit-o .why').textContent, /boss is next/);
  assert.ok(d.querySelector('.t-sit .t-slot.faceup[data-card="boss"]'), 'the boss face up beside it');
});
