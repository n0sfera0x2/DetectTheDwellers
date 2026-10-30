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
  if (w.eval('G.boss.id') === 'wyrm') {
    const now = w.eval('E.dmgOf(G, G.play[0])'), printed = w.eval('G.boss.dmg');
    assert.match(d.querySelector('.reveal .stat').textContent, new RegExp(`Damage${now}.*${printed} \\+${now - printed} until 2 hits`));
  }
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
  // The last round starts one HP short of surviving the boss's hit, so the burn heal (read from the page) is the difference.
  const lose = (held, mobs) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
    w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); G.held[0] = ${JSON.stringify(held)}.map(t => ({ ...D.kit.find(c => c.type === t) }));
      UI.dmg = ${JSON.stringify(mobs)}; G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render(); act('flip'); act('fight'); act('roll'); const HP0 = Math.max(1, E.dmgOf(G, G.play[0]) - BURN_HEAL + 1);
      G.dice.forEach(d => { d.used = true; }); G.hps[0] = HP0; G.blocks = G.blocks.map(() => false); render(); act('end');`);
    return { w, line: d.querySelector('.helped') ? d.querySelector('.helped').textContent : '' };
  };
  let { w, line } = lose(['recover'], {});
  const heal = w.eval('BURN_HEAL'), took = w.eval('G.lastRound.inc[0]'), had = took - heal + 1;
  assert.match(line, new RegExp(`Recovery Agent was never burned\\. Burned before that roll, it heals ${heal} HP\\. The Hunter had ${had} and took ${took}: those ${heal} HP would have kept the Hunter standing\\.`));
  ({ w, line } = lose(['hunt'], {}));
  assert.doesNotMatch(line, /Hunt Agent/, 'a Hunt Agent is no lever against a boss'); assert.doesNotMatch(line, /down first/);
  const max = w.eval('G.max'); assert.match(line, new RegExp(`You met The Lockjaw Syndicate with ${max} of ${max} HP`));
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

// The shift clock: flip i of n reads 22:00 + (i − 1) × 480 / n minutes, floored to 5. The boss is always 05:59.
test('the shift clock runs 22:00 to dawn, positionally, for any feed length', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window;
  const at = (i, n) => w.eval(`clockAt(${i}, ${n})`);
  const want = { 4: ['22:00', '00:00', '02:00', '04:00'], 5: ['22:00', '23:35', '01:10', '02:45', '04:20'],
    6: ['22:00', '23:20', '00:40', '02:00', '03:20', '04:40'], 7: ['22:00', '23:05', '00:15', '01:25', '02:30', '03:40', '04:50'],
    9: ['22:00', '22:50', '23:45', '00:40', '01:30', '02:25', '03:20', '04:10', '05:05'] };
  for (const [n, times] of Object.entries(want)) assert.deepStrictEqual(times.map((_, i) => at(i + 1, +n)), times, `${n} flips`);
  assert.strictEqual(w.eval('BOSS_TIME'), '05:59');
  // In play: the header stamp follows the situation, and the boss reads 05:59.
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start();`);
  const stamp = () => w.document.querySelector('[data-clock]').textContent;
  assert.strictEqual(stamp(), '22:00');
  w.eval(`G.sit = 3; render();`); assert.strictEqual(stamp(), at(3, w.eval('G.total')));
  w.eval(`G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render(); act('flip');`); assert.strictEqual(stamp(), '05:59');
});

