const test = require('node:test'), assert = require('node:assert');
const D = require('../data/cards.json');
const { E, play, rng, TEAMS } = require('../sim/bot');

test('card counts add up to the 63-card deck', () => {
  assert.strictEqual(D.mobs.length, 15); assert.strictEqual(D.situations.length, 18); assert.strictEqual(D.situations.filter(s => s.story).length, 9);
  assert.strictEqual(D.bosses.length, 3); assert.strictEqual(D.classes.length, 5); assert.strictEqual(D.kit.length, 16);
  assert.strictEqual(15 + 18 + 3 + 5 + 16 + 4 + 2, 63);
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
  assert.deepStrictEqual(G.stats.auto, { hits: 0, assist: 0, saved: 0, healed: 0, removed: 0, dodged: 0, recon: 0 });
  const games = Array.from({ length: 40 }, (_, i) => play(['HUN', 'RES'], 'full', { hp: 60, rnd: rng(100 + i) }));
  const total = k => games.reduce((s, g) => s + g.stats.auto[k], 0);
  for (const k of ['hits', 'assist', 'saved', 'healed']) assert.ok(total(k) > 0, `agents should register ${k} over 40 games`);
  assert.ok(games.every(g => Object.values(g.stats.auto).every(v => v >= 0)), 'no negative counts');
});

test('a story card resolves its Recon line when the crew holds a Recon Agent', () => {
  const run = recon => {
    const G = E.newGame(['HUN', 'RES'], 'full', { hp: 60, rnd: rng(4) });
    const vendor = { ...D.situations.find(s => s.id === 'vendor'), kind: 'sit', uid: 950 };
    G.deck = [vendor]; G.row = []; if (recon) G.held[0] = [{ ...D.kit.find(c => c.type === 'recon') }];
    E.setPoint(G, 0); E.flip(G); const res = E.resolveSit(G, 0); return { G, res };
  };
  const plain = run(false), scouted = run(true);
  assert.deepStrictEqual(plain.G.hps, [58, 58]); assert.ok(!plain.res.recon);
  assert.deepStrictEqual(scouted.G.hps, [60, 60]); assert.ok(scouted.res.recon); assert.strictEqual(scouted.G.stats.auto.recon, 1);
});

test('every Full Shift feed carries its story beats', () => {
  for (let i = 0; i < 20; i++) { const G = E.newGame(['HUN'], 'full', { hp: 60, rnd: rng(i) }); assert.strictEqual(G.deck.filter(c => c.story).length, D.storyDeal.full); assert.strictEqual(G.deck.length, D.deal.full); }
});

test('the next-mob mark applies to the next flipped mob and clears when it is beaten', () => {
  const G = E.newGame(['HUN'], 'full', { hp: 60, rnd: rng(6) });
  const mob = { ...D.mobs.find(m => m.id === 'spray'), kind: 'mob', uid: 960, hits: 1, left: 1, back: 0, up: 0 }, def = mob.def;
  G.nextMob = { def: 3, dmg: 0 }; G.deck = [mob]; G.row = []; E.flip(G);
  assert.strictEqual(mob.def, def + 3); assert.strictEqual(G.nextMob, null);
  G.dice = [{ kind: 'crew', k: 0, r: 20, dbl: true, used: false }]; G.rolled = true; E.assign(G, 0, 960);
  assert.strictEqual(mob.def, def);
});

test('a comeback the Hunter finishes is gone for good; anyone else sends it back to the row', () => {
  const finish = who => {
    const G = E.newGame([who, 'RES'], 'full', { hp: 60, rnd: rng(2) });
    const m = { ...D.mobs.find(x => x.id === 'spray'), kind: 'mob', uid: 970, hits: 1, left: 1, back: 1, up: 0 };
    G.phase = 'combat'; G.play = [m]; G.rolled = true; G.row = [];
    G.dice = [{ kind: 'crew', k: 0, r: 20, dbl: true, used: false }]; E.assign(G, 0, 970);
    return G.row.length;
  };
  assert.strictEqual(finish('HUN'), 0); assert.strictEqual(finish('ENG'), 1);
});

