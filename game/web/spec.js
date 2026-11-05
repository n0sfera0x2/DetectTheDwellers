// Detect the Dwellers tests (engine, page, card parity): node --test game/web/spec.js
// Engine rules, then (if jsdom is installed) a headless click-through of the built page and a card parity check.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const E = require('./engine');
const CARDS = require('../cards');
const D = require('../../data/cards.json');
const SIM = require('../sim');

// ---- Fixtures: a game with chosen mobs in the fight and chosen dice ------------------------------------------------
// Deal every item waiting in the deal: to the first player with room, else keep it out.
function dealAll(G) {
  while (G.phase === 'deal') { const k = G.team.map((_, j) => j).find(j => !E.dealFull(G, j)); if (k == null) E.give(G, 0, G.deal[0].uid); else E.give(G, k); }
  return G;
}
// The feed mixes alarms and situations (2026-11-02). Most rule tests want alarms only: newG drops the situation cards
// (the feed tests and the scripted game use the real feed).
const alarmsOnly = G => { G.feed = G.feed.filter(c => !c.sit); return G; };
// Rule tests: every alarm in the feed (no situations) and the Lockjaw Syndicate, unless a test says otherwise.
const game = opt => E.newGame({ alarmsOnly: true, boss: 'wyrm', hp: E.HP, ...opt });
const sitCard = id => ({ sit: id, uid: 's-' + id });
// A new game with its starting items dealt (2 players start in the deal phase).
const newG = opt => dealAll(game(opt));
// A game in a fight round: chosen mobs in play, no items held, chosen dice.
function fight(team, ids, { seed = 1, dice = [], point = 0, boss, mode } = {}) {
  const G = game({ team, seed, boss, mode });
  G.kit.unshift(...G.deal, ...G.agents.flat(), ...G.hand.flat()); G.deal = []; G.agents = team.map(() => []); G.hand = team.map(() => []);
  G.point = point; G.fight = 1; G.round = 1; G.phase = 'assign';
  G.play = ids.map(id => { if (id === 'boss') return G.boss; const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; });
  setDice(G, dice);
  return G;
}
// dice: [k, 3] rolls a 3 on analyst k's own die (their doubles apply); ['agent', 6] is an agent die showing 6 (on point's).
function setDice(G, dice) {
  G.dice = dice.map((x, i) => x[0] === 'agent'
    ? { i, k: G.point, crew: false, src: 'agent', ...E.pipDie(x[1], 'AGENT'), used: null, takes: [], turned: false }
    : { i, k: x[0], crew: true, src: 'own', ...E.pipDie(x[1], G.team[x[0]]), used: null, takes: [], turned: false });
  G.blocks = G.team.map(() => false); G.undo = []; G.wildAll = false; G.enrichLeft = E.running(G, 'enrich');
  G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = E.dmgOf(G, m); });
}
// Set the threat dice under a mob (the printed dice are only 1–3 a card now; tests choose their own).
const setSlots = (m, arr) => { m.slots = arr.slice(); m.off = arr.map(() => false); m.offStack = []; m.hits = arr.length; m.printed = arr.length; return m; };
const setAgents = (G, k, types) => { G.agents[k] = types.map((t, i) => ({ uid: `a${k}-${i}`, t })); };
const setHand = (G, k, types) => { G.hand[k] = types.map((t, i) => ({ uid: `h${k}-${i}`, t })); };
const mob = (G, id) => G.play.find(m => m.id === id);
const offCount = m => m.off.filter(Boolean).length;
const throwsRule = (fn, re) => assert.throws(fn, e => e.rule && (!re || re.test(e.message)));
const slotOf = (m, n) => m.slots.findIndex((v, i) => v === n && !m.off[i]);
const hitsOn = (G, di, m) => E.targets(G, di).hits.filter(h => h.uid === m.uid).map(h => m.slots[h.p]);
// The printed dice of the six paper mobs and the boss (sorted low to high), and their + die: two fewer than the d20
// hits since 2026-10-31. Clustered round each mob's main number; the + die is always a 6.
const PRINTED = { mailer: [[2], 6], spray: [[4], 6], imp: [[1], 6], druid: [[3, 3], 6], wyrmling: [[5, 5], 6], mimic: [[5, 6, 6], 6], wyrm: [[2, 2, 3, 3, 3, 3, 3, 4], 6] };
const otherSlot = (m, n, p) => m.slots.findIndex((v, i) => v === n && !m.off[i] && i !== p);

test('mob dice come from the sim’s numbersFor, two fewer than the d20 hits (the boss too); mode HP; the crew draws 2 items, solo by mode', () => {
  for (const m of CARDS.mobs()) {
    const d = CARDS.diceFor(m); if (PRINTED[m.id]) assert.deepEqual([d.base, d.extra], PRINTED[m.id], m.id);
    assert.deepEqual(d.base, SIM.numbersFor(m.id, m.hits - 2).slice().sort((a, b) => a - b));
  }
  const b = CARDS.boss(), bd = CARDS.diceFor(b, true);
  assert.equal(bd.base.length, b.hitsBase + D.bossAdd[2] - 2); assert.deepEqual([bd.base, bd.extra], PRINTED.wyrm);
  // Clustered: the main number repeats, e.g. 1 2 2 2 3 for five dice.
  assert.deepEqual(SIM.numbersFor('mailer', 5).sort(), [1, 2, 2, 2, 3]); assert.deepEqual(SIM.numbersFor('imp', 5).sort(), [1, 1, 1, 2, 2]);
  assert.equal(CARDS.mobs().length, 15); assert.deepEqual(CARDS.BOSS_IDS, ['wyrm', 'apt', 'ai']);
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 3 });
  assert.equal(G.hp[0], E.MODES.quick.hp); assert.equal(E.newGame({ team: ['HUN', 'RES'], seed: 3, mode: 'full' }).hp[0], E.MODES.full.hp);
  assert.equal(G.phase, 'deal'); assert.equal(G.deal.length, 2); assert.equal(G.kit.length, CARDS.ITEM_DECK.length - 2);
  // Solo starts with 2 items in both modes, one of them an agent (since 2026-11-05; 1 on 2026-11-04), and deals itself.
  const S = E.newGame({ team: ['ENG'], seed: 3, mode: 'full' }); assert.equal(S.phase, 'flip'); assert.equal(S.agents[0].length + S.hand[0].length, 2);
  for (let seed = 1; seed <= 40; seed++) for (const mode of ['quick', 'full']) assert.ok(E.newGame({ team: ['HUN'], seed, mode }).agents[0].length >= 1, `solo starts with an agent (seed ${seed}, ${mode})`);
  assert.equal(S.kit.length, CARDS.ITEM_DECK.length - 2); assert.equal(E.startItems(1, 'quick'), 2); assert.deepEqual(E.START_ITEMS, { solo: 2, crew: 2 });
  assert.equal(E.startItems(1), 2); assert.equal(E.startItems(1, 'quick'), 2, 'Quick Shift solo starts with 2'); assert.equal(E.startItems(3, 'quick'), 3, 'a crew of 3–4 draws 3'); assert.equal(E.startItems(4), 3);
  const Q = E.newGame({ team: ['ENG'], seed: 3 }); assert.equal(Q.agents[0].length + Q.hand[0].length, 2); for (const n of [2, 3, 4]) assert.equal(E.startItems(n), n >= 3 ? 3 : 2);
  for (const team of [['HUN', 'RES', 'ENG'], ['HUN', 'RES', 'ENG', 'SOA']]) assert.equal(E.newGame({ team, seed: 3 }).deal.length, 3, team.length + 'p draws 3');
  assert.deepEqual([E.MODES.quick.hp, E.MODES.full.hp], [10, 13]);
  assert.equal(CARDS.ITEM_DECK.length, 18);
});
test('scaling: a 6 per player past two (review 2); solo and 2 players play the printed dice', () => {
  const spray = n => game({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).feed.find(m => m.id === 'spray').slots;
  assert.deepEqual(spray(1), [4]); assert.deepEqual(spray(2), [4]); assert.deepEqual(spray(3), [4, 6]); assert.deepEqual(spray(4), [4, 6, 6]);
  const boss = n => game({ team: ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), seed: 3 }).boss;
  assert.equal(boss(1).hits, 8); assert.equal(boss(3).hits, 9); assert.equal(boss(4).hits, 10); assert.deepEqual(boss(4).slots.slice(8), [6, 6]);
  assert.equal(SIM.XFROM, CARDS.PAST);
  // The sim sets the same dice (in its own order) for every crew size.
  const sorted = a => a.slice().sort((x, y) => x - y);
  for (const n of [1, 2, 3, 4]) for (const m of CARDS.mobs()) assert.deepEqual(sorted(SIM.slotsFor({ id: m.id, base: m.hits - 2 }, n)), sorted(CARDS.slotsFor(m, false, n)), `${m.id} ${n}p`);
});
test('signature doubles: one number of your own plus the 6; every other die doubles only on a 6', () => {
  const want = { HUN: [4, 6], RES: [3, 6], ENG: [1, 6], SOA: [2, 6] };
  for (const [id, ns] of Object.entries(want)) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, id).dbl, ns.includes(n), `${id} ${n}`);
  for (const who of ['CREW', 'AGENT']) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, who).dbl, n === 6, `${who} ${n}`);
  for (const id of Object.keys(CARDS.DOUBLES)) assert.deepEqual(CARDS.DOUBLES[id], SIM.DOUBLES[id], id);
});
test('four analysts: Hunter, Responder, Engineer, Soarcerer (Forensics, the Shift Lead and the Fixer are gone)', () => {
  assert.deepEqual(CARDS.ANALYST_IDS, ['HUN', 'RES', 'ENG', 'SOA']); assert.equal(CARDS.DOUBLES.FOR, undefined); assert.equal(CARDS.DOUBLES.LEAD, undefined);
  for (const f of ['nudge', 'canNudge', 'peek', 'canPeek', 'hand', 'canHand', 'stand', 'canStand', 'moveTuck', 'canMove']) assert.equal(E[f], undefined, f);
  const G = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 2]] }); assert.equal('nudge' in E.targets(G, 0), false);
});
test('exact numbers: a die takes one die showing exactly its number, never one off', () => {
  const G = fight(['ENG', 'SOA'], ['wyrmling'], { dice: [[1, 5], [1, 3], [1, 4]] }); // SOA doubles 2, 6
  const w = setSlots(mob(G, 'wyrmling'), [4, 5, 5]);
  assert.deepEqual(hitsOn(G, 0, w), [5, 5]); assert.deepEqual(hitsOn(G, 1, w), []);
  throwsRule(() => E.assign(G, 1, w.uid, slotOf(w, 4)), /No 3 left/);
  throwsRule(() => E.assign(G, 0, w.uid, slotOf(w, 4)), /can’t take the 4/);
  E.assign(G, 0, w.uid, slotOf(w, 5)); assert.deepEqual(E.remaining(w), [4, 5]);
  throwsRule(() => E.assign(G, 0, w.uid, slotOf(w, 5)), /already used/); // a single takes one
  E.assign(G, 2, w.uid); assert.deepEqual(E.remaining(w), [5]);
});
test('a double counts as two dice showing its number, on one mob or two, or guards, never both', () => {
  const G = fight(['HUN', 'SOA'], ['spray', 'druid'], { dice: [[0, 4], [1, 2], [1, 3]] }); // HUN 4 and SOA 2 are doubles
  const s = setSlots(mob(G, 'spray'), [4, 4]), dr = setSlots(mob(G, 'druid'), [2, 3, 3]); // druid is Evasive
  E.assign(G, 0, s.uid, slotOf(s, 4), otherSlot(s, 4, slotOf(s, 4))); assert.equal(E.left(s), 0); // both 4s in one go
  assert.ok(G.dice[0].used); assert.equal(E.takesLeft(G.dice[0]), 0);
  // The double 2 takes the druid's 2; it has a take left, but no other 2 to take and it can't take a 3.
  E.assign(G, 1, dr.uid, slotOf(dr, 2)); assert.equal(G.dice[1].used, null); assert.equal(E.takesLeft(G.dice[1]), 1);
  assert.deepEqual(hitsOn(G, 1, dr), []); throwsRule(() => E.assign(G, 1, dr.uid, slotOf(dr, 3)), /No 2 left/);
  throwsRule(() => E.guard(G, 1), /already used/); // half spent: it can't guard now
  E.unassign(G); assert.equal(E.takesLeft(G.dice[1]), 2); E.guard(G, 1); assert.equal(G.blocks[1], true);
  throwsRule(() => E.assign(G, 1, dr.uid, slotOf(dr, 2)), /already used/);
  throwsRule(() => E.guard(G, 2), /double/);
  // A single can't take two.
  setDice(G, [[1, 3]]); G.play = [dr]; throwsRule(() => E.assign(G, 0, dr.uid, slotOf(dr, 3), otherSlot(dr, 3, slotOf(dr, 3))), /Evasive|Only a double/);
  // Across two mobs: the Hunter's double 4 takes the mailer's 4 and the druid's 4.
  const H = fight(['HUN', 'ENG'], ['mailer', 'druid'], { dice: [[0, 4]] }), ma = setSlots(mob(H, 'mailer'), [4, 4]), hd = setSlots(mob(H, 'druid'), [3, 3, 4]);
  assert.deepEqual(E.moreSlots(H, H.dice[0], ma, slotOf(ma, 4)), [otherSlot(ma, 4, slotOf(ma, 4))]);
  E.assign(H, 0, ma.uid, slotOf(ma, 4)); E.assign(H, 0, hd.uid, slotOf(hd, 4));
  assert.deepEqual(E.remaining(ma), [4]); assert.deepEqual(E.remaining(hd), [3, 3]); assert.ok(H.dice[0].used);
  throwsRule(() => E.assign(H, 0, ma.uid, slotOf(ma, 4)), /already used/);
  E.unassign(H); assert.equal(E.takesLeft(H.dice[0]), 1); assert.deepEqual(E.remaining(hd), [3, 3, 4]);
  const S = fight(['ENG', 'SOA'], ['spray'], { dice: [[1, 4]] }), ss = setSlots(mob(S, 'spray'), [4, 4]);
  throwsRule(() => E.assign(S, 0, ss.uid, slotOf(ss, 4), otherSlot(ss, 4, slotOf(ss, 4))), /Only a double/);
});
test('no one-higher-or-lower matches: the Hunter against a comeback, the Responder against the top hitter', () => {
  const G = fight(['HUN', 'RES'], ['spray', 'mimic'], { dice: [[0, 3], [1, 5]] });
  const s = setSlots(mob(G, 'spray'), [4, 4]); s.back = 1; setSlots(mob(G, 'mimic'), [5, 5, 6, 6]);
  assert.deepEqual(hitsOn(G, 0, s), []); // a 3 can't take a 4, comeback or not
  assert.deepEqual(hitsOn(G, 1, mob(G, 'mimic')), [5, 5]); // exact only, even on the highest-Damage mob
  assert.ok(E.targets(G, 1).hits.every(h => !h.near));
  assert.doesNotMatch(CARDS.analystCard('HUN') + CARDS.analystCard('RES'), /one higher|gone for good/);
});
test('reroll: once a round each player rerolls one of their own unused dice; it can’t be undone', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 3], [0, 6], [1, 2], ['agent', 5]] }); // ENG 6 is a double
  G.rerolled = [false, false]; const s = setSlots(mob(G, 'spray'), [6, 6]);
  throwsRule(() => E.reroll(G, 3), /Agent dice/);
  E.assign(G, 1, s.uid, slotOf(s, 6)); throwsRule(() => E.reroll(G, 1), /already used/); // half-used double
  assert.ok(E.canReroll(G, G.dice[0])); E.reroll(G, 0);
  assert.ok(G.dice[0].n >= 1 && G.dice[0].n <= 6); assert.equal(G.dice[0].dbl, CARDS.DOUBLES.ENG.includes(G.dice[0].n));
  assert.equal(G.undo.length, 0, 'a reroll clears undo'); throwsRule(() => E.reroll(G, 0), /already rerolled/);
  assert.ok(E.canReroll(G, G.dice[2])); E.reroll(G, 2); assert.equal(G.rerolled.join(), 'true,true');
  // A new round resets it; the engine rolls fresh.
  const H = newG({ team: ['HUN', 'RES'], seed: 9 }); E.flip(H); if (H.phase === 'roll') E.roll(H);
  assert.equal(H.rerolled.join(), 'false,false'); assert.match(CARDS.legend, /reroll one of your own dice/);
});
test('agent dice: only a 6 doubles; they can’t guard or hit the boss', () => {
  const G = fight(['ENG', 'SOA'], ['boss', 'imp'], { dice: [['agent', 6], ['agent', 1]] });
  assert.equal(G.dice[0].dbl, true); assert.equal(G.dice[1].dbl, false);
  throwsRule(() => E.guard(G, 0), /guard/);
  throwsRule(() => E.assign(G, 0, 'boss'), /boss/);
  E.assign(G, 1, mob(G, 'imp').uid, slotOf(mob(G, 'imp'), 1)); assert.equal(offCount(mob(G, 'imp')), 1);
});