test('the sound toggle works, and is remembered, with no Web Audio at all', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  assert.strictEqual(w.AudioContext, undefined, 'jsdom should have no Web Audio for this test');
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start();`);
  const btn = () => d.querySelector('[data-a=snd]');
  assert.ok(btn(), 'no sound toggle in the top bar'); assert.strictEqual(btn().getAttribute('aria-pressed'), 'true');
  btn().click(); assert.strictEqual(btn().getAttribute('aria-pressed'), 'false'); assert.strictEqual(w.localStorage.getItem('dwellers-sound-v1'), '0');
  btn().click(); assert.strictEqual(btn().getAttribute('aria-pressed'), 'true'); assert.strictEqual(w.localStorage.getItem('dwellers-sound-v1'), '1');
  // Every sting and the ambience are silent no-ops without an AudioContext, and gestures don't throw.
  w.eval(`['roll','hit','double','down','comeback','boss','win','loss','nope'].forEach(n => Sound.play(n)); Sound.ambience(true); Sound.unlock();`);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'x', bubbles: true }));
  assert.strictEqual(w.eval('Sound.live'), false);
  assert.deepStrictEqual(errors, []);
});

test('an agent die picked in a boss fight keeps its agent label and says why it can’t hit', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); G.held[0] = [{ ...D.kit.find(c => c.type === 'triage') }];
    G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render(); act('flip'); act('fight'); act('roll');
    const i = G.dice.findIndex(x => x.kind === 'agent'); G.dice[i].r = 20; UI.sel = i; render();`);
  const die = [...d.querySelectorAll('[data-a=die]')].find(b => b.getAttribute('aria-pressed') === 'true');
  assert.match(die.textContent, /Triage agent/); assert.match(die.getAttribute('aria-label'), /Triage Agent die 20.*picked/);
  assert.match(d.body.textContent, /agents never touch the boss/);
  assert.doesNotMatch(d.body.textContent, /Die 20 can’t hit this one\./);
});

// The end screen's automation report, from a staged G.stats.auto: the non-zero lines show, the zero ones don't.
function endWith(auto, win) {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN', 'RES']; start(); const before = snap();
    G.stats.auto = ${JSON.stringify(auto)}; G.over = true; G.win = ${win}; if (!G.win) { G.dropped = 0; G.downBy = [G.boss.name]; } finish(before);`);
  return { d, errors };
}
test('the end screen reports what the agents did, non-zero lines only, on a win and on a loss', () => {
  const auto = { hits: 10, assist: 12, saved: 0, healed: 22, removed: 2, dodged: 1 };
  for (const win of [true, false]) {
    const { d, errors } = endWith(auto, win), rep = d.querySelector('[data-autorep]');
    assert.ok(rep, 'no automation report'); const t = rep.textContent.replace(/\s+/g, ' ');
    assert.match(t, /landed 10 hits/); assert.match(t, /set up 12 more/); assert.match(t, /healed 22 HP/); assert.match(t, /kept 3 comebacks down/);
    assert.ok(!rep.querySelector('[data-auto=saved]'), 'a zero stat should not show'); assert.doesNotMatch(t, /stopped/);
    assert.deepStrictEqual([...rep.querySelectorAll('[data-auto]')].map(e => e.dataset.auto), ['hits', 'assist', 'healed', 'down']);
    // A loss leads with what the agents did, before the cause.
    if (!win) assert.ok(rep.compareDocumentPosition(d.querySelector('.cause')) & 4, 'the report should come before the cause on a loss');
    assert.deepStrictEqual(errors, []);
  }
  const none = endWith({ hits: 0, assist: 0, saved: 0, healed: 0, removed: 0, dodged: 0 }, false).d.querySelector('[data-autorep]');
  assert.ok(none && !none.querySelector('[data-auto]')); assert.match(none.textContent, /No agents ran this shift/);
});

test('no on-screen rule says a comeback goes down in one hit', () => {
  const oneHit = /(needing|needs|need) (just |only )?one hit|(go|goes) down in one hit|one hit left/i;
  assert.doesNotMatch(html, oneHit, 'the built page still has a one-hit comeback line');
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window;
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); G.phase = 'combat';`);
  for (const p of [{ pre: true, r: 5, back: ['Spray Bot'], hit: ['Spray Bot'] }, { pre: true, r: 5, back: ['A', 'B', 'C'], hit: ['A', 'B'] }]) {
    const t = w.eval(`G.persist = ${JSON.stringify(p)}; persistBanner()`);
    assert.match(t, /full strength/); assert.doesNotMatch(t, oneHit);
  }
  assert.match(w.eval('TIPS.row'), /full strength/);
  for (const t of Object.values(w.eval('D.intro.tips'))) assert.doesNotMatch(t, oneHit);
});

