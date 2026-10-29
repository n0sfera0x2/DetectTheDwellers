const test = require('node:test'), assert = require('node:assert');
const D = require('../data/cards.json');
const { E, play, rng, TEAMS } = require('../sim/bot');

test('card counts add up to the 54-card deck', () => {
  assert.strictEqual(D.mobs.length, 15); assert.strictEqual(D.situations.length, 9);
  assert.strictEqual(D.bosses.length, 3); assert.strictEqual(D.classes.length, 5); assert.strictEqual(D.kit.length, 16);
  assert.strictEqual(15 + 9 + 3 + 5 + 16 + 4 + 2, 54);
});

test('every mob has a known keyword and the kit is 8 types × 2', () => {
  for (const m of D.mobs) assert.ok(D.keywords[m.kw], `${m.name} has unknown keyword ${m.kw}`);
  assert.strictEqual(Object.keys(D.keywords).length, 8);
  const types = {}; for (const k of D.kit) { types[k.type] = (types[k.type] || 0) + 1; assert.ok(k.text && k.burn, `${k.name} needs run and burn text`); }
  assert.deepStrictEqual(Object.values(types), Array(8).fill(2));
});

test('one HP number per difficulty at every player count', () => {
  for (const n of ['1', '2', '3', '4']) assert.deepStrictEqual(D.hp.full[n], D.hp.full['1']);
});

test('First Shift deals its six cards in order with the set boss and kit on top', () => {
  const G = E.newGame(['HUN', 'RES'], 'intro', { rnd: rng(2) });
  assert.deepStrictEqual(G.deck.map(c => c.id).reverse(), D.intro.deck);
  assert.strictEqual(G.boss.id, D.intro.boss);
  assert.strictEqual(G.kit[G.kit.length - 1].type, D.intro.kit[0]);
  assert.strictEqual(G.max, D.hp.intro['2']);
});

test('the bot finishes every game without getting stuck', () => {
  for (const mode of ['full', 'quick', 'intro']) for (let g = 0; g < 60; g++) {
    const G = play(TEAMS[1 + g % 4][0], mode, { rnd: rng(g + 100) });
    assert.ok(G.over, `${mode} game ${g} never ended`);
  }
});

test('every mob prints its own comeback range, starting at 1', () => {
  for (const m of D.mobs) assert.ok(m.persist[0] === 1 && m.persist[1] >= m.persist[0] && m.persist[1] <= 20, `${m.name} range ${m.persist}`);
});

test('only the two highest-Damage comebacks of a roll hit on the way in', () => {
  const G = E.newGame(['HUN', 'RES'], 'full', { hp: 200, rnd: rng(3) });
  const [spray, druid, mimic] = ['spray', 'druid', 'mimic'].map((id, i) => ({ ...D.mobs.find(m => m.id === id), kind: 'mob', uid: 900 + i, left: 1, hits: 2, back: 0, up: 0 }));
  G.row = [spray, druid, mimic]; G.deck = [{ ...D.mobs.find(m => m.id === 'macro'), kind: 'mob', uid: 999, left: 2, hits: 2, back: 0, up: 0 }];
  // Flip roll 1 brings all three back; Mimic (4) and Druid (3) strike, the Sprayer (1) just rejoins.
  const rolls = [1]; G.rnd = () => rolls.length ? (rolls.shift() - 1) / 20 : 0.99;
  assert.ok(E.flip(G));
  assert.strictEqual(G.play.length, 4);
  assert.deepStrictEqual(G.persist.hit.slice().sort(), [druid.name, mimic.name].sort());
  assert.deepStrictEqual(G.hps, [200 - 7, 200 - 7]);
});

test('a Beacon roll chains: what it brings back rolls the row again', () => {
  const G = E.newGame(['HUN', 'RES'], 'full', { hp: 200, rnd: rng(3) });
  const [spray, druid, mimic] = ['spray', 'druid', 'mimic'].map((id, i) => ({ ...D.mobs.find(m => m.id === id), kind: 'mob', uid: 900 + i, left: 1, hits: 2, back: 0, up: 0 }));
  G.row = [spray, druid, mimic]; G.deck = [{ ...D.mobs.find(m => m.id === 'bat'), kind: 'mob', uid: 999, left: 3, hits: 3, back: 0, up: 0 }];
  // Flip roll 20 (quiet), Beacon roll 9 (Sprayer 1–10 only), chain roll 1 (Scavenger and Rootkit).
  const rolls = [20, 9, 1]; G.rnd = () => rolls.length ? (rolls.shift() - 1) / 20 : 0.99;
  assert.ok(E.flip(G));
  assert.deepStrictEqual(G.play.map(m => m.id).sort(), ['bat', 'druid', 'mimic', 'spray']);
  assert.deepStrictEqual(G.plog.map(x => x.why || 'flip'), ['flip', 'beacon', 'chain']);
  assert.strictEqual(G.row.length, 0);
});

