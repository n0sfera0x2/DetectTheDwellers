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
    ? { i, k: G.point, crew: false, src: 'agent', ...E.pipDie(x[1], 'AGENT'), used: null, turned: false }
    : { i, k: x[0], crew: true, src: 'own', ...E.pipDie(x[1], G.team[x[0]]), used: null, turned: false });
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
const PRINTED = { mailer: [[1, 2, 3], 5], spray: [[2, 4, 5], 3], imp: [[1, 2, 4], 5], druid: [[1, 3, 5, 5], 3], wyrmling: [[1, 3, 3, 4], 2], mimic: [[1, 2, 3, 5, 5], 4], wyrm: [[1, 1, 2, 2, 3, 3, 4, 4, 6, 6], 3] };

test('mob dice come from the sim’s numbersFor; HP 30', () => {
  for (const m of CARDS.mobs()) {
    const d = CARDS.diceFor(m); assert.deepEqual([d.base, d.extra], PRINTED[m.id], m.id);
    assert.deepEqual(d.base, SIM.numbersFor(m.id, m.hits).slice().sort((a, b) => a - b)); assert.equal(d.extra, SIM.numbersFor(m.id + '+', 1)[0]);
  }
  const b = CARDS.boss(), bd = CARDS.diceFor(b, true);
  assert.equal(bd.base.length, b.hitsBase + D.bossAdd[2]); assert.deepEqual([bd.base, bd.extra], PRINTED.wyrm);
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 3 });
  assert.equal(G.hp[0], 30); assert.equal(E.HP, 30); assert.equal(G.tray.length, D.quickStartAgent);
  assert.equal(E.newGame({ team: ['ENG'], seed: 3 }).tray.length, D.quickStartSolo);
  assert.equal(E.newGame({ team: ['SOA', 'HUN'], seed: 3 }).cap, D.sharedKit + 1);
});

test('scaling: +1 die per player past two, the card’s + number; solo plays the two-player dice', () => {
  const spray = n => E.newGame({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).feed.find(m => m.id === 'spray').slots;
  assert.deepEqual(spray(1), [2, 4, 5]); assert.deepEqual(spray(2), [2, 4, 5]); assert.deepEqual(spray(3), [2, 4, 5, 3]); assert.deepEqual(spray(4), [2, 4, 5, 3, 3]);
  const boss = n => E.newGame({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).boss;
  assert.equal(boss(1).hits, 10); assert.equal(boss(2).hits, 10); assert.equal(boss(4).hits, 12); assert.deepEqual(boss(4).slots.slice(10), [3, 3]);
  // The sim sets the same dice (in its own order) for every crew size.
  const sorted = a => a.slice().sort((x, y) => x - y);
  for (const n of [1, 2, 3, 4]) for (const m of CARDS.mobs()) assert.deepEqual(sorted(SIM.slotsFor({ id: m.id, base: m.hits }, n)), sorted(CARDS.slotsFor(m, false, n)), `${m.id} ${n}p`);
});

test('doubles by analyst; every other die doubles only on a 6', () => {
  const want = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6] };
  for (const [id, ns] of Object.entries(want)) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, id).dbl, ns.includes(n), `${id} ${n}`);
  for (const who of ['CREW', 'AGENT']) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, who).dbl, n === 6, `${who} ${n}`);
  assert.deepEqual(CARDS.DOUBLES, SIM.DOUBLES);
});

test('exact numbers: a die takes one die showing exactly its number, never one off', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[1, 5], [1, 3], [1, 4]] }); // spray: 2 4 5; SOA doubles 1, 6
  const s = mob(G, 'spray');
  assert.deepEqual(hitsOn(G, 0, s), [5]); assert.deepEqual(hitsOn(G, 1, s), []);
  throwsRule(() => E.assign(G, 1, s.uid, slotOf(s, 2)), /No 3 left/);
  throwsRule(() => E.assign(G, 0, s.uid, slotOf(s, 4)), /can’t take the 4/);
  E.assign(G, 0, s.uid, slotOf(s, 5)); assert.deepEqual(E.remaining(s), [2, 4]);
  throwsRule(() => E.assign(G, 0, s.uid, slotOf(s, 4)), /already used/);
  throwsRule(() => E.assign(G, 1, s.uid, slotOf(s, 2)), /No 3/); // a 3 still can't take a 2
  E.assign(G, 2, s.uid); assert.deepEqual(E.remaining(s), [2]);
});