// Story cards: a fresh Quick Shift with a chosen story card on top of the feed, with or without a Recon Agent in the tray.
function story(id, recon) {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); G.held[0] = ${recon ? `[{ ...D.kit.find(c => c.type === 'recon') }]` : '[]'}; G.row = []; G.nextMob = null;
    G.deck.push({ ...D.situations.find(s => s.id === '${id}'), kind: 'sit', uid: 995 }); render(); act('flip');`);
  return { w, d, errors, sit: () => [...d.querySelectorAll('.dock [data-a=sit]')] };
}

test('a story card with a Recon Agent lights the Recon line and resolves with one button, no roll', () => {
  for (const id of ['insider', 'ceo']) {
    const { w, d, errors, sit } = story(id, true), card = w.eval(`D.situations.find(s => s.id === '${id}')`);
    assert.ok(d.querySelector('.sitc .ptag.st'), 'no Story label'); assert.match(d.querySelector('.sitc').textContent, /Story/);
    const rc = d.querySelector('.sitc .recon'); assert.ok(rc && rc.classList.contains('on'), 'the Recon line should be lit');
    assert.match(rc.textContent, /your Recon Agent has this/); assert.ok(rc.textContent.includes(card.reconText));
    assert.ok(d.querySelector('.sitc .rulebox.off'), 'the normal outcome should be dimmed');
    assert.strictEqual(sit().length, 1, `${id}: one Resolve button, not the options or a roll`); assert.match(sit()[0].textContent, /Resolve with Recon/);
    const kit = w.eval('G.kit.length'); sit()[0].click();
    assert.strictEqual(w.eval('G.lastSit.recon'), true); assert.strictEqual(w.eval('G.lastSit.rolls.length'), 0, 'Recon skips the roll');
    assert.strictEqual(w.eval('G.kit.length'), kit - 1, 'the Recon line draws a kit card');
    assert.match(d.querySelector('.status').textContent, /Recon outcome/); assert.ok(d.querySelector('.status').textContent.includes(card.reconText));
    assert.deepStrictEqual(errors, []);
  }
});

test('a story card without Recon shows the Recon line as a hint and plays the normal outcome', () => {
  let { w, d, errors, sit } = story('insider', false);
  const rc = d.querySelector('.sitc .recon'); assert.ok(rc && !rc.classList.contains('on')); assert.match(rc.textContent, /^With a Recon Agent:/);
  assert.ok(d.querySelector('.sitc .rulebox:not(.off)'), 'the normal rule leads without Recon');
  assert.strictEqual(sit().length, 1); assert.match(sit()[0].textContent, /rolls/);
  sit()[0].click(); assert.strictEqual(w.eval('G.lastSit.rolls.length'), 1); assert.ok(!w.eval('G.lastSit.recon'));
  assert.deepStrictEqual(errors, []);
  // A choice without Recon keeps both options; picking the second marks the next mob, and the mark shows until a mob flips.
  ({ w, d, errors, sit } = story('ceo', false));
  assert.strictEqual(sit().length, 2); sit()[1].click();
  assert.match(d.querySelector('.status').textContent, /no Recon Agent, so the normal outcome: you chose let it ride/);
  assert.match(d.querySelector('[data-nextmob]').textContent, /Next mob: \+2 Damage/);
  w.eval(`G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 996, left: 1, hits: 1, back: 0, up: 0 }); act('flip');`);
  const m = w.eval('G.play[0]'); assert.ok(m.mod, 'the flipped mob should carry the mark');
  assert.match(d.querySelector('.mob .stat').textContent, new RegExp(`Damage${m.dmg}.*${m.dmg - 2} \\+2 story`));
  assert.ok(!d.querySelector('[data-nextmob]'));
  assert.deepStrictEqual(errors, []);
});

test('the Recon burn lists the next three situations and pulls the one picked', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); G.held[0] = [{ ...D.kit.find(c => c.type === 'recon') }]; render();`);
  const top = JSON.parse(w.eval('JSON.stringify(G.deck.slice(-3).map(c => c.name))')), n = w.eval('G.deck.length');
  d.querySelector('.kchip [data-a=burn]').click();
  const opts = [...d.querySelectorAll('.pull [data-a=aim]')]; assert.strictEqual(opts.length, 3);
  assert.deepStrictEqual(opts.map(b => b.querySelector('b').textContent), top.slice().reverse(), 'next first');
  assert.match(opts[0].textContent, /Next/); assert.ok(opts.every(b => b.querySelector('.pt').textContent.length));
  opts[1].click();
  assert.strictEqual(w.eval('G.deck.length'), n - 1); assert.ok(!w.eval('G.deck.map(c => c.name)').includes(top[1]), 'the picked card should leave the feed');
  assert.ok(w.eval('G.deck.map(c => c.name)').includes(top[0]) && w.eval('G.deck.map(c => c.name)').includes(top[2]));
  assert.strictEqual(w.eval('UI.pulled'), 1);
  w.eval(`G.over = true; G.win = true; finish(snap());`);
  assert.match(d.querySelector('[data-autorep]').textContent, /pulled 1 card from the feed/);
  assert.deepStrictEqual(errors, []);
});

