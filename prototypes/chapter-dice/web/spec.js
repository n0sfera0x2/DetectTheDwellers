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
// dice: [k, 3] rolls a 3 on analyst k's own die (their doubles apply); [k, 'D', count] is a bare symbol face;
// ['agent', 6] is an agent die showing 6, ['agent', 'D'] a single-symbol agent face.
function setDice(G, dice) {
  const pip = (n, who) => E.pipDie(n, who);
  G.dice = dice.map((x, i) => x[0] === 'agent'
    ? { i, k: G.point, crew: false, src: 'agent', ...(typeof x[1] === 'number' ? pip(x[1], 'AGENT') : { face: [x[1], 1] }), used: null, turned: false }
    : { i, k: x[0], crew: true, src: 'own', ...(typeof x[1] === 'number' ? pip(x[1], G.team[x[0]]) : { face: [x[1], x[2] || 1] }), used: null, turned: false });
  G.blocks = G.team.map(() => false); G.undo = []; G.wildAll = false; G.enrichLeft = G.tray.filter(c => c.t === 'enrich').length;
  G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = E.dmgOf(G, m); });
}
const mob = (G, id) => G.play.find(m => m.id === id);
const offCount = m => m.off.filter(Boolean).length;
const throwsRule = (fn, re) => assert.throws(fn, e => e.rule && (!re || re.test(e.message)));
const setTray = (G, types) => { G.tray = types.map((t, i) => ({ uid: 'x' + i, t })); };

test('symbol rows come from symbolsFor and the printed card', () => {
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 3 });
  const spray = G.feed.find(m => m.id === 'spray');
  assert.deepEqual(spray.row, require('../sim').symbolsFor('Identity', 3));
  assert.equal(G.boss.hits, D.bosses.find(b => b.id === 'wyrm').hitsBase + D.bossAdd[2]);
  const G4 = E.newGame({ team: ['HUN', 'RES', 'ENG', 'SOA'], seed: 3 });
  assert.equal(G4.feed.find(m => m.id === 'spray').hits, 3 + D.mobAdd[4]);
  assert.equal(G4.boss.hits, D.bosses.find(b => b.id === 'wyrm').hitsBase + D.bossAdd[4]);
  assert.equal(G.hp[0], 23); assert.equal(E.HP, 23); assert.equal(G.tray.length, D.quickStartAgent);
  assert.equal(E.newGame({ team: ['ENG'], seed: 3 }).tray.length, D.quickStartSolo);
  assert.equal(E.newGame({ team: ['SOA', 'HUN'], seed: 3 }).cap, D.sharedKit + 1);
});

test('the key: every die reads 1–2 Detect, 3–4 Contain, 5–6 Eradicate', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(CARDS.symOf), ['D', 'D', 'C', 'C', 'E', 'E']);
  assert.deepEqual(CARDS.KEY, SIM.KEY);
  for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, 'CREW').face[0], CARDS.symOf(n));
});

test('doubles by analyst; every other die doubles only on a 6', () => {
  const want = { HUN: [1, 2, 6], RES: [3, 4, 6], ENG: [2, 4, 6], SOA: [1, 6], PAT: [3, 6] };
  for (const [id, ns] of Object.entries(want)) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, id).face[1], ns.includes(n) ? 2 : 1, `${id} ${n}`);
  for (const who of ['CREW', 'AGENT']) for (let n = 1; n <= 6; n++) assert.equal(E.pipDie(n, who).face[1], n === 6 ? 2 : 1, `${who} ${n}`);
  assert.deepEqual([2, 4, 6].map(n => E.pipDie(n, 'ENG').face[1]), [2, 2, 2]); // the Engineer: every even number
  // The sim plays the same dice.
  for (const id of Object.keys(want)) assert.deepEqual(SIM.DICE[id], [1, 2, 3, 4, 5, 6].map(n => E.pipDie(n, id).face));
  assert.deepEqual(CARDS.DOUBLES, SIM.DOUBLES);
});