test('the row: comebacks return with all their dice and join the fight; nobody is hit on arrival (since 2026-11-03)', () => {
  const G = newG({ team: ['ENG', 'SOA'], seed: 2 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const row = ['imp', 'druid', 'wyrmling', 'mimic'].map(take);
  row.forEach(m => { m.top = 12; m.off[0] = true; });
  G.row = row; G.feed.unshift(take('spray'));
  E.flip(G);
  assert.equal(G.play.length, 5); assert.equal(G.row.length, 0);
  assert.ok(row.every(m => m.back === 1 && E.left(m) === m.hits));
  assert.deepEqual(G.hp, [E.HP, E.HP].map((h, k) => G.max), 'no arrival hits'); assert.equal(G.lastRow.strikes.length, 0);
  assert.equal(G.lastRow.pair.length, 2); assert.equal(G.lastRow.roll, G.lastRow.pair[0] + G.lastRow.pair[1]);
});
test('the row on 2d6: one step wider since 2026-11-03 (2–3 to 2–6); a mob comes back if the sum is at most its number', () => {
  for (const [N, k] of [[13, 6], [12, 6], [11, 5], [10, 5], [9, 4], [8, 4], [7, 3], [5, 3]]) { assert.equal(CARDS.rowTop(N), k); assert.equal(SIM.rowTop(N), k); }
  const G = newG({ team: ['ENG', 'SOA'], seed: 2 });
  const tops = Object.fromEntries(G.feed.map(m => [m.id, m.top]));
  for (const [id, t] of Object.entries({ mailer: 6, spray: 6, druid: 5, imp: 4, mimic: 4, wyrmling: 4 })) if (tops[id]) assert.equal(tops[id], t, id);
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const imp = take('imp'), spray = take('spray'), druid = take('druid'); // back on 2–4, 2–6, 2–5
  G.row = [imp, spray, druid];
  const seq = [2.5 / 6, 1.5 / 6]; G.r = () => seq.shift(); // the amber pair rolls 3 + 2 = 5
  const back = E.rollRow(G, false, 'test');
  assert.deepEqual(G.lastRow.pair, [3, 2]); assert.equal(G.lastRow.roll, 5);
  assert.deepEqual(back.map(m => m.id).sort(), ['druid', 'spray']); assert.deepEqual(G.row, [imp]);
  assert.match(CARDS.mobCard(D.mobs.find(m => m.id === 'imp')), /back on 2–4/);
});
test('Beacon rolls the row when it arrives; the boss arrives with no arrival hits', () => {
  const G = newG({ team: ['ENG', 'SOA'], seed: 4 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const mailer = take('mailer'), imp = take('imp'); imp.top = 12;
  G.feed = [mailer]; G.row = []; G.sits = []; // no situation between these two flips
  E.flip(G); assert.equal(G.rows.length, 0); // nothing on the row: no roll
  G.phase = 'flip'; G.feed = [mailer]; G.play = []; G.row = [imp];
  E.flip(G); assert.ok(G.rows.length >= 1); // the flip rolls, and the Beacon rolls again (empty row by then)
  const B = newG({ team: ['ENG', 'SOA'], seed: 4 }); const m = B.feed.find(x => x.id === 'mimic'); m.top = 12;
  B.row = [m]; B.feed = []; E.flip(B);
  assert.ok(B.play.includes(B.boss) && B.play.includes(m)); assert.deepEqual(B.hp, [E.HP, E.HP]);
});
test('after a fight: every beaten alarm goes back to the row, comebacks too, with the Hunter in the crew as well', () => {
  const G = fight(['ENG', 'RES'], ['spray', 'imp'], { dice: [[0, 6]] }); // ENG 6 is a double
  const s = setSlots(mob(G, 'spray'), [6, 6]), i = mob(G, 'imp'); i.back = 2; i.off = i.off.map(() => true);
  E.assign(G, 0, s.uid, slotOf(s, 6)); E.assign(G, 0, s.uid, slotOf(s, 6));
  E.endRound(G);
  assert.ok(G.row.includes(s)); assert.ok(G.row.includes(i)); assert.equal(G.gone.length, 0); assert.equal(G.play.length, 0);
  assert.equal(G.phase, 'deal'); assert.equal(G.deal.length, D.kitPerFight);
  // Since 2026-11-03 the Hunter no longer ends a comeback: it goes back on the row like any other.
  const H = fight(['HUN', 'ENG'], ['imp'], {}); const hi = mob(H, 'imp'); hi.back = 1; hi.off = hi.off.map(() => true); H.dice = []; E.endRound(H);
  assert.ok(H.row.includes(hi)); assert.equal(H.gone.length, 0); assert.equal(CARDS.PERK.HUN, 'On point, you roll one more die in a fight’s first round. It’s never a double.');
});
test('end of round: mobs hit back; Piercing ignores blocks; Targeted hits only on point, doubled', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[0, 6], [1, 6]], point: 1 }); // spray 1 pierces; imp 3 on point, doubled
  E.guard(G, 0); E.guard(G, 1);
  assert.deepEqual(E.incoming(G).total, [1, 1]); // spray pierces (1 each); imp is blocked by on point
  G.blocks = [false, false];
  assert.deepEqual(E.incoming(G).total, [1, 1 + 6]);
});
test('reroll: once a round a player may take 1 to reroll one of their own dice; never at 1 HP', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 3], [0, 4], [1, 2]] }); G.rerolled = [false, false]; G.hp = [5, 1];
  assert.ok(E.canReroll(G, G.dice[0])); E.reroll(G, 0); assert.equal(G.hp[0], 4, 'a reroll costs 1'); assert.ok(!E.canReroll(G, G.dice[1]), 'once a round');
  throwsRule(() => E.reroll(G, 1), /already rerolled/); assert.ok(!E.canReroll(G, G.dice[2]), 'not at 1 HP'); throwsRule(() => E.reroll(G, 2), /at 1 HP/);
  assert.equal(E.push, undefined); assert.match(CARDS.legend, /take 1 to reroll one of your own dice/);
});
test('threat: once 3 fights are won, alarms (not the boss) deal 1 more; bosses hit for 5', () => {
  const G = fight(['HUN', 'RES'], ['spray'], {}), m = mob(G, 'spray'), base = E.dmgOf(G, m);
  G.won = CARDS.THREAT_AFTER - 1; assert.equal(E.dmgOf(G, m), base); assert.equal(E.threat(G), 0);
  G.won = CARDS.THREAT_AFTER; assert.equal(E.dmgOf(G, m), base + 1); G.won = 9; assert.equal(E.threat(G), CARDS.THREAT_MAX); assert.equal(CARDS.THREAT_MAX, 1); assert.equal(E.dmgOf(G, Object.assign({}, G.boss, { kw: 'ai' })), CARDS.BOSS_DMG);
  assert.ok(CARDS.BOSS_IDS.every(id => CARDS.boss(id).dmg === CARDS.BOSS_DMG)); assert.match(CARDS.tracker, /Fights won.*1: story.*3: story, alarms \+1.*5: story/);
  // Winning a fight counts toward it.
  const H = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 1], [0, 1]] }), s2 = setSlots(mob(H, 'spray'), [1]); E.assign(H, 0, s2.uid, slotOf(s2, 1)); E.endRound(H);
  assert.equal(H.won, 1);
});
test('Watchlist Agent: row alarms come back on one less; Takedown Request: a picked row alarm leaves the game (2026-11-04)', () => {
  assert.equal(CARDS.ITEM_DECK.filter(t => t === 'watchlist').length, 1); assert.equal(CARDS.ITEM_DECK.filter(t => t === 'takedown').length, 1); assert.ok(CARDS.isAgent('watchlist')); assert.ok(!CARDS.isAgent('takedown'));
  const row = (agents, sum) => { const G = fight(['HUN', 'RES'], ['spray'], {}); setAgents(G, 0, agents); const m = mob(G, 'spray'); G.play = []; G.row = [m]; const a = (Math.ceil(sum / 2) - .5) / 6, b = (Math.floor(sum / 2) - .5) / 6, seq = [a, b]; G.r = () => seq.shift(); return [E.rollRow(G, true, 'test'), m, G]; };
  const top = mob(fight(['HUN', 'RES'], ['spray'], {}), 'spray').top;
  assert.equal(row([], top)[0].length, 1, 'back on its number');
  const [back, , W] = row(['watchlist'], top); assert.equal(back.length, 0, 'the Watchlist keeps it on the row'); assert.equal(W.stats.items.watchlist, 1);
  assert.equal(row(['watchlist'], top - 1)[0].length, 1, 'one less still comes back');
  const T = fight(['HUN', 'RES'], ['spray'], {}); setHand(T, 1, ['takedown']); T.phase = 'flip'; assert.ok(!E.canUse(T, 'takedown'), 'nothing on the row');
  const r1 = mob(T, 'spray'); T.play = []; T.row = [r1, { ...r1, uid: 'r2', name: 'Other' }];
  assert.ok(E.canUse(T, 'takedown')); throwsRule(() => E.use(T, 'h1-0'), /Pick the alarm/);
  E.use(T, 'h1-0', null, 'r2'); assert.deepEqual(T.row.map(m => m.uid), [r1.uid]); assert.equal(T.gone.at(-1).uid, 'r2'); assert.deepEqual(T.hand[1], []);
});
test('Full Shift: after the 1st, 3rd and 5th fight won, the top story card is the next flip (2026-11-04)', () => {
  const win = (G, n) => { G.won = n - 1; const m = setSlots(mob(G, 'spray'), [1]); E.assign(G, 0, m.uid, slotOf(m, 1)); E.endRound(G); };
  const G = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 1], [0, 1]], mode: 'full' }), len = G.feed.length, top = G.story[0];
  win(G, 1); assert.equal(G.won, 1); assert.equal(G.feed.length, len + 1); assert.equal(G.feed[0], top); assert.ok(CARDS.SIT_STORY.includes(G.feed[0].sit)); assert.equal(G.story.length, 8);
  const O = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 1], [0, 1]], mode: 'full' }), ol = O.feed.length; win(O, 2); assert.equal(O.feed.length, ol, 'no story card after the 2nd');
  const Q = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 1], [0, 1]] }), ql = Q.feed.length; win(Q, 1); assert.equal(Q.feed.length, ql, 'Quick Shift has no story deck');
});
test('Lockjaw +2 until it has lost two dice; Regen puts back the die it lost; Escalating at round end', () => {
  const G = fight(['ENG', 'SOA'], ['boss'], {});
  const bd = CARDS.BOSS_DMG; assert.equal(bd, 5); // every boss hits for 5 since the squeeze (2026-11-03)
  assert.equal(E.dmgOf(G, G.boss), bd + 2); G.boss.off[0] = true; assert.equal(E.dmgOf(G, G.boss), bd + 2);
  G.boss.off[1] = true; assert.equal(E.dmgOf(G, G.boss), bd);
  const H = fight(['ENG', 'SOA'], ['mimic', 'wyrmling'], { dice: [[1, 5], [1, 6]] }); // SOA 6 is a double
  const mi = setSlots(mob(H, 'mimic'), [5, 5, 6, 6]), p = slotOf(mi, 5);
  E.assign(H, 0, mi.uid, p); E.assign(H, 1, mi.uid, slotOf(mi, 6)); H.hp = [99, 99]; E.endRound(H);
  assert.equal(offCount(mi), 1); assert.equal(mi.off[p], true); assert.deepEqual(E.remaining(mi), [5, 6, 6]); // the 6 it lost last is back; the 5 stays taken
  assert.ok(H.log.some(l => /regenerates: its 6 goes back/.test(l.text)));
  assert.equal(E.dmgOf(H, mob(H, 'wyrmling')), 5);
});
test('roll: on point rolls two (a Hunter on point three); solo rolls two of their own plus the crew die; a Triage Agent’s holder rolls one more of their own', () => {
  const G = newG({ team: ['HUN', 'RES'], seed: 9 }); G.agents = [[], [{ uid: 'k1', t: 'triage' }]]; G.point = 0; E.flip(G); if (G.phase === 'roll') E.roll(G);
  assert.equal(G.dice.filter(d => d.k === 0 && d.src === 'own').length, 3, 'the Hunter on point: one more'); assert.ok(G.dice.find(d => d.k === 0 && d.plain && !d.dbl), 'the extra die is never a double'); assert.equal(G.dice.filter(d => d.k === 1 && d.src === 'own').length, 1);
  assert.ok(G.dice.every(d => d.crew), 'no agent dice any more');
  { const H = newG({ team: ['HUN', 'RES'], seed: 9 }); H.point = 0; E.flip(H); if (H.phase === 'roll') E.roll(H); H.play.forEach(m => setSlots(m, [6, 6, 6, 6, 6, 6, 6, 6])); H.hp = [99, 99]; H.dice.forEach(d => { d.used = 'x'; }); E.endRound(H);
    if (H.phase === 'roll') { E.roll(H); assert.equal(H.dice.filter(d => d.k === 0 && d.src === 'own').length, 2, 'round 2: the Hunter rolls the usual two (since 2026-11-05)'); } else assert.fail('the fight should go on: ' + H.phase); }
  const ag = G.dice.filter(d => d.src === 'triage'); assert.equal(ag.length, 1); assert.equal(ag[0].k, 1, 'the holder’s die, not on point’s'); assert.equal(ag[0].kuid, 'k1');
  assert.equal(ag[0].dbl, CARDS.DOUBLES.RES.includes(ag[0].n), 'the holder’s doubles');
  assert.match(E.dieOwner(G, ag[0]), /Responder \(Triage Agent\)/);
  const P = newG({ team: ['RES', 'HUN'], seed: 9 }); P.agents = [[], []]; P.point = 0; E.flip(P); if (P.phase === 'roll') E.roll(P); assert.equal(P.dice.filter(d => d.k === 1).length, 1, 'off point, the Hunter rolls one');
  const S = newG({ team: ['ENG'], seed: 9 }); S.agents = [[]]; E.flip(S); if (S.phase === 'roll') E.roll(S);
  assert.equal(S.dice.length, D.soloDice); assert.deepEqual(S.dice.map(d => d.src), ['own', 'own', 'crew']);
  for (const d of S.dice) assert.ok(d.n >= 1 && d.n <= 6);
  assert.equal(S.dice[2].dbl, S.dice[2].n === 6); // only a 6 doubles on the crew die
  assert.equal(S.dice[0].dbl, CARDS.DOUBLES.ENG.includes(S.dice[0].n));
});
test('cards: the dice strip along the bottom, no symbols, no “players add”; analysts show doubles as pip faces', () => {
  const pips = html => [...html.matchAll(/class="pip"[^>]*aria-label="(\d)"/g)].map(x => +x[1]);
  const strip = html => { const i = html.indexOf('class="dice"'), j = html.indexOf('class="base"'); assert.ok(i > 0, 'dice strip'); return html.slice(i, j > i ? j : undefined); };
  for (const m of CARDS.mobs()) {
    const h = CARDS.mobCard(m), d = CARDS.diceFor(m);
    assert.deepEqual(pips(strip(h)), [...d.base, d.extra]); assert.match(h, /per player past 2/); assert.equal(d.extra, 6);
    assert.ok(h.lastIndexOf('class="dice"') > h.indexOf('class="fl"'), 'the strip comes after the flavour: the bottom edge');
  }
  const bh = CARDS.bossCard(CARDS.boss()), bd = CARDS.diceFor(CARDS.boss(), true); assert.deepEqual(pips(strip(bh)), [...bd.base, bd.extra]);
  const all = [...CARDS.mobs().map(CARDS.mobCard), bh, CARDS.legend, ...CARDS.ANALYST_IDS.map(CARDS.analystCard), ...[...CARDS.AGENT_IDS, ...CARDS.CONS_IDS].map(CARDS.agentCard)].join('');
  assert.doesNotMatch(all, /players add/i); assert.doesNotMatch(all, /Detect|Contain(?!ment)|Eradicate|symbol/);
  for (const id of CARDS.ANALYST_IDS) { const h = CARDS.analystCard(id); assert.match(h, /Your doubles/); assert.deepEqual(pips(h), CARDS.DOUBLES[id]); }
  assert.match(CARDS.legend, /exactly/); assert.match(CARDS.legend, /counts as <b>two<\/b> dice showing its number/); assert.match(CARDS.legend, /The solo crew die: only a /); assert.doesNotMatch(all, /[Aa]gent dice/);
  assert.doesNotMatch(all, /any one more/); assert.match(CARDS.legend, /Hits back:/); assert.match(CARDS.legend, /sum is at most its number/);
});
test('cards carry the game’s Ink & Static scenes: mob by id, boss print scene, analyst portrait, item scene', () => {
  const ART = { ...require('../../data/art.json'), ...require('../art/art.json') }, PRINT = require('../../data/art-print.json');
  const scene = html => { const m = /<div class="art">([\s\S]*?<\/svg>)<\/div>/.exec(html); assert.ok(m, 'art panel'); return m[1]; };
  for (const m of CARDS.mobs()) { const h = CARDS.mobCard(m); assert.equal(scene(h), ART[m.id], m.id); assert.ok(h.indexOf('class="art"') < h.indexOf('class="nm"'), 'art on top'); }
  assert.equal(scene(CARDS.bossCard(CARDS.boss())), PRINT['boss_' + CARDS.BOSS_ID].replace(/\{\{SID\}\}/g, 'cd'));
  for (const id of CARDS.ANALYST_IDS) assert.equal(scene(CARDS.analystCard(id)), ART[CARDS.ANALYST_ART[id] || id], id);
  for (const t of [...CARDS.AGENT_IDS, ...CARDS.CONS_IDS]) assert.equal(scene(CARDS.agentCard(t)), ART[CARDS.ITEM[t][2]], t);
  // The web build inlines exactly the scenes the cards use (plus the page's own), so the page cards match print.
  const k = CARDS.artKeys(); assert.ok(k.art.every(x => ART[x]) && k.print.every(x => PRINT[x]));
  for (const t of CARDS.CONS_IDS) assert.ok(k.art.includes(CARDS.ITEM[t][2]), t);
});