test('a boss ability that rolls the row names itself in the Row roll banner, and the advice names the trigger (Full Shift)', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'full'; UI.pick = ['HUN']; start(); G.boss = { ...G.boss, ...D.bosses.find(b => b.id === 'wyrm') };
    const m = { ...D.mobs.find(x => x.id === 'ogre'), kind: 'mob', uid: 997, left: 1, hits: 1, back: 0, up: 0, persist: [1, 20] };
    G.play = []; G.phase = 'point'; G.deck = []; G.row = [m]; G.hps = [999]; G.max = 999; render(); act('flip');`);
  assert.match(d.querySelector('.reveal .move').textContent, /Double extortion: every round it’s still up rolls for the row, so end it fast\./);
  w.eval(`act('fight'); G.row.push({ ...D.mobs.find(x => x.id === 'ogre'), kind: 'mob', uid: 998, left: 1, hits: 1, back: 0, up: 0, persist: [1, 20] }); act('roll'); G.dice.forEach(d => { d.used = true; }); render(); act('end'); act('end');`);
  const lead = d.querySelector('.pbanner .lead.f'); assert.ok(lead, 'no boss Row roll banner');
  assert.strictEqual(lead.textContent, 'Double extortion: the Lockjaw Syndicate rolls for the row.');
  assert.deepStrictEqual(errors, []);
});

test('the automation report counts story cards Recon turned', () => {
  const { d } = endWith({ hits: 0, assist: 0, saved: 0, healed: 0, removed: 0, dodged: 0, recon: 2 }, true);
  assert.match(d.querySelector('[data-autorep]').textContent, /turned 2 story cards your way/);
});

test('the analyst picker shows each perk and agent link from data, with a playstyle line', () => {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cards.json'), 'utf8'));
  const d = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window.document;
  for (const c of D.classes) {
    const b = d.querySelector(`[data-a=pick][data-v=${c.id}]`), t = s => (s || '').replace(/\s+/g, ' ').trim();
    assert.strictEqual(t(b.querySelector('.perk').textContent), t(c.perk), `${c.name} perk is not the data text`);
    const ag = b.querySelector('.agl'); assert.ok(ag, `${c.name} has no agent line`);
    assert.strictEqual(ag.querySelector('.phud').textContent, 'Agents'); assert.ok(t(ag.textContent).endsWith(t(c.agent)), `${c.name} agent line is not the data text`);
    assert.ok(b.querySelector('.style').textContent.length > 0, `${c.name} has no playstyle line`);
  }
  // No stale perk numbers anywhere on the page.
  assert.doesNotMatch(html, /16–20 for the Engineer|16–20 count as doubles|heals 3 HP, not just you for 1/);
});

test('a finished First Shift offers Quick Shift (random boss) first, and the next visit starts there', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  assert.strictEqual(w.eval('UI.mode'), 'intro', 'a first visit should start on First Shift');
  assert.match(d.querySelector('[data-a=mode][data-v=quick]').textContent, /Boss: random/);
  assert.match(d.querySelector('[data-a=mode][data-v=intro]').textContent, /Boss: Lockjaw Syndicate/);
  w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); const before = snap(); G.over = true; G.win = true; finish(before);`);
  const p = d.querySelector('.endbar [data-primary]'); assert.strictEqual(p.dataset.a, 'next'); assert.match(p.textContent, /Next: Quick Shift/);
  assert.match(d.querySelector('.endbar [data-a=again]').textContent, /Run First Shift again/);
  assert.strictEqual(w.localStorage.getItem('dwellers-mode-v1'), 'quick');
  p.click(); assert.strictEqual(w.eval('UI.screen'), 'game'); assert.strictEqual(w.eval('G.mode'), 'quick');
  // A returning player (same browser storage, new page) lands on Quick Shift.
  const w2 = new JSDOM(html.replace(/<script>[\s\S]*<\/script>/, ''), { runScripts: 'outside-only', url: 'https://example.org/' }).window; w2.localStorage.setItem('dwellers-mode-v1', 'quick');
  w2.eval(html.match(/<script>([\s\S]*)<\/script>/)[1] + ';window.__mode = UI.mode;');
  assert.strictEqual(w2.__mode, 'quick'); assert.strictEqual(w2.document.querySelector('[data-a=mode][aria-pressed=true]').dataset.v, 'quick');
  assert.deepStrictEqual(errors, []);
});