test('undo takes back the last die that did not beat its mob', () => {
  const G = E.newGame(['HUN', 'RES'], 'full', { hp: 200, rnd: rng(4) });
  const ogre = { ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 901, left: 4, hits: 4, back: 0, up: 0, def: 2 };
  G.deck = [ogre]; E.flip(G); E.rollAll(G);
  G.dice.forEach(d => { d.r = 10; d.dbl = false; });
  const before = { left: ogre.left, crewHits: G.stats.crewHits, log: G.log.length };
  assert.ok(E.assign(G, 0, ogre.uid)); assert.strictEqual(ogre.left, before.left - 1);
  assert.ok(E.canUndo(G)); assert.ok(E.unassign(G));
  assert.strictEqual(ogre.left, before.left); assert.strictEqual(G.dice[0].used, false);
  assert.strictEqual(G.stats.crewHits, before.crewHits); assert.strictEqual(G.log.length, before.log);
  assert.strictEqual(E.unassign(G), false, 'nothing left to undo');
  // A hit that beats the mob can't be taken back.
  ogre.left = 1; assert.ok(E.assign(G, 0, ogre.uid)); assert.strictEqual(E.canUndo(G), false); assert.strictEqual(E.unassign(G), false);
});

test('a lost shift records which mobs dealt the final damage', () => {
  const G = E.newGame(['HUN'], 'full', { hp: 3, rnd: rng(5) });
  const bat = { ...D.mobs.find(m => m.id === 'bat'), kind: 'mob', uid: 902, left: 9, hits: 9, back: 0, up: 0, def: 30, dmg: 5 };
  G.deck = [bat]; E.flip(G); E.rollAll(G); G.blocks = [false];
  const by = E.incomingBy(G); assert.strictEqual(by[0][0].m, bat); assert.strictEqual(E.incoming(G)[0], by[0].reduce((s, x) => s + x.d, 0));
  E.endRound(G);
  assert.ok(G.over && !G.win); assert.deepStrictEqual(G.downBy, [bat.name]);
});

test('mob hits follow the crew-size table, never below 1', () => {
  for (const n of [1, 2, 3, 4]) {
    const G = E.newGame(TEAMS[n][0], 'full', { hp: 50, rnd: rng(n) });
    const mobs = G.deck.filter(c => c.kind === 'mob');
    for (const m of mobs) { const printed = D.mobs.find(x => x.id === m.id).hits; assert.strictEqual(m.hits, Math.max(1, printed + D.mobAdd[n]), `${m.name} at ${n}p`); }
  }
  assert.strictEqual(E.mobHits(1, 1), 1);
});

test('a comeback returns at full hits, and the Hunt Agent can hit it but not a fresh mob', () => {
  const G = E.newGame(['HUN', 'RES'], 'full', { hp: 200, rnd: rng(5) });
  const mob = id => ({ ...D.mobs.find(m => m.id === id), kind: 'mob', back: 0, up: 0 });
  const druid = { ...mob('druid'), uid: 910, hits: 4, left: 0 };
  G.row = [druid]; G.deck = [{ ...mob('macro'), uid: 911, hits: 3, left: 3 }];
  const rolls = [1]; G.rnd = () => rolls.length ? (rolls.shift() - 1) / 20 : 0.99;
  E.flip(G);
  const back = G.play.find(m => m.uid === 910), fresh = G.play.find(m => m.uid === 911);
  assert.strictEqual(back.left, back.hits, 'a comeback returns at full hits');
  assert.ok(E.huntable(back)); assert.ok(!E.huntable(fresh));
});

test('the automation report counts agent hits, healing and removals', () => {
  const G = E.newGame(['HUN', 'RES'], 'full', { hp: 60, rnd: rng(9) });
  assert.deepStrictEqual(G.stats.auto, { hits: 0, assist: 0, saved: 0, healed: 0, removed: 0, dodged: 0 });
  const games = Array.from({ length: 40 }, (_, i) => play(['HUN', 'RES'], 'full', { hp: 60, rnd: rng(100 + i) }));
  const total = k => games.reduce((s, g) => s + g.stats.auto[k], 0);
  for (const k of ['hits', 'assist', 'saved', 'healed']) assert.ok(total(k) > 0, `agents should register ${k} over 40 games`);
  assert.ok(games.every(g => Object.values(g.stats.auto).every(v => v >= 0)), 'no negative counts');
});