test('pip dice in play: a Hunter 2 takes two Detect; a Responder 2 takes one; a crew 6 can guard', () => {
  const G = fight(['HUN', 'RES'], ['spray'], { dice: [[0, 2], [1, 2], [1, 6]] }); // spray: D D C
  const s = mob(G, 'spray');
  E.assign(G, 0, s.uid, 'D'); assert.deepEqual(E.remaining(s), ['C']);
  throwsRule(() => E.guard(G, 1), /double/);
  E.guard(G, 2); assert.equal(G.blocks[1], true);
});

test('agent dice: a 6 is a double that takes two, but still can’t guard or hit the boss', () => {
  const G = fight(['ENG', 'SOA'], ['boss', 'imp'], { dice: [['agent', 6], ['agent', 5]] }); // imp: D E C
  assert.deepEqual(G.dice[0].face, ['E', 2]); assert.deepEqual(G.dice[1].face, ['E', 1]);
  throwsRule(() => E.guard(G, 0), /guard/);
  throwsRule(() => E.assign(G, 0, 'boss', 'E'), /boss/);
  E.assign(G, 0, mob(G, 'imp').uid, 'E'); assert.equal(offCount(mob(G, 'imp')), 1); // only one E on imp
});

test('a face removes one matching symbol; a non-matching face cannot', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 'D'], [1, 'E']] }); // spray: D D C
  E.assign(G, 0, mob(G, 'spray').uid, 'D');
  assert.equal(offCount(mob(G, 'spray')), 1);
  throwsRule(() => E.assign(G, 1, mob(G, 'spray').uid, 'E'));
  throwsRule(() => E.assign(G, 0, mob(G, 'spray').uid, 'D'), /already used/);
});

test('a double removes two of that symbol from one mob, or guards, never both', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], { dice: [[0, 'D', 2], [1, 'D', 2], [1, 'C', 1]] });
  const s = mob(G, 'spray');
  E.assign(G, 0, s.uid, 'D'); assert.deepEqual(E.remaining(s), ['C']);
  E.guard(G, 1); assert.equal(G.blocks[1], true);
  throwsRule(() => E.assign(G, 1, s.uid, 'D'), /already used/);
  throwsRule(() => E.guard(G, 2), /double/);
  // Undo the guard: the die is free again and the block is gone.
  E.unassign(G); assert.equal(G.blocks[1], false); assert.equal(G.dice[1].used, null);
  E.unassign(G); assert.equal(E.left(s), 3);
});

test('Hunter: any face is wild against a comeback, not against a fresh mob', () => {
  const G = fight(['HUN', 'ENG'], ['spray', 'imp'], { dice: [[0, 'E'], [0, 'E']] }); // spray has no E
  throwsRule(() => E.assign(G, 0, mob(G, 'spray').uid, 'D'));
  mob(G, 'spray').back = 1;
  E.assign(G, 0, mob(G, 'spray').uid, 'D'); assert.equal(offCount(mob(G, 'spray')), 1);
});

test('Responder: Contain faces are wild against the highest-Damage mob only', () => {
  // imp: Damage 3, Cloud D E C. mimic: Damage 4, Endpoint E C D E C. Mimic is the top.
  const G = fight(['RES', 'ENG'], ['imp', 'mimic'], { dice: [[0, 'C'], [0, 'C'], [1, 'C']] });
  E.assign(G, 0, mob(G, 'mimic').uid, 'E'); assert.equal(offCount(mob(G, 'mimic')), 1);
  assert.deepEqual(E.remaining(mob(G, 'imp')), ['D', 'D', 'E']);
  assert.equal(E.targets(G, 1).hits.filter(h => h.uid === mob(G, 'imp').uid).length, 0); // not wild on imp: no C to take
  throwsRule(() => E.assign(G, 2, mob(G, 'mimic').uid, 'E')); // the Engineer's C is not wild
});