test('a comeback finished by the Hunter is gone for good, and says so', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 990, left: 3, hits: 3, back: 0, up: 0, def: 5 });
    act('flip'); act('roll');
    G.play = [{ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 991, left: 1, hits: 2, back: 1, up: 0, def: 5 }, { ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 992, left: 3, hits: 3, back: 0, up: 0, def: 5 }];
    G.dice.forEach(d => { d.r = 10; d.dbl = false; d.used = false; }); UI.sel = 0; render(); act('hit', '991');`);
  assert.strictEqual(w.eval('G.row.length'), 0, 'the comeback went back to the row');
  const g = d.querySelector('[data-gone]'); assert.ok(g, 'no gone-for-good line in the fight');
  assert.match(g.textContent, /Gone for good/); assert.doesNotMatch(d.querySelector('.main').textContent, /Into the persistence row/);
  assert.ok(d.querySelector('.mob.ko.gonek'), 'the knocked-out card should carry the gone-for-good stamp');
  assert.deepStrictEqual(errors, []);
});

test('the Fixer’s after-fight heal shows in the fight summary', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.friends = true; UI.pick = ['PAT', 'HUN']; start(); G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 990, left: 1, hits: 1, back: 0, up: 0, def: 5 });
    act('flip'); act('roll'); G.play.forEach(m => { m.left = 1; }); G.play.splice(1); G.hps = G.hps.map(h => h - 10); G.dice.forEach(d => { d.r = 10; d.dbl = false; d.used = false; }); UI.sel = 0; render(); act('hit', String(G.play[0].uid));`);
  const n = (JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cards.json'), 'utf8')).perks.PAT || {}).fight;
  assert.match(d.querySelector('[data-fixer]').textContent, new RegExp(`The Fixer patched the crew: \\+${n} HP`));
  assert.deepStrictEqual(errors, []);
});