test('a double takes its match and any one more from the same mob, or guards, never both', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[0, 4], [0, 2], [1, 3]] }); // ENG 4 and 2 are doubles
  const s = mob(G, 'spray'), imp = mob(G, 'imp');
  throwsRule(() => E.assign(G, 0, s.uid, slotOf(s, 4), imp.slots.length), /same mob/); // no such slot on spray
  E.assign(G, 0, s.uid, slotOf(s, 4), slotOf(s, 5)); assert.deepEqual(E.remaining(s), [2]); // the 4, then the 5: any one more
  E.guard(G, 1); assert.equal(G.blocks[0], true);
  throwsRule(() => E.assign(G, 1, s.uid, slotOf(s, 2)), /already used/);
  throwsRule(() => E.guard(G, 2), /double/);
  throwsRule(() => E.assign(G, 2, imp.uid, slotOf(imp, 1), slotOf(imp, 2)), /No 3/);
  // Undo the guard: the die is free again and the block is gone; undo the double: both dice go back.
  E.unassign(G); assert.equal(G.blocks[0], false); assert.equal(G.dice[1].used, null);
  E.unassign(G); assert.equal(E.left(s), 3);
  // A double can also take just its match; a single can't take one more.
  E.assign(G, 1, s.uid, slotOf(s, 2)); assert.deepEqual(E.remaining(s), [4, 5]);
  setDice(G, [[1, 5]]); throwsRule(() => E.assign(G, 0, s.uid, slotOf(s, 5), slotOf(s, 4)), /Only a double/);
  assert.deepEqual(E.moreSlots(s, slotOf(s, 5)), [slotOf(s, 4)]);
});

test('Hunter: one higher or lower also matches against a comeback, not a fresh mob', () => {
  const G = fight(['HUN', 'ENG'], ['spray'], { dice: [[0, 3]] }); // spray 2 4 5
  const s = mob(G, 'spray');
  assert.deepEqual(hitsOn(G, 0, s), []);
  s.back = 1;
  assert.deepEqual(hitsOn(G, 0, s).sort(), [2, 4]); assert.ok(E.targets(G, 0).hits.every(h => h.near));
  E.assign(G, 0, s.uid, slotOf(s, 4)); assert.deepEqual(E.remaining(s), [2, 5]);
  // The Engineer's dice get no ±1.
  setDice(G, [[1, 3]]); assert.deepEqual(hitsOn(G, 0, s), []);
});

test('Responder: one higher or lower also matches against the highest-Damage mob only, boss included', () => {
  const G = fight(['RES', 'SOA'], ['imp', 'mimic'], { dice: [[0, 2], [1, 4]] }); // imp D3: 1 2 4. mimic D4: 1 2 3 5 5
  assert.deepEqual(hitsOn(G, 0, mob(G, 'mimic')).sort(), [1, 2, 3]);
  assert.deepEqual(hitsOn(G, 0, mob(G, 'imp')), [2]); // exact only on imp
  assert.deepEqual(hitsOn(G, 1, mob(G, 'mimic')), []); // the Soarcerer's 4 gets no ±1
  const B = fight(['RES', 'ENG'], ['boss'], { dice: [[0, 5]] }); // boss: no 5
  assert.deepEqual([...new Set(hitsOn(B, 0, B.boss))].sort(), [4, 6]);
  E.assign(B, 0, 'boss'); assert.equal(offCount(B.boss), 1);
});

test('Evasive: only a double can hit it', () => {
  const G = fight(['ENG', 'SOA'], ['druid'], { dice: [[1, 5], [1, 1]] }); // druid: 1 3 5 5; SOA doubles 1, 6
  const dr = mob(G, 'druid');
  throwsRule(() => E.assign(G, 0, dr.uid, slotOf(dr, 5)), /Evasive/);
  E.assign(G, 1, dr.uid, slotOf(dr, 1), slotOf(dr, 5)); assert.equal(offCount(dr), 2);
});

test('agent dice: only a 6 doubles; they can’t guard or hit the boss', () => {
  const G = fight(['ENG', 'SOA'], ['boss', 'imp'], { dice: [['agent', 6], ['agent', 4]] });
  assert.equal(G.dice[0].dbl, true); assert.equal(G.dice[1].dbl, false);
  throwsRule(() => E.guard(G, 0), /guard/);
  throwsRule(() => E.assign(G, 0, 'boss', G.boss.slots.indexOf(6)), /boss/);
  E.assign(G, 1, mob(G, 'imp').uid, slotOf(mob(G, 'imp'), 4)); assert.equal(offCount(mob(G, 'imp')), 1);
});