test('Responder wild covers the boss', () => {
  const G = fight(['RES', 'ENG'], ['boss'], { dice: [[0, 'C']] });
  E.assign(G, 0, 'boss', 'D'); assert.equal(offCount(G.boss), 1);
});

test('Evasive: only a double face hits it', () => {
  const G = fight(['ENG', 'SOA'], ['druid'], { dice: [[0, 'E'], [0, 'E', 2]] }); // druid: Endpoint E E C D
  throwsRule(() => E.assign(G, 0, mob(G, 'druid').uid, 'E'), /Evasive/);
  E.assign(G, 1, mob(G, 'druid').uid, 'E'); assert.equal(offCount(mob(G, 'druid')), 2);
});

test('agent dice cannot hit the boss and cannot guard', () => {
  const G = fight(['ENG', 'SOA'], ['boss', 'spray'], { dice: [['agent', 'D'], ['agent', 'D']] });
  throwsRule(() => E.assign(G, 0, 'boss', 'D'), /boss/);
  throwsRule(() => E.guard(G, 0), /guard/);
  E.assign(G, 1, mob(G, 'spray').uid, 'D'); assert.equal(offCount(mob(G, 'spray')), 1);
});

test('Enrichment run turns one crew die per running card; burn makes every die wild', () => {
  const G = fight(['ENG', 'SOA'], ['spray'], {});
  setTray(G, ['enrich']); setDice(G, [[0, 'E', 2], [1, 'E'], ['agent', 'E']]);
  throwsRule(() => E.enrichTurn(G, 2, 'D'), /crew die/);
  E.enrichTurn(G, 0, 'D'); assert.deepEqual(G.dice[0].face, ['D', 2]);
  throwsRule(() => E.enrichTurn(G, 1, 'D'), /No Enrichment/);
  E.burn(G, 'enrich'); assert.equal(G.wildAll, true);
  E.assign(G, 1, mob(G, 'spray').uid, 'C'); assert.equal(offCount(mob(G, 'spray')), 1);
});

test('the row: comebacks return with all symbols; only the two highest-Damage hit on arrival', () => {
  const G = E.newGame({ team: ['ENG', 'SOA'], seed: 2 });
  const take = id => { const m = G.feed.find(x => x.id === id); G.feed = G.feed.filter(x => x !== m); return m; };
  const row = ['imp', 'druid', 'wyrmling', 'mimic'].map(take); // Damage 3, 3, 4, 4
  row.forEach(m => { m.top = 12; m.off[0] = true; });
  G.row = row; G.feed.unshift(take('spray'));
  E.flip(G);
  assert.equal(G.play.length, 5); assert.equal(G.row.length, 0);
  assert.ok(row.every(m => m.back === 1 && E.left(m) === m.hits));
  assert.deepEqual(G.hp, [23 - 8, 23 - 8]);
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
  assert.ok(B.play.includes(B.boss) && B.play.includes(m)); assert.deepEqual(B.hp, [23, 23]);
});

test('after a fight: beaten mobs go to the row unless they came back once; then gone for good', () => {
  const G = fight(['HUN', 'ENG'], ['spray', 'imp'], { dice: [[0, 'D', 2], [1, 'C']] });
  const s = mob(G, 'spray'), i = mob(G, 'imp'); i.back = 1; i.off = i.off.map(() => true);
  E.assign(G, 0, s.uid, 'D'); E.assign(G, 1, s.uid, 'C');
  E.endRound(G);
  assert.ok(G.row.includes(s)); assert.ok(G.gone.includes(i)); assert.equal(G.play.length, 0);
  assert.ok(['flip', 'loot'].includes(G.phase));
});