// Core and advanced rules: First and Quick Shift never show a story card or a boss row trigger; Full Shift shows both.
const bossReveal = (mode, id) => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = '${mode}'; UI.pick = ['HUN']; start(); G.boss = { ...G.boss, ...D.bosses.find(b => b.id === '${id}') }; G.play = []; G.phase = 'point'; G.deck = []; G.row = []; render(); act('flip');`);
  return { w, d, errors };
};
test('the mode cards say which rules each mode plays', () => {
  const d = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window.document, t = k => d.querySelector(`[data-a=mode][data-v=${k}] .rules-l`).textContent;
  assert.strictEqual(t('intro'), 'Core rules'); assert.strictEqual(t('quick'), 'Core rules'); assert.strictEqual(t('full'), 'Core + story cards + boss row triggers');
  assert.match(d.querySelector('[data-a=mode][data-v=full]').textContent, /Boss: random/);
});
test('a Quick Shift boss reveal shows only the core ability, with no row-trigger advice', () => {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cards.json'), 'utf8'));
  for (const b of D.bosses) {
    const { w, d, errors } = bossReveal('quick', b.id);
    const ab = d.querySelector('.reveal .ability').textContent, mv = d.querySelector('.reveal .move').textContent;
    assert.doesNotMatch(ab, /\brow\b/, `${b.name}: the core ability mentions the row`); assert.ok(ab.length > b.abilityName.length + 4, `${b.name}: no core ability left`);
    assert.doesNotMatch(mv, /\brow\b/, `${b.name}: Your move mentions the row trigger`);
    w.eval(`act('fight'); render();`);
    assert.doesNotMatch(d.querySelector('.mob .ability').textContent, /\brow\b/);
    const tip = d.querySelector('.tip'); if (tip) assert.doesNotMatch(tip.textContent, new RegExp(b.abilityName + ':'));
    assert.deepStrictEqual(errors, []);
  }
  // First Shift (Lockjaw, core) teaches the boss without the trigger too.
  const { d } = bossReveal('intro', 'wyrm'); assert.doesNotMatch(d.querySelector('.reveal').textContent, /rolls for the row/);
});
test('a Full Shift boss reveal names the row trigger in the ability and in Your move', () => {
  for (const id of ['wyrm', 'apt', 'ai']) {
    const { d, errors } = bossReveal('full', id);
    assert.match(d.querySelector('.reveal .ability').textContent, /\brow\b/); assert.match(d.querySelector('.reveal .move').textContent, /\brow\b/);
    assert.deepStrictEqual(errors, []);
  }
});
test('a Quick Shift never deals a story card or shows the Recon Agent’s story clause', () => {
  for (let seed = 0; seed < 6; seed++) {
    const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
    w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start();`);
    assert.strictEqual(w.eval('G.deck.filter(c => c.story).length'), 0, 'a story card in a Quick Shift feed');
    w.eval(`G.phase = 'loot'; G.loot = [D.kit.find(k => k.type === 'recon')]; render();`);
    assert.doesNotMatch(d.querySelector('.lootc').textContent, /story card/i);
  }
  const r = playThrough('quick', 1); assert.deepStrictEqual(r.errors, []);
});
test('a rebuilt kit deck is told once in the status line', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'full'; UI.pick = ['HUN']; start(); G.deck.push({ ...D.mobs.find(m => m.id === 'ogre'), kind: 'mob', uid: 990, left: 1, hits: 1, back: 0, up: 0, def: 5 });
    act('flip'); act('roll'); G.play.splice(1); G.play[0].left = 1; G.discard = G.kit.splice(0); G.dice.forEach(d => { d.r = 10; d.dbl = false; d.used = false; }); UI.sel = 0; render(); act('hit', String(G.play[0].uid));`);
  assert.ok(w.eval('G.log.some(l => /^The kit deck is empty/.test(l.t))'), 'the engine never rebuilt the kit deck');
  const s = d.querySelectorAll('[data-reshuffle]'); assert.strictEqual(s.length, 1); assert.match(s[0].textContent, /Kit deck rebuilt from burned agents/);
  w.eval(`while (G.phase === 'loot') act('take', '0'); act('flip');`); assert.strictEqual(d.querySelectorAll('[data-reshuffle]').length, 0, 'still told after the next flip');
  assert.deepStrictEqual(errors, []);
});
test('the end screen shows how long the shift took, stores it, and copies a one-line result', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'quick'; UI.pick = ['HUN']; start(); Clock.t0 -= 14 * 60000; const before = snap(); G.over = true; G.win = true; finish(before);`);
  assert.match(d.querySelector('[data-dur]').textContent, /Shift took 14 min/);
  const saved = JSON.parse(w.localStorage.getItem('dwellers-board-v29')); assert.strictEqual(Math.round(saved[0].min), 14);
  const line = w.eval('resultLine()');
  assert.match(line, /Quick Shift \(core\)/); assert.match(line, /Hunter \(1p\)/); assert.match(line, /14 min/); assert.match(line, /rounds?/); assert.match(line, /agents:/); assert.match(line, /Win: /);
  d.querySelector('[data-a=copy]').click();
  assert.ok(d.querySelector('[data-a=copy]').textContent === 'Copied' || d.querySelector('.copyx input').value === line, 'no copy feedback');
  assert.deepStrictEqual(errors, []);
});
test('the built page names its embedded fonts and the SIL Open Font License', () => {
  const top = html.slice(0, 600);
  const note = (top.match(/<!--([\s\S]*?)-->/) || [])[1] || '';
  for (const t of ['Chakra Petch', 'IBM Plex Mono', 'SIL Open Font License 1.1']) assert.ok(note.includes(t), `the font notice lacks ${t}`);
  assert.match(top, /Copyright 2018 The Chakra Petch Project Authors/); assert.match(top, /Copyright 2017 IBM Corp\./);
  assert.match(html, /^<!doctype html>/i, 'the notice must not push the doctype down');
});

