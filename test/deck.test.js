const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const skeleton = require('../deck/skeleton');
const { build } = require('../deck/build');

test('the deck is 54 cards and builds six duplex sheets', () => {
  const items = build();
  assert.strictEqual(items.length, 54);
  for (let s = 1; s <= 6; s++) for (const side of ['fronts', 'backs'])
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'dist', 'deck', `sheet-${s}-${side}.html`)));
});

test('card markup matches the snapshot (run `npm run golden` after an intentional change)', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-cards.json'), 'utf8'));
  const now = skeleton();
  assert.strictEqual(now.length, golden.length);
  now.forEach(([f, b], i) => { assert.strictEqual(f, golden[i][0], `front of card ${i + 1} changed`); assert.strictEqual(b, golden[i][1], `back of card ${i + 1} changed`); });
});

test('every SVG gradient id on a sheet is unique', () => {
  const dir = path.join(__dirname, '..', 'dist', 'deck');
  for (const f of fs.readdirSync(dir).filter(x => x.startsWith('sheet-'))) {
    const ids = [...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(new Set(ids).size, ids.length, `${f} has duplicate ids`);
  }
});
