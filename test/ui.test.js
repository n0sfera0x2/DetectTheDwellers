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
  [...d.querySelectorAll('[data-a=pick]')].slice(0, players).forEach(b => b.click());
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