// ---- Items: dealing, personal agents, consumables (sim.js NEWITEMS, PERSONAL, CONSFREE, slotsK) -------------------
test('dealing: every item takes a slot, 4 a player (agents and consumables alike); full slots discard one, or keep the new one out', () => {
  const G = fight(['HUN', 'RES'], ['spray'], {}); setAgents(G, 0, ['triage', 'contain']); setHand(G, 0, ['coffee', 'surge']); // 4/4
  G.deal = [{ uid: 'n1', t: 'recover' }, { uid: 'n2', t: 'coffee' }, { uid: 'n3', t: 'enrich' }, { uid: 'n4', t: 'triage' }]; G.dealNext = 'flip'; G.phase = 'deal';
  assert.equal(E.slotsOf(G, 0), 4); assert.equal(E.heldN(G, 0), 4); assert.ok(E.dealFull(G, 0)); assert.ok(!E.dealFull(G, 1));
  throwsRule(() => E.give(G, 0), /holds 4 items already/); throwsRule(() => E.give(G, 0, 'nope'), /Pick one of/); throwsRule(() => E.give(G, 5), /No such/);
  E.give(G, 1); assert.deepEqual(G.agents[1].map(c => c.uid), ['n1']); assert.equal(G.phase, 'deal');
  // A consumable to the full player: it needs a slot too. Discard their Shift Coffee for it.
  E.give(G, 0, 'h0-0'); assert.deepEqual(G.hand[0].map(c => c.uid), ['h0-1', 'n2']); assert.ok(G.discard.some(c => c.uid === 'h0-0'));
  // Discard the Containment Agent for the Enrichment Agent.
  E.give(G, 0, 'a0-1'); assert.deepEqual(G.agents[0].map(c => c.t), ['triage', 'enrich']); assert.ok(G.discard.some(c => c.uid === 'a0-1'));
  // Keep the last one out: discarded, and the deal is done.
  E.give(G, 0, 'n4'); assert.ok(G.discard.some(c => c.uid === 'n4')); assert.equal(G.phase, 'flip'); assert.equal(G.deal.length, 0);
  throwsRule(() => E.give(G, 0), /Nothing to deal/);
});
test('dealing solo: automatic into free slots (6 solo); full, the player picks what goes', () => {
  const S = fight(['ENG'], ['spray'], {}); setAgents(S, 0, ['triage', 'contain', 'enrich', 'recover']); setHand(S, 0, ['surge']);
  const s = mob(S, 'spray'); s.off = s.off.map(() => true);
  S.kit.push({ uid: 'c1', t: 'coffee' }); S.dice = []; E.endRound(S); // solo draws 1: into the sixth slot
  assert.equal(S.phase, 'flip'); assert.deepEqual(S.hand[0].map(c => c.uid), ['h0-0', 'c1']); assert.equal(E.heldN(S, 0), 6);
  S.phase = 'assign'; S.play = []; S.kit.push({ uid: 't1', t: 'triage' }); E.endRound(S);
  assert.equal(S.phase, 'deal', 'full slots: the player picks'); assert.equal(S.deal[0].uid, 't1');
  E.give(S, 0, 'a0-3'); assert.equal(S.phase, 'flip'); assert.deepEqual(S.agents[0].map(c => c.t), ['triage', 'contain', 'enrich', 'triage']);
  assert.equal(E.slotsOf(S, 0), 6);
});
test('the Soarcerer (2026-11-05): on point, two more dice while baselining; no item draw; their agents and dice are like anyone’s', () => {
  // Own dice the Soarcerer (analyst 0) rolls in the first round, with or without a baseline.
  const soaDice = (point, base) => { for (let seed = 1; ; seed++) { const G = newG({ team: ['SOA', 'ENG'], seed }); G.point = point; E.flip(G); const m = G.play.find(x => x.uid === G.flipped);
    if (G.phase !== 'roll' || !m || !E.canBaseline(G, m)) continue; if (base) E.baseline(G, m.uid); E.roll(G); return G.dice.filter(d => d.k === 0 && d.crew).length; } };
  assert.equal(soaDice(0, true), 2 + CARDS.SOA_BASE_DICE, 'on point, baselining: two more'); assert.equal(soaDice(0, false), 2, 'on point, no baseline: the usual two');
  assert.equal(soaDice(1, true), 1, 'off point: the usual one'); assert.equal(CARDS.SOA_BASE_DICE, 2);
  const won = point => { const G = fight(['SOA', 'ENG'], ['spray'], { point }); const m = mob(G, 'spray'); m.based = 2; G.phase = 'assign'; G.round = 1; G.dice = []; G.undo = []; G.play = [m]; m.off = m.off.map(() => true); setAgents(G, 1, ['contain']); E.endRound(G); return G; };
  assert.equal(won(0).drawn.length, D.kitPerFight, 'a baseline draws no extra item now');
  const G = fight(['SOA', 'ENG'], ['spray'], { dice: [[0, 1], [1, 1]] }); assert.equal(E.slotsOf(G, 0), 4); assert.equal(E.baseCost(G, { back: 0 }), CARDS.BASE_N);
  setAgents(G, 0, ['contain']); assert.equal(E.weight(G, 'a0-0'), 1, 'their agents count as one');
  const m = setSlots(mob(G, 'spray'), [4, 4, 3, 3]); m.based = 2; assert.equal(E.canHit(G, G.dice[0], m), null, 'a Soarcerer 1 takes nothing here');
  assert.equal(CARDS.PERK.SOA, 'On point, while you baseline an alarm, roll two more dice.'); assert.ok(!E.soloKeep(fight(['SOA'], ['spray']), 0), 'the solo keep roll is gone');
});
test('the Engineer on point (2026-11-05): a double of theirs can guard another analyst instead; off point, only themselves', () => {
  const G = fight(['ENG', 'HUN'], ['spray'], { dice: [[0, 6], [0, 1], [1, 4]], point: 0 }); // ENG 6 and 1, HUN 4: doubles
  assert.deepEqual(E.guardable(G, G.dice[0]), [0, 1]); E.guard(G, 0, 1); assert.deepEqual(G.blocks, [false, true]);
  assert.match(G.log[G.log.length - 1].text, /^Engineer guards Hunter with a 6/);
  assert.ok(!E.canGuard(G, G.dice[2]), 'the Hunter is blocking already'); E.guard(G, 1); assert.deepEqual(G.blocks, [true, true]);
  const O = fight(['ENG', 'HUN'], ['spray'], { dice: [[0, 6], [1, 4]], point: 1 });
  assert.deepEqual(E.guardable(O, O.dice[0]), [0]); throwsRule(() => E.guard(O, 0, 1), /only the player who rolled it/);
  assert.match(CARDS.PERK.ENG, /On point, a double of yours can guard another analyst instead\.$/);
});
test('Triage Agent: its holder rolls one more of their own dice every round (two in a multi-alarm fight), under its card; it pairs, guards, rerolls and hits the boss', () => {
  const one = fight(['HUN', 'RES'], ['spray'], {}); setAgents(one, 1, ['triage', 'triage']); one.phase = 'roll'; one.round = 0; E.roll(one);
  assert.deepEqual(one.dice.filter(d => d.src === 'triage').map(d => d.kuid), ['a1-0', 'a1-1'], 'one alarm: one die each');
  const G = fight(['HUN', 'RES'], ['spray', 'boss'], {}); setAgents(G, 1, ['triage', 'triage']); G.phase = 'roll'; G.round = 0; E.roll(G);
  const ag = G.dice.filter(d => d.src === 'triage'); assert.equal(ag.length, 4, 'a multi-alarm fight: two each'); assert.ok(ag.every(d => d.k === 1 && d.crew && !d.twin));
  assert.deepEqual(ag.map(d => d.kuid), ['a1-0', 'a1-0', 'a1-1', 'a1-1']); assert.match(CARDS.AGENT.triage[1], /In a multi-alarm fight, two more\.$/);
  // It plays like the holder's own die: it can take a boss die, reroll, and pair with their own die.
  const t = ag[0]; t.n = 3; t.dbl = CARDS.DOUBLES.RES.includes(3); setSlots(G.boss, [3, 4]);
  assert.ok(E.targets(G, t.i).hits.some(h => h.uid === G.boss.uid), 'it hits the boss'); assert.ok(E.canReroll(G, t));
  const own = G.dice.find(d => d.k === 1 && d.src === 'own'); own.n = 5; own.dbl = false; ag[1].n = 5; ag[1].dbl = false;
  assert.ok(E.canPair(G, own, ag[1]), 'it pairs with the holder’s own die');
});
test('Enrichment Agent: once a round per card, turn any crew die to any number, keeping double or single', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], {}); setAgents(G, 0, ['enrich']); setDice(G, [[0, 6], [1, 3], ['agent', 3]]);
  const s = setSlots(mob(G, 'spray'), [4, 4]);
  assert.equal(G.enrichLeft, 1);
  throwsRule(() => E.enrichTurn(G, 2, 2), /crew die/);
  assert.ok(E.targets(G, 1).enrich, 'a crewmate’s die too: it works for the whole crew'); assert.ok(E.targets(G, 0).enrich);
  E.enrichTurn(G, 0, 4); assert.equal(G.dice[0].n, 4); assert.equal(G.dice[0].dbl, true, 'a double stays a double');
  assert.deepEqual(hitsOn(G, 0, s), [4, 4]);
  setDice(G, [[0, 2], [0, 3]]); E.enrichTurn(G, 0, 4); throwsRule(() => E.enrichTurn(G, 1, 4), /No Enrichment Agent turn left/);
  E.unassign(G); assert.equal(G.enrichLeft, 1, 'undo gives the turn back'); assert.equal(G.dice[0].n, 2);
});
test('Containment Agent: per card, the highest-Damage alarm deals 2 less to everyone, never below 1; Targeted doubles the cut', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp', 'wyrmling'], { point: 1 }); // spray 1 pierces, imp 3 on point doubled, wyrmling 4
  assert.deepEqual(E.incoming(G).total, [1 + 4, 1 + 6 + 4]);
  setAgents(G, 0, ['contain']); // the Exfil Courier (4) is the biggest: 2 less, for both of them
  let inc = E.incoming(G); assert.deepEqual(inc.total, [1 + 2, 1 + 6 + 2]); assert.deepEqual(inc.contain, [2, 2]);
  setAgents(G, 0, ['contain', 'contain']); // a second card: the Courier is now 2, so the Grifter (3) is the biggest; on point takes it doubled
  inc = E.incoming(G); assert.deepEqual(inc.total, [1 + 2, 1 + 2 + 2]); assert.deepEqual(inc.contain, [2, 2 + 4]);
  // Never below 1.
  const spray = mob(G, 'spray'), wyr = mob(G, 'wyrmling'); G.play = [spray]; assert.deepEqual(E.incoming(G).total, [1, 1]);
  // At round end the log names the cut, once per alarm.
  setAgents(G, 0, ['contain']); G.play = [wyr]; setDice(G, []); E.endRound(G); assert.deepEqual(G.hp, [E.HP - 2, E.HP - 2]);
  assert.ok(G.log.some(l => /Containment Agent: Exfil Courier deals 2 less to each of you/.test(l.text))); assert.equal(G.stats.items.contain, 4);
});
test('Recovery Agent: after every won fight, heals 4 per card split across the crew, lowest first, up to the start', () => {
  const G = fight(['HUN', 'RES'], ['spray'], {}); setAgents(G, 1, ['recover']);
  G.hp = [2, E.HP - 1]; mob(G, 'spray').off = mob(G, 'spray').off.map(() => true); E.endRound(G);
  assert.deepEqual(G.hp, [2 + D.recoverHeal, E.HP - 1], 'the holder doesn’t matter: it heals whoever is lowest'); assert.equal(G.phase, 'deal');
  assert.equal(G.stats.items.recover, D.recoverHeal);
  assert.match(CARDS.AGENT.recover[1], new RegExp(`heal ${D.recoverHeal} HP split across the crew`));
});
test('consumables: Surge Playbook rolls 3 of the holder’s dice; Isolation Script takes a die off every alarm; Shift Coffee heals 6', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'wyrmling', 'boss'], { point: 0 }); setDice(G, []);
  setSlots(mob(G, 'spray'), [4, 4]); setSlots(mob(G, 'wyrmling'), [4, 5, 5]);
  setHand(G, 1, ['surge', 'isolate', 'coffee']);
  throwsRule(() => E.use(G, 'intel'), /Nobody holds/); throwsRule(() => E.use(G, 'surge', 0), /Nobody holds/);
  E.use(G, 'surge'); assert.equal(G.dice.length, 3); assert.ok(G.dice.every(d => d.k === 1 && d.crew && d.src === 'surge' && d.dbl === CARDS.DOUBLES.SOA.includes(d.n)), 'the holder’s dice, not on point’s');
  G.boss.off = G.boss.off.map((x, i) => i > 0);
  E.use(G, 'isolate'); assert.deepEqual(E.remaining(mob(G, 'spray')), [4]); assert.equal(E.left(G.boss), 1);
  assert.deepEqual(E.remaining(mob(G, 'wyrmling')), [4, 5]); // a repeated number goes first
  G.hp = [1, 5]; E.use(G, 'coffee'); assert.equal(G.hp[0] + G.hp[1], 12); assert.deepEqual(G.hp, [6, 6]); // one at a time onto the lowest
  assert.equal(G.stats.items.coffee, 6); assert.equal(G.stats.items.isolate, 2, 'the boss keeps its last die');
  assert.deepEqual(G.hand[1], []); assert.equal(G.discard.filter(c => /^h1-/.test(c.uid)).length, 3); assert.deepEqual(G.stats.used, { surge: 1, isolate: 1, coffee: 1 });
});
test('consumables: Threat Intel Feed makes every die match anything this round, agent dice still not the boss', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'boss'], { dice: [[1, 3], ['agent', 5]] }); const s = setSlots(mob(G, 'spray'), [4, 4]);
  setHand(G, 0, ['intel']); assert.deepEqual(hitsOn(G, 0, s), []);
  E.use(G, 'intel'); assert.equal(G.wildAll, true); assert.deepEqual(hitsOn(G, 0, s), [4, 4]); assert.deepEqual(hitsOn(G, 1, G.boss), []);
  assert.ok(hitsOn(G, 0, G.boss).length > 0);
  E.assign(G, 0, s.uid, slotOf(s, 4)); assert.equal(offCount(s), 1);
  G.play = [s]; G.dice = []; s.off = [false, false]; assert.equal(G.wildAll, true); E.endRound(G); assert.equal(G.wildAll, false, 'this round only');
});
test('consumables: when each can be used', () => {
  const G = fight(['HUN', 'RES'], ['spray'], {});
  const at = (phase, round) => { G.phase = phase; G.round = round; return CARDS.CONS_IDS.filter(t => E.canUse(G, t)); };
  assert.deepEqual(at('assign', 1), ['surge', 'intel', 'isolate', 'coffee']);
  assert.deepEqual(at('roll', 0), ['isolate', 'coffee']);
  assert.deepEqual(at('roll', 1), ['isolate', 'coffee', 'freeze']);
  G.play = []; assert.deepEqual(at('flip', 0), ['coffee', 'freeze']);
  for (const p of ['deal', 'sit', 'tuck']) assert.deepEqual(at(p, 0), [], p);
  setHand(G, 0, ['surge']); G.phase = 'roll'; throwsRule(() => E.use(G, 'surge'), /Can’t use the Surge Playbook now/);
});
test('Change Freeze skips the next row roll, of any kind, once', () => {
  const G = newG({ team: ['HUN', 'RES'], seed: 5 }); G.feed = G.feed.filter(m => m.id !== 'mailer'); // no Beacon roll after the flip
  const imp = G.feed.find(m => m.id === 'imp'); G.feed = G.feed.filter(m => m !== imp); imp.top = 12; G.row = [imp];
  setHand(G, 1, ['freeze', 'freeze']); E.use(G, 'freeze'); assert.equal(G.freeze, true);
  throwsRule(() => E.use(G, 'freeze'), /Can’t use/); // one at a time
  const rows = G.rows.length; E.flip(G);
  assert.equal(G.rows.length, rows, 'no row roll on the flip'); assert.deepEqual(G.row, [imp]); assert.equal(G.freeze, false);
  assert.ok(G.log.some(l => /Change Freeze: no row roll \(the flip\)/.test(l.text)));
  // The next one rolls.
  E.rollRow(G, false, 'test'); assert.equal(G.rows.length, rows + 1);
  // An empty row doesn't use it up.
  const H = fight(['HUN', 'RES'], ['spray'], {}); H.freeze = true; H.row = []; E.rollRow(H, false, 'test'); assert.equal(H.freeze, true);
});

