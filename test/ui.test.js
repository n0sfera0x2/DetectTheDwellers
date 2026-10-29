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

// First Shift's boss: a solo analyst, hurt, holding the Recovery and Triage Agents the setup puts in the kit deck.
function firstShiftBoss(hpLost) {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start();
    G.held[0] = ['recover', 'triage'].map(t => ({ ...D.kit.find(c => c.type === t) }));
    G.play = []; G.phase = 'point'; G.deck = []; G.row = []; G.hps = G.hps.map(h => h - ${hpLost}); render();`);
  w.document.querySelector('[data-a=flip]').click();
  return { w, d: w.document, errors };
}

test('the boss reveal names the burn that helps, with the real heal from the crew’s HP', () => {
  const { w, d, errors } = firstShiftBoss(4);
  const move = d.querySelector('.reveal .move'); assert.ok(move, 'no move hint at the reveal');
  assert.match(move.textContent, /Burn your Recovery Agent now: \+4 HP/);
  assert.ok(d.querySelector('.reveal [data-a=burn]'), 'no burn button in the reveal');
  // The damage stat explains Ransom Demand: engine damage vs the printed number.
  if (w.eval('G.boss.id') === 'wyrm') assert.match(d.querySelector('.reveal .stat').textContent, /Damage9.*7 \+2 until 2 hits/);
  d.querySelector('.reveal [data-a=burn]').click();
  assert.ok(!d.querySelector('.reveal'), 'burning should close the reveal into the fight');
  assert.strictEqual(w.eval('G.hps[0]'), w.eval('G.max'));
  // Next move: Triage after the roll, and its chip is lit once the dice are down.
  assert.match(d.querySelector('.tip').textContent, /After you roll, burn your Triage Agent/);
  d.querySelector('[data-a=roll]').click();
  assert.ok(d.querySelector('.kchip.live.urge [data-a=burn]'), 'the burnable kit should be lit in a boss fight');
  assert.deepStrictEqual(errors, []);
});

test('the boss reveal traps focus, and Esc does not start the fight', () => {
  const { w, d, errors } = firstShiftBoss(4);
  const tab = shift => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: !!shift, bubbles: true }));
  const inside = () => !!d.activeElement.closest('.reveal');
  assert.strictEqual(d.activeElement.dataset.a, 'fight', 'Fight should hold focus when the reveal opens');
  tab(); assert.ok(inside()); assert.strictEqual(d.activeElement.dataset.a, 'burn');
  tab(); assert.strictEqual(d.activeElement.dataset.a, 'fight', 'Tab should wrap inside the dialog');
  tab(true); assert.strictEqual(d.activeElement.dataset.a, 'burn', 'Shift+Tab should wrap backwards');
  d.querySelector('[data-a=quit]').focus(); assert.ok(inside(), 'focus escaped the dialog');
  key(w, 'Escape'); assert.ok(d.querySelector('.reveal'), 'Esc should not mean Fight');
  d.querySelector('.reveal [data-a=fight]').click(); assert.ok(!d.querySelector('.reveal'));
  assert.deepStrictEqual(errors, []);
});

test('between fights, the face-down feed card flips the next situation (tap or F)', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start();`);
  const card = d.querySelector('.pdesk .fdown[data-a=flip]'); assert.ok(card, 'no face-down feed card');
  assert.match(card.getAttribute('aria-label'), /Flip situation 1 of/); assert.ok(d.querySelector('.status'), 'no status line');
  assert.ok(!d.querySelector('.pd-point'), 'a solo analyst has no on-point choice');
  card.click(); assert.strictEqual(w.eval('G.sit'), 1); assert.ok(!d.querySelector('.fdown'));
  // Back between fights with a crew: analyst cards pick who's on point, and F flips.
  w.eval(`UI.pick = ['HUN', 'RES']; start();`);
  d.querySelector('.acard[data-a=point][data-v="1"]').click(); assert.strictEqual(w.eval('G.point'), 1);
  assert.strictEqual(d.querySelector('.acard[data-v="1"]').getAttribute('aria-pressed'), 'true');
  key(w, 'f'); assert.strictEqual(w.eval('G.sit'), 1);
  assert.deepStrictEqual(errors, []);
});

