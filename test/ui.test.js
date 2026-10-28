// Plays the built page headlessly in jsdom: every mode must reach the end screen with no script errors.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
require('../scripts/build-page');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');

function playThrough(mode, players) {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  const d = w.document, seen = { tips: 0, burns: 0 };
  const click = s => { const b = [...d.querySelectorAll(s)].find(x => !x.disabled); if (b) { b.click(); return true; } return false; };
  // One analyst is picked by default; "Playing with friends?" opens the crew up to four.
  if (players > 1) { d.querySelector('[data-a=friends]').click(); for (const id of ['RES', 'ENG', 'SOA'].slice(0, players - 1)) d.querySelector(`[data-a=pick][data-v=${id}]`).click(); }
  const crew = [...d.querySelectorAll('[data-a=pick][aria-pressed=true]')].length; if (crew !== players) errors.push(`crew of ${crew}, wanted ${players}`);
  d.querySelector(`[data-a=mode][data-v=${mode}]`).click(); click('[data-a=start]');
  for (let n = 0; n < 4000 && !d.querySelector('#end-h'); n++) {
    if (d.querySelector('.tip')) seen.tips++;
    if (click('[data-a=aim]')) continue;
    if (n % 9 === 0 && click('[data-a=burn]')) { seen.burns++; continue; }
    if (click('[data-a=take]') || click('[data-a=sit]') || click('[data-a=flip]') || click('[data-a=roll]') || click('[data-a=hit]')) continue;
    const live = [...d.querySelectorAll('[data-a=die]')].filter(b => !b.disabled && !b.classList.contains('dead') && b.getAttribute('aria-pressed') !== 'true');
    if (live.length) { live[0].click(); if (d.querySelector('[data-a=hit]')) continue; }
    click('[data-a=end]');
  }
  return { ended: !!d.querySelector('#end-h'), errors, ...seen };
}

for (const mode of ['intro', 'quick', 'full']) for (const players of [1, 3]) {
  test(`${mode} shift, ${players} player(s), plays to the end`, () => {
    const r = playThrough(mode, players);
    assert.deepStrictEqual(r.errors, []); assert.ok(r.ended, 'never reached the end screen');
    if (mode === 'intro') assert.ok(r.tips > 0, 'First Shift tips never showed');
  });
}

test('a booth visitor starts solo; friends can add up to four, and Just me goes back to one', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const on = () => d.querySelectorAll('[data-a=pick][aria-pressed=true]').length;
  assert.strictEqual(on(), 1);
  d.querySelector('[data-a=pick][data-v=RES]').click(); assert.strictEqual(on(), 1, 'solo pick should replace, not add');
  d.querySelector('[data-a=friends]').click(); for (const id of ['HUN', 'ENG', 'SOA', 'PAT']) d.querySelector(`[data-a=pick][data-v=${id}]`).click();
  assert.strictEqual(on(), 4); d.querySelector('[data-a=solo]').click(); assert.strictEqual(on(), 1);
});

// A fresh page with a rigged fight: one mob, dice we control. Drives the page through its own globals.
function rigged() {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN', 'RES']; start();
    G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 990, left: 3, hits: 3, back: 0, up: 0, def: 5 });
    act('flip'); act('roll'); G.dice.forEach(d => { d.r = 10; d.dbl = false; d.used = false; }); UI.sel = 0; render();`);
  return { w, d: w.document, errors };
}
const key = (w, k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));

test('a hit can be undone with the Undo button or the U key', () => {
  const { w, d, errors } = rigged();
  assert.ok(d.querySelector('.dock .tgts [data-a=hit]'), 'a picked die should list its targets in the dock');
  d.querySelector('[data-a=hit]').click();
  assert.strictEqual(w.eval('G.play[0].left'), 2); assert.ok(d.querySelector('[data-a=undo]'), 'no Undo control after a hit');
  key(w, 'u');
  assert.strictEqual(w.eval('G.play[0].left'), 3); assert.strictEqual(w.eval('G.dice[0].used'), false); assert.ok(!d.querySelector('[data-a=undo]'));
  assert.deepStrictEqual(errors, []);
});

test('ending a round with live dice asks first; shortcuts pick dice and end', () => {
  const { w, d, errors } = rigged();
  key(w, '2'); assert.strictEqual(w.eval('UI.sel'), w.eval('UI.order[1]'));
  key(w, 'e'); assert.strictEqual(w.eval('G.round'), 1, 'ended without asking'); assert.match(d.querySelector('[data-a=end]').textContent, /End anyway/);
  key(w, 'e'); assert.strictEqual(w.eval('G.round'), 2);
  assert.match(d.querySelector('.crew').textContent, /Round 1:/, 'round report missing from the crew cards');
  assert.deepStrictEqual(errors, []);
});

test('the boss arrives with a reveal, and a loss names what took the analyst down', () => {
  const { w, d, errors } = rigged();
  w.eval(`G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render();`);
  d.querySelector('[data-a=flip]').click();
  assert.ok(d.querySelector('.reveal [data-a=fight]'), 'no boss reveal'); d.querySelector('[data-a=fight]').click(); assert.ok(!d.querySelector('.reveal'));
  w.eval(`act('roll'); G.dice.forEach(d => { d.used = true; }); G.hps[0] = 1; G.blocks = G.blocks.map(() => false); G.rest = -1; render();`);
  d.querySelector('[data-a=end]').click();
  assert.ok(d.querySelector('#end-h')); assert.match(d.querySelector('.cause').textContent, new RegExp(w.eval('G.boss.name')));
  assert.ok(d.querySelector('.helped'), 'a loss should say what would have helped');
  assert.match(d.querySelector('.cta').textContent, /Binary Defense booth/); assert.ok(!d.querySelector('a.cta'), 'no link until the booth URL is set');
  assert.deepStrictEqual(errors, []);
});

test('quitting mid-shift asks first, then returns to the start screen', () => {
  const { w, d } = rigged();
  d.querySelector('[data-a=quit]').click(); assert.strictEqual(w.eval('UI.screen'), 'game');
  d.querySelector('[data-a=quity]').click(); assert.ok(d.querySelector('[data-a=start]'));
});