test('a 14+ die can guard instead of hitting: button or G key, a distinct die, the blocking badge, and Undo takes it back', () => {
  const { w, d, errors } = rigged();
  w.eval(`G.play[0].ability = null; G.blocks = G.team.map(() => false); G.dice[0].r = 15; UI.sel = 0; render();`);
  const k = w.eval('G.dice[0].k'), b = d.querySelector('[data-a=guard]');
  assert.ok(b, 'no Guard button for a picked 15'); assert.match(b.textContent, /Guard with the 15/);
  b.click();
  assert.strictEqual(w.eval('G.dice[0].guard'), true); assert.strictEqual(w.eval(`G.blocks[${k}]`), true); assert.strictEqual(w.eval('G.play[0].left'), 3, 'a guard must not hit');
  const die = d.querySelector('[data-a=die][data-v="0"]'); assert.ok(die.classList.contains('grd'), 'guarded die not marked'); assert.match(die.getAttribute('aria-label'), /guarding/);
  assert.match(d.querySelector('.dock').textContent, /blocking/); assert.match(d.querySelector(`[data-hp="${k}"]`).textContent, /blocking/);
  key(w, 'u');
  assert.strictEqual(w.eval('G.dice[0].guard'), false); assert.strictEqual(w.eval(`G.blocks[${k}]`), false); assert.strictEqual(w.eval('UI.sel'), 0, 'undo should leave the die picked');
  key(w, 'g'); assert.strictEqual(w.eval('G.dice[0].guard'), true, 'the G key should guard with the picked die');
  // A 13 can't guard, and neither can a die whose roller already blocks.
  w.eval(`G.dice[1].r = 13; UI.sel = 1; render();`); assert.ok(!d.querySelector('[data-a=guard]'), 'a 13 offered Guard');
  w.eval(`G.dice[1].r = 16; G.dice[1].k = ${k}; render();`); assert.ok(!d.querySelector('[data-a=guard]'), 'Guard offered to an analyst already blocking');
  assert.deepStrictEqual(errors, []);
});