test('end of round: mobs hit back; Piercing ignores blocks; Targeted hits only on point, doubled', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'imp'], { dice: [[0, 'E', 2], [1, 'D', 2]], point: 1 });
  setTray(G, []);
  E.guard(G, 0); E.guard(G, 1);
  const inc = E.incoming(G);
  assert.deepEqual(inc.total, [1, 1]); // spray pierces (1 each); imp is blocked by on point
  G.blocks = [false, false];
  assert.deepEqual(E.incoming(G).total, [1, 1 + 6]);
  setTray(G, ['contain']); assert.deepEqual(E.incoming(G).total, [1, 1 + 2]); // imp 3 → 1, doubled
});

test('Lockjaw +2 until it has lost two symbols; Regen and Escalating at round end', () => {
  const G = fight(['ENG', 'SOA'], ['boss'], {});
  assert.equal(E.dmgOf(G, G.boss), 11); G.boss.off[0] = true; assert.equal(E.dmgOf(G, G.boss), 11);
  G.boss.off[1] = true; assert.equal(E.dmgOf(G, G.boss), 9);
  const H = fight(['ENG', 'SOA'], ['mimic', 'wyrmling'], { dice: [[0, 'E']] });
  E.assign(H, 0, mob(H, 'mimic').uid, 'E'); H.hp = [99, 99]; E.endRound(H);
  assert.equal(offCount(mob(H, 'mimic')), 0); assert.equal(E.dmgOf(H, mob(H, 'wyrmling')), 5);
});

test('roll: on point rolls two; solo rolls two of their own plus the crew die; Triage rolls an agent die', () => {
  const G = E.newGame({ team: ['HUN', 'RES'], seed: 9 }); setTray(G, ['triage']); G.point = 1; E.flip(G); if (G.phase === 'roll') E.roll(G);
  assert.equal(G.dice.filter(d => d.k === 1 && d.crew).length, 2); assert.equal(G.dice.filter(d => d.k === 0).length, 1);
  assert.equal(G.dice.filter(d => !d.crew).length, 1);
  const S = E.newGame({ team: ['ENG'], seed: 9 }); S.tray = []; E.flip(S); if (S.phase === 'roll') E.roll(S);
  assert.equal(S.dice.length, D.soloDice); assert.deepEqual(S.dice.map(d => d.src), ['own', 'own', 'crew']);
  for (const d of S.dice) { assert.ok(d.n >= 1 && d.n <= 6); assert.equal(d.face[0], CARDS.symOf(d.n)); }
  assert.deepEqual(S.dice[2].face, E.pipDie(S.dice[2].n, 'CREW').face); // only a 6 doubles on the crew die
  assert.deepEqual(S.dice[0].face, E.pipDie(S.dice[0].n, 'ENG').face);
  assert.ok(G.dice.filter(d => !d.crew).every(d => d.face[1] === (d.n === 6 ? 2 : 1)));
});

test('cards: mobs and the boss carry the key; analyst cards show their doubles as pip faces', () => {
  for (const html of [...CARDS.mobs().map(CARDS.mobCard), CARDS.bossCard(CARDS.boss())]) { assert.match(html, /class="key"/); assert.match(html, /1–2/); assert.match(html, /3–4/); assert.match(html, /5–6/); }
  const pips = html => [...html.matchAll(/class="pip"[^>]*aria-label="(\d)"/g)].map(x => +x[1]);
  for (const id of CARDS.ANALYST_IDS) { const h = CARDS.analystCard(id); assert.match(h, /Your doubles/); assert.deepEqual(pips(h), CARDS.DOUBLES[id]); }
  assert.match(CARDS.legend, /only a .* is a double/); assert.match(CARDS.legend, /sum is at most its number/);
});

