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

test('mob hits scale as printed + analysts − 2, never below 1', () => {
  for (const n of [1, 2, 3, 4]) {
    const G = E.newGame(TEAMS[n][0], 'full', { rnd: rng(1) });
    for (const m of G.deck.filter(c => c.kind === 'mob')) {
      const base = D.mobs.find(x => x.id === m.id).hits;
      assert.strictEqual(m.hits, Math.max(1, base + n - 2));
    }
  }
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