test('the fight explainer and the double tip teach Guard', () => {
  const { w, d, errors } = rigged();
  w.eval(`G.play[0].ability = null; render();`);
  const tips = w.eval('TIPS'); assert.match(tips.double, /guard/); assert.match(tips.guard, /14\+/); assert.match(tips.end, /guard/);
  const rb = d.querySelector('.rbrief'); if (rb) assert.match(rb.textContent, /guard with any die showing 14\+/i);
  assert.deepStrictEqual(errors, []);
});

test('First Shift: the second flip brings the Banshee back, and the tip says so', () => {
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
  const errors = []; w.addEventListener('error', e => errors.push(e.message));
  w.eval(`UI.mode = 'intro'; UI.pick = ['HUN']; start(); act('flip');
    for (let n = 0; n < 20 && G.phase === 'combat'; n++) { act('roll'); G.dice.forEach(x => { x.r = 20; x.dbl = true; }); for (let i = 0; i < G.dice.length && G.phase === 'combat'; i++) if (G.play[0] && E.beats(G, G.dice[i], G.play[0])) { UI.sel = i; act('hit', String(G.play[0].uid)); } if (G.phase === 'combat') act('end'); act('end'); }
    while (G.phase === 'loot') act('take', '0'); act('flip');`);
  assert.strictEqual(w.eval('G.sit'), 2); assert.strictEqual(w.eval('G.plog[G.plog.length - 1].r'), 1, 'flip 2 should use the scripted row result');
  const banshee = w.eval(`D.mobs.find(m => m.id === 'banshee').name`);
  assert.match(d.querySelector('.pbanner').textContent, new RegExp(banshee));
  const tip = d.querySelector('.tip').textContent; assert.match(tip, /back/i); assert.match(tip, /Banshee/);
  assert.deepStrictEqual(errors, []);
});

test('the web mob card shows hits exactly like the printed card: the 1p–4p strip, this crew marked, no solo note', () => {
  const C = require('../deck/cards'), D = require('../data/cards.json');
  const flat = t => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  for (const n of [1, 3]) {
    const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/' }).window, d = w.document;
    w.eval(`UI.mode = 'quick'; UI.pick = ${JSON.stringify(['HUN', 'RES', 'ENG'].slice(0, n))}; start(); G.row = [];
      G.deck = G.deck.filter(c => c.kind !== 'mob' || c.id !== 'bat'); G.deck.push({ ...D.mobs.find(m => m.id === 'bat'), kind: 'mob', uid: 995, hits: E.mobHits(D.mobs.find(m => m.id === 'bat').hits, G.team.length), left: 1, back: 0, up: 0 }); act('flip'); render();`);
    const card = d.querySelector('[data-mob="995"]'); assert.ok(card, 'mob card not rendered');
    const strip = card.querySelector('.hstrip'); assert.ok(strip, 'no hits strip');
    const printed = flat(C.mob(D.mobs.find(m => m.id === 'bat'))).match(/Hits 1p \d+ 2p \d+ 3p \d+ 4p \d+/i)[0].toLowerCase();
    assert.strictEqual(flat(strip.innerHTML).toLowerCase(), printed);
    assert.strictEqual(strip.querySelector('.hc.on .hp').textContent, `${n}p`);
    assert.ok(!/solo|−\d/.test(card.querySelector('.stat').textContent), 'hits note leaked onto the card');
    assert.match(card.querySelector('.rng').textContent, /^Back 1–\d+$/);
  }
});