test('Enrichment run turns one crew die to any number, keeping double or single; burn matches anything', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], {});
  setTray(G, ['enrich']); setDice(G, [[0, 4], [1, 3], ['agent', 3]]);
  throwsRule(() => E.enrichTurn(G, 2, 2), /crew die/);
  E.enrichTurn(G, 0, 5); assert.equal(G.dice[0].n, 5); assert.equal(G.dice[0].dbl, true);
  throwsRule(() => E.enrichTurn(G, 1, 2), /No Enrichment/);
  const s = mob(G, 'spray'); assert.deepEqual(hitsOn(G, 1, s), []);
  E.burn(G, 'enrich'); assert.equal(G.wildAll, true);
  assert.deepEqual(hitsOn(G, 1, s), [2, 4, 5]);
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
  assert.deepEqual(G.hp, [30 - 8, 30 - 8]);
  assert.equal(G.lastRow.strikes.length, 2);
  assert.equal(G.lastRow.pair.length, 2); assert.equal(G.lastRow.roll, G.lastRow.pair[0] + G.lastRow.pair[1]);
});

test('the row on 2d6: tiers from the d20 ranges; a mob comes back if the sum is at most its number', () => {
  for (const [N, k] of [[13, 8], [12, 8], [11, 7], [10, 7], [9, 6], [8, 6], [7, 5], [5, 5]]) { assert.equal(CARDS.rowTop(N), k); assert.equal(SIM.rowTop(N), k); }
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 2 });
  const tops = Object.fromEntries(G.feed.map(m => [m.id, m.top]));
  assert.deepEqual(tops, { mailer: 8, spray: 8, druid: 7, imp: 6, mimic: 6, wyrmling: 6 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const imp = take('imp'), spray = take('spray'), druid = take('druid'); // back on 2–6, 2–8, 2–7
  G.row = [imp, spray, druid];
  const seq = [2.5 / 6, 3.5 / 6]; G.r = () => seq.shift(); // the amber pair rolls 3 + 4 = 7
  const back = E.rollRow(G, false, 'test');
  assert.deepEqual(G.lastRow.pair, [3, 4]); assert.equal(G.lastRow.roll, 7);
  assert.deepEqual(back.map(m => m.id).sort(), ['druid', 'spray']); assert.deepEqual(G.row, [imp]);
  // The printed card says the same number.
  assert.match(CARDS.mobCard(D.mobs.find(m => m.id === 'imp')), /back on 2–6/);
});

test('Beacon rolls the row when it arrives; the boss arrives with no arrival hits', () => {
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 4 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const mailer = take('mailer'), imp = take('imp'); imp.top = 12;
  G.feed = [mailer]; G.row = [];
  E.flip(G); assert.equal(G.rows.length, 0); // nothing on the row: no roll
  G.phase = 'flip'; G.feed = [mailer]; G.play = []; G.row = [imp];
  E.flip(G); assert.ok(G.rows.length >= 1); // the flip rolls, and the Beacon rolls again (empty row by then)
  const B = E.newGame({ team: ['ENG', 'SOA'], seed: 4 }); const m = B.feed.find(x => x.id === 'mimic'); m.top = 12;
  B.row = [m]; B.feed = []; E.flip(B);
  assert.ok(B.play.includes(B.boss) && B.play.includes(m)); assert.deepEqual(B.hp, [30, 30]);
});