test('an empty item deck reshuffles the discards', () => {
  const G = newG({ team: ['ENG', 'HUN'], seed: 1 });
  G.discard = [...G.kit.splice(0), ...G.agents.flat(), ...G.hand.flat()]; G.agents = [[], []]; G.hand = [[], []];
  G.phase = 'assign'; G.play = []; G.fight = 1; G.round = 1; G.dice = []; E.endRound(G);
  assert.equal(G.deal.length, D.kitPerFight); assert.equal(G.kit.length + G.discard.length + G.deal.length, 18);
  assert.ok(G.log.some(l => /shuffled the discards/.test(l.text)));
});
test('deterministic given a seed, and a scripted game reaches an end', () => {
  const run = seed => { const G = E.newGame({ team: ['HUN', 'RES'], seed }); let n = 0;
    while (!G.over && n++ < 3000) {
      if (G.phase === 'deal') dealAll(G); else if (G.phase === 'flip') E.flip(G); else if (G.phase === 'roll') E.roll(G);
      else if (G.phase === 'tuck') E.tuck(G, E.heldAgents(G)[0].c.uid);
      else if (G.phase === 'sit') E.resolveSit(G, ...(G.sit.id === 'chatter' ? ['dig', 1] : [E.SIT_OPTS[G.sit.id][Math.min(E.SIT_OPTS[G.sit.id].length - 1, E.alarmsLeft(G) ? 1 : 0)]]));
      else { for (const d of G.dice) { const t = E.targets(G, d.i); if (t.hits.length) E.assign(G, d.i, t.hits[0].uid, t.hits[0].p); else if (t.guard) E.guard(G, d.i); } E.endRound(G); }
    } return G; };
  const a = run(11), b = run(11);
  assert.ok(a.over); assert.deepEqual(a.log, b.log);
});

// ---- Situations, conditions, the Hunter's 1s and the Engineer's turn (sim.js situation(), choose(), incoming()) ----
// A game between fights 1 and 2 with situation id on top of the feed; dice: the d6 rolls to come (G.r stubbed), then the seed.
function atSit(team, id, { seed = 1, point = 0, dice = [] } = {}) {
  const G = newG({ team, seed }); G.fight = 1; G.phase = 'flip'; G.point = point; G.feed.unshift(sitCard(id));
  const r = G.r, seq = dice.map(v => (v - .5) / 6); G.r = () => seq.length ? seq.shift() : r();
  E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.sit.id, id); return G;
}
const kits = G => G.deal.length; // items drawn and waiting to be dealt

