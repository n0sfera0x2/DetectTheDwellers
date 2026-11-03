// Chapter dice web prototype: the page script. Renders the engine state (CDEngine) with the shared paper card
// markup (CDCards) and adds live state around the cards: the threat dice set under each card (taken ones turned
// aside), slot highlights for the selected die, stamps, and the motion and sound of the real game (ui/ui.js): cards
// flip in, comebacks get a Back stamp, a beaten mob goes down, dice tumble and land, short Web Audio stings.
// Nothing is drawn on a card face. Throwaway prototype code, inlined into web/index.html by web/build.js.
(function () {
  const E = window.CDEngine, A = window.CDCards, D = window.CD_DATA, ART = window.CD_ART || {};
  const app = document.getElementById('app'), live = document.getElementById('live');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const qs = new URLSearchParams(location.search || '');
  const UI = { G: null, sel: null, more: null, guarding: null, dealTo: null, drawer: null, cards: false, start: 0, end: 0, msg: '', err: false, copied: null, reveal: false,
    setup: { team: ['HUN', 'RES'], mode: 'quick' }, seed: qs.has('seed') ? +qs.get('seed') : (Date.now() % 1e9) };
  const nm = id => A.cls(id).name;
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const mmss = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const dataMob = id => D.mobs.find(m => m.id === id);
  const cardFor = m => m.boss ? A.bossCard(A.boss(m.id)) : A.mobCard(dataMob(m.id));
  const cardKey = m => m.boss ? 'boss:' + m.id : 'mob:' + m.id;
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };

  // ---- Art helpers (as ui/ui.js): scenes fill their frame; analyst thumbnails crop to the analyst and their screen ----
  const slice = svg => { const s = String(svg || ''); return /^<svg[^>]*preserveAspectRatio=/.test(s) ? s.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid slice"') : s.replace('<svg', '<svg preserveAspectRatio="xMidYMid slice"'); };
  const crop = (svg, vb) => vb ? slice(svg).replace(/viewBox="[^"]*"/, `viewBox="${vb}"`) : slice(svg);
  const THUMB = { HUN: '40 14 120 80', RES: '60 6 135 90', ENG: '34 10 120 80', SOA: '45 4 135 90' };
  const SQUARE = id => THUMB[id].replace(/ \d+ \d+$/, ' 90 90');
  const SHORT = { HUN: 'Hunter', RES: 'Resp.', ENG: 'Eng.', SOA: 'Soar.' };
  const STYLE = { HUN: 'Rolls deep', RES: 'Patches the crew', ENG: 'Rolls hot', SOA: 'Runs the automation' };
  const ic = p => `<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = { check: ic('<path d="M3 8.5l3.2 3L13 4.5"/>'), shield: ic('<path d="M8 1.8l5 2v4c0 3.2-2.2 5.3-5 6.4-2.8-1.1-5-3.2-5-6.4v-4z"/>') };
  const SPK = on => ic(`<path d="M2 6h3l4-3v10l-4-3H2z"/>${on ? '<path d="M11.5 5.5a3.5 3.5 0 010 5"/><path d="M13.5 3.5a6.5 6.5 0 010 9"/>' : '<path d="M11 6l4 4M15 6l-4 4"/>'}`);

  // ---- The shift clock (as ui/ui.js): 22:00 to 06:00 by feed card, never real time. The boss at 05:59 ----
  // The feed is dealt at random (2026-11-02), so the clock and the bar count feed cards, not fights.
  const BOSS_TIME = '05:59', flipped = G => G.feedTotal - G.feed.length;
  function clockAt(i, n) {
    const m = 22 * 60 + Math.floor((Math.max(1, i) - 1) * 480 / Math.max(1, n) / 5) * 5;
    return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  const clockNow = () => UI.G.bossOut ? BOSS_TIME : clockAt(flipped(UI.G), UI.G.feedTotal);

  // ---- Sound (as ui/ui.js): synthesised Web Audio stings, no files. Nothing starts before a gesture; no-op in jsdom ----
  const SND_LS = 'dwellers-chapter-sound-v1';
  const Sound = (() => {
    let on = true; try { on = localStorage.getItem(SND_LS) !== '0'; } catch (e) { /* private mode: on for this visit */ }
    let ctx = null, master = null, sfx = null;
    const AC = () => { try { return window.AudioContext || window.webkitAudioContext || null; } catch (e) { return null; } };
    function ensure() {
      if (ctx) return ctx; const C = AC(); if (!C) return null;
      try { ctx = new C(); master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination); sfx = ctx.createGain(); sfx.gain.value = .32; sfx.connect(master); } catch (e) { ctx = null; }
      return ctx;
    }
    function noiseBuf(sec) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
    function tone(f, t, dur, { type = 'sine', g = .5, to = null, a = .01 } = {}) {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(v).connect(sfx); o.start(t); o.stop(t + dur + .05);
    }
    function hiss(t, dur, { f = 3000, q = 1.2, g = .5, type = 'bandpass' } = {}) {
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), v = ctx.createGain(); s.buffer = noiseBuf(Math.max(.05, dur)); bp.type = type; bp.frequency.value = f; bp.Q.value = q;
      v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(bp).connect(v).connect(sfx); s.start(t); s.stop(t + dur + .02);
    }
    const STING = {
      roll: t => { for (let i = 0; i < 9; i++) hiss(t + i * .055 + Math.random() * .025, .045, { f: 1800 + Math.random() * 2200, q: 3, g: .55 - i * .04 }); },
      hit: t => { tone(150, t, .16, { g: .7, to: 55 }); hiss(t, .05, { f: 1200, g: .4 }); },
      double: t => { tone(660, t, .18, { type: 'triangle', g: .3 }); tone(990, t + .07, .3, { type: 'triangle', g: .3 }); tone(1320, t + .14, .4, { g: .18 }); },
      guard: t => { tone(520, t, .22, { type: 'triangle', g: .25 }); tone(780, t + .05, .3, { g: .14 }); },
      down: t => { tone(320, t, .42, { type: 'sawtooth', g: .18, to: 70 }); tone(90, t, .3, { g: .6, to: 40 }); hiss(t, .3, { f: 600, q: .7, g: .3, type: 'lowpass' }); },
      comeback: t => { tone(220, t, 1.1, { type: 'triangle', g: .22, a: .35 }); tone(233, t, 1.1, { type: 'triangle', g: .2, a: .35 }); tone(110, t + .1, 1, { g: .25, a: .3 }); },
      boss: t => { tone(55, t, 2.2, { type: 'sawtooth', g: .22, a: .6 }); tone(58.3, t, 2.2, { type: 'sawtooth', g: .18, a: .6 }); tone(41, t + .2, 1.8, { g: .5, a: .4 }); hiss(t, 1.4, { f: 300, q: .6, g: .2, type: 'lowpass' }); },
      win: t => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * .16, 1.6 - i * .2, { g: .22, a: .04 })); tone(261.6, t, 2.2, { type: 'triangle', g: .14, a: .5 }); },
      loss: t => { [392, 311.1, 261.6].forEach((f, i) => tone(f, t + i * .32, .6, { type: 'triangle', g: .26 })); tone(880, t + 1.1, 1.2, { g: .07, a: .02 }); },
    };
    function play(name, delay = 0) { if (!on || !ensure() || !STING[name]) return; try { if (ctx.state === 'suspended') ctx.resume(); STING[name](ctx.currentTime + .01 + delay / 1000); } catch (e) { /* audio is best-effort */ } }
    function unlock() { if (!on || !ensure()) return; try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* best-effort */ } }
    function toggle() { on = !on; try { localStorage.setItem(SND_LS, on ? '1' : '0'); } catch (e) { /* this visit only */ } if (on) unlock(); if (ctx) try { master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); } catch (e) { /* best-effort */ } return on; }
    return { play, unlock, toggle, get on() { return on; } };
  })();
  ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => Sound.unlock(), { capture: true }));
  const say = t => { if (!live || !t) return; live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

  // ---- Effects: each action is diffed against the state before it; the flags live for this tick's renders only ----
  // so a card flips in once, a stamp lands once, a die tumbles once. Presentation only: the engine has resolved.
  let FX = null;
  const offKeys = G => new Set([...G.play, ...G.row].flatMap(m => m.off.map((o, p) => o ? m.uid + '-' + p : null)).filter(Boolean));
  function snap(G) { return G ? { hp: G.hp.slice(), inPlay: new Set(G.play.map(m => m.uid + ':' + m.back)), down: new Set(G.play.filter(m => !E.left(m)).map(m => m.uid)),
    off: offKeys(G), rows: G.rows.length, phase: G.phase, round: G.round, fight: G.fight, dice: G.dice.length, bossOut: G.bossOut, over: G.over, guards: G.dice.filter(d => d.used === 'guard').length } : null; }
  function diff(b, G) {
    const fx = { enter: new Set(), ko: new Set(), struck: new Set(), hurt: new Set(), row: null, roll: false, boss: false, over: false, guard: false };
    if (!b || !G) return fx;
    G.play.forEach(m => { if (!b.inPlay.has(m.uid + ':' + m.back)) fx.enter.add(m.uid); if (!E.left(m) && !b.down.has(m.uid)) fx.ko.add(m.uid); });
    offKeys(G).forEach(k => { if (!b.off.has(k)) fx.struck.add(k); });
    G.hp.forEach((h, k) => { if (h < b.hp[k]) fx.hurt.add(k); });
    if (G.rows.length > b.rows) fx.row = G.rows[G.rows.length - 1];
    fx.roll = G.phase === 'assign' && (b.phase !== 'assign' || G.dice.length > b.dice);
    fx.boss = G.bossOut && !b.bossOut; fx.over = G.over && !b.over;
    fx.guard = G.dice.filter(d => d.used === 'guard').length > b.guards;
    return fx;
  }
  function act(fn, okMsg) {
    const before = snap(UI.G);
    try { fn(); UI.msg = okMsg || ''; UI.err = false; }
    catch (e) { if (!e.rule) throw e; UI.msg = e.message; UI.err = true; }
    const G = UI.G;
    if (G && G.over && !UI.end) UI.end = Date.now();
    const fx = FX = diff(before, G);
    if (fx.boss) UI.reveal = true;
    render();
    setTimeout(() => { if (FX === fx) { effects(fx); FX = null; } }, 0);
  }
  // After the renders of one action: dice tumble, the amber pair tumbles, stings play, HP readouts flash.
  const ROLL_MS = 560, ROLL_STAGGER = 45, ROW_MS = 660;
  function tumble(els, ms0, face) {
    let last = 0;
    els.forEach((el, n) => {
      const f = el.querySelector('.f'); if (!f) return; const keep = f.innerHTML, ms = ms0 + n * ROLL_STAGGER; last = Math.max(last, ms);
      el.classList.add('rolling');
      const t = setInterval(() => { if (!el.isConnected) return clearInterval(t); f.innerHTML = face(1 + Math.floor(Math.random() * 6)); }, 70);
      setTimeout(() => { clearInterval(t); if (!el.isConnected) return; f.innerHTML = keep; el.classList.remove('rolling'); el.classList.add('landed'); }, ms);
    });
    return last;
  }
  function effects(fx) {
    const G = UI.G; if (!G) return;
    const motion = !reduced();
    fx.hurt.forEach(k => { const el = app.querySelector(`[data-hp="${k}"]`); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } });
    let wait = 0;
    if (fx.row) {
      Sound.play('roll');
      const amb = [...app.querySelectorAll('.t-rowroll.new .t-amb')], bn = app.querySelector('.t-rowroll.new');
      if (motion && amb.length) { if (bn) bn.classList.add('rolling'); wait = tumble(amb, ROW_MS - ROLL_STAGGER, n => A.pip(n, 34)); setTimeout(() => { if (bn && bn.isConnected) bn.classList.remove('rolling'); }, wait); }
      if (fx.row.back.length) Sound.play('comeback', motion ? ROW_MS : 0);
    }
    if (fx.roll) {
      const dice = [...app.querySelectorAll('.t-die:not(.used)')];
      if (motion && dice.length) { setTimeout(() => tumble(dice.filter(d => d.isConnected), ROLL_MS, n => A.pip(n, 40)), wait); }
      Sound.play('roll', wait); if (G.dice.some(d => d.dbl)) Sound.play('double', wait + (motion ? ROLL_MS : 0));
    }
    if (fx.ko.size) Sound.play('down'); else if (fx.struck.size) Sound.play('hit'); else if (fx.guard) Sound.play('guard');
    if (fx.boss) Sound.play('boss');
    if (fx.over) Sound.play(G.win ? 'win' : 'loss', 300);
    const lines = [];
    if (fx.row) lines.push(`Row roll ${fx.row.pair[0]} plus ${fx.row.pair[1]}, ${fx.row.roll}: ${fx.row.back.length ? fx.row.back.join(', ') + ' came back' : 'nothing came back'}.`);
    if (fx.ko.size) lines.push(G.play.filter(m => fx.ko.has(m.uid)).map(m => m.name).join(', ') + ' is down.');
    if (fx.over) lines.push(G.win ? 'Shift survived.' : 'Shift lost.');
    say(lines.join(' '));
  }

  // ---- Actions ------------------------------------------------------------------------------------------------
  function startGame() {
    const team = UI.setup.team.slice();
    UI.G = E.newGame({ team, seed: UI.seed, mode: UI.setup.mode }); UI.start = Date.now(); UI.end = 0; UI.sel = null; UI.more = null; UI.dealTo = null; UI.msg = ''; UI.copied = null; UI.reveal = false; UI.guarding = null;
    render(); focusKey(UI.G.phase === 'deal' ? 'give0' : 'flip'); say(`Shift started at 22:00. Survive until 06:00. ${UI.G.phase === 'deal' ? `Deal the ${UI.G.deal.length} items, then pick who is on point and flip.` : team.length > 1 ? 'Pick who is on point, then flip.' : 'Flip the first alarm.'}`);
  }
  // After a die is used, select the next unused die that can still do something.
  function nextDie() {
    const G = UI.G; if (!G || G.phase !== 'assign') { UI.sel = null; return; }
    const ok = d => { const t = E.targets(G, d.i); return !d.used && !(d.takes.length && UI.sel === d.i) && (t.hits.length || t.guard); };
    const after = G.dice.filter(d => d.i > (UI.sel == null ? -1 : UI.sel)).find(ok) || G.dice.find(ok);
    UI.sel = after ? after.i : null;
  }
  // A double with a take left stays selected for its second number; any other die moves on to the next one.
  function doAssign(di, uid, p, q) { UI.more = null; act(() => E.assign(UI.G, di, uid, p, q)); if (!UI.err) { if (!(E.takesLeft(UI.G.dice[di]) && E.targets(UI.G, di).hits.length)) nextDie(); render(); } }
  // Guard: a double guards only the player who rolled it (2026-11-03).
  function doGuard() { UI.more = null; guardFor(UI.G.dice[UI.sel].k); }
  function guardFor(k) { const i = UI.sel; UI.guarding = null; act(() => E.guard(UI.G, i, k)); if (!UI.err) { nextDie(); render(); } }
  function doPair(i, j) { UI.guarding = null; act(() => E.pair(UI.G, i, j)); if (!UI.err) { UI.sel = i; render(); } }
  // Tap a threat die under a card: the selected die takes it (the engine says why not). A double takes two, one tap each.
  function tapSlot(uid, p) {
    const G = UI.G, m = G.play.find(x => x.uid === uid); if (!m || G.phase !== 'assign') return;
    if (UI.sel == null) { UI.msg = 'Pick a die first (tap it, or press 1–9).'; UI.err = true; return render(); }
    doAssign(UI.sel, uid, p);
  }

  // What the items did this shift (engine G.stats.items), one line per item that did something.
  const ITEM_DID = { triage: ['Triage Agents', 'dice taken or guarded'], contain: ['Containment Agents', 'damage stopped'], recover: ['Recovery Agents', 'HP healed'],
    enrich: ['Enrichment Agent', 'turned dice put to work'], surge: ['Surge Playbook', 'dice taken or guarded'], intel: ['Threat Intel Feed', 'wild takes'],
    isolate: ['Isolation Script', 'threat dice removed'], coffee: ['Shift Coffee', 'HP healed'], freeze: ['Change Freeze', 'row rolls skipped'],
    twin: ['Twin', 'extra dice put to work and damage stopped'], ghost: ['Ghost', 'arrival damage stopped'], scramble: ['Scramble', 'comebacks kept on the row'], repair: ['Repair', 'HP healed'],
    spotlight: ['Spotlight', 'dice made doubles'], slip: ['Slip', 'hits dodged'], ticket: ['Golden ticket', 'dice turned'], momentum: ['Momentum', 'extra dice rolled'], persist: ['Persist', 'knockouts stopped'], siphon: ['Siphon', 'HP healed'], callback: ['Callback', 'amber dice rerolled'] };
  const itemsDid = G => Object.entries(G.stats.items || {}).filter(([, n]) => n > 0).map(([t, n]) => ({ t, n, name: ITEM_DID[t][0], what: ITEM_DID[t][1] }));
  // ---- Copy result -----------------------------------------------------------------------------------------------
  function resultLine() {
    const G = UI.G, burns = Object.entries(G.stats.used).map(([t, n]) => `${t} ${n}`).join(', ');
    return ['Detect the Dwellers', `${G.team.map(nm).join(' + ')} (${G.n}p)`, `${G.max} HP`,
      `${G.win ? 'Win' : 'Loss'}${G.win ? '' : ` in fight ${G.fight}${G.bossOut ? ' (boss)' : ''}`}`, mmss((UI.end || Date.now()) - UI.start),
      `${pl(G.stats.rounds, 'round')}, ${pl(G.stats.back, 'comeback')}, ${pl(G.stats.guards, 'guard')}`, `lowest HP ${Math.min(...G.hp)}/${G.max}`,
      `items used: ${burns || 'none'}`, `items did: ${itemsDid(G).map(x => `${x.t} ${x.n}`).join(', ') || 'nothing'}`, `seed ${UI.seed}`].join(' | ');
  }
  function copyResult() {
    const t = resultLine(), done = ok => { UI.copied = ok ? 'ok' : t; render(); };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand && document.execCommand('copy'); ta.remove(); done(!!ok); } catch (e) { done(false); } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => done(true), fallback); else fallback(); } catch (e) { fallback(); }
  }

  // ---- Views --------------------------------------------------------------------------------------------------------
  const soundBtn = () => `<button class="btn s snd" type="button" data-a="snd" data-k="snd" aria-pressed="${Sound.on}" aria-label="Sound">${SPK(Sound.on)}<span>Sound</span></button>`;
  const dbls = id => A.DOUBLES[id].map(n => A.pip(n, 18)).join('');
  const MODE_SUB = { quick: '8 cards from the deck, then the boss. About 20 minutes.', full: '14 cards, 3 of them story cards, then the boss. The boss pulls the row. About 35 minutes.' };
  function vSetup() {
    const team = UI.setup.team, n = team.length;
    const picks = A.ANALYST_IDS.map(id => { const on = team.includes(id);
      return `<button type="button" class="pick" data-a="pick" data-id="${id}" data-k="pick${id}" aria-pressed="${on}" ${!on && n >= 4 ? 'disabled' : ''}><span class="art">${crop(ART[id], THUMB[id])}</span>
        <span class="pk-t"><span class="pk-h"><span class="nm">${esc(nm(id))}</span><span class="style">${esc(STYLE[id])}</span></span><span class="dbl"><span class="phud">Doubles</span>${dbls(id)}</span><span class="pk-perk">${esc(A.PERK[id])}</span></span>
        <span class="st">${on ? ICON.check + 'In' : 'Add'}</span></button>`; }).join('');
    return `<div class="wrap"><div class="intro-grid">
      <section class="hero"><span class="art">${slice(ART.hero)}</span><p class="meta c">Co-op · 1–4 players · one night in the SOC</p><h1 class="logo">Detect the Dwellers</h1>
        <p class="lede"><b>22:00.</b> The SOC is yours until dawn, and the alarms are already going off. Something is moving 40 GB out the door. Something else is trying every password in the building. Knock one down and it comes back. Hold the line until <b>06:00</b>, because at 05:59 the real attack lands.</p>
        <p class="lede2"><b>Roll. Match. Survive.</b> Every alarm sets dice under its card. Knock them out with dice showing the same number before it hits back. Beat one the hard way and your agents learn its trick. Every shift deals a new night, and a different boss waits at the bottom.</p>
        <p class="t-note"><b>Tuned for 1–4 players,</b> co-op. A Quick Shift takes about 20 minutes.</p>
        <p class="meta">Same cards as the print-and-play deck. <button class="lnk" type="button" data-a="cards" data-k="cards">See all ${A.mobs().length + A.BOSS_IDS.length + 2 + A.ANALYST_IDS.length + A.AGENT_IDS.length + A.CONS_IDS.length + A.SIT_IDS.length + A.COND_IDS.length} cards</button></p></section>
      <section class="setup panel" aria-labelledby="crew-h"><h2 class="sech" id="crew-h">Crew · ${n} of 4</h2><div class="picks" role="group" aria-labelledby="crew-h">${picks}</div>
        <p class="meta">One analyst per player, up to 4. Tap to add or drop.</p>
        <h2 class="sech" id="mode-h">Shift</h2><div class="modes" role="group" aria-labelledby="mode-h">${Object.entries(E.MODES).map(([k, M]) => `<button type="button" class="shiftm${UI.setup.mode === k ? ' on' : ''}" data-a="mode" data-m="${k}" data-k="mode${k}" aria-pressed="${UI.setup.mode === k}"><b>${M.label}</b><span class="meta">${MODE_SUB[k]}</span></button>`).join('')}</div>
        <div class="startbar"><p class="meta">${n === 1 ? 'Solo' : `${n} players`} · ${E.MODES[UI.setup.mode].label} · ${E.MODES[UI.setup.mode].hp} HP each · Survive until 06:00</p>
          <button class="btn p w big" type="button" data-a="start" data-k="start">Clock in</button></div></section>
    </div></div>`;
  }
  function vTop() {
    const G = UI.G, fighting = G.phase === 'assign' || G.phase === 'roll', inc = fighting ? E.incoming(G) : null;
    const between = G.phase === 'flip' || G.phase === 'deal' || G.phase === 'sit' || G.phase === 'tuck';
    const F = flipped(G), T = G.feedTotal;
    const label = (G.bossOut ? (G.over ? 'Boss fight' : `Boss fight · round ${G.round || 1}`) : G.phase === 'sit' ? `Situation · card ${F} of ${T}` : between ? (G.feed.length ? `Next: card ${F + 1} of ${T}` : 'Next: the boss') : `Fight ${G.fight} · card ${F} of ${T} · round ${G.round || 1}`) + (E.threat(G) && !G.bossOut ? ` · Threat +${E.threat(G)}` : '');
    const now = G.bossOut ? T : between && G.phase !== 'sit' ? -1 : F - 1, next = !G.bossOut && (G.phase === 'flip' || G.phase === 'deal') ? F : -1;
    const bar = [...Array(T)].map((_, i) => `<i class="${i < F && i !== now ? 'done' : ''}${i === now ? ' now' : ''}${i === next ? ' next' : ''}"></i>`).join('') + `<i class="boss${G.bossOut ? ' now' : ''}${next === T ? ' next' : ''}"></i>`;
    const crew = G.team.map((id, k) => {
      const hp = G.hp[k], n = inc ? inc.total[k] : 0, after = Math.max(0, hp - n);
      const incl = inc ? (G.blocks[k] && !n ? `<span class="inc safe">${ICON.shield}<b>Blocking</b></span>` : n ? `<span class="inc">Incoming <b class="num">−${n}</b>${n >= hp ? ' · lethal' : ''}</span>` : '<span class="inc safe">Nothing incoming</span>') : `<span class="inc">${k === G.point ? '<b class="pt">On point</b>' : 'Off point'}</span>`;
      return `<div class="pc${k === G.point ? ' on' : ''}" data-hp="${k}"><div class="pc-h">${k === G.point ? '<i class="dot" aria-hidden="true"></i>' : ''}<span class="nm">${esc(nm(id))}</span><span class="hpn"><b class="num">${hp}</b><span class="of">/${G.max}</span></span></div>${vConds(k)}
        <span class="hpbar${hp / G.max <= .35 ? ' low' : ''}" aria-hidden="true"><i style="transform:scaleX(${after / G.max})"></i>${n ? `<i class="inci" style="transform:translateX(${after / G.max * 100}%) scaleX(${(hp - after) / G.max})"></i>` : ''}</span>${incl}</div>`;
    }).join('');
    return `<div class="gtop"><header class="top"><span class="brand">Detect the Dwellers<small>Night shift</small></span>
      <div class="feed"><span class="fline"><time class="clk" data-clock>${clockNow()}</time><span class="meta c">${label}</span></span><span class="feedbar" aria-hidden="true">${bar}</span></div>
      <nav class="tbtns">${soundBtn()}<button class="btn s" type="button" data-a="cards" data-k="cards" aria-pressed="${UI.cards}">Cards</button><button class="btn s" type="button" data-a="log" data-k="log" aria-pressed="${UI.drawer === 'log'}">Log</button><button class="btn s" type="button" data-a="quit" data-k="quit">New</button></nav></header>
      <div class="crew" style="--n:${G.n}" aria-label="Crew HP">${crew}</div></div>`;
  }
  // The condition cards a player holds, small beside their HP (hover or tap one to read it full size).
  function vConds(k) {
    const G = UI.G, held = A.COND_IDS.filter(c => G.cond[k][c]); if (!held.length) return '';
    return `<span class="t-conds" aria-label="${esc(nm(G.team[k]))} holds ${held.map(c => A.COND[c][0]).join(', ')}">${held.map(c => `<span class="t-condc ${c}" data-card="cond:${c}">${A.condCard(c)}<b aria-hidden="true">${A.COND[c][0]}</b></span>`).join('')}</span>`;
  }
  // The amber pair: the two row dice, their sum, and what came back.
  const amber = n => `<span class="t-amb"><span class="f">${A.pip(n, 34)}</span></span>`;
  function vRowRoll() {
    const G = UI.G, r = G.lastRow;
    if (!r || r.fight !== G.fight) return '';
    const isNew = FX && FX.row === r;
    return `<div class="pbanner t-rowroll${isNew ? ' new' : ''}${r.back.length ? ' hot' : ''}" data-roll="${r.roll}"><div class="t-pair" aria-hidden="true">${r.pair.map(amber).join('')}<b class="num">=${r.roll}</b></div><p><span class="lead">Row roll · ${esc(r.why)}.</span>
      ${r.back.length ? `<b>${esc(r.back.join(', '))}</b> ${r.back.length > 1 ? 'come back' : 'comes back'} at full strength.` : 'The row stays quiet.'}
      ${r.strikes.length ? `<span class="hit">${r.strikes.map(s => `${esc(s.name)} hits everyone for <b class="num">${s.dmg}</b>`).join('; ')}.</span>` : ''}</p></div>`;
  }
  function vBossBanner() {
    const G = UI.G; if (!G.bossOut || G.round > 1) return '';
    return `<div class="pbanner boss"><time class="clk f">05:59</time><p><span class="lead f">${esc(G.boss.name)} arrives.</span> The feed is empty: this is the last fight. ${esc(A.BOSS_TEXT[G.boss.id][0])}${E.MODES[G.mode].bossRow ? ` Full Shift: ${esc(A.BOSS_TEXT[G.boss.id][1])}` : ''}</p></div>`;
  }
  // Read-aloud: on the flip, whoever is on point reads the new mob's flavour out, one line at a time (CSS only).
  const lines = t => String(t).split(/(?<=[.!?…])\s+/).filter(Boolean);
  function vAloud() {
    const G = UI.G; if (G.phase !== 'roll' || G.round !== 0 || G.bossOut) return '';
    const m = G.play.find(x => !x.back && !x.boss), f = m && dataMob(m.id).flavor; if (!f) return '';
    const fresh = FX && FX.enter.has(m.uid) && !reduced();
    return `<div class="t-aloud"><span class="aloud">${G.n > 1 ? `${esc(nm(G.team[G.point]))}, read it aloud` : 'Read it aloud'} · ${esc(m.name)}</span><p class="${fresh ? 'reveal-ln' : ''}">${lines(f).map((s, i) => `<span class="ln" style="--i:${i}">${esc(s)}</span>`).join(' ')}</p></div>`;
  }
  // The threat dice set under a card: one per slot, taken ones turned aside. Live state only, never on the card.
  function vThreat(m) {
    const G = UI.G, t = UI.sel != null && G.phase === 'assign' ? E.targets(G, UI.sel) : null;
    const mine = t ? t.hits.filter(h => h.uid === m.uid) : [], more = null;
    return `<div class="t-threat${m.slots.length > 6 ? ' big' : ''}" role="group" aria-label="Dice under ${esc(m.name)}">${m.slots.map((v, p) => {
      const off = m.off[p], h = mine.find(x => x.p === p), pend = false, mo = false, just = FX && FX.struck.has(m.uid + '-' + p);
      const c = ['t-td', off ? 'off' : '', just ? 'just' : '', h ? (h.near ? 'tgt near' : 'tgt') : '', pend ? 'pend' : '', mo ? 'tgt more' : '', p >= m.printed ? 'xtra' : '', (t || more) && !off && !h && !mo && !pend ? 'dim' : ''].filter(Boolean).join(' ');
      const label = `${v}${p >= m.printed ? ' (extra die for this crew)' : ''}${off ? ', taken' : h ? (h.near ? ', one off: your perk matches it' : ', matches') : mo ? ', take as one more' : ''}`;
      return `<button class="${c}" data-a="slot" data-u="${m.uid}" data-p="${p}" data-k="slot${m.uid}-${p}" aria-label="${esc(label)}" ${off ? 'disabled' : ''}>${A.pip(v, 30)}${just ? '<i class="burst" aria-hidden="true"></i>' : ''}</button>`;
    }).join('')}</div>`;
  }
  function vMob(m) {
    const G = UI.G, down = !E.left(m);
    const dmg = E.dmgOf(G, m), inc = (G.phase === 'assign' || G.phase === 'roll') ? E.incoming(G).by.find(x => x.uid === m.uid) : null;
    const enter = FX && FX.enter.has(m.uid), ko = FX && FX.ko.has(m.uid), struck = FX && [...FX.struck].some(k => k.startsWith(m.uid + '-'));
    const lines = [];
    if (down) lines.push('<span>Beaten. Goes back on the row at the end of the round.</span>');
    else {
      lines.push(`<span><b class="num">${E.left(m)}</b> of ${m.hits} dice left · hits for <b class="num">${dmg}</b>${dmg !== m.dmg ? ` <span class="hot">(${dmg > m.dmg ? '+' : ''}${dmg - m.dmg})</span>` : ''}</span>`);
      if (inc) lines.push(inc.to.length ? `<span class="hot">At round end: ${inc.dmg} to ${inc.to.map(k => esc(nm(G.team[k]))).join(', ')}</span>` : '<span class="safe">At round end: blocked</span>');
      if (E.canBaseline(G, m)) lines.push(`<button class="btn s cy" type="button" data-a="baseline" data-u="${m.uid}" data-k="base${m.uid}" aria-label="Baseline ${esc(m.name)}: set ${E.baseCost(G, m)} more dice">Baseline it <kbd>B</kbd></button>`);
      if (m.based) lines.push(`<span>Baselining: beat every die, the ${A.baseDie(m.id)}s too, and the agents learn it</span>`);
    }
    if (G.n >= 3) lines.push(`<span>${G.n} players: + die set ${G.n - 2}× (marked +)</span>`);
    const cls = ['t-slot', down ? 'down' : '', ko ? 'ko' : '', enter ? (m.back ? 'fresh' : 'flipin') : '', struck && !ko ? 'struck' : '', m.back && !down ? 'back' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-card="${cardKey(m)}" data-uid="${m.uid}">${cardFor(m)}
      ${m.back && !down ? `<span class="t-stamp bstamp${enter ? ' new' : ''}" aria-hidden="true">${m.back > 1 ? `Back ×${m.back}` : 'Came back'}</span>` : ''}${down ? `<span class="t-stamp beat${ko ? ' new' : ''}">Down</span>` : m.based ? '<span class="t-stamp bstamp base" aria-hidden="true">Baselining</span>' : ''}
      ${vThreat(m)}<div class="t-under">${lines.join('')}</div></div>`;
  }
  // Between fights: the feed face down (the print card back) and who's on point, as analyst cards with portraits.
  function vFlipDesk() {
    // The feed is face down: the page never says whether the top card is an alarm or a situation.
    const G = UI.G, boss = !G.feed.length, al = E.alarmsLeft(G), si = G.feed.length - al;
    const label = boss ? 'Bring on the boss' : 'Flip the top card';
    return `<div class="pdesk"><div class="pd-feed"><button class="fdown${boss ? ' boss' : ''}" type="button" data-a="flip" data-k="flipcard" style="--stack:${Math.min(3, G.feed.length)}" aria-label="${label}">
        <span class="fd-art" aria-hidden="true">${slice(ART.back)}</span><span class="fd-t" aria-hidden="true">${boss ? 'The boss' : 'Detect the<br>Dwellers'}</span>
        <span class="fd-b" aria-hidden="true"><b>${boss ? '05:59 · last fight' : `${pl(G.feed.length, 'card')} in the feed`}</b><span>${boss ? 'Bring it on' : 'Flip'}</span></span></button></div>
      <div class="pd-side">${G.fight ? `<p class="status">${G.fight ? '<b>Fight won.</b> ' : ''}${boss ? 'The feed is empty. The boss is next.' : `${pl(al, 'alarm')} and ${pl(si, 'situation')} left in the feed, shuffled, then the boss.`}</p>` : '<p class="status"><b>22:00. The shift starts.</b> Pick who’s on point, then flip the top card of the feed. Alarms and situations are shuffled together.</p>'}
        
        <div class="pd-point"><h2 class="sech">On point</h2><div class="acards" role="group" aria-label="On point">${G.team.map((id, k) => { const on = G.point === k;
          return `<button class="acard${on ? ' on' : ''}" type="button" data-a="point" data-n="${k}" data-k="point${k}" aria-pressed="${on}"><i class="tab" aria-hidden="true"></i><span class="scr">${crop(ART[id], THUMB[id])}</span><b class="nm">${esc(nm(id))}</b><span class="phud${on ? ' c' : ''}">${on ? 'On point · 2 dice' : `${G.hp[k]}/${G.max} HP`}</span></button>`; }).join('')}</div>
        <p class="meta">On point rolls two dice${G.n === 1 ? '' : ' and takes Targeted hits'}.</p></div></div></div>`;
  }
  // The chance a row alarm comes back on one roll of the two amber dice (sum at most its number).
  const backPct = top => { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b <= top) n++; return Math.round(n / 36 * 100); };
  // The round's steps, the current one lit: Row (from round 2, if anything is on it), Roll, Match, Hits back.
  function vSteps() {
    const G = UI.G, row = G.round >= 1 && G.row.length > 0, cur = G.phase === 'roll' ? 'roll' : 'match';
    const steps = [['row', 'Row', row ? 'Roll the amber dice' : 'Nothing on it'], ['roll', 'Roll', 'Everyone rolls'], ['match', 'Match', 'Dice take dice'], ['hits', 'Hits back', 'Alarms still up hit']];
    return `<ol class="t-steps" aria-label="The round">${steps.map(([id, h, s], i) => `<li class="${id === cur || (id === 'row' && cur === 'roll' && row) ? 'now' : ''}${id === 'row' && !row ? ' off' : ''}${(cur === 'match' && (id === 'row' || id === 'roll')) ? ' done' : ''}"${id === cur ? ' aria-current="step"' : ''}><b>${i + 1}. ${h}</b><span>${s}</span></li>`).join('')}</ol>`;
  }
  function vTable() {
    const G = UI.G;
    const head = G.phase === 'flip' || G.phase === 'deal' || G.phase === 'sit' || G.phase === 'tuck' ? '' : vSteps() + `<div class="fhead"><span class="sech f">${G.bossOut ? 'Boss fight' : `Fight ${G.fight}`}${G.play.filter(m => E.left(m)).length > 1 ? ' · multi-alarm' : ''} · round ${G.round || 1} · ${esc(nm(G.team[G.point]))} on point</span><span class="sech a">Row · ${G.row.length}</span></div>`;
    const bans = vBossBanner() + vRowRoll() + vAloud();
    let body = '';
    // A lone mob: the card, and beside it the banners and the round in plain words (as the real game's solo table).
    if (G.play.length === 1) return `<section class="table solo" aria-label="The fight">${head}<div class="solo-b"><div class="inplay">${vMob(G.play[0])}</div><div class="sb">${bans ? `<div class="bans">${bans}</div>` : ''}${vBrief(G.play[0])}</div></div>${vAgents()}</section>`;
    if (G.play.length) body = `${G.phase === 'roll' || G.phase === 'assign' ? `<p class="t-now"><b class="sech">What now</b> ${nowText(G)}</p>` : ''}<div class="inplay many">${G.play.map(vMob).join('')}</div>`;
    else if (G.phase === 'sit' || (G.phase === 'flip' && G.sitDone)) body = vSit();
    else if (G.phase === 'flip') body = vFlipDesk();
    else if (G.phase === 'tuck') { const a = G.tuck[0], m = dataMob(a.id);
      body = `<div class="t-tuckp"><div class="t-slot" data-card="mob:${a.id}">${A.mobCard(m)}<span class="t-stamp beat">Baselined</span></div><div class="sb"><h2 class="sech a">The agents learned it</h2><p class="status"><b>${esc(a.name)}</b> is baselined. Tuck it under an agent someone holds, below. That agent gains <b>${esc(A.traitName(a.id))}</b>: ${esc(A.BASE[a.id].replace(/^[^:]+: /, ''))} Pick the agent with care: discarding it loses the trait.</p><p class="meta">Tucked, it is off the persistence row. If that agent is discarded, it slides out and goes back on the row.</p></div></div>`; }
    else if (G.phase === 'deal') body = vDeal();
    return `<section class="table" aria-label="The fight">${head}${bans ? `<div class="bans">${bans}</div>` : ''}${body}${vAgents()}</section>`;
  }
  // A situation on the mat where the mob would be: its card, one button per option under it, then the outcome (the
  // dice rolled, won or lost) and the next flip.
  const OK_LABEL = { lateral: 'Roll the row', travel: 'Roll 2 dice', ciso: 'Roll 2 dice', pentest: 'Everyone rolls', vendor: 'Take the hit', coffee: 'Drink up', honey: 'Heal up', budget: 'Draw 2 items', intel: 'Drop it', change: 'Brace', ioc: 'Reopen it' };
  function vSit() {
    const G = UI.G, S = G.sit, sd = A.SIT[S.id], opts = E.SIT_OPTS[S.id], who = esc(nm(G.team[G.point]));
    let n = 0; const key = () => `<kbd>${++n}</kbd>`;
    const btn = (o, label, i, off) => `<button class="btn${i === 0 ? ' p' : ''}" type="button" data-a="sit" data-o="${o}" data-k="sit${o}"${off ? ' disabled' : ''}>${label} ${key()}</button>`;
    let acts;
    if (!S.done) {
      const lbl = i => sd.opts ? sd.opts[i][0] : OK_LABEL[S.id] || 'Carry on';
      acts = S.id === 'chatter' ? `<div class="sit-dig" role="group" aria-label="Dig in: how many dice"><span class="phud">${esc(lbl(0))} · dice</span>${[1, 2, 3, 4].map(k => `<button class="btn${k === 1 ? ' p' : ''}" type="button" data-a="sit" data-o="dig" data-n="${k}" data-k="sitdig${k}" aria-label="Dig in with ${k} ${k === 1 ? 'die' : 'dice'}">${A.pip(k, 22)}${key()}</button>`).join('')}</div>${btn('leave', esc(lbl(1)), 1)}`
        : opts.map((o, i) => { const off = o === 'run' && !S.alarms;
          return `<span class="sit-o">${btn(o, esc(lbl(i)), i, off)}${off ? '<span class="why">No alarm left in the feed: you can’t fall back.</span>' : ''}</span>`; }).join('');
      acts = `<p class="status"><b>${who} is on point.</b> ${sd.opts ? 'Choose one.' : 'It just happens.'}</p><div class="sit-acts">${acts}</div>`;
    } else {
      const res = S.dice ? `<div class="sit-dice${S.won ? ' won' : S.won === false ? ' lost' : ''}" aria-label="Rolled ${S.dice.join(', ')}">${S.dice.map(v => `<span class="t-die${S.id === 'chatter' && v === 6 || S.id === 'usb' && S.won && S.dice.filter(x => x === v).length > 1 ? ' dbl' : ''}"><span class="f">${A.pip(v, 34)}</span></span>`).join('')}<b class="tag">${S.won ? 'Won' : 'Lost'}</b></div>` : '';
      acts = `<div class="sit-res">${res}<p class="status">${esc(S.text)}</p>${G.phase === 'flip' ? `<div class="sit-acts"><button class="btn p big" type="button" data-a="flip" data-k="sitflip">${G.feed.length ? 'Flip the next card' : 'Bring on the boss'} <kbd>F</kbd></button></div>` : ''}</div>`;
    }
    return `<div class="t-sit"><div class="sit-cards"><div class="t-sslot" data-card="sit:${S.id}">${A.sitCard(S.id)}</div></div><div class="sit-side"><h2 class="sech a">Situation · ${esc(sd.kind)}</h2>${acts}</div></div>`;
  }
  // The items on the mat, below the mobs, grouped by who holds them: each player's agents full size in their slots
  // (an empty slot is a dashed spot), a Triage Agent's die under its own card (or a dashed spot where it will land),
  // as the physical die sits under the physical card; then their consumables in hand, small, each with Use.
  function vAgents() {
    const G = UI.G, tucking = G.phase === 'tuck', top = G.phase === 'deal' ? G.deal[0] : null, drawn = new Set(G.drawn.map(c => c.uid));
    // A baselined alarm tucked under this agent: its name and Baseline line, as the tucked card's edge shows at the table.
    // A baselined alarm tucked under this agent: the real card, slid under it so only its tuck band shows, as at the table.
    const tucked = c => G.aug.filter(a => a.host === c.uid).map(a => `<div class="t-tuckc" data-card="mob:${a.id}" data-tucked="${a.id}" aria-label="${esc(a.name)} tucked under it: ${esc(A.BASE[a.id])}">${A.mobCard(dataMob(a.id))}</div>`).join('');
    // With any Triage on the mat, every card keeps the die row's height so the buttons line up.
    const anyT = G.agents.some(a => a.some(c => c.t === 'triage'));
    const under = c => { if (c.t !== 'triage') return anyT ? '<div class="t-adice" aria-hidden="true"></div>' : ''; const ds = G.dice.filter(d => d.kuid === c.uid);
      return `<div class="t-adice" role="group" aria-label="${esc(E.KIT_NAME[c.t])} die">${ds.length ? ds.map(d => dieHtml(d, G.dice.length)).join('') : `<span class="t-dph" aria-hidden="true">Rolls<br>${E.weight(G, c.uid) > 1 ? E.weight(G, c.uid) + ' dice' : '1 die'}</span>`}</div>`; };
    const groups = G.team.map((id, k) => {
      const ag = G.agents[k], slots = E.slotsOf(G, k), hand = G.hand[k], swap = top && E.dealFull(G, k) && UI.dealTo === k;
      const cards = ag.map(c => `<div class="t-kslot${swap ? ' swap' : ''}" data-card="agent:${c.t}" data-kuid="${c.uid}">${A.agentCard(c.t)}${tucked(c)}${under(c)}
        <div class="row"><span class="run">${swap ? 'Swap?' : 'Holding'}</span>${tucking ? `<button class="btn s cy" type="button" data-a="tuck" data-u="${c.uid}" data-k="tuck${c.uid}"${E.tuckedOn(G, c.uid) >= A.TUCK_CAP ? ' disabled' : ''} aria-label="Tuck ${esc(G.tuck[0].name)} under ${esc(nm(id))}’s ${esc(E.KIT_NAME[c.t])}">${E.tuckedOn(G, c.uid) >= A.TUCK_CAP ? 'Full' : 'Tuck it here'}</button>`
          : swap ? `<button class="btn s warn" type="button" data-a="drop" data-n="${k}" data-u="${c.uid}" data-k="drop${c.uid}" aria-label="Discard ${esc(nm(id))}’s ${esc(E.KIT_NAME[c.t])} for the new ${esc(E.KIT_NAME[top.t])}">Discard it</button>` : ''}</div></div>`).join('');
      const empty = Array.from({ length: Math.max(0, slots - ag.length - hand.length) }, () => `<div class="t-kslot open"><div class="t-kempty">Item slot</div>${anyT ? '<div class="t-adice" aria-hidden="true"></div>' : ''}<div class="row"><span class="run">Empty</span></div></div>`).join('');
      // Consumables sit in the same slots as agents (2026-11-03), each with Use (or Discard it when dealing to a full player).
      const hcards = hand.map(c => { const can = E.canUse(G, c.t);
        return `<div class="t-kslot cons${drawn.has(c.uid) && G.phase !== 'assign' ? ' new' : ''}${can ? ' live' : ''}${swap ? ' swap' : ''}" data-card="agent:${c.t}" data-huid="${c.uid}">${A.agentCard(c.t)}${anyT ? '<div class="t-adice" aria-hidden="true"></div>' : ''}
          <div class="row"><span class="run">${swap ? 'Swap?' : 'Use once'}</span>${swap ? `<button class="btn s warn" type="button" data-a="drop" data-n="${k}" data-u="${c.uid}" data-k="drop${c.uid}" aria-label="Discard ${esc(nm(id))}’s ${esc(E.KIT_NAME[c.t])} for the new ${esc(E.KIT_NAME[top.t])}">Discard it</button>`
          : `<button class="btn s cy" type="button" data-a="use" data-u="${c.uid}" data-k="use${c.uid}" ${can ? '' : 'disabled'} aria-label="${esc(nm(id))}: use the ${esc(E.KIT_NAME[c.t])}">Use</button>`}</div></div>`; }).join('');
      return `<div class="t-pk${k === G.point ? ' pt' : ''}${swap ? ' swap' : ''}" data-holder="${k}" role="group" aria-label="${esc(nm(id))}’s items"><h3 class="t-pkh"><span class="nm">${esc(nm(id))}</span><span class="cnt num">${ag.length + hand.length}/${slots} items</span></h3>
        <div class="t-pkb"><div class="t-kit">${cards}${hcards}${empty}</div></div></div>`;
    }).join('');
    return `<div class="t-agents"><h2 class="sech"><span>Items</span><span class="cnt num">deck ${G.kit.length}</span></h2><div class="t-crewkit" style="--n:${G.n}">${groups}</div></div>`;
  }
  // Dealing: the item on top of the deal full size on the mat, the rest of the draw beside it, and a Give button per
  // player. An agent for a full player asks which of their agents to discard (on their cards below), or keep it out.
  function vDeal() {
    const G = UI.G, c = G.deal[0]; if (!c) return '';
    const agent = A.isAgent(c.t), rest = G.deal.slice(1), solo = G.n === 1;
    if (solo) UI.dealTo = 0;
    const asking = UI.dealTo != null && E.dealFull(G, UI.dealTo);
    const gives = G.team.map((id, k) => { const full = E.dealFull(G, k);
      return `<button class="btn${UI.dealTo === k ? ' on' : k === G.point ? ' p' : ''}" type="button" data-a="give" data-n="${k}" data-k="give${k}" aria-pressed="${UI.dealTo === k}">Give to ${esc(nm(id))} <span class="num">${E.heldN(G, k)}/${E.slotsOf(G, k)}</span>${full ? ' · full' : ''}</button>`; }).join('');
    const why = (agent ? 'An agent works for the whole crew, every round.' : 'A consumable is used once.') + ` It takes one of ${G.n === 1 ? 'your' : 'that player’s'} ${E.slotsOf(G, 0)} item slots.`;
    const ask = asking ? `<p class="status"><b>${esc(nm(G.team[UI.dealTo]))}’s slots are full.</b> Discard one of their items below (an agent takes what’s tucked under it along), or keep the new one out.</p><div class="sit-acts"><button class="btn warn" type="button" data-a="keepout" data-k="keepout">Keep it out</button></div>` : '';
    const sit = G.sitDone && G.sit && G.sit.text ? `<p class="meta">${esc(G.sit.text)}</p>` : '';
    return `<div class="t-dealp"><div class="t-dslot" data-card="agent:${c.t}">${A.agentCard(c.t)}</div>${rest.length ? `<div class="t-dnext"><span class="phud">Next</span>${rest.map(x => `<div class="t-hslot" data-card="agent:${x.t}">${A.agentCard(x.t)}<b class="hn">${esc(E.KIT_NAME[x.t])}</b></div>`).join('')}</div>` : ''}
      <div class="sb"><h2 class="sech">Deal · ${G.deal.length === 1 ? 'the last new item' : `${G.deal.length} new items`}</h2>${sit}<p class="status"><b>${esc(E.KIT_NAME[c.t])}.</b> ${why}</p>
      ${solo ? '' : `<div class="sit-acts">${gives}</div>`}${ask}</div></div>`;
  }
  // What to do at this step, in one line (the "What now" panel, and above a multi-alarm fight).
  const nowText = G => G.phase === 'roll' ? (G.round >= 1 && G.row.length ? 'Roll: the row first, then everyone’s dice.' : 'Roll everyone’s dice.')
    : G.dice.some(x => !x.used) ? 'Tap one of your dice, then a glowing die under an alarm with the <b>same number</b>. A double takes two, or guards you.' : 'Every die is placed. <b>End the round</b>: alarms still up hit back.';
  // "What now": what to do this step in a line or two, what this alarm does, and the full rules folded away.
  function vBrief(m) {
    const G = UI.G, inc = (G.phase === 'assign' || G.phase === 'roll') ? E.incoming(G).by.find(x => x.uid === m.uid) : null, dm = !m.boss && dataMob(m.id);
    const perks = (G.team.includes('HUN') ? ' Hunter on point: one more die.' : '') + (G.team.includes('RES') ? ` Responder: a double heals anyone ${A.RES_HEAL} instead of guarding.` : '') + (G.team.includes('SOA') ? ' Soarcerer: any die is a double for baselining.' : '') + (G.team.includes('ENG') ? ' Engineer: once a round, turn a die to its opposite side.' : '');
    const now = nowText(G);
    const hits = !E.left(m) ? 'Beaten: it deals nothing.' : inc ? (inc.to.length ? `Still up at round end, it hits ${inc.to.map(k => esc(nm(G.team[k]))).join(' and ')} for <b class="num">${inc.dmg}</b>.` : 'Blocked: it hits nobody.') : `It hits for <b class="num">${E.dmgOf(G, m)}</b>.`;
    const kw = m.boss ? '+2 Damage until it has lost two dice.' : `<b>${esc(A.kw[dm.ability])}.</b> ${esc(A.kwText[dm.ability])}`;
    const beaten = m.boss ? 'Beat it and the shift is survived.' : m.based ? 'Beaten with its Baseline dice, it tucks under an agent, off the row.' : `Beaten, it goes on the persistence row: ${backPct(m.top)}% to come back on each row roll.`;
    const rules = [['To hit', 'A die takes one die under it showing <b>exactly</b> its number. A double counts as two dice showing its number, or guards you. Two of your own dice showing the same number pair up as a double. Once a round you may take 1 to reroll one of your dice (not at 1 HP).' + perks],
      ['Win the fight', `Draw ${G.n === 1 ? (D.kitSolo === 1 ? 'an item' : D.kitSolo + ' items') : D.kitPerFight + ' items'} and deal them.`],
      ['Next', m.boss ? 'No more situations: this is the last fight.' : !G.feed.length ? 'The feed is empty: the boss is next.' : `${pl(G.feed.length, 'card')} face down, alarms and situations shuffled, then the boss.`]];
    return `<div class="rbrief"><h2 class="sech">What now</h2><p class="now">${now}</p><ul>
      <li><span class="phud f">This alarm</span><span>${hits}${G.cond.some(c => c.exposed) ? ` Exposed: anyone hit takes 1 more.` : ''}</span></li>
      <li><span class="phud f">Keyword</span><span>${kw}</span></li><li><span class="phud a">Beaten</span><span>${beaten}</span></li></ul>
      <details class="rules"><summary>Rules</summary><ul>${rules.map(([h, t]) => `<li><span class="phud c">${h}</span><span>${t}</span></li>`).join('')}</ul></details></div>`;
  }
  function vSide() {
    const G = UI.G, r = G.lastRow;
    // Each row mob as a small amber card: its scene, its number, and the 2d6 sums 2–12 that bring it back.
    const rowHtml = G.row.length ? `<div class="t-rowlist">${G.row.map(m => `<div class="rcard"><span class="scr">${slice(ART[m.id])}</span><div class="rc-b"><b class="nm">${esc(m.name)}</b><span class="rng">Back on 2–${m.top} · <b>${backPct(m.top)}%</b> a roll</span>
      <span class="t-track" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i class="${i + 2 <= m.top ? 'on' : ''}${r && r.fight === G.fight && r.roll === i + 2 ? ' roll' : ''}">${i + 2}</i>`).join('')}</span></div></div>`).join('')}</div>`
      : '<p class="empty">Empty. Beaten alarms land here and come back on the 2 amber dice.</p>';
    return `<aside class="t-side">
      <div class="panel pad"><h2 class="sech a"><span>Persistence row</span><span class="cnt"></span></h2>${rowHtml}</div>
      <div class="panel pad"><h2 class="sech"><span>Crew cards</span><span class="cnt">${esc(nm(G.team[G.point]))} on point</span></h2><div class="t-crewcards">${G.team.map((id, k) => `<div class="t-cslot${k === G.point ? ' pt' : ''}" data-card="analyst:${id}">${A.analystCard(id)}${k === G.point ? '<div class="lbl">On point</div>' : ''}</div>`).join('')}
        <div class="t-cslot" data-card="legend">${A.legend}</div></div></div>
    </aside>`;
  }
  function dieHtml(d, n) {
    const G = UI.G, owner = d.src === 'agent' ? 'Agent' : d.src === 'crew' ? 'Crew' : SHORT[G.team[d.k]] + (d.src === 'surge' ? '+' : '');
    const half = !d.used && d.takes && d.takes.length, gTo = d.used === 'guard' && d.guards != null && d.guards !== d.k ? SHORT[G.team[d.guards]] : '';
    const usedTo = d.used === 'guard' ? 'Guard' + (gTo ? ' for ' + nm(G.team[d.guards]) : '') : d.used === 'pair' ? 'paired with die ' + (d.pairedTo + 1) : d.used ? [...new Set(d.takes.map(x => (G.play.find(m => m.uid === x.uid) || { name: '?' }).name))].join(' and ') : '';
    const label = `${E.faceText(d)}, ${E.dieOwner(G, d)}${d.used ? ', used: ' + usedTo : half ? ', one take left' : ''}${d.paired != null ? ', paired with die ' + (d.paired + 1) : ''}${d.turned ? ', turned by Enrichment' : ''}${d.focused ? ', turned by Focused' : ''}${d.flipped ? ', turned to its opposite side: counts as one die' : ''}${d.rattled ? ', Rattled: no doubles' : ''}`;
    const pr = G.phase === 'assign' && E.pairs(G).some(p => p.includes(d.i));
    const t = !d.used && G.phase === 'assign' ? E.targets(G, d.i) : null, dead = t && !t.hits.length && !t.guard && !pr;
    const cls = ['t-die', d.src === 'agent' || d.src === 'crew' ? 'agent' : '', d.dbl ? 'dbl' : '', d.used ? 'used' : '', half ? 'half' : '', d.used === 'guard' ? 'grd' : '', d.used === 'pair' ? 'pairx' : '', d.paired != null ? 'paired' : '', pr ? 'pairable' : '', dead ? 'dead' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" data-a="die" data-i="${d.i}" data-k="die${d.i}" aria-pressed="${UI.sel === d.i}" aria-label="Die ${d.i + 1}: ${esc(label)}" title="${esc(label)}">
      ${n <= 9 ? `<kbd aria-hidden="true">${d.i + 1}</kbd>` : ''}<span class="f">${A.pip(d.n, 40)}</span><span class="o">${d.used === 'guard' ? (gTo ? 'Guard ' + esc(gTo) : 'Guard') : d.used === 'pair' ? 'Paired' : d.used ? 'Used' : half ? '1 left' : d.paired != null ? 'Pair ×2' : d.dbl ? 'Double ×2' : esc(owner)}</span>${d.used === 'guard' || (t && t.guard && d.dbl) ? `<span class="gmark" aria-hidden="true">${ICON.shield}</span>` : ''}${d.turned ? '<span class="badge w">EN</span>' : d.flipped ? '<span class="badge c">OPP</span>' : d.focused ? '<span class="badge c">FO</span>' : d.rattled ? '<span class="badge r">RAT</span>' : ''}</button>`;
  }
  function vDock() {
    const G = UI.G; let hint = '', ctl = '';
    if (G.phase === 'flip' && G.sitDone) {
      hint = `<b>Situation done.</b> ${esc(nm(G.team[G.point]))} stays on point through the next fight. ${G.feed.length ? 'Flip the next card' : 'Bring on the boss'}.`;
      ctl = `<div class="acts"><span class="grow"></span><button class="btn p big" data-a="flip" data-k="flip">${G.feed.length ? 'Flip the next card' : 'Bring on the boss'} <kbd>F</kbd></button></div>`;
    } else if (G.phase === 'flip') {
      hint = `<b>Pick who’s on point</b>, then ${G.feed.length ? 'flip the top card: an alarm or a situation' : 'bring on the boss'}.`;
      ctl = `<div class="acts"><span class="grow"></span><button class="btn p big" data-a="flip" data-k="flip">${G.feed.length ? 'Flip the top card' : 'Bring on the boss'} <kbd>F</kbd></button></div>`;
    } else if (G.phase === 'sit') {
      hint = `<b>${esc(A.SIT[G.sit.id].kind)}.</b> ${esc(nm(G.team[G.point]))} is on point: ${A.SIT[G.sit.id].opts ? 'choose on the mat (keys 1–' + (G.sit.id === 'chatter' ? 5 : 2) + ').' : 'resolve it (key 1).'}`;
    } else if (G.phase === 'roll') {
      const usable = G.hand.some(h => h.some(c => E.canUse(G, c.t)));
      hint = G.round >= 1 ? '<b>New round.</b> Roll the row first, then everyone rolls.' : '<b>Fight!</b> Roll the dice.';
      if (G.round >= 1 && !G.row.length) hint = '<b>New round.</b> The row is empty, so just roll the dice.';
      if (G.freeze && G.row.length) hint += ' Change Freeze: the next row roll is skipped.';
      if (usable) hint += ' Consumables: <b>Use</b> one in the dock first if you want.';
      ctl = `<div class="acts"><span class="inc grow">${incText()}</span><button class="btn p big" data-a="roll" data-k="roll">${G.round >= 1 && G.row.length ? 'Roll the row, then the dice' : 'Roll the dice'} <kbd>R</kbd></button></div>`;
    } else if (G.phase === 'assign') {
      const d = UI.sel != null ? G.dice[UI.sel] : null, t = d ? E.targets(G, d.i) : null, prs = E.pairs(G);
      const prHint = prs.length ? ` <b>Pair:</b> two of your own ${prs.map(([i]) => G.dice[i].n + 's').join(', ')} can pair up as one double.` : '';
      const picking = d && UI.guarding === d.i && t && t.guard;
      if (picking) hint = `<b>${esc(E.dieOwner(G, d))}: guard who?</b> A guard blocks any one player who isn’t blocking yet: you or a crewmate.`;
      else if (d && !d.used && d.takes.length) hint = `<b>${esc(E.dieOwner(G, d))}: double ${d.n}, one more ${d.n} to place.</b> ${t.hits.length ? 'Tap another matching die, under this alarm or another.' : `No ${d.n} left to take.`} Or pick another die.`;
      else if (!d) hint = (G.dice.some(x => !x.used) ? '<b>Tap a die</b>, then a matching die under an alarm. Keys 1–9 pick dice.' : '<b>All dice placed.</b> End the round when you’re ready.') + (G.dice.some(x => E.canFocus(G, x)) ? ' Focused: pick one of your dice to turn it to any number.' : '') + (G.dice.some(x => E.canEng(G, x)) ? ' Engineer: pick one of your dice to turn it to its opposite side (once a round).' : '') + (G.hand.some(h => h.some(c => E.canUse(G, c.t))) ? ' Consumables: <b>Use</b> one in the dock.' : '') + prHint;
      else if (d.used) hint = 'That die is used. <b>Undo</b> to take it back.';
      else hint = `<b>${esc(E.dieOwner(G, d))}: ${E.faceText(d)}.</b> ${t.hits.length ? (d.dbl ? `A double counts as two ${d.n}s: tap up to two matching dice, under one alarm or two,${(E.canHeal(G, d) ? ' <b>or Heal</b> anyone ' + A.RES_HEAL : ' <b>or Guard</b> yourself')}.` : 'Tap a glowing die under an alarm that shows the same number.') + (t.hits.some(h => h.near) ? ' Dashed rings are one off: your perk matches them.' : '') + (t.hits.some(h => h.evade) ? ' <b>Evasive:</b> this double isn’t its number, so it takes any one of its dice and is spent.' : '') : (E.canHeal(G, d) ? `Nothing it can hit. <b>Heal</b> anyone ${A.RES_HEAL} with it.` : d.dbl && t.guard ? `Nothing it can hit. <b>Guard</b> yourself with it.` : `Nothing it can hit.${E.canReroll(G, d) ? ' <b>Reroll it for 1 HP?</b>' : ''}`)}${prs.some(p => p.includes(d.i)) ? prHint : ''}${t.focus ? ' <b>Focused:</b> turn it to any number.' : ''}${t.eng ? ` <b>Engineer:</b> turn it to its opposite side, a ${7 - d.n} (it counts as one die then).` : ''}${d.rattled ? ' Rattled: no doubles this roll.' : ''}${G.wildAll ? ' Every die matches anything this round.' : ''}${!d.crew ? ' Agent dice can’t hit the boss or guard.' : ''}`;
      const sel = d && !d.used;
      const ag = G.dice.filter(x => x.kuid).length;
      // Pair: a control right after the second of two matching dice, in the tray.
      const pairAt = new Map(prs.map(([i, j]) => [j, i]));
      const pairBtn = j => { const i = pairAt.get(j), n = G.dice[i].n; return `<button class="btn s cy t-pairb" type="button" data-a="pair" data-i="${i}" data-j="${j}" data-k="pair${i}-${j}" aria-label="Pair dice ${i + 1} and ${j + 1}: two ${n}s make a double ${n}"><span class="pp" aria-hidden="true">${A.pip(n, 16)}${A.pip(n, 16)}</span>Pair</button>`; };
      ctl = `<div class="t-dice" role="group" aria-label="Crew dice">${G.dice.filter(x => !x.kuid).map(x => dieHtml(x, G.dice.length) + (pairAt.has(x.i) ? pairBtn(x.i) : '')).join('')}${ag ? `<span class="t-agnote">+ ${ag} agent ${ag === 1 ? 'die' : 'dice'} under ${ag === 1 ? 'its card' : 'their cards'}</span>` : ''}</div>
        <div class="acts">
        ${picking ? `<span class="t-gpick" role="group" aria-label="Guard who"><span class="inc">Guard who?</span>${E.guardable(G).map(k => `<button class="btn cy grdb" type="button" data-a="guardfor" data-n="${k}" data-k="gfor${k}">${ICON.shield}${esc(nm(G.team[k]))}${k === d.k ? ' (you)' : ''} <kbd>${k + 1}</kbd></button>`).join('')}<button class="btn s" type="button" data-a="guardx" data-k="guardx">Cancel</button></span>`
          : sel && t.guard ? `<button class="btn cy grdb" data-a="guard" data-k="guard">${ICON.shield}Guard <kbd>G</kbd></button>` : ''}
        ${sel && E.canHeal(G, d) ? `<span class="t-gpick" role="group" aria-label="Heal who"><span class="inc">Heal ${A.RES_HEAL}:</span>${G.team.map((id, k) => `<button class="btn cy" type="button" data-a="heal" data-n="${k}" data-k="heal${k}"${G.hp[k] >= G.max ? ' disabled' : ''}>${esc(nm(id))}${k === d.k ? ' (you)' : ''}</button>`).join('')}</span>` : ''}
        ${d && E.canReroll(G, d) ? `<button class="btn" data-a="reroll" data-k="reroll" aria-label="Take 1 damage to reroll this die">Reroll: take 1 <kbd>X</kbd></button>` : ''}${G.rerolled ? `<span class="inc rr">Rerolls left: ${G.team.map((id, k) => G.rerolled[k] ? '' : esc(SHORT[id])).filter(Boolean).join(', ') || 'none'}</span>` : ''}
        ${sel && t.eng ? `<button class="btn cy" data-a="eng" data-k="eng" aria-label="Engineer: turn this die to its opposite side, ${7 - d.n}">Opposite side (→ ${7 - d.n}) <kbd>O</kbd></button>` : ''}
        ${sel && t.focus ? `<span class="inc">Focused: turn to…</span><span class="t-turn">${[1, 2, 3, 4, 5, 6].filter(n => n !== d.n).map(n => `<button class="btn s cy" data-a="focus" data-n="${n}" data-k="focus${n}" aria-label="Focused: turn this die to ${n}">${A.pip(n, 20)}</button>`).join('')}</span>` : ''}
        ${d && E.canSpot(G, d) ? `<button class="btn cy" data-a="spot" data-k="spot">Spotlight: make it a double</button>` : ''}
        ${d && E.canTicket(G, d) ? `<span class="inc">Golden ticket: turn to…</span><span class="t-turn">${[1, 2, 3, 4, 5, 6].filter(n => n !== d.n).map(n => `<button class="btn s cy" data-a="ticket" data-n="${n}" data-k="ticket${n}" aria-label="Golden ticket: turn this die to ${n}">${A.pip(n, 20)}</button>`).join('')}</span>` : ''}
        ${G.team.map((id, k) => E.canSlip(G, k) ? G.play.filter(m => E.left(m)).map(m => `<button class="btn s cy" data-a="slip" data-n="${k}" data-u="${m.uid}" data-k="slip${k}${m.uid}">Slip: ${esc(m.name)} misses ${esc(SHORT[id])}</button>`).join('') : '').join('')}
        ${sel && t.enrich ? `<span class="inc">${esc(SHORT[G.team[d.k]])}’s Enrichment: turn to</span><span class="t-turn">${[1, 2, 3, 4, 5, 6].filter(n => n !== d.n).map(n => `<button class="btn s" data-a="turn" data-n="${n}" data-k="turn${n}" aria-label="Turn this die to ${n}">${A.pip(n, 20)}</button>`).join('')}</span>` : ''}
        <span class="inc grow dk">${incText()}</span>
        <button class="btn" data-a="undo" data-k="undo" ${G.undo.length ? '' : 'disabled'}>Undo <kbd>U</kbd></button>
        <button class="btn p" data-a="end" data-k="end">End round <kbd>E</kbd></button></div>`;
    } else if (G.phase === 'tuck') {
      hint = `<b>${esc(G.tuck[0].name)} is baselined.</b> Pick the agent it tucks under, whoever holds it: <b>Tuck it here</b> on the mat.`;
    } else if (G.phase === 'deal') {
      const c = G.deal[0], full = UI.dealTo != null && E.dealFull(G, UI.dealTo);
      hint = full ? `<b>${esc(nm(G.team[UI.dealTo]))}’s slots are full.</b> Discard one of their items on the mat, or keep the new ${esc(E.KIT_NAME[c.t])} out.`
        : G.n === 1 ? `<b>Your item slots are full.</b> Discard one to take the ${esc(E.KIT_NAME[c.t])}, or keep it out.`
        : `<b>Deal the ${esc(E.KIT_NAME[c.t])}</b>${G.deal.length > 1 ? ` (${G.deal.length} to deal)` : ''}: it takes one of that player’s item slots. Tap <b>Give to …</b> on the mat${G.n <= 4 ? ' (keys 1–' + G.n + ')' : ''}.`;
    }
    // Items by the dice: each player's items in the dock while fighting, consumables with Use.
    const kit = (G.phase === 'roll' || G.phase === 'assign') ? `<div class="t-dkit" role="group" aria-label="Items">${G.team.map((id, k) => `<span class="t-dk"><b>${esc(SHORT[id])}</b>${[...G.agents[k].map(c => `<span class="chip ag">${esc(E.KIT_NAME[c.t])}</span>`), ...G.hand[k].map(c => `<button class="btn s cy" type="button" data-a="use" data-u="${c.uid}" data-k="duse${c.uid}" ${E.canUse(G, c.t) ? '' : 'disabled'}>Use ${esc(E.KIT_NAME[c.t])}</button>`)].join('') || '<span class="chip">No items</span>'}<span class="num slots">${E.heldN(G, k)}/${E.slotsOf(G, k)}</span></span>`).join('')}</div>` : '';
    return `<div class="dock" role="region" aria-label="Dice tray"><div class="dockin">${kit}<p class="status" aria-live="polite">${UI.msg ? `<span class="${UI.err ? 'err' : ''}">${esc(UI.msg)}</span> ` : ''}${hint}</p>${ctl}</div></div>`;
  }
  function incText() {
    const G = UI.G, inc = E.incoming(G), tot = inc.total.reduce((a, b) => a + b, 0);
    return tot ? `At round end: ${G.team.map((id, k) => `${esc(nm(id))} <b class="num">−${inc.total[k]}</b>${inc.exposed.includes(k) ? ' (Exposed +1)' : ''}`).join(' · ')}` : '<span class="safe">Nothing hits back this round.</span>';
  }
  function vLog() {
    if (UI.drawer !== 'log') return '';
    const L = UI.G.log.slice().reverse();
    return `<aside class="logp" aria-label="Game log"><div class="lh"><h2 class="sech">Log</h2><button class="btn s" data-a="log" data-k="logx">Close <kbd>Esc</kbd></button></div><div class="log">${L.map(l => `<p class="${l.kind}"><span class="t">${l.fight ? `F${l.fight}${l.round ? '·R' + l.round : ''}` : '—'}</span>${esc(l.text)}</p>`).join('')}</div></aside>`;
  }
  function vGallery() {
    if (!UI.cards) return '';
    const all = [...A.mobs().map(m => ['mob:' + m.id, A.mobCard(m)]), ...A.BOSS_IDS.map(id => ['boss:' + id, A.bossCard(A.boss(id))]), ['legend', A.legend], ['tracker', A.tracker], ...A.ANALYST_IDS.map(id => ['analyst:' + id, A.analystCard(id)]), ...[...A.AGENT_IDS, ...A.CONS_IDS].map(t => ['agent:' + t, A.agentCard(t)]), ...A.SIT_IDS.map(id => ['sit:' + id, A.sitCard(id)]), ...A.COND_IDS.map(id => ['cond:' + id, A.condCard(id)])];
    return `<div class="t-gallery" role="dialog" aria-label="All cards"><div class="in"><div class="lh"><h2 class="sech">Every card · the same as the print-and-play deck</h2><button class="btn s" data-a="cards" data-k="cardsx">Close <kbd>Esc</kbd></button></div>
      <div class="grid">${all.map(([k, h]) => `<div class="t-gslot" data-card="${k}">${h}</div>`).join('')}</div></div></div>`;
  }
  // The boss reveal (as ui/ui.js): the boss card scans in over the table, with the one thing worth knowing.
  function vReveal() {
    const G = UI.G; if (!UI.reveal || G.over) return '';
    return `<div class="reveal" role="dialog" aria-modal="true" aria-labelledby="rv-h"><div class="rv"><div class="rv-card" data-card="boss:${G.boss.id}">${A.bossCard(A.boss(G.boss.id))}</div>
      <div class="rv-b"><time class="clk f">05:59</time><h2 class="logo" id="rv-h">The boss is here</h2><p class="lede">${esc(G.boss.name)} arrives with one last row roll and no arrival hits. ${esc(A.BOSS_TEXT[G.boss.id][0])}${E.MODES[G.mode].bossRow ? ` Full Shift: ${esc(A.BOSS_TEXT[G.boss.id][1])}` : ''} Spend your doubles.</p>
      <button class="btn p big" type="button" data-a="unreveal" data-k="unreveal">Face it</button></div></div></div>`;
  }
  // Who dropped the crew: the last mob whose hit took someone to 0, from the log.
  function killer() {
    const G = UI.G, h = G.log.slice().reverse().find(l => l.kind === 'hurt' && / 0 HP left/.test(l.text)), m = h && /\((.+?) (hits back|arrives)\)/.exec(h.text);
    return m ? m[1] : null;
  }
  function vEnd() {
    const G = UI.G; if (!G.over) return '';
    const ms = (UI.end || Date.now()) - UI.start, who = killer(), km = who && [...D.mobs].find(m => m.name === who);
    const artSvg = G.win ? (ART['win_' + G.boss.id] || ART.win) : km ? ART[km.id] : (who === G.boss.name ? A.SCENE.boss(G.boss.id) : ART.hero);
    const down = G.hp.findIndex(h => h <= 0);
    const roster = G.team.map((id, k) => `<li class="${!G.win && k === down ? 'down' : ''}"><span class="art">${crop(ART[id], SQUARE(id))}</span><span><span class="nm">${esc(nm(id))}</span><br><span class="num">${G.hp[k]}/${G.max}</span> <span class="meta">HP</span></span></li>`).join('');
    return `<div class="t-end" role="dialog" aria-label="Shift over"><div class="end">
      <article class="endcard ${G.win ? 'win' : 'loss'}"><div class="ec-art"><span class="art">${slice(artSvg)}</span><span class="stamp" aria-hidden="true">${G.win ? 'Contained' : 'Flatlined'}</span></div>
        <div class="ec-bd"><p class="meta ${G.win ? 'c' : 'f'}">${esc(E.MODES[G.mode].label)} · ${G.n}p · ${G.max} HP</p>
          <h2 class="logo" tabindex="-1">${G.win ? 'Shift survived' : 'Shift lost'}</h2>
          ${G.win ? `<p class="lede"><time class="clk dawn">06:00</time> You made it to dawn. ${esc(G.boss.name)} is beaten. Everybody walks out.</p>`
            : `<p class="cause"><time class="clk">${clockNow()}</time> The shift fell in ${G.bossOut ? 'the boss fight' : `fight ${G.fight}`}${who ? `: <b>${esc(who)}</b> took the ${esc(nm(G.team[down >= 0 ? down : 0]))} to 0 HP` : ''}.</p>`}
          <ul class="roster" aria-label="Crew">${roster}</ul>
          <div class="stats"><div><b>${G.fight}</b><span class="meta">Fights</span></div><div><b>${G.stats.rounds}</b><span class="meta">Rounds</span></div><div><b>${G.stats.back}</b><span class="meta">Comebacks</span></div><div><b>${G.stats.guards}</b><span class="meta">Guards</span></div></div>
          <div class="did"><h3 class="sech">What your items did</h3>${itemsDid(G).length ? `<ul>${itemsDid(G).map(x => `<li><b class="num">${x.n}</b> ${esc(x.what)} <span class="meta">${esc(x.name)}</span></li>`).join('')}</ul>` : '<p class="meta">Nothing this shift: no item got used.</p>'}</div>
          <div class="dur"><p class="meta">Shift took <b class="num">${mmss(ms)}</b> · lowest HP <b class="num">${Math.min(...G.hp)}</b></p><button class="lnk" type="button" data-a="copy" data-k="copy">${UI.copied === 'ok' ? ICON.check + 'Copied' : 'Copy result'}</button></div>
          ${UI.copied && UI.copied !== 'ok' ? `<label class="meta copyx">Copy this line<textarea class="t-line" rows="3" readonly>${esc(UI.copied)}</textarea></label>` : ''}
          <p class="sig" data-line>${esc(resultLine())}</p></div></article>
      <div class="endbar"><button class="btn p big" type="button" data-a="quit" data-k="again">New shift</button><button class="btn big" type="button" data-a="log" data-k="log2">Log</button></div>
    </div></div>`;
  }

  // ---- Render and events ------------------------------------------------------------------------------------------
  function render() {
    const k = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    app.innerHTML = UI.G ? `<div class="wrap game">${vTop()}<div class="t-main">${vTable()}${vSide()}</div></div>` + vDock() + vReveal() + vLog() + vGallery() + vEnd() : vSetup() + vGallery();
    document.body.classList.toggle('ingame', !!UI.G);
    if (k) focusKey(k);
  }
  function focusKey(k) { const el = app.querySelector(`[data-k="${k}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }

  // ---- Card peek: hover a small card (tap it on a phone) to read it full size ----------------------------------
  // The peek holds the same shared card markup as print and the gallery. It lives outside #app so renders keep it.
  const peek = document.createElement('div'); peek.className = 't-peek'; peek.setAttribute('aria-hidden', 'true'); document.body.appendChild(peek);
  const cardByKey = k => k.startsWith('boss:') ? A.bossCard(A.boss(k.slice(5))) : k === 'legend' ? A.legend : k === 'tracker' ? A.tracker : k.startsWith('mob:') ? A.mobCard(dataMob(k.slice(4)))
    : k.startsWith('analyst:') ? A.analystCard(k.slice(8)) : k.startsWith('agent:') ? A.agentCard(k.slice(6)) : k.startsWith('sit:') ? A.sitCard(k.slice(4)) : k.startsWith('cond:') ? A.condCard(k.slice(5)) : '';
  let peekKey = null, lastPtr = 'mouse';
  function showPeek(slot) {
    const c = slot && slot.querySelector('.card'); if (!c || slot.closest('.t-gallery')) return hidePeek();
    const r = c.getBoundingClientRect(); if (r.width >= 300) return hidePeek(); // already big enough to read
    const k = slot.dataset.card; if (peekKey !== k) { peek.innerHTML = cardByKey(k); peekKey = k; }
    const vw = window.innerWidth, vh = window.innerHeight, W = Math.min(360, vw - 16, (vh - 16) * 240 / 336), H = W * 336 / 240, gap = 12;
    let x = r.right + gap; if (x + W > vw - 8) x = r.left - gap - W; if (x < 8) x = (vw - W) / 2;
    const y = Math.max(8, Math.min(r.top + r.height / 2 - H / 2, vh - H - 8));
    peek.style.setProperty('--pz', (W / 240).toFixed(3)); peek.style.left = x + 'px'; peek.style.top = y + 'px'; peek.classList.add('on');
  }
  function hidePeek() { peek.classList.remove('on'); peekKey = null; }
  const peekSlot = t => t && t.closest && t.closest('.card') && !t.closest('[data-a]') ? t.closest('[data-card]') : null;
  app.addEventListener('pointerdown', e => { lastPtr = e.pointerType || 'mouse'; }, { capture: true });
  app.addEventListener('mouseover', e => { if (lastPtr === 'touch') return; const s = peekSlot(e.target); if (s) showPeek(s); else hidePeek(); });
  app.addEventListener('mouseleave', hidePeek);
  app.addEventListener('click', e => { if (lastPtr !== 'touch') return; const s = peekSlot(e.target);
    if (s && !(peek.classList.contains('on') && peekKey === s.dataset.card)) showPeek(s); else hidePeek(); });
  window.addEventListener('scroll', hidePeek, { passive: true });

  app.addEventListener('click', e => {
    const G = UI.G;
    const b = e.target.closest && e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'pick') { const s = UI.setup.team, id = b.dataset.id, j = s.indexOf(id); if (j >= 0) { if (s.length > 1) s.splice(j, 1); } else if (s.length < 4) s.push(id); return render(); }
    if (a === 'start') return startGame();
    if (a === 'mode') { UI.setup.mode = b.dataset.m; return render(); }
    if (a === 'snd') { Sound.toggle(); return render(); }
    if (a === 'cards') { UI.cards = !UI.cards; return render(); }
    if (a === 'log') { UI.drawer = UI.drawer === 'log' ? null : 'log'; return render(); }
    if (a === 'quit') { if (G && !G.over && !confirmQuit()) return; UI.G = null; UI.drawer = null; UI.dealTo = null; UI.reveal = false; UI.seed = (UI.seed * 7 + 13) % 1e9; return render(); }
    if (a === 'copy') return copyResult();
    if (!G) return;
    if (a === 'unreveal') { UI.reveal = false; render(); return focusKey('roll'); }
    if (a === 'point') return act(() => E.setPoint(G, +b.dataset.n));
    if (a === 'flip') { act(() => E.flip(G)); if (G.phase === 'sit') { say(`Situation: ${D.situations.find(s => s.id === G.sit.id).name}. ${nm(G.team[G.point])} is on point.`); return focusKey(app.querySelector('[data-a="sit"]:not(:disabled)') ? app.querySelector('[data-a="sit"]:not(:disabled)').dataset.k : ''); } return focusKey(UI.reveal ? 'unreveal' : 'roll'); }
    if (a === 'sit') { act(() => E.resolveSit(G, b.dataset.o, b.dataset.n ? +b.dataset.n : undefined)); if (!UI.err && G.sit) say(G.sit.text); return focusKey(G.phase === 'flip' ? 'sitflip' : ''); }
    if (a === 'focus') { const i = UI.sel; act(() => E.focus(G, i, +b.dataset.n)); return focusKey('die' + i); }
    if (a === 'eng') { const i = UI.sel; act(() => E.engTurn(G, i)); return focusKey('die' + i); }
    if (a === 'spot') { const i = UI.sel; act(() => E.spotlight(G, i)); return focusKey('die' + i); }
    if (a === 'ticket') { const i = UI.sel; act(() => E.ticket(G, i, +b.dataset.n)); return focusKey('die' + i); }
    if (a === 'slip') { act(() => E.slip(G, +b.dataset.n, b.dataset.u)); return focusKey('end'); }
    if (a === 'baseline') { act(() => E.baseline(G, b.dataset.u)); return focusKey('roll'); }
    if (a === 'tuck') { act(() => E.tuck(G, b.dataset.u)); return focusKey(G.phase === 'flip' ? 'flip' : ''); }
    if (a === 'roll') { UI.reveal = false; UI.sel = null; UI.more = null; UI.guarding = null; act(() => E.roll(G)); nextDie(); render(); return focusKey('die' + (UI.sel || 0)); }
    if (a === 'die') { const i = +b.dataset.i; UI.more = null; UI.guarding = null; UI.sel = UI.sel === i ? null : i; UI.msg = ''; return render(); }
    if (a === 'slot') return tapSlot(b.dataset.u, +b.dataset.p);
    if (a === 'guard') return doGuard();
    if (a === 'guardfor') return guardFor(+b.dataset.n);
    if (a === 'heal') { const i = UI.sel; UI.sel = null; act(() => E.heal(G, i, +b.dataset.n)); return focusKey('end'); }
    if (a === 'guardx') { UI.guarding = null; render(); return focusKey('guard'); }
    if (a === 'pair') { const i = +b.dataset.i; doPair(i, +b.dataset.j); return focusKey('die' + i); }
    if (a === 'reroll') { const i = UI.sel; act(() => E.reroll(G, i)); return focusKey('die' + i); }
    if (a === 'turn') { const i = UI.sel; return act(() => E.enrichTurn(G, i, +b.dataset.n)); }
    if (a === 'undo') { UI.more = null; UI.guarding = null; act(() => E.unassign(G)); const last = G.dice.filter(d => !d.used).map(d => d.i); if (UI.sel == null || (G.dice[UI.sel] && G.dice[UI.sel].used)) UI.sel = last.length ? last[last.length - 1] : null; return render(); }
    if (a === 'end') { UI.sel = null; UI.more = null; UI.guarding = null; act(() => E.endRound(G)); return focusKey(G.phase === 'roll' ? 'roll' : 'flip'); }
    if (a === 'use') { act(() => E.use(G, b.dataset.u)); if (G.phase === 'assign' && UI.sel == null) { nextDie(); render(); } return; }
    if (a === 'give') { const k = +b.dataset.n; if (E.dealFull(G, k)) { UI.dealTo = k; UI.msg = ''; render(); return focusKey('keepout'); } UI.dealTo = null; act(() => E.give(G, k)); return focusAfterDeal(); }
    if (a === 'drop') { const k = +b.dataset.n; act(() => E.give(G, k, b.dataset.u)); UI.dealTo = null; render(); return focusAfterDeal(); }
    if (a === 'keepout') { const k = UI.dealTo == null ? 0 : UI.dealTo, c = G.deal[0]; if (c) act(() => E.give(G, k, c.uid)); UI.dealTo = null; render(); return focusAfterDeal(); }
  });
  const focusAfterDeal = () => focusKey(UI.G.phase === 'deal' ? 'give' + UI.G.point : 'flip');
  const confirmQuit = () => { try { return window.confirm('Abandon this shift?'); } catch (e) { return true; } };
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    const G = UI.G, key = e.key.toLowerCase(), click = k => { const el = app.querySelector(`[data-a="${k}"]`); if (el && !el.disabled) { el.click(); e.preventDefault(); } };
    if (key === 'escape' && peek.classList.contains('on')) { hidePeek(); return; }
    if (key === 'escape') { if (UI.cards) UI.cards = false; else if (UI.drawer) UI.drawer = null; else if (UI.reveal) UI.reveal = false; else if (UI.guarding != null) UI.guarding = null; else UI.sel = null; return render(); }
    if (!G) return;
    if (key === 'l') return click('log');
    if (UI.reveal && (key === 'enter' || key === ' ')) return click('unreveal');
    if (G.phase === 'flip' && key === 'f') return click('flip');
    if (G.phase === 'deal' && /^[1-4]$/.test(key)) { const el = app.querySelector(`[data-a="give"][data-n="${+key - 1}"]`); if (el) { el.click(); e.preventDefault(); } return; }
    if (G.phase === 'sit' && /^[1-9]$/.test(key)) { const el = [...app.querySelectorAll('[data-a="sit"]')][+key - 1]; if (el && !el.disabled) { el.click(); e.preventDefault(); } return; }
    if (G.phase === 'roll' && key === 'r') return click('roll');
    if (G.phase === 'roll' && key === 'b') return click('baseline');
    if (G.phase === 'assign') {
      if (UI.guarding != null && /^[1-4]$/.test(key)) { const el = app.querySelector(`[data-a="guardfor"][data-n="${+key - 1}"]`); if (el) { el.click(); e.preventDefault(); } return; }
      if (key === 'p') return click('pair');
      if (/^[1-9]$/.test(key) && G.dice[+key - 1]) { UI.more = null; UI.guarding = null; UI.sel = +key - 1; UI.msg = ''; render(); return focusKey('die' + UI.sel); }
      if (key === 'g') return click('guard');
      if (key === 'x') return click('reroll');
      if (key === 'o') return click('eng');
      if (key === 'u' || key === 'backspace') return click('undo');
      if (key === 'e') return click('end');
    }
  });
  window.CDUI = { UI, render, resultLine, clockAt };
  render();
})();