test('after a fight: beaten mobs go to the row unless they came back once; then gone for good', () => {
  const G = fight(['HUN', 'ENG'], ['spray', 'imp'], { dice: [[0, 2], [1, 4], [1, 5]] }); // HUN 2 is a double
  const s = mob(G, 'spray'), i = mob(G, 'imp'); i.back = 1; i.off = i.off.map(() => true);
  E.assign(G, 0, s.uid, slotOf(s, 2)); E.assign(G, 1, s.uid, slotOf(s, 4)); E.assign(G, 2, s.uid, slotOf(s, 5));
  E.endRound(G);
  assert.ok(G.row.includes(s)); assert.ok(G.gone.includes(i)); assert.equal(G.play.length, 0);
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
  const H = fight(['ENG', 'SOA'], ['mimic', 'wyrmling'], { dice: [[1, 5], [1, 3]] });
  const mi = mob(H, 'mimic'), p = slotOf(mi, 5);
  E.assign(H, 0, mi.uid, p); E.assign(H, 1, mi.uid, slotOf(mi, 3)); H.hp = [99, 99]; E.endRound(H);
  assert.equal(offCount(mi), 1); assert.equal(mi.off[p], true); assert.deepEqual(E.remaining(mi), [1, 2, 3, 5]); // the 3 it lost last is back; the 5 stays taken
  assert.ok(H.log.some(l => /regenerates: its 3 goes back/.test(l.text)));
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
  const strip = html => { const i = html.indexOf('class="dice"'); assert.ok(i > 0, 'dice strip'); return html.slice(i); };
  for (const m of CARDS.mobs()) {
    const h = CARDS.mobCard(m), d = CARDS.diceFor(m);
    assert.deepEqual(pips(strip(h)), [...d.base, d.extra]); assert.match(h, /per player past 2/);
    assert.ok(h.lastIndexOf('class="dice"') > h.indexOf('class="fl"'), 'the strip comes after the flavour: the bottom edge');
  }
  const bh = CARDS.bossCard(CARDS.boss()), bd = CARDS.diceFor(CARDS.boss(), true); assert.deepEqual(pips(strip(bh)), [...bd.base, bd.extra]);
  const all = [...CARDS.mobs().map(CARDS.mobCard), bh, CARDS.legend, ...CARDS.ANALYST_IDS.map(CARDS.analystCard), ...CARDS.AGENT_IDS.map(CARDS.agentCard)].join('');
  assert.doesNotMatch(all, /players add/i); assert.doesNotMatch(all, /Detect|Contain(?!ment)|Eradicate|symbol/);
  for (const id of CARDS.ANALYST_IDS) { const h = CARDS.analystCard(id); assert.match(h, /Your doubles/); assert.deepEqual(pips(h), CARDS.DOUBLES[id]); }
  assert.match(CARDS.legend, /exactly/); assert.match(CARDS.legend, /any one more/); assert.match(CARDS.legend, /only a .* is a double/);
  assert.match(CARDS.legend, /per player past 2/); assert.match(CARDS.legend, /sum is at most its number/);
});

test('burns: Triage adds three on-point dice; Containment takes a die off every mob; Recovery heals 6', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'wyrmling', 'boss'], { point: 1 });
  setTray(G, ['triage', 'contain', 'recover']); setDice(G, []);
  E.burn(G, 'triage'); assert.equal(G.dice.length, 3); assert.ok(G.dice.every(d => d.k === 1 && d.crew && d.dbl === CARDS.DOUBLES.SOA.includes(d.n)));
  G.boss.off = G.boss.off.map((x, i) => i > 0);
  E.burn(G, 'contain'); assert.deepEqual(E.remaining(mob(G, 'spray')), [2, 4]); assert.equal(E.left(G.boss), 1);
  assert.deepEqual(E.remaining(mob(G, 'wyrmling')), [1, 3, 4]); // a repeated number goes first
  G.hp = [14, 19]; E.burn(G, 'recover'); assert.equal(G.hp[0] + G.hp[1], 39); assert.deepEqual(G.hp, [20, 19]); // one at a time onto the lowest
  throwsRule(() => E.burn(G, 'enrich'), /No such agent/);
});

test('won fight: Fixer and Recovery heal; draw two; a full tray means you choose what to discard', () => {
  const G = fight(['PAT', 'ENG'], ['spray'], { dice: [[0, 5], [1, 4]] }); // ENG 4 is a double
  setTray(G, ['recover', 'triage', 'triage', 'contain', 'contain']); G.hp = [10, 10];
  const s = mob(G, 'spray'); E.assign(G, 0, s.uid, slotOf(s, 5)); E.assign(G, 1, s.uid, slotOf(s, 4), slotOf(s, 2)); E.endRound(G);
  assert.equal(G.hp[0] + G.hp[1], 20 + D.perks.PAT.fight + D.recoverHeal + D.perks.PAT.recover);
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
      else { for (const d of G.dice) { const t = E.targets(G, d.i); if (t.hits.length) E.assign(G, d.i, t.hits[0].uid, t.hits[0].p); else if (t.guard) E.guard(G, d.i); } E.endRound(G); }
    } return G; };
  const a = run(11), b = run(11);
  assert.ok(a.over); assert.deepEqual(a.log, b.log);
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
    : k.startsWith('mob:') ? CARDS.mobCard(D.mobs.find(m => m.id === k.slice(4))) : k.startsWith('analyst:') ? CARDS.analystCard(k.slice(8)) : CARDS.agentCard(k.slice(6));
  const got = slot.querySelector('.card').cloneNode(true);
  got.querySelectorAll('[class]').forEach(el => { [...el.classList].filter(c => c.startsWith('x-')).forEach(c => el.classList.remove(c)); if (!el.classList.length) el.removeAttribute('class'); });
  const t = w.document.createElement('div'); t.innerHTML = want;
  assert.equal(got.outerHTML, t.firstElementChild.outerHTML, `card ${k} differs from the shared card markup`);
}