test('the feed: 15 alarms and 9 situations; Quick deals 8, Full 9 with a story deck on the side; one of three bosses', () => {
  assert.equal(CARDS.SIT_IDS.length, 18); assert.equal(CARDS.SIT_CORE.length, 9); assert.equal(CARDS.SIT_STORY.length, 9);
  const games = mode => [...Array(60)].map((_, s) => E.newGame({ team: ['HUN', 'RES'], seed: s, mode }));
  for (const F of games('quick')) { assert.equal(F.feed.length, 8); assert.ok(F.feed.every(c => !c.sit || CARDS.SIT_CORE.includes(c.sit)), 'no story cards'); assert.equal(F.alarmsTotal, F.feed.filter(c => !c.sit).length); }
  for (const F of games('full')) { assert.equal(F.feed.length, 9); assert.ok(F.feed.every(c => !CARDS.SIT_STORY.includes(c.sit)), 'story cards wait in their own deck'); assert.equal(F.story.length, 9); assert.equal(F.feedTotal, 12); }
  const qs = games('quick'), n = qs.map(F => F.alarmsTotal); assert.ok(Math.min(...n) < Math.max(...n), 'the number of fights varies');
  assert.deepEqual([...new Set(qs.map(F => F.boss.id))].sort(), ['ai', 'apt', 'wyrm'], 'every boss turns up'); assert.ok(qs.every(F => !F.feed.includes(F.boss)));
  // Shuffled: across seeds, the first card is sometimes a situation and sometimes an alarm.
  assert.equal(new Set(qs.map(F => !!F.feed[0].sit)).size, 2);
  // A situation first, then another, then an alarm: the fight count only counts alarms.
  const G = newG({ team: ['HUN', 'RES'], seed: 6 }); G.feed.unshift(sitCard('pager'), sitCard('patch'));
  E.setPoint(G, 1); E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.fight, 0, 'no alarm flipped yet'); assert.equal(G.sit.id, 'pager');
  throwsRule(() => E.flip(G), /Not time/); throwsRule(() => E.resolveSit(G, 'heal'), /Not an option/);
  E.resolveSit(G, 'mute'); assert.equal(G.phase, 'flip'); assert.ok(G.sitDone && G.sit.done); assert.match(G.sit.text, /one more threat die/);
  throwsRule(() => E.setPoint(G, 0), /On point is set/);
  E.flip(G); assert.equal(G.phase, 'sit'); assert.equal(G.sit.id, 'patch'); E.resolveSit(G, 'heal'); throwsRule(() => E.setPoint(G, 0), /On point is set/);
  const m = G.feed[0]; E.flip(G); assert.equal(G.fight, 1); assert.deepEqual(G.play, [m]); assert.equal(G.point, 1); assert.equal(G.sit, null); assert.equal(G.sitDone, false);
  assert.equal(m.slots[m.slots.length - 1], 6, 'the mute waited for the alarm');
  // A situation as the last card: the boss is next after it.
  G.play = []; G.phase = 'flip'; G.feed = [sitCard('patch')]; E.flip(G); assert.equal(G.phase, 'sit'); assert.ok(G.sit.boss); assert.equal(G.bossOut, false);
  E.resolveSit(G, 'agent'); assert.equal(G.phase, 'deal', 'the item drawn is dealt first'); dealAll(G); E.flip(G); assert.ok(G.bossOut);
  assert.ok(G.log.some(l => l.kind === 'sit' && /Situation: Pager Storm/.test(l.text)));
});
test('The Badge That Wasn’t: hold the room (Exposed, an extra item for the next win) or fall back (the next alarm goes straight on the row, unfought)', () => {
  const G = atSit(['ENG', 'RES'], 'insider', { point: 1 }), top = G.feed[0];
  assert.equal(G.sit.top, undefined, 'nothing is turned face up');
  E.resolveSit(G, 'stay'); assert.equal(G.cond[1].exposed, true); assert.equal(G.cond[0].exposed, false); assert.equal(G.bonusDraw, 1);
  assert.match(G.sit.text, /draw an item/);
  E.flip(G); assert.equal(G.play[0], top);
  // Win the fight: the usual draw plus one, and Exposed is discarded.
  G.phase = 'assign'; G.dice = []; G.play.forEach(m => { m.off = m.off.map(() => true); }); E.endRound(G);
  assert.equal(kits(G), D.kitPerFight + 1); assert.equal(G.bonusDraw, 0); assert.equal(G.cond[1].exposed, false);
  // Fall back with another situation before the next alarm: that alarm goes on the row unfought when it flips; the one after is fought.
  const R = atSit(['ENG', 'SOA'], 'insider'); R.feed.unshift(sitCard('patch')); const t2 = R.feed[1], t3 = R.feed[2], hp = R.hp.slice();
  const n0 = kits(R); E.resolveSit(R, 'run'); assert.ok(R.badgeSkip); assert.match(R.sit.text, /straight on the row, unfought/); assert.equal(kits(R), n0 + 2, 'and draw 2 items'); dealAll(R);
  E.flip(R); E.resolveSit(R, 'heal'); dealAll(R); R.row = []; const kits0 = R.kit.length; E.flip(R);
  assert.equal(R.phase, 'flip', 'no fight'); assert.deepEqual(R.play, []); assert.deepEqual(R.row, [t2]); assert.equal(t2.back, 0, 'not a comeback'); assert.deepEqual(R.hp, hp); assert.equal(R.kit.length, kits0, 'no draw');
  assert.equal(R.badgeSkip, false); E.flip(R); assert.ok(R.play.includes(t3), 'the next alarm is fought');
  // No alarm left in the feed (only the boss): you can't fall back.
  const B = newG({ team: ['ENG', 'SOA'], seed: 1 }); B.fight = 5; B.feed = [sitCard('insider')]; E.flip(B);
  assert.ok(B.sit.boss); throwsRule(() => E.resolveSit(B, 'run'), /No alarm left/); assert.equal(B.phase, 'sit');
});
test('Pager Storm: ride it out (everyone loses 2, draw an item) or mute it (one more threat die, a 6, dropped when beaten)', () => {
  const G = atSit(['ENG', 'SOA'], 'pager'), n0 = kits(G); E.resolveSit(G, 'ride'); assert.deepEqual(G.hp, [E.HP - 2, E.HP - 2]); assert.equal(kits(G), n0 + 1); assert.equal(G.phase, 'deal');
  // The Janitor's USB, leave it: on point heals 2.
  const U = atSit(['ENG', 'SOA'], 'usb', { point: 1 }), u0 = kits(U); E.resolveSit(U, 'leave'); assert.equal(kits(U), u0 + 1); assert.match(U.sit.text, /played it safe: drew/);
  const M = atSit(['ENG', 'SOA'], 'pager'), m = M.feed[0], was = m.slots.slice(), hits = m.hits;
  E.resolveSit(M, 'mute'); M.row = []; E.flip(M);
  assert.deepEqual(m.slots, [...was, 6]); assert.equal(m.hits, hits + 1); assert.equal(E.left(m), hits + 1); assert.ok(m.slots.length - 1 >= m.printed, 'shown as an extra die');
  M.phase = 'assign'; M.dice = []; m.off = m.off.map(() => true); E.endRound(M);
  assert.ok(M.row.includes(m)); assert.deepEqual(m.slots, was); assert.equal(m.hits, hits); assert.equal(m.off.length, hits);
  // A comeback has its printed dice only.
  m.top = 12; const back = E.rollRow(M, false, 'test'); assert.ok(back.includes(m)); assert.equal(E.left(m), hits);
});
test('The Janitor’s USB: a pair draws 2 items and Focuses; no pair Rattles', () => {
  const G = atSit(['ENG', 'SOA'], 'usb', { dice: [2, 5, 2] }), n = kits(G);
  E.resolveSit(G, 'grab'); assert.deepEqual(G.sit.dice, [2, 5, 2]); assert.equal(G.sit.won, true);
  assert.equal(kits(G), n + 2); assert.equal(G.phase, 'deal'); assert.equal(G.cond[0].focused, true); assert.equal(G.cond[0].rattled, false);
  dealAll(G); assert.equal(G.phase, 'flip');
  const L = atSit(['ENG', 'SOA'], 'usb', { dice: [1, 2, 3] }), ln = kits(L);
  E.resolveSit(L, 'grab'); assert.equal(L.sit.won, false); assert.equal(kits(L), ln); assert.equal(L.cond[0].rattled, true);
  // Can't hold two of the same.
  L.cond[0].rattled = true; L.phase = 'sit'; E.resolveSit(L, 'grab'); assert.equal(L.cond[0].rattled, true);
});
test('Dark Web Chatter: dig in with 1–4 dice; a 6 draws 2 items, no 6 costs on point 1 HP a die', () => {
  const G = atSit(['ENG', 'SOA'], 'chatter', { point: 1, dice: [3, 6] }), n = kits(G);
  throwsRule(() => E.resolveSit(G, 'dig', 5), /1 to 4/); throwsRule(() => E.resolveSit(G, 'dig'), /1 to 4/);
  E.resolveSit(G, 'dig', 2); assert.deepEqual(G.sit.dice, [3, 6]); assert.equal(G.sit.won, true); assert.equal(kits(G), n + 2); assert.deepEqual(G.hp, [E.HP, E.HP]);
  const L = atSit(['ENG', 'SOA'], 'chatter', { point: 1, dice: [1, 2, 5] });
  E.resolveSit(L, 'dig', 3); assert.equal(L.sit.won, false); assert.deepEqual(L.hp, [E.HP, E.HP - 3]); assert.match(L.sit.text, /loses 3 HP/);
});
test('Lateral Whispers rolls the row now; comebacks join the next fight', () => {
  const G = atSit(['ENG', 'SOA'], 'lateral'), imp = G.feed.find(m => m.id === 'imp'); G.feed = G.feed.filter(m => m !== imp);
  imp.top = 12; G.row = [imp];
  const hp = G.hp.slice(); E.resolveSit(G, 'ok'); assert.deepEqual(G.pending, [imp]); assert.equal(G.row.length, 0); assert.equal(imp.back, 1);
  assert.deepEqual(G.hp, hp, 'no arrival hits'); assert.equal(G.lastRow.why, 'Lateral Whispers');
  E.flip(G); assert.ok(G.play.includes(imp)); assert.equal(G.play.length, 2); assert.deepEqual(G.pending, []);
});
test('Patch Tuesday: take a breather (everyone +3, capped) or raid the supply closet (draw an item, then deal it)', () => {
  const G = atSit(['ENG', 'SOA'], 'patch'); G.hp = [5, E.HP - 1]; E.resolveSit(G, 'heal'); assert.deepEqual(G.hp, [8, E.HP]);
  const A2 = atSit(['ENG', 'RES'], 'patch'); setAgents(A2, 0, ['triage', 'contain']); setAgents(A2, 1, ['contain', 'recover']);
  E.resolveSit(A2, 'agent'); assert.equal(kits(A2), 1); assert.equal(A2.phase, 'deal'); assert.equal(A2.hp[0], E.HP - 1, 'the raid costs on point 1 HP');
  const c = A2.deal[0]; if (CARDS.isAgent(c.t)) E.give(A2, 1, 'a1-0'); else E.give(A2, 1);
  assert.equal(A2.phase, 'flip'); assert.ok(A2.sitDone); E.flip(A2); assert.equal(A2.fight, 2);
});
test('the boss pulls the row: down to 6, 4 and 2 dice, roll the row at round end; comebacks hit on arrival and join the fight', () => {
  assert.deepEqual(CARDS.BOSS_STEPS, [6, 4, 2]); assert.match(CARDS.bossCard(CARDS.boss()), /Full Shift:<\/b> Down to 6, 4 and 2 dice: roll the row/);
  // Quick Shift: no row trigger.
  const Q = fight(['HUN', 'RES'], ['boss'], {}), qb = Q.boss; Q.row = [{ ...Q.feed[0], uid: 'q1', top: 12 }]; Q.bossOut = true; qb.off = qb.off.map((_, i) => i < qb.hits - 6); E.endRound(Q); assert.equal(Q.rows.length, 0);
  const G = fight(['HUN', 'RES'], ['boss'], { mode: 'full' }), b = G.boss, imp = G.feed.find(m => m.id === 'imp'); G.feed = G.feed.filter(m => m !== imp);
  imp.top = 12; G.row = [imp]; G.bossOut = true;
  b.off = b.off.map((_, i) => i < b.hits - 6); E.endRound(G); // down to 6 this round
  assert.ok(G.play.includes(imp), 'the comeback joins the boss fight'); assert.equal(G.lastRow.why, `${b.name} down to 6`); assert.deepEqual(b.steps, [6]);
  const rows = G.rows.length; G.phase = 'assign'; G.dice = []; E.endRound(G); assert.equal(G.rows.length, rows, 'once per mark');
});
test('the full pool: the twelve new situations, each as its card says', () => {
  const T = (id, opt = {}) => atSit(['ENG', 'SOA'], id, opt);
  // Impossible Travel: 7+ draws an item; under 7, on point loses 2.
  let G = T('travel', { dice: [3, 4] }), n0 = kits(G); E.resolveSit(G, 'chase'); assert.equal(G.sit.won, true); assert.equal(kits(G), n0 + 1);
  G = T('travel', { point: 1, dice: [1, 2] }); E.resolveSit(G, 'chase'); assert.deepEqual(G.hp, [E.HP, E.HP - 2]); G = T('travel'); E.resolveSit(G, 'leave'); assert.deepEqual(G.hp, [E.HP, E.HP]);
  // CISO Wants a Briefing: under 6, on point loses 3.
  G = T('ciso', { dice: [2, 3] }); E.resolveSit(G, 'ok'); assert.deepEqual(G.hp, [E.HP - 3, E.HP]); G = T('ciso', { dice: [3, 3] }); E.resolveSit(G, 'ok'); assert.deepEqual(G.hp, [E.HP, E.HP]);
  // Pentest Day: everyone rolls; a 1 or 2 loses 2.
  G = T('pentest', { dice: [2, 5] }); E.resolveSit(G, 'runit'); assert.deepEqual(G.hp, [E.HP - 2, E.HP]);
  G = T('pentest'); throwsRule(() => E.resolveSit(G, 'resched'), /consumable/); setHand(G, 1, ['coffee']); E.resolveSit(G, 'resched'); assert.deepEqual(G.hand[1], []); assert.deepEqual(G.hp, [E.HP, E.HP]);
  // Coffee Run heals 3, Honeytoken Tripped 2; Budget Approved draws 2.
  G = T('coffee'); G.hp = [2, 9]; E.resolveSit(G, 'round'); assert.deepEqual(G.hp, [4, E.HP]); G = T('coffee'); G.hp = [2, 9]; E.resolveSit(G, 'shot'); assert.deepEqual(G.hp, [7, 9]);
  G = T('honey'); G.hp = [2, 2]; E.resolveSit(G, 'ok'); assert.deepEqual(G.hp, [4, 4]);
  G = T('budget'); n0 = kits(G); E.resolveSit(G, 'tools'); assert.equal(kits(G), n0 + 2); G = T('budget'); G.hp = [5, 5]; n0 = kits(G); E.resolveSit(G, 'training'); assert.equal(kits(G), n0 + 1); assert.deepEqual(G.hp, [7, 7]);
  // Marketing Blast: everyone loses 1, or on point loses 3 and draws an item.
  G = T('blast'); E.resolveSit(G, 'all'); assert.deepEqual(G.hp, [E.HP - 1, E.HP - 1]);
  G = T('blast', { point: 1 }); n0 = kits(G); E.resolveSit(G, 'point'); assert.deepEqual(G.hp, [E.HP, E.HP - 3]); assert.equal(kits(G), n0 + 1);
  // Threat Intel Drop: the highest-Damage row alarm leaves the game.
  G = T('intel'); const lo = G.feed.find(m => m.id === 'mailer'), hi = G.feed.find(m => m.id === 'mimic'); G.feed = G.feed.filter(m => m !== lo && m !== hi); G.row = [lo, hi];
  E.resolveSit(G, 'ok'); assert.deepEqual(G.row, [lo]); assert.ok(G.gone.includes(hi));
  // The CEO's Inbox: everyone loses 2, or the next alarm gets +2 Damage for that fight only.
  G = T('ceo'); E.resolveSit(G, 'quarantine'); assert.deepEqual(G.hp, [E.HP - 2, E.HP - 2]);
  G = T('ceo'); E.resolveSit(G, 'letride'); G.row = []; const c = G.feed[0], dm = c.dmg; E.flip(G); assert.equal(E.dmgOf(G, c), dm + 2 + (c.kw === 'ramp' ? c.up : 0));
  G.phase = 'assign'; G.dice = []; c.off = c.off.map(() => true); E.endRound(G); assert.equal(c.plus, 0, 'gone once beaten');
  // Ghost in the Change Window: the next alarm sets a copy of its first die.
  G = T('change'); E.resolveSit(G, 'ok'); G.row = []; const g = G.feed[0], first = g.slots[0], h0 = g.hits; E.flip(G); assert.equal(g.hits, h0 + 1); assert.equal(g.slots[g.slots.length - 1], first);
  // Old Case, New IOC: the row alarm with the highest comeback number comes back now, no arrival hit, next fight.
  G = T('ioc'); const a = G.feed.find(m => m.id === 'mailer'), b = G.feed.find(m => m.id === 'imp'); G.feed = G.feed.filter(m => m !== a && m !== b); G.row = [b, a]; const hp = G.hp.slice();
  E.resolveSit(G, 'ok'); assert.deepEqual(G.pending, [a]); assert.deepEqual(G.row, [b]); assert.deepEqual(G.hp, hp); assert.equal(a.back, 1);
  // Vendor Breach Notice: everyone loses 2, then the row rolls and comebacks join the next fight.
  G = T('vendor'); const v = G.feed.find(m => m.id === 'mailer'); G.feed = G.feed.filter(m => m !== v); v.top = 12; G.row = [v];
  E.resolveSit(G, 'rotate'); assert.ok(G.pending.includes(v)); assert.equal(G.lastRow.why, 'Vendor Breach Notice');
  G = T('vendor'); const v2 = G.feed.find(m => m.id === 'mailer'); G.feed = G.feed.filter(m => m !== v2); v2.top = 12; G.row = [v2]; E.resolveSit(G, 'cutoff'); assert.deepEqual(G.row, [v2]); assert.deepEqual(G.hp, [E.HP - 3, E.HP]);
});
test('the bosses: the Persistent Operator comes back once with 2 dice; the Rogue AI switches agents and traits off; Full Shift row triggers', () => {
  // Quick Shift: the Operator comes back with 2 dice, no row roll.
  const Q = fight(['HUN', 'RES'], ['boss'], { boss: 'apt' }), qb = Q.boss; Q.bossOut = true; Q.row = [{ ...Q.feed[0], uid: 'r9', top: 12 }]; qb.off = qb.off.map(() => true); E.endRound(Q);
  assert.equal(Q.over, false); assert.equal(E.left(qb), 2); assert.deepEqual(qb.slots, CARDS.numbersFor('apt', 2)); assert.equal(Q.rows.length, 0);
  Q.phase = 'assign'; Q.dice = []; qb.off = qb.off.map(() => true); E.endRound(Q); assert.ok(Q.over && Q.win, 'the second time it stays down');
  // Full Shift: coming back rolls the row.
  const F = fight(['HUN', 'RES'], ['boss'], { boss: 'apt', mode: 'full' }), fb = F.boss; F.bossOut = true; const r = F.feed.find(m => m.id === 'mailer'); F.feed = F.feed.filter(m => m !== r); r.top = 12; F.row = [r];
  fb.off = fb.off.map(() => true); E.endRound(F); assert.ok(F.play.includes(r), 'the comeback joins the fight'); assert.match(F.lastRow.why, /comes back/);
  // The Rogue AI: no Triage dice, no Containment, no traits while it is in play.
  const A = fight(['HUN', 'RES'], ['boss'], { boss: 'ai' }); setAgents(A, 0, ['triage', 'contain']); A.aug = [{ id: 'bat', name: 'b', host: 'a0-0' }];
  assert.equal(E.running(A, 'contain'), 0); assert.equal(E.traitCount(A, 'Scramble'), 0); A.phase = 'roll'; A.round = 0; E.roll(A); assert.equal(A.dice.filter(d => d.src === 'triage').length, 0);
  // Full Shift: each consumable used rolls the row (not Change Freeze).
  const U = fight(['HUN', 'RES'], ['boss'], { boss: 'ai', mode: 'full' }); const u = U.feed.find(m => m.id === 'mailer'); U.feed = U.feed.filter(m => m !== u); u.top = 12; U.row = [u];
  setHand(U, 0, ['coffee']); U.hp = [5, 5]; E.use(U, 'coffee'); assert.ok(U.play.includes(u)); assert.equal(U.lastRow.why, 'the Rogue AI');
  // Every boss card prints its core ability and its Full Shift trigger.
  for (const id of CARDS.BOSS_IDS) { const h = CARDS.bossCard(CARDS.boss(id)); assert.match(h, /Full Shift:/); assert.ok(h.includes(CARDS.BOSS_TEXT[id][0].replace(/’/g, '’'))); }
});
test('Stalker hits only the lowest HP; Fileless: Containment cuts the highest-Damage alarm that isn’t Fileless; no arrival hits', () => {
  const G = fight(['HUN', 'ENG'], ['banshee'], {}); G.hp = [8, 5]; assert.deepEqual(E.incoming(G).total, [0, 1]);
  const W = fight(['HUN', 'ENG'], ['wraith', 'spray'], {}); setAgents(W, 0, ['contain']); const inc = E.incoming(W);
  assert.equal(inc.by.find(b => b.name === mob(W, 'wraith').name).cut, 0, 'Fileless: no cut'); assert.equal(inc.total[0], 3 + 1, 'the Sprayer is already at 1');
  // Comebacks don't hit on arrival (since 2026-11-03).
  const R = fight(['RES', 'ENG'], ['spray'], {}); const ar = { ...mob(R, 'spray'), uid: 'r5', top: 12, dmg: 4, off: [false], slots: [4], hits: 1 }; R.row = [ar]; const hp = R.hp.slice(); E.rollRow(R, true, 'test'); assert.deepEqual(R.hp, hp);
});
test('Rattled: that player’s next roll has no doubles, then it’s gone', () => {
  const G = newG({ team: ['HUN', 'RES'], seed: 2 }); E.flip(G); G.cond[0].rattled = true; G.agents = [[], []];
  const four = (4 - .5) / 6, seq = Array(8).fill(four); G.r = () => seq.length ? seq.shift() : four; // every die a 4
  G.phase = 'roll'; G.round = 1; G.row = []; E.roll(G);
  assert.ok(G.dice.filter(d => d.k === 0).every(d => d.n === 4 && !d.dbl && d.rattled), 'the Hunter’s 4s are single');
  assert.equal(G.cond[0].rattled, false); assert.ok(G.dice.filter(d => d.k === 1).every(d => !d.dbl), 'RES 4s are single anyway');
  G.phase = 'roll'; E.roll(G); assert.ok(G.dice.filter(d => d.k === 0 && !d.plain).every(d => d.dbl), 'next roll: doubles again (the Hunter’s extra die never is)');
});
test('Exposed: +1 at round end only when something hits you', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[1, 6]], point: 1 }); // spray 1 pierces; imp 3 hits on point, doubled
  G.cond[0].exposed = true; G.cond[1].exposed = true;
  assert.deepEqual(E.incoming(G).total, [1 + 1, 1 + 6 + 1]); assert.deepEqual(E.incoming(G).exposed, [0, 1]);
  G.play = [mob(G, 'imp')]; assert.deepEqual(E.incoming(G).total, [0, 6 + 1], 'not hit: no extra');
  E.guard(G, 0); assert.deepEqual(E.incoming(G).total, [0, 0], 'blocked: no extra');
  G.blocks = [false, false]; G.dice[0].used = null; E.endRound(G); assert.deepEqual(G.hp, [E.HP, E.HP - 7]);
});
test('Focused: once, turn one of your own dice to any number; it reads as that number and spends the card', () => {
  const G = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 5], [1, 5], ['agent', 5], [0, 3]] }); G.cond[0].focused = true;
  const s = setSlots(mob(G, 'spray'), [4, 4]); G.undo = [{}];
  assert.ok(E.canFocus(G, G.dice[0])); assert.ok(!E.canFocus(G, G.dice[1]), 'RES isn’t Focused'); assert.ok(!E.canFocus(G, G.dice[2]), 'not an agent die');
  throwsRule(() => E.focus(G, 1, 4), /isn’t Focused/); throwsRule(() => E.focus(G, 2, 4), /not an agent die/); throwsRule(() => E.focus(G, 0, 7), /1 to 6/);
  assert.ok(E.targets(G, 0).focus);
  E.focus(G, 0, 2); assert.equal(G.dice[0].n, 2); assert.equal(G.dice[0].dbl, false); assert.equal(G.cond[0].focused, false); assert.equal(G.undo.length, 0, 'not undoable');
  assert.deepEqual(hitsOn(G, 0, s), []);
  throwsRule(() => E.focus(G, 3, 4), /isn’t Focused/); // spent
  G.cond[0].focused = true; E.focus(G, 3, 4); assert.equal(G.dice[3].dbl, true, 'a Hunter 4 is a double'); assert.deepEqual(hitsOn(G, 3, s), [4, 4]);
});
test('Hunter: no wild numbers; a Hunter 1 matches only a 1 (on point they roll one more die: see the roll test)', () => {
  const G = fight(['HUN', 'RES'], ['wyrmling'], { dice: [[0, 1]] }); const w = setSlots(mob(G, 'wyrmling'), [1, 4, 5]); w.back = 1;
  assert.deepEqual(hitsOn(G, 0, w), [1], 'a comeback: exact numbers'); const B = fight(['HUN', 'RES'], ['boss'], { dice: [[0, 1]] }); assert.ok(!E.canHit(B, B.dice[0], B.boss) || !E.canHit(B, B.dice[0], B.boss).wild, 'the boss: exact too');
  assert.equal(E.hunts, undefined); assert.equal(CARDS.PERK.HUN, 'On point, you roll one more die in a fight’s first round. It’s never a double.');
});
test('Engineer: once a fight (since 2026-11-05), turn one of their dice to its opposite side; it counts as one die', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 6], [0, 5], [1, 3]] }); G.rerolled = [false, false]; G.undo = [{}]; G.engUsed = false;
  const s = setSlots(mob(G, 'spray'), [1, 1]);
  assert.ok(E.canEng(G, G.dice[0])); assert.ok(!E.canEng(G, G.dice[2]), 'only the Engineer’s dice');
  throwsRule(() => E.engTurn(G, 2), /Engineer’s own/);
  E.engTurn(G, 0); const d = G.dice[0];
  assert.equal(d.n, 1); assert.equal(d.dbl, false, 'a turned die counts as one, even on an Engineer double'); assert.ok(d.flipped); assert.equal(G.undo.length, 0);
  assert.equal(E.canGuard(G, d), false); throwsRule(() => E.guard(G, 0), /can’t guard/); assert.equal(E.canReroll(G, d), false);
  throwsRule(() => E.reroll(G, 0), /turned/);
  assert.deepEqual(hitsOn(G, 0, s), [1, 1]); throwsRule(() => E.assign(G, 0, s.uid, 0, 1), /Only a double/);
  E.assign(G, 0, s.uid, 0); assert.ok(G.dice[0].used, 'one take and it is spent');
  throwsRule(() => E.engTurn(G, 1), /this fight already/); assert.ok(!E.canEng(G, G.dice[1]));
  // Two rounds of one fight: one turn in all; the next fight, another.
  const H = newG({ team: ['ENG', 'SOA'], seed: 4 }); H.point = 0; E.flip(H); assert.equal(H.phase, 'roll');
  H.play.forEach(m => setSlots(m, [6, 6, 6, 6, 6, 6])); H.hp = [99, 99];
  const fight1 = H.fight, eng = () => H.dice.filter(x => x.crew && x.k === 0).map(x => x.i);
  E.roll(H); E.engTurn(H, eng()[0]); throwsRule(() => E.engTurn(H, eng()[1]), /this fight already/);
  E.endRound(H); assert.equal(H.phase, 'roll'); assert.equal(H.fight, fight1, 'same fight');
  E.roll(H); assert.equal(H.engUsed, true, 'still spent in round 2'); throwsRule(() => E.engTurn(H, eng()[1]), /this fight already/); assert.equal(H.stats.flipped, 1);
  H.phase = 'flip'; H.feed.push(H.feed[0]); E.flip(H); assert.equal(H.engUsed, false, 'a new fight: the turn is back');
  assert.match(CARDS.PERK.ENG, /^Once a fight, turn one of your dice to its opposite side/);
});
test('Responder: a double may heal anyone 3 instead of guarding, spending it; nobody heals above the start', () => {
  const G = fight(['RES', 'SOA'], ['spray'], { dice: [[0, 3], [0, 6], [0, 2], [1, 6]] }); G.hp = [3, 5]; // RES 3 and 6: doubles
  assert.ok(E.canGuard(G, G.dice[0]), 'it can still guard'); assert.ok(E.canHeal(G, G.dice[0])); assert.ok(!E.canHeal(G, G.dice[2]), 'a single can’t'); assert.ok(!E.canHeal(G, G.dice[3]), 'nor a crewmate’s double');
  E.heal(G, 0, 1); assert.deepEqual(G.hp, [3, 5 + CARDS.RES_HEAL]); assert.equal(G.dice[0].used, 'heal'); assert.ok(!E.canHeal(G, G.dice[0]));
  G.hp[1] = G.max - 1; E.heal(G, 1, 1); assert.equal(G.hp[1], G.max, 'capped at the start'); assert.match(G.log[G.log.length - 1].text, /heal Soarcerer 1/);
  assert.equal(CARDS.RES_HEAL, 3); assert.equal(CARDS.PERK.RES, 'A double of yours can heal anyone 3 instead of guarding.');
});
test('Exfil (in place of Evasive): still up at round end, the crew discards an item, their choice; then the next round', () => {
  assert.equal(CARDS.abilityOf(D.mobs.find(m => m.id === 'druid')), 'exfil'); assert.equal(CARDS.abilityOf(D.mobs.find(m => m.id === 'specter')), 'exfil');
  assert.match(CARDS.mobCard(D.mobs.find(m => m.id === 'specter')), /Exfil\.<\/b> Still up at round end: the crew discards an item\./); assert.doesNotMatch(CARDS.mobCard(D.mobs.find(m => m.id === 'druid')), /Evasive/);
  const G = fight(['HUN', 'ENG'], ['druid'], { dice: [[0, 1]] }); setHand(G, 0, ['coffee']); setAgents(G, 1, ['triage']); G.hp = [20, 20]; G.max = 20;
  assert.equal(mob(G, 'druid').kw, 'exfil'); E.endRound(G); assert.equal(G.phase, 'exfil'); assert.equal(G.exfil, 1);
  throwsRule(() => E.exfil(G, 'nope'), /Pick an item/); E.exfil(G, 'h0-0'); assert.equal(G.hand[0].length, 0); assert.equal(G.phase, 'roll'); assert.ok(G.discard.some(c => c.uid === 'h0-0'));
  // Nothing to discard: no step.
  const N = fight(['HUN', 'ENG'], ['druid'], {}); N.hp = [20, 20]; N.max = 20; E.endRound(N); assert.equal(N.phase, 'roll');
});
// A fresh game whose first flipped alarm has a Baseline line (all 15 do since 2026-11-04).
function flipBaselinable(team) {
  for (let seed = 1; ; seed++) { const G = newG({ team, seed }); E.flip(G); const m = G.play.find(x => x.uid === G.flipped); if (CARDS.BASE[m.id]) return { G, m, seed }; }
}
test('baseline it: all 15 alarms carry a tuck band (since 2026-11-04), one trait each, 10 traits in all', () => {
  assert.deepEqual(Object.keys(CARDS.BASE).sort(), CARDS.mobs().map(m => m.id).sort()); assert.equal(CARDS.BASE_N, 2);
  for (const id of ['mailer', 'spray', 'macro', 'banshee', 'vibe', 'ogre', 'hydra']) assert.match(CARDS.mobCard(D.mobs.find(x => x.id === id)), /Baseline it/);
  for (let seed = 1; seed < 20; seed++) { const G = newG({ team: ['HUN', 'RES'], seed }); E.flip(G); const m = G.play.find(x => x.uid === G.flipped); assert.ok(E.canBaseline(G, m), m.id); }
  assert.deepEqual([CARDS.traitName('mailer'), CARDS.traitName('hydra'), CARDS.traitName('vibe'), CARDS.traitName('banshee'), CARDS.traitName('macro'), CARDS.traitName('spray'), CARDS.traitName('ogre')], ['Beacon', 'Beacon', 'Escalate', 'Rooted', 'Targeted', 'Piercing', 'Piercing']);
});
test('Targeted and Piercing (2026-11-04): two while its holder is on point; two in a multi-alarm fight', () => {
  const G = fight(['HUN', 'RES'], ['spray'], { point: 0 }); setAgents(G, 0, ['contain']); setAgents(G, 1, ['triage']);
  G.aug = [{ id: 'macro', name: 'macro', host: 'a0-0' }, { id: 'spray', name: 'spray', host: 'a1-0' }];
  assert.equal(E.weight(G, 'a0-0'), 2, 'Targeted: its holder is on point'); assert.equal(E.weight(G, 'a1-0'), 1, 'Piercing: one alarm in play');
  G.point = 1; assert.equal(E.weight(G, 'a0-0'), 1, 'Targeted: off point');
  G.play.push(mob(fight(['HUN', 'RES'], ['imp']), 'imp')); assert.equal(E.weight(G, 'a1-0'), 2, 'Piercing: a multi-alarm fight');
});
test('baseline it: two more dice before the first roll, on a fresh flip only; beaten, it tucks under an agent someone holds', () => {
  const { G, m, seed } = flipBaselinable(['HUN', 'RES']);
  assert.ok(E.canBaseline(G, m)); const n = m.slots.length, v = CARDS.baseDie(m.id);
  E.baseline(G, m.uid); assert.equal(m.slots.length, n + 2); assert.deepEqual(m.slots.slice(-2), [v, v]); assert.equal(m.hits, n + 2);
  throwsRule(() => E.baseline(G, m.uid), /already/);
  // Beat it: every die off, end the round, then tuck under the Responder's agent.
  G.phase = 'assign'; G.round = 1; G.dice = []; G.undo = []; G.play = [m]; m.off = m.off.map(() => true);
  G.agents = [[], []]; setAgents(G, 0, ['triage']); setAgents(G, 1, ['contain']);
  E.endRound(G); assert.equal(G.phase, 'tuck'); assert.equal(m.slots.length, n, 'it goes on the row with its printed dice');
  throwsRule(() => E.tuck(G, 'nope'), /agent someone holds/);
  E.tuck(G, 'a1-0'); assert.ok(E.aug(G, m.id)); assert.equal(G.phase, 'deal', 'then the draw is dealt'); assert.ok(!G.row.includes(m), 'tucked, it is off the row');
  assert.ok(G.log.some(l => /tucks under Responder’s Containment Agent/.test(l.text)));
  // Discarding the host (to make room for a new agent) ends it.
  setHand(G, 1, ['coffee', 'surge']); G.deal = [{ uid: 'n1', t: 'triage' }, { uid: 'n2', t: 'triage' }]; E.give(G, 1); assert.ok(E.aug(G, m.id)); // 4/4 slots now E.give(G, 1, 'a1-0'); assert.ok(!E.aug(G, m.id)); assert.ok(G.row.includes(m), 'it slides out and goes back on the row');
  // A comeback can be baselined too (one more die); never after the first roll.
  const H = newG({ team: ['HUN', 'RES'], seed }); E.flip(H); const c = H.play.find(x => x.uid === H.flipped); c.back = 1; assert.ok(E.canBaseline(H, c)); assert.equal(E.baseCost(H, c), 3);
  c.back = 0; E.roll(H); throwsRule(() => E.baseline(H, c.uid), /before the first roll/);
  assert.equal(Object.keys(CARDS.BASE).length, 15); assert.ok(CARDS.mobs().every(x => CARDS.mobCard(x).includes('Baseline it') === !!CARDS.BASE[x.id]));
});
test('baselined with no agent held: it waits, and tucks under the next agent dealt', () => {
  const G = fight(['HUN', 'RES'], ['mailer'], {}); const m = mob(G, 'mailer'); m.based = 0; m.off = m.off.map(() => true);
  G.tuck = [{ id: 'mailer', name: m.name, uid: m.uid }]; G.dice = [];
  G.kit.push({ uid: 'q2', t: 'triage' }, { uid: 'q1', t: 'coffee' }); E.endRound(G); // draws the coffee, then the triage
  assert.equal(G.phase, 'deal'); assert.deepEqual(G.aug.map(a => [a.id, a.host]), [['mailer', null]]); assert.ok(!E.aug(G, 'mailer'));
  E.give(G, 0); assert.equal(G.aug[0].host, null, 'a consumable isn’t an agent');
  E.give(G, 1); assert.equal(G.aug[0].host, 'q2'); assert.ok(E.aug(G, 'mailer'));
});
test('agent traits (one tuck each, for good, each changing the agent): Overclock, Twin, Escalate, Golden, Rooted, Hardened, Siphon, Beacon', () => {
  const held = (G, id, host = 'a1-0') => { G.aug = [{ id, name: id, host }]; };
  // Overclock: the agent's Overclocked line (Triage rolls one more).
  const O = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(O, 1, ['triage']); held(O, 'imp'); assert.ok(E.upgraded(O, 'a1-0')); O.phase = 'roll'; O.round = 0; E.roll(O); assert.equal(O.dice.filter(d => d.src === 'triage').length, 2);
  // Escalate: from round 2 of a fight, the agent counts as two.
  const X = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(X, 1, ['triage']); held(X, 'wyrmling'); X.round = 1; assert.equal(E.weight(X, 'a1-0'), 1); X.round = 2; assert.equal(E.weight(X, 'a1-0'), 2);
  // Twin: counts as two.
  const T = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(T, 1, ['contain']); held(T, 'wraith'); assert.equal(E.weight(T, 'a1-0'), 2);
  // Golden: counts as two against the boss.
  const S = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(S, 1, ['contain']); held(S, 'specter'); assert.equal(E.weight(S, 'a1-0'), 1);
  const SB = fight(['HUN', 'ENG'], ['boss'], { boss: 'wyrm' }); setAgents(SB, 1, ['contain']); held(SB, 'specter'); assert.equal(E.weight(SB, 'a1-0'), 2);
  // Rooted: counts as two while its holder is at half HP or less.
  const F = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(F, 1, ['contain']); held(F, 'mimic'); F.max = 12; F.hp = [12, 7]; assert.equal(E.weight(F, 'a1-0'), 1); F.hp = [12, 6]; assert.equal(E.weight(F, 'a1-0'), 2);
  // Beacon: counts as two in a fight a comeback joined.
  const B = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(B, 1, ['contain']); held(B, 'bat'); assert.equal(E.weight(B, 'a1-0'), 1); const cb = mob(B, 'spray'); B.play = []; cb.back = 1; E.enter(B, cb); assert.equal(E.weight(B, 'a1-0'), 2);
  // Siphon: its agent takes no item slot.
  const P = fight(['HUN', 'ENG'], ['spray'], {}); setAgents(P, 1, ['contain', 'triage']); assert.equal(E.heldN(P, 1), 2); held(P, 'leech'); assert.equal(E.heldN(P, 1), 1);
  // Hardened: keeps working against the Rogue AI.
  const H = fight(['HUN', 'ENG'], ['boss'], { boss: 'ai' }); setAgents(H, 1, ['triage', 'contain']); held(H, 'druid', 'a1-1'); assert.equal(E.running(H, 'contain'), 1); assert.equal(E.running(H, 'triage'), 0);
  // One tuck per agent.
  const C = fight(['HUN', 'RES'], ['spray'], {}); setAgents(C, 1, ['triage']); held(C, 'imp'); C.phase = 'tuck'; C.tuck = [{ id: 'bat', name: 'b', uid: 'x', mob: {} }];
  throwsRule(() => E.tuck(C, 'a1-0'), /already holds 1/); assert.equal(CARDS.TUCK_CAP, 1); assert.match(CARDS.agentCard('contain'), /Overclocked/);
  assert.deepEqual([...new Set(Object.keys(CARDS.BASE).map(CARDS.traitName))].sort(), ['Beacon', 'Escalate', 'Golden', 'Hardened', 'Overclock', 'Piercing', 'Rooted', 'Siphon', 'Targeted', 'Twin']);
});
// ---- Guard anyone, pairs, the solo Soarcerer's keep roll, baselining at every crew size (sim.js GUARDANY, PAIRADD, SOASOLOKEEP) ----
test('a guard covers only the player who rolled it (2026-11-03); never twice', () => {
  const G = fight(['HUN', 'ENG'], ['spray', 'imp'], { dice: [[0, 4], [0, 6], [1, 1]] }); // HUN 4, HUN 6, ENG 1: all doubles
  throwsRule(() => E.guard(G, 0, 1), /only the player who rolled it/);
  E.guard(G, 0); assert.deepEqual(G.blocks, [true, false]); assert.equal(G.dice[0].used, 'guard'); assert.equal(G.dice[0].guards, 0);
  assert.match(G.log[G.log.length - 1].text, /^Hunter guards themselves with a 4/);
  assert.ok(!E.canGuard(G, G.dice[1]), 'the Hunter is already blocking'); throwsRule(() => E.guard(G, 1), /Hunter is already blocking/);
  assert.ok(E.canGuard(G, G.dice[2])); E.guard(G, 2); assert.deepEqual(G.blocks, [true, true]);
  E.unassign(G); assert.deepEqual(G.blocks, [true, false]); assert.ok(E.canGuard(G, G.dice[2]));
  assert.match(CARDS.legend, /guards you/);
});
test('pairs: two of your own dice showing the same number make one double; it takes two, or it guards', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 5], [0, 5], [0, 4], [1, 5], ['agent', 5]] }); // ENG doubles 1, 6: 5s are single
  const s = setSlots(mob(G, 'spray'), [5, 5]);
  assert.deepEqual(E.pairs(G), [[0, 1]], 'only the Engineer’s two 5s');
  throwsRule(() => E.assign(G, 0, s.uid, 0, 1), /Only a double/);
  E.pair(G, 0, 1); assert.equal(G.dice[0].dbl, true); assert.equal(G.dice[0].paired, 1); assert.equal(G.dice[1].used, 'pair'); assert.equal(E.takesLeft(G.dice[0]), 2);
  assert.match(G.log[G.log.length - 1].text, /pairs two 5s: a double 5/); assert.deepEqual(E.pairs(G), []);
  assert.ok(!E.canReroll(G, G.dice[0]), 'a pair can’t be rerolled'); throwsRule(() => E.assign(G, 1, s.uid), /already used/);
  E.assign(G, 0, s.uid, 0, 1); assert.equal(E.left(s), 0); assert.ok(G.dice[0].used); assert.ok(!E.canGuard(G, G.dice[0]), 'never both');
  // Undo restores the pair, then the two dice.
  E.unassign(G); assert.equal(E.left(s), 2); assert.equal(G.dice[0].paired, 1); assert.equal(G.dice[0].dbl, true);
  E.unassign(G); assert.equal(G.dice[0].dbl, false); assert.equal(G.dice[0].paired, undefined); assert.equal(G.dice[1].used, null); assert.deepEqual(E.pairs(G), [[0, 1]]);
  // Or it guards (its owner).
  E.pair(G, 0, 1); assert.ok(E.canGuard(G, G.dice[0])); E.guard(G, 0); assert.deepEqual(G.blocks, [true, false]); throwsRule(() => E.assign(G, 0, s.uid), /already used/);
  // Refused: different numbers, someone else's die, an agent die, a die that is already a double, a turned die.
  const R = fight(['SOA', 'ENG'], ['spray'], { dice: [[0, 5], [0, 4], [1, 5], ['agent', 5], [0, 2], [0, 2], [1, 2], [1, 2]] });
  throwsRule(() => E.pair(R, 0, 1), /same number/); throwsRule(() => E.pair(R, 0, 2), /your own/); throwsRule(() => E.pair(R, 0, 3), /Agent dice/);
  throwsRule(() => E.pair(R, 4, 5), /double already/); throwsRule(() => E.pair(R, 0, 0), /two dice/);
  R.engUsed = false; E.engTurn(R, 6); assert.equal(R.dice[6].n, 5); throwsRule(() => E.pair(R, 6, 7), /opposite side/);
  assert.deepEqual(E.pairs(R), [], 'nothing pairable left');
  // The solo crew die pairs with your own (it is yours); a Surge Playbook die doesn't.
  const S = fight(['SOA'], ['spray'], { dice: [[0, 4], [0, 5], [0, 4]] }); S.dice[2].src = 'crew';
  assert.deepEqual(E.pairs(S), [[0, 2]]); E.pair(S, 0, 2); assert.equal(S.dice[0].dbl, true);
  S.dice.push({ i: 3, k: 0, crew: true, src: 'surge', ...E.pipDie(5, 'SOA'), used: null, takes: [], turned: false });
  throwsRule(() => E.pair(S, 1, 3), /dice you rolled/);
});
test('pairs: not while Rattled (that roll has no doubles)', () => {
  const roll = rattled => { const G = newG({ team: ['RES', 'HUN'], seed: 2 }); E.flip(G); G.cond[0].rattled = rattled; G.agents = [[], []];
    const five = (5 - .5) / 6; G.r = () => five; G.phase = 'roll'; G.round = 1; G.row = []; G.point = 0; E.roll(G); return G; };
  const R = roll(true), i = R.dice.filter(d => d.k === 0).map(d => d.i);
  assert.equal(i.length, 2); assert.ok(R.dice[i[0]].rattled); assert.deepEqual(E.pairs(R), []);
  throwsRule(() => E.pair(R, i[0], i[1]), /Rattled/);
  const N = roll(false); assert.deepEqual(E.pairs(N), [[0, 1]]); E.pair(N, 0, 1); assert.equal(N.dice[0].dbl, true);
});
test('baselining sets 2 dice at every crew size (3 until 2026-11-04), 4 players too (the alarm’s own + die stays)', () => {
  for (const n of [1, 2, 3, 4]) {
    const team = ['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), { G, m } = flipBaselinable(team);
    const before = m.slots.length; assert.equal(before, CARDS.slotsFor(D.mobs.find(x => x.id === m.id), false, n).length, 'the + die at 4 players');
    E.baseline(G, m.uid); assert.equal(m.slots.length, before + 2, `${n}p`); assert.equal(m.based, 2);
    assert.match(G.log[G.log.length - 1].text, /2 more dice/);
  }
});
// ---- The built page in jsdom -------------------------------------------------------------------------------------
let JSDOM = null; try { ({ JSDOM } = require('../../node_modules/jsdom')); } catch (e) { /* jsdom not installed */ }
const PAGE = path.join(__dirname, 'index.html');
let built = false;
const load = seed => {
  if (!built) { execFileSync(process.execPath, [path.join(__dirname, 'build.js')]); built = true; }
  const dom = new JSDOM(fs.readFileSync(PAGE, 'utf8'), { runScripts: 'dangerously', url: 'file:///chapter-dice/index.html?seed=' + seed, pretendToBeVisual: true });
  return dom.window;
};
// Card parity: the card element on the page, minus live-state classes, equals the shared card function's output.
function cardParity(w, slot) {
  const k = slot.dataset.card, want = k.startsWith('boss:') ? CARDS.bossCard(CARDS.boss(k.slice(5))) : k === 'legend' ? CARDS.legend : k === 'tracker' ? CARDS.tracker
    : k.startsWith('mob:') ? CARDS.mobCard(D.mobs.find(m => m.id === k.slice(4))) : k.startsWith('analyst:') ? CARDS.analystCard(k.slice(8))
    : k.startsWith('sit:') ? CARDS.sitCard(k.slice(4)) : k.startsWith('cond:') ? CARDS.condCard(k.slice(5)) : CARDS.agentCard(k.slice(6));
  const got = slot.querySelector('.card').cloneNode(true);
  got.querySelectorAll('[class]').forEach(el => { [...el.classList].filter(c => c.startsWith('x-')).forEach(c => el.classList.remove(c)); if (!el.classList.length) el.removeAttribute('class'); });
  const t = w.document.createElement('div'); t.innerHTML = want;
  assert.equal(got.outerHTML, t.firstElementChild.outerHTML, `card ${k} differs from the shared card markup`);
}
// The page's feed with its alarms first, so the next flip starts a fight (the situations follow, in order).
function alarmFirst(w) { const G = w.CDUI.UI.G; G.feed = [...G.feed.filter(c => !c.sit), ...G.feed.filter(c => c.sit)]; w.CDUI.render(); }
// Deal on the page: Give to each player in turn; a full player discards their first agent.
function pageDeal(w) {
  const d = w.document, G = w.CDUI.UI.G; let n = 0;
  while (G.phase === 'deal' && n++ < 40) {
    const drop = d.querySelector('[data-a="drop"]'); if (drop) { drop.click(); continue; }
    d.querySelector(`[data-a="give"][data-n="${n % G.n}"]`).click();
  }
}

test('page: every card in the gallery matches the shared paper card markup', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(5), d = w.document, n = 15 + 3 + 1 + 1 + 4 + 5 + 6 + 18 + 3; // alarms, bosses, dice reference, shift tracker, analysts, agents, consumables, situations, conditions
  assert.match(d.body.textContent, new RegExp(`See all ${n} cards`));
  assert.equal(d.querySelectorAll('[data-a="pick"]').length, 4, 'the setup lists 4 analysts'); assert.doesNotMatch(d.body.textContent, /Fixer/);
  d.querySelector('[data-a="cards"]').click();
  const slots = [...d.querySelectorAll('.t-gslot[data-card]')];
  assert.equal(slots.length, n);
  assert.deepEqual(slots.filter(s => s.dataset.card.startsWith('agent:')).map(s => s.dataset.card.slice(6)), [...CARDS.AGENT_IDS, ...CARDS.CONS_IDS], 'every item type once');
  slots.forEach(s => cardParity(w, s));
});