test('the boss banner and the reveal’s Your move say the same thing, and name kit that won’t help', () => {
  for (const [held, hurt, want] of [[['hunt'], 0, /Your Hunt Agent can’t touch a boss\. Save it\./], [['recover', 'triage'], 4, /Burn your Recovery Agent now: \+4 HP/], [[], 0, /Every die goes on .+18–20 is two hits/]]) {
    const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
    w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); G.held[0] = ${JSON.stringify(held)}.map(t => ({ ...D.kit.find(c => c.type === t) }));
      G.play = []; G.phase = 'point'; G.deck = []; G.row = []; G.hps = G.hps.map(h => h - ${hurt}); render();`);
    d.querySelector('[data-a=flip]').click();
    const move = d.querySelector('.reveal .move p'), tip = d.querySelector('.tip p');
    assert.ok(move && tip, 'banner or reveal move missing'); assert.strictEqual(tip.textContent, move.textContent);
    assert.match(move.textContent, want); assert.doesNotMatch(d.querySelector('.reveal').textContent, /Burn what you’ve got/);
  }
});

test('a boss loss names a real lever, never “put it down first” for the only enemy left', () => {
  const lose = (held, mobs) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
    w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); G.held[0] = ${JSON.stringify(held)}.map(t => ({ ...D.kit.find(c => c.type === t) }));
      UI.dmg = ${JSON.stringify(mobs)}; G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render(); act('flip'); act('fight'); act('roll');
      G.dice.forEach(d => { d.used = true; }); G.hps[0] = 4; G.blocks = G.blocks.map(() => false); render(); act('end');`);
    return { w, line: d.querySelector('.helped') ? d.querySelector('.helped').textContent : '' };
  };
  let { w, line } = lose(['recover'], {});
  assert.match(line, /Recovery Agent was never burned\. Burned before that roll, it heals 6 HP\. The Hunter had 4 and took 9: those 6 HP would have kept the Hunter standing\./);
  ({ line } = lose(['hunt'], {}));
  assert.doesNotMatch(line, /Hunt Agent/, 'a Hunt Agent is no lever against a boss'); assert.doesNotMatch(line, /down first/);
  assert.match(line, /You met The Lockjaw Syndicate with 18 of 18 HP/);
  ({ line } = lose([], { 'MFA Banshee': 6 }));
  assert.match(line, /MFA Banshee did the most damage: 6 HP/);
});

test('on a wide screen, picking a die moves focus to its first target, so the next key is the hit', () => {
  const { w, d, errors } = rigged();
  w.matchMedia = q => ({ matches: /min-width:\s*1041px/.test(q), media: q });
  w.eval(`UI.sel = null; render();`);
  const die = d.querySelector('[data-a=die]:not(:disabled):not(.dead)'); die.focus(); die.click();
  const t = d.activeElement;
  assert.strictEqual(t.dataset.a, 'hit', 'focus should land on a Hit button after a pick');
  assert.ok(t.classList.contains('hitb'), 'wide screens hit from the mob card');
  assert.ok(w.eval(`E.beats(G, G.dice[UI.sel], G.play.find(m => m.uid === ${t.dataset.v}))`), 'the focused target must be one the die beats');
  // One Hit per target in the markup a wide screen shows: one card button per beaten mob.
  assert.strictEqual(d.querySelectorAll('.hitb').length, w.eval('G.play.filter(m => E.beats(G, G.dice[UI.sel], m)).length'));
  // Number keys still pick, and still hand focus to the target.
  w.eval(`UI.sel = null; render();`); key(w, '2');
  assert.strictEqual(w.eval('UI.sel'), w.eval('UI.order[1]')); assert.strictEqual(d.activeElement.dataset.a, 'hit');
  // Narrow screens keep focus on the die: their targets already follow the dice in the dock.
  w.matchMedia = q => ({ matches: false, media: q }); w.eval(`UI.sel = null; render();`);
  d.querySelector('[data-a=die]:not(:disabled):not(.dead)').click(); assert.strictEqual(d.activeElement.dataset.a, 'die');
  assert.deepStrictEqual(errors, []);
});

test('the header, status line, feed card and fight header agree on the situation number', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  const num = (s, re = /situation (\d+) of (\d+)/i) => { const m = re.exec(s || ''); return m ? `${m[1]}/${m[2]}` : null; };
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); G.deck.length = G.total - 3; G.sit = 3; G.lastSit = { name: 'Coffee Run', rolls: [] }; render();`);
  // Between fights, everything names the situation that comes next.
  const next = `${w.eval('G.sit') + 1}/${w.eval('G.total')}`;
  assert.strictEqual(num(d.querySelector('[data-progress]').textContent), next, 'header');
  assert.strictEqual(num(d.querySelector('.status').textContent), next, 'status line');
  assert.strictEqual(num(d.querySelector('.fdown').getAttribute('aria-label')), next, 'feed card');
  // Flipped: the header, the fight or situation header and the log all name the situation in play.
  w.eval(`G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 990, left: 1, hits: 1, back: 0, up: 0 }); G.row = []; act('flip');`);
  assert.strictEqual(num(d.querySelector('[data-progress]').textContent), next, 'header in the fight');
  assert.strictEqual(num(d.querySelector('#fight-h').textContent), next, 'fight header');
  assert.strictEqual(num(w.eval('G.log[G.log.length - 1].t'), /Situation (\d+)()/).split('/')[0], next.split('/')[0], 'log line');
  w.eval(`G.play = []; G.phase = 'point'; G.deck.push({ ...D.situations.find(s => s.id === 'patch'), kind: 'sit', uid: 991 }); render(); act('flip');`);
  const sitN = `${w.eval('G.sit')}/${w.eval('G.total')}`;
  assert.strictEqual(num(d.querySelector('[data-progress]').textContent), sitN, 'header on a situation');
  assert.strictEqual(num(d.querySelector('.sitc .ptag').textContent), sitN, 'situation card');
  assert.deepStrictEqual(errors, []);
});