test('page: every card in the gallery matches the shared paper card markup', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(5), d = w.document;
  d.querySelector('[data-a="cards"]').click();
  const slots = [...d.querySelectorAll('.t-gslot[data-card]')];
  assert.equal(slots.length, 6 + 1 + 1 + 5 + 4);
  slots.forEach(s => cardParity(w, s));
});

test('page: a 2-player game clicked through to the end screen, cards in parity throughout', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(21), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  assert.match(d.body.textContent, /Tuned for 2 players/);
  click('[data-a="start"]');
  let n = 0, slotHits = 0, mores = 0, guards = 0, checked = new Set(), sawRow = false;
  while (!w.CDUI.UI.G.over && n++ < 4000) {
    const G = w.CDUI.UI.G;
    d.querySelectorAll('[data-card]').forEach(s => { const key = s.dataset.card + ':' + G.phase; if (!checked.has(key)) { checked.add(key); cardParity(w, s); } });
    if (d.querySelector('.t-rowroll[data-roll]')) sawRow = true;
    if (G.phase === 'flip') { click(`[data-a="point"][data-n="${G.fight % 2}"]`); click('[data-a="flip"]'); }
    else if (G.phase === 'roll') click('[data-a="roll"]');
    else if (G.phase === 'loot') click('[data-a="discard"]');
    else {
      const tgt = d.querySelector('.t-td.tgt');
      if (tgt) { if (tgt.classList.contains('more')) mores++; else slotHits++; tgt.click(); continue; }
      if (d.querySelector('[data-a="guard"]')) { click('[data-a="guard"]'); guards++; continue; }
      if (d.querySelector('[data-a="one"]')) { click('[data-a="one"]'); continue; }
      click('[data-a="end"]');
    }
  }
  const G = w.CDUI.UI.G;
  assert.ok(G.over, 'game should end'); assert.ok(slotHits > 0, 'tapping a die under a card assigns the rolled die');
  assert.ok(mores > 0, 'a double took one more');
  assert.doesNotMatch(d.body.innerHTML, /players add/i);
  assert.ok(sawRow, 'a row roll was shown');
  assert.match(d.querySelector('.t-end h2').textContent, /Shift (survived|lost)/);
  assert.match(w.CDUI.resultLine(), /chapter dice prototype/);
  assert.ok(checked.size > 5);
});

test('page: a double asks for one more (or just the one); undo takes it back; keyboard picks dice', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]'); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
  const G = w.CDUI.UI.G; assert.equal(G.phase, 'assign');
  // Put a known double in hand: the first analyst's top double, matching a die under the first mob.
  const m = G.play[0], id = G.team[0], n = CARDS.DOUBLES[id].find(v => m.slots.includes(v)) || CARDS.DOUBLES[id][0];
  if (!m.slots.includes(n)) m.slots[0] = n;
  G.dice[0] = { ...G.dice[0], k: 0, crew: true, src: 'own', ...E.pipDie(n, id), used: null, turned: false };
  w.CDUI.UI.sel = 0; w.CDUI.render();
  d.querySelector(`.t-slot[data-uid="${m.uid}"] .t-td.tgt`).click();
  assert.ok(w.CDUI.UI.more, 'a double waits for its one more'); assert.ok(d.querySelector('[data-a="one"]'));
  assert.ok(d.querySelector('.t-td.tgt.more')); assert.equal(G.dice[0].used, null);
  click('[data-a="one"]'); assert.equal(G.dice[0].used.slots.length, 1); assert.equal(w.CDUI.UI.more, null);
  click('[data-a="undo"]'); assert.equal(G.dice.filter(x => x.used).length, 0);
  w.CDUI.UI.sel = 0; w.CDUI.render(); d.querySelector(`.t-slot[data-uid="${m.uid}"] .t-td.tgt`).click();
  d.querySelector('.t-td.tgt.more').click(); assert.equal(G.dice[0].used.slots.length, 2);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '2', bubbles: true })); assert.equal(w.CDUI.UI.sel, 1);
});