test('page: a 2-player game clicked through to the end screen, items dealt and used, cards in parity throughout', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(9), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  assert.match(d.body.textContent, /Tuned for 1–4 players/);
  click('[data-a="start"]');
  let n = 0, slotHits = 0, twos = 0, guards = 0, pickers = 0, sits = 0, bases = 0, tucks = 0, deals = 0, uses = 0, checked = new Set(), sawRow = false;
  while (!w.CDUI.UI.G.over && n++ < 4000) {
    const G = w.CDUI.UI.G;
    d.querySelectorAll('[data-card]').forEach(s => { const key = s.dataset.card + ':' + G.phase; if (!checked.has(key)) { checked.add(key); cardParity(w, s); } });
    if (d.querySelector('.t-rowroll[data-roll]')) sawRow = true;
    if (G.phase === 'deal') { deals++; const drop = d.querySelector('[data-a="drop"]'); if (drop) drop.click(); else click(`[data-a="give"][data-n="${deals % 2}"]`); }
    else if (G.phase === 'flip') { if (!G.sitDone) click(`[data-a="point"][data-n="${G.fight % 2}"]`); click('[data-a="flip"]'); }
    else if (G.phase === 'sit') { sits++; click('[data-a="sit"]:not(:disabled)'); }
    else if (G.phase === 'roll') { if (!bases && d.querySelector('[data-a="baseline"]')) { bases++; click('[data-a="baseline"]'); } click('[data-a="roll"]'); }
    else if (G.phase === 'tuck') { tucks++; click('[data-a="tuck"]'); }
    else if (G.phase === 'exfil') click('[data-a="exfil"]');
    else {
      // Spend a consumable that can be used in the fight, once a round at most.
      const use = d.querySelector('[data-a="use"]:not(:disabled)'); if (use && !G.dice.some(x => x.used) && uses < 6 && !G.usedThis) { G.usedThis = true; uses++; use.click(); continue; }
      const tgt = d.querySelector('.t-td.tgt');
      if (tgt) { slotHits++; tgt.click(); continue; }
      if (d.querySelector('[data-a="guardfor"]')) { pickers++; click('[data-a="guardfor"]'); continue; }
      if (d.querySelector('[data-a="guard"]')) { click('[data-a="guard"]'); guards++; continue; }
      twos += G.dice.filter(x => x.takes && x.takes.length === 2).length;
      G.usedThis = false; click('[data-a="end"]');
    }
  }
  const G = w.CDUI.UI.G;
  console.log('page play-through: fights', G.fight, 'twos', twos, 'baselined', bases, 'tucked', tucks, 'dealt', deals, 'used', uses, 'guards', guards, 'picked', pickers, 'won', G.win);
  assert.ok(G.over, 'game should end'); assert.ok(slotHits > 0, 'tapping a die under a card assigns the rolled die');
  assert.ok(twos > 0, 'a double took two'); assert.ok(deals > 0, 'items were dealt on the mat'); assert.ok(uses > 0, 'a consumable was used');
  assert.doesNotMatch(d.body.innerHTML, /players add/i);
  assert.ok(sawRow, 'a row roll was shown'); assert.ok(sits > 0, 'situations flipped between fights'); assert.ok(bases > 0, 'an alarm baselined'); assert.ok(tucks > 0, 'and tucked under a held agent');
    assert.match(d.querySelector('.t-end h2').textContent, /Shift (survived|lost)/);
  assert.match(w.CDUI.resultLine(), /^Detect the Dwellers/); assert.match(w.CDUI.resultLine(), /items used: /);
  // What the items did: the end screen lists every item type that did something, with its count.
  const did = Object.entries(G.stats.items).filter(([, n]) => n > 0); assert.ok(did.length > 0, 'the items did something');
  assert.match(d.querySelector('.t-end .did h3').textContent, /What your items did/); assert.equal(d.querySelectorAll('.t-end .did li').length, did.length);
  assert.match(w.CDUI.resultLine(), /items did: /);
  assert.ok(checked.size > 5);
});