test('boss hits follow the crew-size table, and the Fixer heals after every fight', () => {
  for (const n of [1, 2, 3, 4]) {
    const G = E.newGame(['HUN', 'RES', 'ENG', 'SOA'].slice(0, n), 'full', { hp: 60, rnd: rng(n) });
    assert.strictEqual(G.boss.hits, D.bosses.find(b => b.id === G.boss.id).hitsBase + D.bossAdd[n]);
  }
  const G = E.newGame(['PAT', 'RES'], 'full', { hp: 60, rnd: rng(3) });
  G.hps = [30, 30]; const m = { ...D.mobs.find(x => x.id === 'spray'), kind: 'mob', uid: 980, hits: 1, left: 1, back: 0, up: 0 };
  G.phase = 'combat'; G.play = [m]; G.rolled = true; G.dice = [{ kind: 'crew', k: 0, r: 20, dbl: true, used: false }]; E.assign(G, 0, 980);
  assert.strictEqual(G.hps[0] + G.hps[1], 60 + D.perks.PAT.fight);
});

test('an empty kit deck is rebuilt from burned agents', () => {
  const G = E.newGame(['HUN'], 'full', { hp: 60, rnd: rng(8) });
  const burned = G.kit.splice(0, 3); G.discard = burned; G.kit = [];
  G.phase = 'combat'; G.play = []; G.loot = [];
  const before = G.discard.length; G.stats.reshuffles = 0;
  G.play = [{ ...D.mobs.find(m => m.id === 'spray'), kind: 'mob', uid: 990, hits: 1, left: 1, back: 0, up: 0 }]; G.rolled = true;
  G.dice = [{ kind: 'crew', k: 0, r: 20, dbl: true, used: false }]; E.assign(G, 0, 990);
  assert.strictEqual(G.stats.reshuffles, 1); assert.strictEqual(G.discard.length, 0);
  assert.strictEqual(G.loot.length + G.kit.length, before);
});

test('a solo analyst draws one kit card per won fight; a crew draws two', () => {
  const draw = team => {
    const G = E.newGame(team, 'quick', { rnd: rng(5) });
    G.phase = 'combat'; G.loot = []; G.rolled = true;
    G.play = [{ ...D.mobs.find(m => m.id === 'spray'), kind: 'mob', uid: 990, hits: 1, left: 1, back: 0, up: 0 }];
    G.dice = [{ kind: 'crew', k: 0, r: 20, dbl: true, used: false }]; E.assign(G, 0, 990);
    return G.loot.length;
  };
  assert.strictEqual(draw(['ENG']), D.kitSolo);
  assert.strictEqual(draw(['ENG', 'HUN']), D.kitPerFight);
  assert.strictEqual(draw(['SOA']), D.kitSolo + D.perks.SOA.draw);
});

test('core modes deal no story cards and skip boss row triggers; Full Shift has both', () => {
  for (let i = 0; i < 20; i++) {
    const Q = E.newGame(['HUN', 'RES'], 'quick', { hp: 40, rnd: rng(i) });
    assert.ok(!Q.adv); assert.strictEqual(Q.deck.filter(c => c.story).length, 0);
  }
  const lock = adv => {
    const G = E.newGame(['HUN', 'RES'], adv ? 'full' : 'quick', { hp: 200, rnd: rng(1) });
    const boss = { ...D.bosses.find(b => b.id === 'wyrm'), kind: 'boss', uid: 999, hits: 9, left: 9, back: 0, up: 0 };
    G.row = [{ ...D.mobs.find(m => m.id === 'spray'), kind: 'mob', uid: 998, hits: 3, left: 0, back: 0, up: 0 }];
    G.deck = []; G.boss = boss; G.phase = 'point'; E.flip(G);
    const before = G.plog.length; G.dice.forEach(d => { d.used = true; }); G.rolled = true; E.endRound(G);
    return G.plog.slice(before).filter(x => x.why === 'boss').length;
  };
  assert.strictEqual(lock(false), 0); assert.ok(lock(true) >= 1);
});