test('burns: Triage adds three on-point dice; Containment takes a symbol off every mob; Recovery heals 6', () => {
  const G = fight(['ENG', 'SOA'], ['spray', 'boss'], { point: 1 });
  setTray(G, ['triage', 'contain', 'recover']); setDice(G, []);
  E.burn(G, 'triage'); assert.equal(G.dice.length, 3); assert.ok(G.dice.every(d => d.k === 1 && d.crew));
  G.boss.off = G.boss.off.map((x, i) => i > 0);
  E.burn(G, 'contain'); assert.equal(offCount(mob(G, 'spray')), 1); assert.equal(E.left(G.boss), 1);
  G.hp = [14, 19]; E.burn(G, 'recover'); assert.equal(G.hp[0] + G.hp[1], 39); assert.deepEqual(G.hp, [20, 19]); // one at a time onto the lowest
  throwsRule(() => E.burn(G, 'enrich'), /No such agent/);
});

test('won fight: Fixer and Recovery heal; draw two; a full tray means you choose what to discard', () => {
  const G = fight(['PAT', 'ENG'], ['spray'], { dice: [[0, 'D', 2], [1, 'C']] });
  setTray(G, ['recover', 'triage', 'triage', 'contain', 'contain']); G.hp = [10, 10];
  E.assign(G, 0, mob(G, 'spray').uid, 'D'); E.assign(G, 1, mob(G, 'spray').uid, 'C'); E.endRound(G);
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
      else { for (const d of G.dice) { const t = E.targets(G, d.i); if (t.hits.length) E.assign(G, d.i, t.hits[0].uid, t.hits[0].sym); else if (t.guard) E.guard(G, d.i); } E.endRound(G); }
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
  assert.match(d.body.textContent, /Only 2 players is tuned/);
  click('[data-a="start"]');
  let n = 0, svgHits = 0, guards = 0, checked = new Set(), sawRow = false;
  while (!w.CDUI.UI.G.over && n++ < 4000) {
    const G = w.CDUI.UI.G;
    d.querySelectorAll('[data-card]').forEach(s => { const key = s.dataset.card + ':' + G.phase; if (!checked.has(key)) { checked.add(key); cardParity(w, s); } });
    if (d.querySelector('.t-rowroll[data-roll]')) sawRow = true;
    if (G.phase === 'flip') { click(`[data-a="point"][data-n="${G.fight % 2}"]`); click('[data-a="flip"]'); }
    else if (G.phase === 'roll') click('[data-a="roll"]');
    else if (G.phase === 'loot') click('[data-a="discard"]');
    else {
      const tgt = d.querySelector('.card svg.x-tgt');
      if (tgt && svgHits < 30) { tgt.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); svgHits++; continue; }
      const hit = d.querySelector('[data-a="hit"]'); if (hit) { hit.click(); continue; }
      if (d.querySelector('[data-a="guard"]')) { click('[data-a="guard"]'); guards++; continue; }
      click('[data-a="end"]');
    }
  }
  const G = w.CDUI.UI.G;
  assert.ok(G.over, 'game should end'); assert.ok(svgHits > 0, 'tapping a symbol on a card assigns the die');
  assert.ok(sawRow, 'a row roll was shown');
  assert.match(d.querySelector('.t-end h2').textContent, /Shift (survived|lost)/);
  assert.match(w.CDUI.resultLine(), /chapter dice prototype/);
  assert.ok(checked.size > 5);
});

test('page: undo takes back the last die and keyboard picks dice', { skip: !JSDOM && 'jsdom not installed' }, () => {
  const w = load(8), d = w.document, click = s => d.querySelector(s).click();
  click('[data-a="start"]'); click('[data-a="flip"]'); if (w.CDUI.UI.G.phase === 'roll') click('[data-a="roll"]');
  const G = w.CDUI.UI.G; if (G.phase !== 'assign') return;
  const hit = d.querySelector('[data-a="hit"]'); if (!hit) return;
  hit.click(); assert.equal(G.dice.filter(x => x.used).length, 1);
  click('[data-a="undo"]'); assert.equal(G.dice.filter(x => x.used).length, 0);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '2', bubbles: true })); assert.equal(w.CDUI.UI.sel, 1);
});