test('page: the deal phase shows the drawn item on the mat with a Give button per player; a full player picks what goes', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  click('[data-a="start"]'); const G = w.CDUI.UI.G;
  assert.equal(G.phase, 'deal'); assert.equal(d.querySelectorAll('[data-a="give"]').length, 2);
  assert.ok(!d.querySelector('[data-a="flip"]'), 'no flip until the items are dealt');
  const top = d.querySelector('.t-dealp .t-dslot[data-card]'); assert.ok(top, 'the drawn item on the mat'); assert.equal(top.dataset.card, 'agent:' + G.deal[0].t); cardParity(w, top);
  assert.match(d.querySelector('.dock .status').textContent, /Deal the/);
  // A known deal: an agent for a player whose 4 slots are full (2 agents, 2 consumables), then a consumable.
  G.agents = [[{ uid: 'k1', t: 'triage' }, { uid: 'k2', t: 'contain' }], []]; G.hand = [[{ uid: 'h1', t: 'coffee' }, { uid: 'h2', t: 'isolate' }], []];
  G.deal = [{ uid: 'n1', t: 'enrich' }, { uid: 'n2', t: 'surge' }]; w.CDUI.render();
  assert.match(d.querySelector('[data-a="give"][data-n="0"]').textContent, /full/);
  assert.equal(d.querySelectorAll('[data-holder="0"] .t-kslot[data-kuid]').length, 2); assert.equal(d.querySelectorAll('[data-holder="0"] .t-kslot[data-huid]').length, 2, 'consumables in slots');
  assert.equal(d.querySelectorAll('[data-holder="1"] .t-kslot.open').length, 4, 'four empty slots');
  assert.match(d.querySelector('[data-holder="0"] .t-pkh').textContent, /4\/4 items/);
  click('[data-a="give"][data-n="0"]'); assert.equal(G.deal.length, 2, 'asks first');
  assert.equal(d.querySelectorAll('[data-holder="0"] [data-a="drop"]').length, 4); assert.ok(d.querySelector('[data-a="keepout"]'));
  click('[data-a="drop"][data-u="k2"]'); assert.deepEqual(G.agents[0].map(c => c.uid), ['k1', 'n1']); assert.ok(!d.querySelector('[data-a="drop"]'));
  // The consumable goes to the other player's slots, with Use (not usable between fights).
  click('[data-a="give"][data-n="1"]'); assert.equal(G.phase, 'flip'); assert.deepEqual(G.hand[1].map(c => c.uid), ['n2']);
  const h = d.querySelector('[data-holder="1"] .t-kslot[data-huid="n2"]'); assert.ok(h, 'in the Responder’s slots'); cardParity(w, h);
  assert.ok(h.querySelector('[data-a="use"]').disabled, 'Surge Playbook waits for the roll');
  assert.match(d.querySelector('[data-holder="1"] .t-pkh').textContent, /1\/4 items/);
  // Keep it out.
  G.phase = 'deal'; G.deal = [{ uid: 'n3', t: 'recover' }]; G.dealNext = 'flip'; w.CDUI.render();
  click('[data-a="give"][data-n="0"]'); click('[data-a="keepout"]'); assert.equal(G.phase, 'flip'); assert.ok(G.discard.some(c => c.uid === 'n3'));
});

test('page: a consumable is usable only when its timing allows; Surge rolls more dice into the tray', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  click('[data-a="start"]'); pageDeal(w); alarmFirst(w); const G = w.CDUI.UI.G;
  G.hand = [[{ uid: 'u1', t: 'surge' }, { uid: 'u2', t: 'coffee' }], [{ uid: 'u3', t: 'freeze' }]]; w.CDUI.render();
  const btn = uid => d.querySelector(`[data-a="use"][data-u="${uid}"]`);
  assert.ok(btn('u1').disabled); assert.ok(!btn('u2').disabled); assert.ok(!btn('u3').disabled, 'Change Freeze before the flip');
  click('[data-a="flip"]'); if (G.phase === 'roll') { assert.ok(btn('u1').disabled); assert.ok(btn('u3').disabled, 'not before the first roll'); click('[data-a="roll"]'); }
  assert.equal(G.phase, 'assign'); assert.ok(!btn('u1').disabled, 'after the roll');
  const n = G.dice.length; btn('u1').click(); assert.equal(G.dice.length, n + 3); assert.ok(!btn('u1'), 'used once, then gone');
  assert.equal(d.querySelectorAll('.dock .t-die').length, G.dice.filter(x => !x.kuid).length, 'the new dice sit in the tray');
  assert.ok(G.dice.slice(-3).every(x => x.src === 'surge' && x.k === 0));
});

test('page: a double stays selected for its second take; undo takes one back; keyboard picks dice', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]'); pageDeal(w); alarmFirst(w); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
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

test('page: agents sit on the mat in their holder’s group; a Triage Agent’s die lands under its own card, not in the dice tray', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]'); pageDeal(w); alarmFirst(w);
  const G = w.CDUI.UI.G; G.agents = [[{ uid: 'k1', t: 'triage' }, { uid: 'k2', t: 'recover' }], [{ uid: 'k3', t: 'triage' }]]; G.hand = [[], []]; w.CDUI.render();
  assert.ok(d.querySelector('.table .t-agents [data-holder="0"] [data-kuid="k1"]'), 'agents are on the play mat, by holder'); assert.ok(!d.querySelector('.t-side .t-kslot'), 'not in the side panel');
  assert.ok(d.querySelector('[data-holder="1"] [data-kuid="k3"]'));
  assert.equal(d.querySelectorAll('.t-agents .t-dph').length, 2, 'a spot under each Triage card before the roll');
  click('[data-a="flip"]'); if (G.phase === 'roll') click('[data-a="roll"]'); assert.equal(G.phase, 'assign');
  const ag = G.dice.filter(x => x.src === 'triage'); assert.equal(ag.map(x => x.kuid).join(), 'k1,k3'); assert.equal(ag.map(x => x.k).join(), '0,1', 'each holder’s die');
  for (const x of ag) assert.ok(d.querySelector(`[data-holder="${x.k}"] [data-kuid="${x.kuid}"] .t-adice [data-k="die${x.i}"]`), 'under its card');
  assert.equal(d.querySelectorAll('.dock .t-die').length, G.dice.length - ag.length, 'the tray holds only crew dice');
  assert.equal(d.querySelectorAll('[data-kuid="k2"] .t-die').length, 0, 'only Triage rolls');
  // Picking the Triage die under its card works like any die.
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
  w.CDUI.UI.setup.team = ['ENG', 'HUN']; click('[data-a="start"]'); pageDeal(w);
  alarmFirst(w); const G = w.CDUI.UI.G; click('[data-a="flip"]');
  G.play = []; G.phase = 'flip'; G.feed = G.feed.filter(c => c.sit !== 'usb'); G.feed.unshift(sitCard('usb')); const r = G.r, seq = [2, 2, 5].map(v => (v - .5) / 6); G.r = () => seq.length ? seq.shift() : r(); w.CDUI.render();
  assert.match(d.querySelector('.dock [data-a="flip"]').textContent, /Flip the top card/, 'the page never says what the face-down card is');
  assert.doesNotMatch(d.querySelector('.table').textContent, /situation first/i);
  click('[data-a="flip"]'); assert.equal(G.phase, 'sit');
  const slot = d.querySelector('.table .t-sslot[data-card="sit:usb"]'); assert.ok(slot, 'the situation card is on the mat'); cardParity(w, slot);
  assert.deepEqual([...d.querySelectorAll('[data-a="sit"]')].map(b => b.dataset.o), ['grab', 'leave']);
  assert.match(d.querySelector('[data-a="sit"]').textContent, /Grab it/);
  key('1'); assert.ok(G.sitDone); assert.equal(G.phase, 'deal', 'a pair draws 2 items to deal');
  assert.match(d.querySelector('.t-dealp').textContent, /takes Focused/, 'the outcome stays on the mat while dealing');
  const cond = d.querySelector('[data-hp="0"] [data-card="cond:focused"]'); assert.ok(cond, 'Focused sits by the on-point HP'); cardParity(w, cond);
  pageDeal(w); assert.equal(G.phase, 'flip');
  alarmFirst(w); click('[data-k="sitflip"]'); assert.equal(G.fight, 2); if (G.phase === 'roll') click('[data-a="roll"]'); assert.equal(G.phase, 'assign');
  // The Engineer's die: an Opposite side button and the Focused picker.
  const i = G.dice.findIndex(x => x.k === 0 && x.crew); G.dice[i] = { ...G.dice[i], n: 2, dbl: false, used: null, takes: [], turned: false }; w.CDUI.UI.sel = i; w.CDUI.render();
  assert.match(d.querySelector('[data-a="eng"]').textContent, /Opposite side \(→ 5\)/); assert.equal(d.querySelectorAll('[data-a="focus"]').length, 5);
  assert.match(d.querySelector('.dock .status').textContent, /Focused: turn it to any number/);
  click('[data-k="focus6"]'); assert.equal(G.dice[i].n, 6); assert.equal(G.cond[0].focused, false); assert.ok(!d.querySelector('[data-card="cond:focused"]'));
  key('o'); assert.equal(G.dice[i].n, 1); assert.ok(G.dice[i].flipped); assert.ok(!d.querySelector('[data-a="eng"]'));
  assert.match(d.querySelector(`[data-k="die${i}"]`).textContent, /OPP/);
  // The Badge That Wasn’t with no alarm left in the feed: Fall back is disabled with the reason; nothing is face up.
  G.play = []; G.phase = 'flip'; G.feed = [sitCard('insider')]; G.sitDone = false; w.CDUI.render(); click('[data-a="flip"]');
  const run = d.querySelector('[data-a="sit"][data-o="run"]'); assert.ok(run.disabled); assert.match(d.querySelector('.sit-o .why').textContent, /No alarm left/);
  assert.ok(!d.querySelector('.t-sit .t-slot.faceup'), 'no card turned face up beside it');
});

test('page: Guard covers the player who rolled the double, straight away; undo takes it back', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  click('[data-a="start"]'); pageDeal(w); alarmFirst(w); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
  const G = w.CDUI.UI.G; assert.equal(G.phase, 'assign');
  const own = G.dice.filter(x => x.k === 0 && x.crew).map(x => x.i);
  own.forEach(i => { G.dice[i] = { ...G.dice[i], ...E.pipDie(6, G.team[0]), used: null, takes: [], turned: false }; });
  w.CDUI.UI.sel = own[0]; w.CDUI.render();
  assert.doesNotMatch(d.querySelector('[data-a="guard"]').textContent, /…/); assert.ok(!d.querySelector('[data-a="guardfor"]'), 'no picker');
  click('[data-a="guard"]'); assert.equal(G.blocks.join(), 'true,false'); assert.equal(G.dice[own[0]].guards, 0);
  w.CDUI.UI.sel = own[1]; w.CDUI.render(); assert.ok(!d.querySelector('[data-a="guard"]'), 'already blocking: no second guard');
  click('[data-a="undo"]'); assert.equal(G.blocks.join(), 'false,false');
});

test('page: two matching dice show a Pair control in the tray and the hint; pairing makes a double; undo splits it', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => { const e = d.querySelector(s); assert.ok(e, 'missing ' + s); e.click(); };
  click('[data-a="start"]'); pageDeal(w); alarmFirst(w); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
  const G = w.CDUI.UI.G; assert.equal(G.phase, 'assign');
  const own = G.dice.filter(x => x.k === 0 && x.crew).map(x => x.i), n = [1, 2, 3, 5].find(v => !CARDS.DOUBLES[G.team[0]].includes(v) && v !== 1);
  own.forEach(i => { G.dice[i] = { ...G.dice[i], ...E.pipDie(n, G.team[0]), used: null, takes: [], turned: false }; });
  G.dice.filter(x => x.k !== 0 || !x.crew).forEach(x => { x.n = 6; x.dbl = true; }); // nothing else pairs
  w.CDUI.UI.sel = null; w.CDUI.render();
  const btn = d.querySelector('.dock .t-dice [data-a="pair"]'); assert.ok(btn, 'a Pair control in the tray');
  assert.equal(btn.previousElementSibling.dataset.k, 'die' + own[1], 'right after the second die');
  assert.ok(d.querySelector(`[data-k="die${own[0]}"]`).classList.contains('pairable'));
  assert.match(d.querySelector('.dock .status').textContent, new RegExp(`Pair: two of your own ${n}s`));
  btn.click(); assert.equal(G.dice[own[0]].dbl, true); assert.equal(G.dice[own[1]].used, 'pair'); assert.equal(w.CDUI.UI.sel, own[0]);
  assert.match(d.querySelector(`[data-k="die${own[0]}"]`).textContent, /Pair ×2/); assert.match(d.querySelector(`[data-k="die${own[1]}"]`).textContent, /Paired/);
  assert.ok(!d.querySelector('[data-a="pair"]')); assert.ok(d.querySelector('[data-a="guard"]'), 'a pair can guard');
  click('[data-a="undo"]'); assert.equal(G.dice[own[0]].dbl, false); assert.equal(G.dice[own[1]].used, null); assert.ok(d.querySelector('[data-a="pair"]'));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'p', bubbles: true })); assert.equal(G.dice[own[0]].dbl, true, 'P pairs');
});
