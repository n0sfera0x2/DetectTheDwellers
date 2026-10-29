const D = __DATA__;
const ART = __ART__;
__ENGINE__

const E = DTD12(D);
const AART = { triage: 'Network', hunt: 'Identity', contain: 'Endpoint', enrich: 'Cloud', patch: 'Endpoint', recover: 'Identity', decoy: 'Network', recon: 'Cloud' };
const TNAME = { triage: 'Triage', hunt: 'Hunt' };
const app = document.getElementById('app'), live = document.getElementById('live');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };

// Art: new keys (hero, kit_<type>) may be missing, so every lookup falls back.
const pickArt = (...keys) => keys.map(k => ART[k]).find(Boolean) || '';
const slice = svg => { const s = String(svg || ''); return /^<svg[^>]*preserveAspectRatio=/.test(s) ? s.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid slice"') : s.replace('<svg', '<svg preserveAspectRatio="xMidYMid slice"'); };
const bossArt = id => (ART._boss && ART._boss[id]) || ART[id] || '';
const kitArt = type => pickArt('kit_' + type, AART[type]);
const mobArt = m => m.kind === 'boss' ? bossArt(m.id) : ART[m.id] || ART[m.domain] || '';
const ic = (d, extra = '') => `<svg class="ic ${extra}" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${d}</svg>`;
const ICON = { check: ic('<path d="M2.5 8.5l3.5 3.5 7.5-8"/>'), undo: ic('<path d="M5.5 3L2 6.5 5.5 10"/><path d="M2.5 6.5H10a4 4 0 010 8H6"/>'), chev: ic('<path d="M3.5 6l4.5 4.5L12.5 6"/>', 'chev') };

// Booth call to action on the end screens. The URL (or QR target) is pending from Binary Defense:
// leave url null until it is supplied, and the line renders as plain text. Set url and it becomes a link.
const BOOTH_CTA = { text: 'Talk to the night shift at the Binary Defense booth.', url: null };

// A booth visitor usually plays alone: one analyst by default, "Playing with friends?" opens up to four.
const UI = { screen: 'intro', mode: 'intro', diff: 'Analyst', pick: ['HUN'], friends: false, team: '', sel: null, aim: null, board: [], savedAt: null, seen: new Set(), dice: new Set(),
  reveal: false, ko: [], confirmEnd: false, quitAsk: false, kitOpen: new Set(), order: [], dmg: {}, logOpen: false, left: [], bossHp: null };
let G = null, DB = null; const LS = 'dwellers-board-v19', TIPS_LS = 'dwellers-tips-v1', KEYS_LS = 'dwellers-keys-v1';
// The shortcut legend hides for good once a player has used any shortcut.
let keysUsed = (() => { try { return localStorage.getItem(KEYS_LS) === '1'; } catch (e) { return false; } })();
function markKeys() { if (keysUsed) return; keysUsed = true; try { localStorage.setItem(KEYS_LS, '1'); } catch (e) { /* private mode: hidden for this visit */ } }
function loadLocal() { try { UI.board = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { UI.board = []; } }
function saveLocal(x) { try { const b = JSON.parse(localStorage.getItem(LS) || '[]'); b.push(x); b.sort((a, c) => c.score - a.score); localStorage.setItem(LS, JSON.stringify(b.slice(0, 30))); UI.board = b.slice(0, 30); } catch (e) { UI.board = [x]; } }
loadLocal();
(async () => { try { if (window.claude && typeof window.claude.use === 'function') { DB = await window.claude.use('db'); if (DB) DB.collection('dwellers-v19').orderBy('score', 'desc').limit(30).onSnapshot(s => { UI.board = s.docs.map(d => d.data()).filter(Boolean); if (UI.screen !== 'game') render(); }, () => { DB = null; loadLocal(); }); } } catch (e) { DB = null; } })();
function saveScore(x) { if (DB) DB.collection('dwellers-v19').add(x).catch(() => { DB = null; saveLocal(x); }); else saveLocal(x); }

// Tips for Full and Quick Shift: shown the first time each moment comes up, until dismissed.
const tipsSeen = (() => { try { return new Set(JSON.parse(localStorage.getItem(TIPS_LS) || '[]')); } catch (e) { return new Set(); } })();
function dismissTip(k) { tipsSeen.add(k); try { localStorage.setItem(TIPS_LS, JSON.stringify([...tipsSeen])); } catch (e) { /* private mode: remembered for this visit */ } }
const TIPS = {
  point: 'Pick who’s on point, then flip. Some situations only hit whoever is on point.',
  roll: 'Everyone rolls a d20 at once, and whoever’s on point rolls two.',
  rest: 'Hurt? Before you roll, send one analyst off-shift: no roll, no damage, +1 HP.',
  assign: 'Pick a die, then a mob it beats. The die plus your bonus has to reach its Defense.',
  double: '18–20 is a double (16–20 for the Engineer): two hits, and you block that round.',
  end: 'Every mob still up hits everyone who didn’t block, unless its ability says otherwise. End the round when your dice are spent.',
  row: 'Beaten mobs go to the persistence row. Every flip makes a Row roll: a mob whose range matches comes back needing just one hit. The two with the highest Damage hit everyone on the way in.',
  loot: (D.intro && D.intro.tips.loot) || 'Kit drop. Every kit card is an agent: keep it running, or burn it once for a big one-shot effect.',
  boss: (D.intro && D.intro.tips.boss) || 'The boss. Burn what you’ve got.'
};
// Plain words for first-timers: the intro shows these instead of the card perks, which lean on rules terms.
const PERK_PLAIN = {
  HUN: '+5 against mobs that come back after you beat them.',
  RES: '+5 against whichever mob in play hits hardest.',
  ENG: 'Rolls of 16–20 count as doubles (two hits), not just 18–20.',
  SOA: 'Carries one extra kit card for the crew.',
  PAT: 'Sit a round out and the whole crew heals 3 HP, not just you for 1.'
};
// Thumbnail crops on the start screen (viewBox into the 200×112 scene): the analyst and their screen, not the room.
const THUMB = { HUN: '40 14 120 80', RES: '60 6 135 90', ENG: '34 10 120 80', SOA: '45 4 135 90', PAT: '48 14 135 90' };
// Focal points for tall crops (phones, several mobs): the x, as a % of the 200-wide scene, that stays centred
// when the art column is narrower than the scene. Scenes not listed sit at 50%.
const FOCAL = { spray: 45, wraith: 56, druid: 47, imp: 45, mimic: 48, leech: 47, hydra: 46, specter: 52, wyrmling: 52 };
// Crew HP pills on phones: short names that fit without an ellipsis.
const SHORT = { HUN: 'Hunter', RES: 'Resp.', ENG: 'Eng.', SOA: 'Soar.', PAT: 'Fixer' };
const crop = (svg, vb) => vb ? slice(svg).replace(/viewBox="[^"]*"/, `viewBox="${vb}"`) : slice(svg);
const pl = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const FIRST_FIGHT = { pre: 'Hit Roll. Every analyst rolls at once.', live: 'Tap a ready die, then hit a mob it beats: die plus bonus, at least its Defense.', spent: 'Out of dice. End the round: whatever is still standing hits back.' };
// The engine logs "Persist roll"; the player only ever sees one name for it: the Row roll.
const rowWord = t => String(t).replace(/^Persist roll/, 'Row roll').replace(/Persist roll now/, 'Row roll now');

let said = '';
const say = t => { if (!t) return; said = t; live.textContent = ''; setTimeout(() => { if (said === t) live.textContent = t; }, 30); };
const nP = () => String(Math.max(1, Math.min(4, UI.pick.length)));
const hpFor = () => UI.mode === 'full' ? D.hp.full[nP()][UI.diff] : D.hp[UI.mode][nP()];
const nm = k => E.cls(G.team[k]).name;
const canHit = i => { const d = G.dice[i]; return d && !d.used && G.play.some(m => E.beats(G, d, m)); };
const firstLive = () => { const i = G.dice.findIndex((d, j) => canHit(j)); return i >= 0 ? i : null; };
const liveCount = () => G.dice.filter((d, i) => canHit(i)).length;
const isDouble = d => d.dbl || d.r >= 18;
// Why a picked die can't hit this card, matching the engine's beats(): the rule, not just the numbers.
function missWhy(d, m) {
  const who = d.kind === 'agent' ? `The ${d.card.name}’s ${d.r}` : `Die ${d.r}`;
  if (d.kind === 'agent' && m.kind === 'boss') return `${who} can’t hit it: agents never touch the boss.`;
  if (d.kind === 'agent' && m.ability === 'noagent') return `${who} can’t hit it: Fileless, agents can’t touch it.`;
  if (d.kind === 'agent' && d.card.type === 'hunt' && m.left > 2) return `${who} can’t hit it: the Hunt Agent only hits a mob with 1 or 2 hits left.`;
  if (m.ability === 'hardened' && d.r < 12) return `${who} can’t hit it: Evasive, only a natural 12 or higher.`;
  if (d.r === 1) return `${who} can’t hit it: a natural 1 always misses.`;
  return `${who} can’t hit it (${E.total(G, d, m)} vs ${m.def}).`;
}
const toTop = () => { try { scrollTo(0, 0); } catch (e) { /* jsdom */ } };
const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const cap1 = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
// Glue a trailing number to the word before it so a line never orphans it.
const glue = (name, n) => `${esc(name)}&nbsp;${n}`;
const bestBonus = d => G.play.length ? Math.max(...G.play.map(m => E.bonusDie(G, d, m))) : 0;
// One progress model everywhere: G.sit is the situation in play (1-based). Between fights the header, the status line
// and the feed card all name the situation that comes next, so they never disagree by one.
const sitOf = n => `Situation ${n} of ${G.total}`;
const progressLabel = () => G.bossIn ? 'Boss fight' : G.phase === 'point' ? (G.deck.length ? `Next: ${lc1(sitOf(G.sit + 1))}` : 'Next: the boss') : sitOf(G.sit);
const sitArt = c => pickArt('sit_' + c.id, c.type === 'challenge' ? 'fp' : c.type === 'choice' ? 'esc' : 'event', 'event');

// The shift clock: 22:00 to 06:00. Flip i (1-based) of n reads 22:00 + (i − 1) × 480 / n minutes, floored to 5.
// Positional, not printed on cards (the feed is shuffled). The boss always lands at 05:59.
const BOSS_TIME = '05:59';
function clockAt(i, n) {
  const m = 22 * 60 + Math.floor((Math.max(1, i) - 1) * 480 / Math.max(1, n) / 5) * 5;
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
// What the clock reads now: the boss, else the situation in play (or the last one flipped; 22:00 before the first).
const clockNow = () => G.bossIn ? BOSS_TIME : clockAt(G.sit, G.total);
const clockStamp = () => `<time class="clk" data-clock>${clockNow()}</time>`;

// Sound, synthesised with Web Audio: no files, so the page stays one offline file. Rain and a server hum underneath,
// short stings on top. Nothing starts until a user gesture, and every call is a no-op without Web Audio (jsdom).
const SND_LS = 'dwellers-sound-v1';
const Sound = (() => {
  let on = true; try { on = localStorage.getItem(SND_LS) !== '0'; } catch (e) { /* private mode: on for this visit */ }
  let ctx = null, master = null, sfx = null, amb = null, want = false;
  const AC = () => { try { return window.AudioContext || window.webkitAudioContext || null; } catch (e) { return null; } };
  function ensure() {
    if (ctx) return ctx; const C = AC(); if (!C) return null;
    try { ctx = new C(); master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = .32; sfx.connect(master);
      amb = ctx.createGain(); amb.gain.value = 0; amb.connect(master); bed(); } catch (e) { ctx = null; }
    return ctx;
  }
  function noiseBuf(sec) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  // Ambience: rain is looped noise, high-passed and softened; the hum is two low sines under a lowpass.
  function bed() {
    const rain = ctx.createBufferSource(); rain.buffer = noiseBuf(3); rain.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const rg = ctx.createGain(); rg.gain.value = .5; rain.connect(hp).connect(lp).connect(rg).connect(amb); rain.start();
    const hum = ctx.createGain(); hum.gain.value = .9; const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 220; hl.connect(hum).connect(amb);
    [[55, .5], [110, .25], [165, .06]].forEach(([f, g]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f; og.gain.value = g; o.connect(og).connect(hl); o.start(); });
  }
  const now = () => ctx.currentTime;
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
    down: t => { tone(320, t, .42, { type: 'sawtooth', g: .18, to: 70 }); tone(90, t, .3, { g: .6, to: 40 }); hiss(t, .3, { f: 600, q: .7, g: .3, type: 'lowpass' }); },
    comeback: t => { tone(220, t, 1.1, { type: 'triangle', g: .22, a: .35 }); tone(233, t, 1.1, { type: 'triangle', g: .2, a: .35 }); tone(110, t + .1, 1, { g: .25, a: .3 }); },
    boss: t => { tone(55, t, 2.2, { type: 'sawtooth', g: .22, a: .6 }); tone(58.3, t, 2.2, { type: 'sawtooth', g: .18, a: .6 }); tone(41, t + .2, 1.8, { g: .5, a: .4 }); hiss(t, 1.4, { f: 300, q: .6, g: .2, type: 'lowpass' }); },
    win: t => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * .16, 1.6 - i * .2, { g: .22, a: .04 })); tone(261.6, t, 2.2, { type: 'triangle', g: .14, a: .5 }); },
    loss: t => { [392, 311.1, 261.6].forEach((f, i) => tone(f, t + i * .32, .6, { type: 'triangle', g: .26 })); tone(880, t + 1.1, 1.2, { g: .07, a: .02 }); }
  };
  function play(name) { if (!on || !ensure() || !STING[name]) return; try { if (ctx.state === 'suspended') ctx.resume(); STING[name](now() + .01); } catch (e) { /* audio is best-effort */ } }
  // The bed sits well under the stings: about a tenth of their level.
  function ambience(yes) { want = yes; if (!ctx) return; try { amb.gain.cancelScheduledValues(now()); amb.gain.setTargetAtTime(yes && on ? .045 : 0, now(), yes ? 1.2 : .4); } catch (e) { /* best-effort */ } }
  // First gesture: create (or resume) the context, then bring up the bed if a shift is running.
  function unlock() { if (!on || !ensure()) return; try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* best-effort */ } ambience(want); }
  function toggle() { on = !on; try { localStorage.setItem(SND_LS, on ? '1' : '0'); } catch (e) { /* remembered for this visit */ }
    if (on) unlock(); if (ctx) try { master.gain.setTargetAtTime(on ? 1 : 0, now(), .05); } catch (e) { /* best-effort */ } return on; }
  return { play, ambience, unlock, toggle, get on() { return on; }, get live() { return !!ctx; } };
})();
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => Sound.unlock(), { capture: true }));
const SPK = on => ic(`<path d="M2 6h3l4-3v10l-4-3H2z"/>${on ? '<path d="M11.5 5.5a3.5 3.5 0 010 5"/><path d="M13.5 3.5a6.5 6.5 0 010 9"/>' : '<path d="M11 6l4 4M15 6l-4 4"/>'}`);
// One toggle. Phones show it icon-only in the clock line (variant 'm'), wider screens in the top-bar buttons; CSS hides the other.
const soundBtn = (v = 'd') => `<button class="btn s tb snd ${v}" type="button" data-a="snd" data-k="snd${v}" aria-pressed="${Sound.on}"${v === 'm' ? ' aria-label="Sound"' : ''}>${SPK(Sound.on)}${v === 'm' ? '' : '<span>Sound</span>'}</button>`;

// Read-aloud: whoever is on point reads the flipped card out. The text is the card's own, from data; on the flip
// it comes in one line at a time (CSS only, so no button waits on it). Later renders show it whole.
const lines = t => String(t).split(/(?<=[.!?…])\s+/).filter(Boolean);
const readAloud = (t, fresh) => fresh ? lines(t).map((s, i) => `<span class="ln" style="--i:${i}">${esc(s)}</span>`).join(' ') : esc(t);
const aloudHint = () => `<span class="aloud">${G.team.length > 1 ? `${esc(nm(G.point))}, read it aloud` : 'Read it aloud'}</span>`;

// Dice tumble on the roll: the engine has already resolved, so this is presentation only. Each die flickers through
// faces and lands with a slight stagger; a click or key re-renders the tray and lands everything at once.
const ROLL_MS = 560, ROLL_STAGGER = 45, D20_MS = 660;
function tumbleDice() {
  const dice = [...app.querySelectorAll('.dock .die:not(.used)')]; if (!dice.length) return 0;
  if (!reduced()) dice.forEach(el => el.classList.add('rolling'));
  if (reduced()) { dice.forEach(el => el.classList.add('fadein')); return 0; }
  let last = 0; const tb = app.querySelector('.table'); if (tb) tb.classList.add('rolling');
  dice.forEach((el, n) => {
    const b = el.querySelector('b'), keep = b.innerHTML, ms = ROLL_MS + n * ROLL_STAGGER; last = Math.max(last, ms);
    const t = setInterval(() => { if (!el.isConnected) return clearInterval(t); b.textContent = 1 + Math.floor(Math.random() * 20); }, 60);
    setTimeout(() => { clearInterval(t); if (!el.isConnected) return; b.innerHTML = keep; el.classList.remove('rolling'); el.classList.add('landed'); }, ms);
  });
  setTimeout(() => { if (tb) tb.classList.remove('rolling'); }, last);
  return last;
}

function start() {
  G = E.newGame(UI.pick, UI.mode, { diff: UI.diff });
  Object.assign(UI, { screen: 'game', sel: null, aim: null, savedAt: null, seen: new Set(), dice: new Set(), reveal: false, ko: [], confirmEnd: false, quitAsk: false, dmg: {}, left: [], bossHp: null, aim: null });
  UI.logN = G.log.length; toTop(); render(); Sound.ambience(true);
  say(`Shift started at 22:00. Survive until 06:00. ${G.team.length > 1 ? 'Pick who is on point, then flip.' : 'Flip the first situation.'}`);
}

function snap() {
  const doc = el => { const r = el.getBoundingClientRect(); return { left: r.left + scrollX, top: r.top + scrollY, width: r.width }; };
  const rects = {}; app.querySelectorAll('[data-chip]').forEach(el => { rects[el.dataset.chip] = doc(el); });
  const sumEl = app.querySelector('[data-rowsum]'), sum = sumEl && doc(sumEl);
  return { phase: G.phase, held: G.held[0].slice(), hps: G.hps.slice(), play: G.play.slice(), bossIn: G.bossIn, logN: G.log.length, plogN: G.plog.length, sit: G.sit, round: G.round, rolled: G.rolled, hits: G.stats.crewHits + G.stats.agentHits, rects, sum };
}

function act(a, v) {
  if (UI.screen === 'intro') {
    if (a === 'mode') UI.mode = v; if (a === 'diff') UI.diff = v;
    if (a === 'pick') { if (!UI.friends) UI.pick = [v]; else { const i = UI.pick.indexOf(v); if (i >= 0) UI.pick.splice(i, 1); else if (UI.pick.length < 4) UI.pick.push(v); } }
    if (a === 'friends') UI.friends = true;
    if (a === 'solo') { UI.friends = false; UI.pick = UI.pick.slice(0, 1); if (!UI.pick.length) UI.pick = ['HUN']; }
    if (a === 'start' && UI.pick.length) return start(); return render();
  }
  if (UI.screen === 'end') { if (a === 'again') return start(); if (a === 'new') { UI.screen = 'intro'; toTop(); return render(); } return; }
  if (a === 'quit') { UI.quitAsk = true; return render(); }
  if (a === 'quitn') { UI.quitAsk = false; return render(); }
  if (a === 'quity') { UI.quitAsk = false; UI.screen = 'intro'; G = null; toTop(); render(); say('Shift abandoned. Back at the start screen.'); return; }
  if (a === 'tipx') { dismissTip(v); return render(); }
  if (a === 'snd') { const on = Sound.toggle(); Sound.ambience(true); render(); say(on ? 'Sound on.' : 'Sound off.'); return; }
  if (a === 'log') { UI.logOpen = !UI.logOpen; render(); const t = document.getElementById(UI.logOpen ? 'logx' : 'logb'); if (t) t.focus(); return; }
  if (a === 'kitx') { UI.kitOpen.has(v) ? UI.kitOpen.delete(v) : UI.kitOpen.add(v); return render(); }
  if (a === 'fight') { UI.reveal = false; render(); const h = document.getElementById('fight-h'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start' }); say(`Fight ${G.boss.name}. Roll when you’re ready.`); return; }
  const before = snap(), wasConfirm = UI.confirmEnd; let extra = '';
  UI.reveal = false; UI.confirmEnd = false; UI.ko = [];
  if (a === 'point') E.setPoint(G, +v);
  else if (a === 'flip') { G.lastSit = null; E.flip(G); UI.sel = null; }
  else if (a === 'sit') E.resolveSit(G, +v);
  else if (a === 'rest') E.setRest(G, +v);
  else if (a === 'decoy') E.decoy(G);
  else if (a === 'roll') { if (E.rollAll(G)) { UI.sel = firstLive(); extra = rollSummary(); } }
  else if (a === 'die') { const i = +v; if (G.dice[i] && !G.dice[i].used) UI.sel = UI.sel === i ? null : i; if (UI.sel !== null) extra = `Die ${G.dice[UI.sel].r} picked. It beats ${pl(G.play.filter(m => E.beats(G, G.dice[UI.sel], m)).length, 'mob')}.`; }
  else if (a === 'hit') { if (UI.sel !== null && E.assign(G, UI.sel, +v)) UI.sel = G.phase === 'combat' ? firstLive() : null; }
  else if (a === 'undo') { if (E.unassign(G)) { UI.sel = firstLive(); extra = 'Last hit taken back.'; } }
  else if (a === 'end') {
    const n = liveCount();
    if (n && !wasConfirm) { UI.confirmEnd = true; render(); say(`${n} ${n > 1 ? 'dice' : 'die'} can still hit. Press End again to take the hits anyway.`); return; }
    if (E.endRound(G)) UI.sel = null;
  }
  else if (a === 'burn') { const i = +v, c = G.held[0][i]; if (c && ['hunt', 'patch', 'recon'].includes(c.type)) UI.aim = UI.aim && UI.aim.i === i ? null : { i, type: c.type }; else E.burn(G, 0, i); }
  else if (a === 'aim') { if (UI.aim) { E.burn(G, 0, UI.aim.i, +v); UI.aim = null; } }
  else if (a === 'take') { const [k, drop] = v.split(':'); if (k === 'x' && G.loot[0]) UI.left.push(G.loot[0]); E.takeLoot(G, 0, k === 'x' ? null : +k, drop === undefined ? undefined : +drop); }
  if (G.over) return finish(before);
  // Mobs that just went down get a short knockout beat before they leave the board.
  if (['hit', 'aim', 'burn'].includes(a)) {
    const ko = before.play.filter(m => !G.play.includes(m)).map(m => ({ ...m }));
    if (ko.length) { UI.ko = ko; setTimeout(() => { if (UI.ko === ko) { UI.ko = []; if (UI.screen === 'game') render(); } }, 320); }
  }
  if (!before.bossIn && G.bossIn && G.phase === 'combat') { UI.reveal = true; UI.bossHp = G.hps.slice(); }
  render(); effects(before);
  const landIn = a === 'roll' && G.rolled && before.phase === 'combat' && !before.rolled ? tumbleDice() : 0;
  stings(a, before, landIn);
  if (a === 'die' && UI.sel !== null) focusTarget();
  if (before.phase !== 'combat' && G.phase === 'combat' && !UI.reveal) { const h = app.querySelector('.pbanner') || document.getElementById('fight-h'); if (h && h.scrollIntoView) { const t = h.getBoundingClientRect().top; if (t < 0 || t > innerHeight * .45) h.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } }
  tally(a, before);
  // A roll is announced once, after the dice land; everything else straight away.
  const line = announce(a, before, extra);
  if (landIn) { const g = G; setTimeout(() => { if (G === g) say(line); }, landIn); } else say(line);
}

// One sting per action, timed to what is on screen: the rattle with the tumble, a double when its die lands,
// a comeback when the Row roll die settles, the boss over its reveal.
function stings(a, before, landIn) {
  if (a === 'roll' && G.rolled) { Sound.play('roll'); if (G.dice.some(d => d.kind === 'crew' && isDouble(d))) setTimeout(() => Sound.play('double'), landIn); }
  if (['hit', 'aim', 'burn'].includes(a)) { if (UI.ko.length) Sound.play('down'); else if (G.stats.crewHits + G.stats.agentHits > before.hits) Sound.play('hit'); }
  const rolls = G.plog.slice(before.plogN);
  if (rolls.length && !UI.reveal) { Sound.play('roll'); if (rolls.some(x => x.back.length)) setTimeout(() => Sound.play('comeback'), reduced() ? 0 : D20_MS); }
  if (UI.reveal && !before.bossIn) Sound.play('boss');
}

// Damage per mob across the shift, for the loss screen's "what would have helped" line. Read-only on engine state.
function tally(a, before) {
  G.log.slice(before.logN).forEach(l => { const m = /−(\d+) HP \((.+) hits on the way back\)/.exec(l.t); if (m) UI.dmg[m[2]] = (UI.dmg[m[2]] || 0) + +m[1]; });
  const L = G.lastRound; if (a === 'end' && L && L.by && L.round === before.round) L.by.forEach(list => list.forEach(x => { UI.dmg[x.name] = (UI.dmg[x.name] || 0) + x.d; }));
}

// One short sentence or two per action for the live region, instead of every log line.
function announce(a, before, extra) {
  const lost = G.hps.map((h, k) => Math.max(0, before.hps[k] - h)), hurtK = lost.map((d, k) => [d, k]).filter(([d]) => d > 0);
  const whoFor = () => !hurtK.length ? '' : hurtK.length === G.team.length && G.team.length > 1 && hurtK.every(([d]) => d === hurtK[0][0]) ? `everyone for ${hurtK[0][0]}` : listOf(hurtK.map(([d, k]) => `the ${nm(k)} for ${d}`));
  const rolls = G.plog.slice(before.plogN).map(x => `Row roll ${x.r}: ${x.back.length ? `${listOf(x.back)} came back` : 'the row stays quiet'}`);
  const out = [];
  if (a === 'flip') {
    if (rolls.length) out.push(rolls.join('. ') + (hurtK.length && G.plog.slice(before.plogN).some(x => x.back.length) ? ` and hit ${whoFor()}` : '') + '.');
    out.push(G.bossIn ? `${G.boss.name} is here.` : G.phase === 'sit' ? `Situation ${G.sit}: ${G.cur.name}.` : `Situation ${G.sit}: ${listOf(G.play.map(m => m.name))}. Roll when you’re ready.`);
  } else if (a === 'hit' || a === 'aim' || a === 'burn') {
    const last = G.log.slice(before.logN).map(l => l.t).filter(t => !/^Persist roll/.test(t));
    out.push(...last.slice(0, 3).map(rowWord));
    if (rolls.length) out.push(rolls.join('. ') + '.');
  } else if (a === 'end') {
    out.push(`Round ${before.round} over.` + (hurtK.length ? ` Mobs hit ${whoFor()}.` : ' Nobody took damage.'));
    if (rolls.length) out.push(rolls.join('. ') + '.');
  } else if (a !== 'roll' && a !== 'die') {
    const lines = G.log.slice(before.logN).map(l => rowWord(l.t)); out.push(...lines.slice(-2));
  }
  return [...out, extra].filter(Boolean).join(' ');
}

function rollSummary() {
  return 'Rolled. ' + G.team.map((w, k) => { const ds = G.dice.filter(d => d.k === k && d.kind === 'crew').map(d => d.r + (isDouble(d) ? ' double' : '')); return ds.length ? `${nm(k)}: ${listOf(ds)}.` : ''; }).join(' ');
}

// After a render: the persist d20 tumbles and lands on its roll, comebacks lift out of the row strip and fly into
// the fight (where the card takes a BACK stamp), and every crew HP bar that took damage flashes.
function effects(before) {
  G.hps.forEach((h, k) => { if (h < before.hps[k]) { const el = app.querySelector(`[data-hp="${k}"]`); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } } });
  const motion = !reduced();
  const die = G.plog.length > before.plogN && app.querySelector('.d20[data-roll]');
  if (die && motion) {
    const v = die.querySelector('.dv'), r = die.dataset.roll, bn = die.closest('.pbanner'); let n = 0; die.classList.add('tumble'); if (bn) bn.classList.add('rolling');
    const t = setInterval(() => { if (!v.isConnected || ++n >= D20_MS / 60) { clearInterval(t); v.textContent = r; die.classList.remove('tumble'); die.classList.add('landed'); if (bn) bn.classList.remove('rolling'); return; } v.textContent = 1 + Math.floor(Math.random() * 20); }, 60);
  } else if (die) die.classList.add('fadein');
  const back = G.play.filter(m => m.back > 0 && !before.play.includes(m));
  back.forEach((m, n) => {
    const card = app.querySelector(`[data-mob="${m.uid}"]`), from = before.rects[m.uid] || before.sum; if (!card) return;
    if (!from || !motion || !card.animate) return;
    // The row card lands on the mob's art (not its header), and flies under the sticky top bar, never over it.
    const sc = card.querySelector('.scr') || card, r = sc.getBoundingClientRect(), g = document.createElement('div');
    g.className = 'ghost'; g.innerHTML = `<b>${esc(m.name)}</b>`; g.setAttribute('aria-hidden', 'true');
    const w = Math.max(120, Math.min(180, from.width));
    const x0 = Math.max(scrollX + 8, Math.min(from.left, scrollX + innerWidth - w - 8));
    Object.assign(g.style, { left: x0 + 'px', top: from.top + 'px', width: w + 'px' }); document.body.appendChild(g);
    const to = { left: r.left + scrollX + r.width / 2 - w / 2, top: r.top + scrollY + r.height / 2 - 18 }, dx = to.left - x0, dy = to.top - from.top;
    g.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(0,-10px)', opacity: 1, offset: .25 }, { transform: `translate(${dx}px,${dy}px)`, opacity: .9, offset: .85 }, { transform: `translate(${dx}px,${dy}px) scale(.9)`, opacity: 0 }],
      { duration: 820, delay: 380 + n * 110, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).onfinish = () => g.remove();
    setTimeout(() => g.remove(), 1800);
  });
}

function finish(before) {
  const low = Math.min(...G.hps), f = 1 - low / G.max; G.tier = !G.win ? 'Flatlined' : f <= .3 ? 'Wingman' : f <= .6 ? 'Solid Shift' : 'Close Call';
  const rank = { Wingman: 3, 'Solid Shift': 2, 'Close Call': 1 }[G.tier] || 0;
  const x = { team: (UI.team || 'Night shift').slice(0, 24), mode: UI.mode, diff: UI.mode === 'full' ? UI.diff : UI.mode === 'intro' ? 'First Shift' : 'Quick', players: G.team.length, tier: G.tier, hp: low, max: G.max, score: rank * 1000 + Math.round(low / G.max * 500) - G.stats.rounds, at: Date.now() };
  UI.savedAt = x.at; UI.before = before; UI.fellAt = clockNow(); saveScore(x); Sound.ambience(false); Sound.play(G.win ? 'win' : 'loss'); UI.screen = 'end'; UI.reveal = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); toTop(); render();
  const h = document.getElementById('end-h'); if (h) h.focus({ preventScroll: true });
  say(G.win ? `Shift survived. You made it to 06:00. ${G.boss.name} contained. ${G.tier}.` : `Shift lost at ${UI.fellAt}. The ${nm(G.dropped)} went down to ${listOf(G.downBy || ['the mobs'])}.`);
}

app.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.v); });
app.addEventListener('input', e => { if (e.target.id === 'team') UI.team = e.target.value; });
// Shortcuts for repeat players: R roll, E end round, F flip, U undo, 1–9 pick a die.
document.addEventListener('keydown', e => {
  if (UI.screen !== 'game' || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (UI.reveal) { if (e.key === 'Tab') trapTab(e); return; }
  if (e.key === 'Escape' && UI.logOpen) { e.preventDefault(); act('log'); return; }
  const k = e.key.toLowerCase(), fire = sel => { const b = app.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); markKeys(); act(b.dataset.a, b.dataset.v); } };
  if (k === 'r') fire('[data-a=roll]'); else if (k === 'e') fire('[data-a=end]'); else if (k === 'f') fire('[data-a=flip]'); else if (k === 'u') fire('[data-a=undo]');
  else if (k === 'escape' && UI.quitAsk) act('quitn');
  else if (/^[1-9]$/.test(k) && UI.order[+k - 1] != null) { const i = UI.order[+k - 1]; if (G.dice[i] && !G.dice[i].used) { e.preventDefault(); markKeys(); act('die', String(i)); } }
});

// Wide screens hit from the mob cards, which come before the dice tray in the DOM. After a pick, focus jumps to the
// first card the die beats, so the next Tab (or Enter) is the hit. Narrow screens list targets after the dice already.
const wide = () => { try { return matchMedia('(min-width:1041px)').matches; } catch (e) { return false; } };
function focusTarget() { if (!wide()) return; const t = app.querySelector('.hitb'); if (t) t.focus(); }

// The boss reveal is modal: Tab and Shift+Tab cycle through its buttons and never reach the board behind it.
function trapTab(e) {
  const f = [...app.querySelectorAll('.reveal button:not(:disabled)')]; if (!f.length) return;
  const i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
  e.preventDefault(); f[n].focus();
}
app.addEventListener('focusin', e => { if (UI.screen === 'game' && UI.reveal && !e.target.closest('.reveal')) { const f = app.querySelector('.reveal [data-a=fight]'); if (f) f.focus(); } });

function render() {
  const ae = document.activeElement, had = ae && ae !== app && app.contains(ae), k = had && ae.dataset ? ae.dataset.k : null;
  app.innerHTML = UI.screen === 'intro' ? vIntro() : UI.screen === 'end' ? vEnd() : vGame();
  if (UI.screen === 'game' && UI.reveal) { const f = app.querySelector('[data-a=fight]'); if (f) f.focus(); return; }
  if (!had) return;
  let el = k && app.querySelector(`[data-k="${k}"]`);
  // The focused control is gone: land on the picked die, the next live die, or the next action. Never the page body.
  if (!el || el.disabled) el = app.querySelector('[data-a=die][aria-pressed=true]') || app.querySelector('[data-a=die]:not(:disabled):not(.dead)') || app.querySelector('[data-primary]:not(:disabled)') || app.querySelector('.main button:not(:disabled), .setup button:not(:disabled), .end button:not(:disabled)');
  if (el) el.focus();
}

function lb(compact) {
  const rows = UI.board.filter(r => r.mode === UI.mode).slice(0, 10);
  if (!rows.length) return compact ? '' : `<p class="body-s">No ${esc(D.modes[UI.mode].label)} shifts logged yet. Yours is the first on the board.</p>`;
  return `<div style="overflow-x:auto"><table class="lb"><thead><tr><th scope="col">#</th><th scope="col">Crew</th><th scope="col">Result</th><th scope="col" style="text-align:right">Lowest HP</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.at === UI.savedAt ? 'me' : ''}"><td class="n" style="text-align:left">${i + 1}</td><td>${esc(r.team)}</td><td>${esc(r.tier)} · ${esc(r.players)}p${r.mode === 'full' ? ' · ' + esc(r.diff) : ''}</td><td class="n">${esc(r.hp)}/${esc(r.max)}</td></tr>`).join('')}</tbody></table></div>`;
}

function vIntro() {
  const solo = !UI.friends, n = UI.pick.length;
  const picks = D.classes.map(c => { const on = UI.pick.includes(c.id);
    return `<button type="button" class="pick" data-a="pick" data-v="${c.id}" data-k="p${c.id}" aria-pressed="${on}" ${!solo && !on && n >= 4 ? 'disabled' : ''}><span class="art">${crop(ART[c.id], THUMB[c.id])}</span><span><span class="nm">${esc(c.name)}</span><br><span class="perk">${esc(PERK_PLAIN[c.id] || c.perk)}</span></span><span class="st">${on ? ICON.check + (solo ? 'You' : 'In') : solo ? 'Pick' : 'Add'}</span></button>`; }).join('');
  const order = ['intro', 'quick', 'full'].filter(k => D.modes[k]);
  const modes = order.map(k => { const m = D.modes[k]; return `<button type="button" class="opt" data-a="mode" data-v="${k}" data-k="m${k}" aria-pressed="${UI.mode === k}"><b>${esc(m.label)}</b><span class="meta">${esc(m.minutes)} min</span></button>`; }).join('');
  const diffs = UI.mode === 'full' ? `<h2 class="sech">Difficulty</h2><div class="seg" role="group" aria-label="Difficulty">${['Recruit', 'Analyst', 'Veteran'].map(k => `<button type="button" class="opt" data-a="diff" data-v="${k}" data-k="d${k}" aria-pressed="${UI.diff === k}"><b>${k}</b><span class="meta">${D.hp.full[nP()][k]} HP each</span></button>`).join('')}</div>` : '';
  const board = lb(true);
  const more = solo ? `<button class="lnk" type="button" data-a="friends" data-k="friends">Playing with friends? Add up to 3 more</button>`
    : `<p class="meta">One analyst per player, up to 4. <button class="lnk" type="button" data-a="solo" data-k="solo">Just me</button></p>`;
  return `<div class="wrap"><div class="intro-grid">
    <section class="hero"><span class="art">${slice(pickArt('hero', 'event', 'Network'))}</span><p class="meta c">An original game by Binary Defense</p><h1 class="logo">Detect the Dwellers</h1>
      <p class="lede">A co-op dice game on the SOC night shift. The shift starts at 22:00. Threats show up one at a time, and you roll to put them down. What you beat can come back. Keep everyone standing, take the boss at 05:59, and make it to 06:00.</p>
      ${board ? `<div class="lbmini"><h2 class="sech">Leaderboard · ${esc(D.modes[UI.mode].label)}</h2>${board}</div>` : ''}</section>
    <section class="setup panel" aria-labelledby="setup-h"><h2 class="sr" id="setup-h">Set up your shift</h2>
      <h2 class="sech">Mode</h2><div class="seg" role="group" aria-label="Mode">${modes}</div><p class="body-s">${esc(cap1(D.modes[UI.mode].sub))}${UI.mode === 'intro' ? '. Tips walk you through it.' : '.'}</p>${diffs}
      <h2 class="sech" id="crew-h">${solo ? 'Your analyst' : `Crew · ${n} of 4`}</h2><div class="picks" role="group" aria-labelledby="crew-h">${picks}</div>${more}
      <div class="field"><label class="sech" for="team">Crew name</label><input id="team" maxlength="24" autocomplete="off" value="${esc(UI.team)}" placeholder="Night Shift Six"></div>
      <div class="startbar"><p class="meta">${n ? `${n === 1 ? `Solo · ${hpFor()} HP` : `${n} players · ${hpFor()} HP each`} · Survive until 06:00` : 'Pick an analyst for each player'}</p>
        <button class="btn p w big" type="button" data-a="start" data-k="start" data-primary ${n ? '' : 'disabled'}>Clock in</button></div></section>
  </div></div>`;
}

// Damage as the engine will deal it, with the printed number and the reason when they differ: "9 · 7 +2 until 2 hits".
function dmgStat(m) {
  const v = E.dmgOf(G, m), d = v - m.dmg; if (!d) return `${v}`;
  const why = m.kind === 'boss' && m.id === 'wyrm' ? `${m.dmg} +${d} until 2 hits` : `${m.dmg} +${d} ${m.abilityName}`;
  return `${v}<span class="why"><span class="sr"> (</span>${esc(why)}<span class="sr">)</span></span>`;
}

// Hits as the engine scales them, with the printed number when they differ: "1 · 2 −1 solo", "3 · 2 +1 for 3 analysts".
function hitsNote(m) {
  const n = G.team.length, who = n === 1 ? 'solo' : `${n}p`, whoSr = n === 1 ? 'playing solo' : `for ${n} analysts`;
  const p = m.kind === 'boss' ? (D.bosses.find(b => b.id === m.id) || {}).hitsBase : (D.mobs.find(x => x.id === m.id) || {}).hits;
  if (p == null || p === m.hits) return '';
  const d = m.hits - p;
  return `<span class="why"><span class="sr"> (printed ${p}, ${d > 0 ? 'plus' : 'minus'} ${Math.abs(d)} ${whoSr})</span><span aria-hidden="true">${p} ${d > 0 ? '+' : '−'}${Math.abs(d)} · ${who}</span></span>`;
}

function mobHTML(m, ko, solo) {
  const key = 'm' + m.uid + '.' + m.back, fresh = ko || UI.seen.has(key) ? '' : 'fresh'; if (!ko) UI.seen.add(key);
  const boss = m.kind === 'boss';
  // One pip per hit to tick off; a one-hit mob needs no bar.
  const pips = m.hits > 1 ? `<div class="pips" aria-hidden="true">${Array.from({ length: m.hits }, (_, i) => `<i class="${!ko && i < m.left ? '' : 'gone'}"></i>`).join('')}</div>` : '';
  const d = !ko && UI.sel !== null ? G.dice[UI.sel] : null, ok = d && E.beats(G, d, m);
  // Wide screens hit from the card; narrow screens hit from the dock's target buttons, so this one hides there.
  const btn = ok ? `<button class="btn p w hitb" type="button" data-a="hit" data-v="${m.uid}" data-k="h${m.uid}">Hit it · ${hitWhy(d, m)}</button>`
    : d ? `<p class="nohit">${esc(missWhy(d, m))}</p>` : '';
  const right = boss ? `<span class="phud f">${esc(m.domain)}</span>` : `<span class="rng">${m.routine ? 'Routine · ' : ''}Back on ${m.persist[0]}–${m.persist[1]}</span>`;
  const kw = m.kw && D.keywords[m.kw] ? `<svg class="kwi" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${D.keywords[m.kw].icon}</svg>` : '';
  const back = !ko && !boss && m.back > 0, fx = FOCAL[m.id];
  return `<article class="mob paper ${solo ? 'pcard' : ''} ${boss ? 'boss' : ''} ${fresh} ${back ? 'back' : ''} ${ok ? 'can' : ''} ${ko ? 'ko' : ''}" data-mob="${m.uid}" aria-labelledby="mn${m.uid}"><i class="tab" aria-hidden="true"></i><div class="mob-in">
    <span class="scr"${fx ? ` style="--fx:${fx}%"` : ''}>${slice(mobArt(m))}${back ? `<span class="bstamp" aria-hidden="true">${m.back > 1 ? `Back ×${m.back}` : 'Back'}</span>` : ''}</span><div class="bd">
    <div class="mh"><span class="ptag">${boss ? 'Boss' : esc(m.domain)}</span>${m.scouted && E.active(G, 'recon').length ? '<span class="phud c">Scouted +5</span>' : ''}${right}</div>
    <h3 class="nm" id="mn${m.uid}">${esc(m.name)}${ko ? '<span class="sr"> is down</span>' : back ? '<span class="sr">, back from the row</span>' : ''}</h3>
    <dl class="stat"><div class="def"><dt>Defense</dt><dd>${m.def}</dd></div><div><dt>Hits</dt><dd>${ko ? 0 : m.left}/${m.hits}${hitsNote(m)}</dd></div><div><dt>Damage</dt><dd>${dmgStat(m)}</dd></div></dl>${pips}
    <p class="ability">${kw}<b>${esc(m.abilityName)}.</b> ${esc(m.abilityText)}</p>${m.flavor ? `<p class="fl ${fresh && !ko && !back ? 'reveal-ln' : ''}">${solo && !ko ? aloudHint() : ''}${readAloud(m.flavor, !!fresh && !ko && !back)}</p>` : ''}${btn}</div></div></article>`;
}

const hitWhy = (d, m) => isDouble(d) ? `${d.r}: double, two hits` : `${E.total(G, d, m)} vs ${m.def}`;
function canBurn(c) { const f = G.phase === 'combat', r = f && G.rolled;
  return { triage: r, hunt: f && G.play.some(m => m.kind !== 'boss' && m.left <= 2), contain: f, enrich: r, patch: G.row.length > 0, recover: G.hps.some(h => h < G.max), decoy: r, recon: G.deck.length >= 2 }[c.type] && !G.over; }
function aimTargets() { if (!UI.aim) return ''; const t = UI.aim.type;
  const opts = t === 'hunt' ? G.play.filter(m => m.kind !== 'boss' && m.left <= 2).map(m => [m.uid, `Finish ${m.name}`]) : t === 'patch' ? G.row.map(m => [m.uid, `Patch out ${m.name}`]) : G.deck.slice(-3).map((c, i) => [i, `Bury ${c.name}`]).reverse();
  return `<div class="row">${opts.map(([v, l]) => `<button class="btn s cy" type="button" data-a="aim" data-v="${v}" data-k="aim${v}">${esc(l)}</button>`).join('')}</div>`; }

// HP a Recovery burn would really add: the engine heals the lowest analyst 1 at a time and never past max.
function healGain(n) { const h = G.hps.slice(); let got = 0; for (let i = 0; i < n; i++) { const k = h.indexOf(Math.min(...h)); if (h[k] >= G.max) break; h[k]++; got++; } return got; }
const lc1 = s => String(s).charAt(0).toLowerCase() + String(s).slice(1);
// The one kit move that helps most against the boss, read from the kit in hand and the crew's HP. Nothing invented:
// the card name and burn text come from the kit data, the HP from the engine's own healing rule.
function bossMove() {
  const held = G.held[0] || [], at = t => held.findIndex(c => c.type === t);
  const say1 = (i, eff) => { const c = held[i], now = canBurn(c); return { i, now, text: now ? `Burn your ${c.name} now: ${eff}` : `After you roll, burn your ${c.name}: ${eff}` }; };
  let i = at('recover'); const gain = i >= 0 ? healGain(6) : 0;
  if (i >= 0 && gain) return say1(i, `+${gain} HP${G.team.length > 1 ? ' across the crew' : ''}.`);
  i = at('contain'); if (i >= 0) { const b = G.play.find(m => m.kind === 'boss'); return say1(i, `every mob in play takes 1 hit${b ? `, ${b.name} included` : ''}.`); }
  for (const t of ['triage', 'enrich', 'decoy']) { i = at(t); if (i >= 0) return say1(i, lc1(held[i].burn)); }
  return null;
}
// The boss advice: one sentence or two, shared word for word by the First Shift banner, the boss tip and the
// reveal's "Your move". With a burn that helps, that burn. Without one, which held cards won't help (and why, by the
// rules) and what to do instead: finish a comeback first, go off-shift (crews only), or put every die on the boss.
function bossAdvice() {
  const mv = bossMove(); if (mv) return mv;
  const held = G.held[0] || [], seen = new Set(), out = [];
  const others = G.play.filter(m => m.kind !== 'boss'), easy = others.filter(m => m.left <= 2);
  for (const c of held) { if (seen.has(c.type)) continue; seen.add(c.type);
    if (c.type === 'hunt') out.push(easy.length ? `Your ${c.name} can’t touch a boss, but it can finish ${easy[0].name}.` : `Your ${c.name} can’t touch a boss. Save it.`);
    else if (c.type === 'recover') out.push(`Keep your ${c.name} for when you’re hurt. Burning it heals up to 6 HP.`);
    else if (c.type === 'recon') out.push(`Your ${c.name} has no feed left to scout.`);
    else if (c.type === 'patch') out.push(`Your ${c.name} can’t touch a boss.`);
  }
  const b = G.play.find(m => m.kind === 'boss') || G.boss, dbl = G.team.includes('ENG') && G.team.length === 1 ? '16–20' : '18–20';
  if (others.length) out.push(`Put ${others[0].name} down first: ${others[0].left === 1 ? 'it needs one hit, and ' : ''}a mob you finish never hits back.`);
  else if (G.team.length > 1) out.push(`Anyone low goes off-shift before the roll: no damage, +1 HP.`);
  else out.push(`Every die goes on ${b.name}. A natural ${dbl} is two hits and blocks its damage.`);
  return { i: null, now: false, text: out.join(' ') };
}

function kitCard(c, id) {
  return `<article class="paper cy kcard" ${id ? `id="${id}"` : ''} aria-label="${esc(c.name)}"><i class="tab" aria-hidden="true"></i><span class="scr">${slice(kitArt(c.type))}</span>
    <div class="mh"><span class="ptag cy">Kit</span><span class="phud c">AI agent</span></div><h3 class="nm">${esc(c.name)}</h3>
    <p class="part"><span class="phud c">Run it</span>${esc(c.text)}</p><p class="part"><span class="phud a">Or burn it</span>${esc(c.burn)}</p></article>`;
}
// The kit is a strip of chips. Burnable chips light up (and pulse in a boss fight); a chip opens its full card.
function kitTray() {
  const cap = E.slots(G, 0), groups = [], boss = G.bossIn && G.phase === 'combat';
  G.held[0].forEach((c, i) => { const g = groups.find(x => x.c.type === c.type); if (g) g.n++; else groups.push({ c, i, n: 1 }); });
  const chips = groups.map(({ c, i, n }) => {
    const can = canBurn(c), aiming = UI.aim && UI.aim.i === i, open = UI.kitOpen.has(c.type);
    return `<li class="kchip ${can ? 'live' : ''} ${can && boss ? 'urge' : ''}"><button type="button" class="kname" data-a="kitx" data-v="${c.type}" data-k="kx${c.type}" aria-expanded="${open}" ${open ? `aria-controls="kd-${c.type}"` : ''}><span class="art kart">${slice(kitArt(c.type))}</span><b>${esc(c.name)}</b>${n > 1 ? `<span class="x"><span class="sr">, </span>×${n}<span class="sr"> copies</span></span>` : ''}${ICON.chev}</button>${can || aiming ? `<button class="btn s ${aiming ? '' : boss ? 'p' : 'cy'}" type="button" data-a="burn" data-v="${i}" data-k="b${c.type}">${aiming ? 'Cancel' : 'Burn it'}</button>` : ''}</li>`; }).join('');
  const cards = groups.filter(g => UI.kitOpen.has(g.c.type)).map(({ c }) => kitCard(c, 'kd-' + c.type)).join('');
  return `<section class="kit" aria-labelledby="kit-h"><div class="kitbar"><h2 class="sech" id="kit-h">Crew kit · ${G.held[0].length}/${cap}</h2>${chips ? `<ul class="kchips">${chips}</ul>` : `<p class="meta">${G.discard.some(c => c.kind === 'agent' && !UI.left.includes(c)) ? 'Kit spent. Win a fight to draw another.' : 'No kit yet. Win a fight to draw one.'}</p>`}</div>
    ${UI.aim ? aimTargets() : ''}${aiOnUI() ? '<p class="meta f">The Rogue AI has shut your agents down. You can still burn them.</p>' : ''}${cards ? `<div class="kdetail">${cards}</div>` : ''}</section>`;
}
function aiOnUI() { return G.play.some(m => m.ability === 'takeover' || (m.kind === 'boss' && m.id === 'ai')); }

// The Row roll: one line. A comeback is told here and by the BACK stamp on its card, nowhere else on the board
// (the log keeps its entry). A comeback that waits behind a situation is told once, at the flip, not again at the fight.
function persistBanner() { const p = G.persist; if (!p || !p.pre) return ''; const hot = p.back.length, many = p.back.length > 1;
  const later = G.phase === 'sit' && G.pendingBack.length ? ` You fight ${many ? 'them' : 'it'} after this situation.` : '';
  const hit = p.hit || p.back, all = hit.length === p.back.length;
  const line = !hot ? 'Nothing matched. The row stays quiet.' : all ? `${listOf(p.back)} ${many ? 'are' : 'is'} back: ${many ? 'they' : 'it'} hit everyone on the way in and ${many ? 'go' : 'goes'} down in one hit.${later}`
    : `${listOf(p.back)} ${many ? 'are' : 'is'} back and ${many ? 'go' : 'goes'} down in one hit. ${hit.length ? `Only the ${hit.length > 1 ? `${['', 'one', 'two', 'three', 'four'][hit.length] || hit.length} hardest hitters` : 'hardest hitter'}, ${listOf(hit)}, ${hit.length > 1 ? 'hit' : 'hits'} everyone on the way in.` : 'Comebacks with the boss don’t hit on the way in.'}${later}`;
  return `<div class="pbanner ${hot ? 'hot' : ''}" role="status"><div class="d20 ${hot ? '' : 'q'}" data-roll="${p.r}"><span class="dv" aria-hidden="true">${p.r}</span></div><p><b>Row roll ${p.r}.</b> ${esc(line)}</p></div>`; }

function tipHTML() {
  if (G.over) return '';
  const fight = G.phase === 'combat', dbl = fight && G.rolled && G.dice.some(d => d.kind === 'crew' && !d.used && isDouble(d));
  const adv = fight && G.bossIn ? bossAdvice() : null, mv = adv && adv.i != null;
  if (G.mode === 'intro' && D.intro) { const T = D.intro.tips;
    // Situation 1 teaches one step at a time; the doubles rule waits for a later fight.
    const first = G.sit === 1 && fight && !G.bossIn ? (!G.rolled ? (G.team.length > 1 ? FIRST_FIGHT.pre : `Hit Roll. Playing solo, you roll ${D.soloDice || 3} dice.`) : liveCount() ? FIRST_FIGHT.live : FIRST_FIGHT.spent) : null;
    const t = G.phase === 'loot' ? T.loot : G.bossIn ? (adv ? adv.text : T.boss) : G.phase === 'point' ? (G.sit === 0 ? (G.team.length > 1 ? 'Pick who’s on point, then flip the first situation.' : 'Flip the first situation.') : null) : first || (dbl ? TIPS.double : T[String(G.sit)]);
    return t ? `<div class="tip ${mv ? 'urge' : ''}" role="note"><p>${esc(t)}</p></div>` : ''; }
  const hurt = G.team.length > 1 && G.hps.some(h => h < G.max);
  const want = G.phase === 'loot' ? ['loot'] : G.phase === 'point' ? ['point', 'row'].filter(k => k === 'row' ? G.row.length : G.team.length > 1) : fight ? (G.bossIn ? ['boss'] : []).concat(G.rolled ? (liveCount() ? ['assign'].concat(dbl ? ['double'] : []) : ['end']) : ['roll'].concat(hurt ? ['rest'] : [])) : [];
  const k = want.find(x => !tipsSeen.has(x)); if (!k) return '';
  const txt = k === 'roll' && G.team.length === 1 ? `Roll. Playing solo, you get ${D.soloDice || 3} dice a round.` : k === 'boss' && adv ? adv.text : TIPS[k];
  return `<div class="tip" role="note"><p>${esc(txt)}</p><button class="btn s cy" type="button" data-a="tipx" data-v="${k}" data-k="tip${k}">Got it</button></div>`;
}

// Between fights, one status line: what just happened, then what is next. Replaces the old Fight over / Next panels.
function statusLine() {
  const r = G.lastSit, won = G.lastRound && G.lastRound.ended, out = [];
  if (won) out.push('<b>Fight won.</b> The last mob went down before it could hit back.');
  else if (r) out.push(`<b>${esc(r.name)}:</b> ${r.choice ? `you chose ${esc(lc1(r.choice))}.` : r.rolls.length ? esc(r.rolls.map(x => `${nm(x.k)} rolled ${x.t}, ${x.ok ? 'pass' : 'fail'}`).join('; ')) + '.' : 'done.'}`);
  if (G.phase === 'loot' && G.team.length > 1) out.push(`${esc(nm(G.point))} is on point and takes the kit draw for the crew.`);
  else if (G.phase === 'point') out.push(!G.sit ? `${pl(G.total, 'situation')}, then the boss.` : G.deck.length ? `${sitOf(G.sit + 1)} is next.` : 'The feed is empty. The boss is next.');
  return `<p class="status" role="status">${out.join(' ')}</p>`;
}

// Crew HP as compact readouts: name, HP, a bar whose striped end is the damage coming in, and one status line.
function crewHTML() {
  const fight = G.phase === 'combat', by = fight ? E.incomingBy(G) : null, L = G.lastRound;
  return G.team.map((w, k) => { const c = E.cls(w), on = G.point === k && G.team.length > 1, hp = G.hps[k], low = hp <= G.max * .25;
    let inc = '', incN = 0;
    if (fight) {
      const list = by[k]; incN = k === G.rest ? 0 : list.reduce((s, x) => s + x.d, 0);
      inc = k === G.rest ? `<p class="inc safe"><b>Off-shift</b> · no damage</p>` : !incN ? `<p class="inc safe"><b>Incoming&nbsp;0</b>${G.blocks[k] ? ' · blocking' : G.decoyRound && on ? ' · decoyed' : ''}</p>`
        : `<p class="inc">Incoming <b class="num">−${incN}</b><span class="sr"> from ${list.map(x => `${esc(x.m.name)} ${x.d}`).join(', ')}</span></p>`;
    }
    if (L && !L.ended && L.by && (!fight || !G.rolled)) {
      const got = L.by[k] || [], sum = L.inc[k];
      inc = `<p class="inc ${sum ? '' : 'safe'}">Round ${L.round}: ${k === L.rest ? '<b>off-shift</b>' : sum ? `<b>took&nbsp;−${sum}</b><span class="sr"> from ${got.map(x => `${esc(x.name)} ${x.d}`).join(', ')}</span>` : L.blocks[k] ? '<b>blocked</b>' : L.decoy && k === G.point ? '<b>decoyed</b>' : '<b>not targeted</b>'}</p>`;
    }
    const pct = n => Math.round(n / G.max * 1000) / 10, cut = Math.min(incN, hp);
    return `<article class="pc ${on ? 'on' : ''}" data-hp="${k}" aria-labelledby="pc${k}" title="${esc(c.perk)}"><div class="pc-h">${on ? '<i class="dot" aria-hidden="true"></i>' : ''}<h3 class="nm" id="pc${k}"><span class="full">${esc(c.name)}</span><span class="short" aria-hidden="true">${esc(SHORT[w] || c.name)}</span>${on ? '<span class="sr">, on point</span>' : ''}</h3><span class="hpn"><b class="num">${hp}</b><span class="of">/${G.max}</span></span></div>
      <div class="hpbar ${low ? 'low' : ''}" role="img" aria-label="${hp} of ${G.max} HP${incN ? `, ${incN} incoming` : ''}"><i style="width:${pct(hp)}%"></i>${cut ? `<i class="inci" style="left:${pct(hp - cut)}%;width:${pct(cut)}%"></i>` : ''}</div>${inc}</article>`; }).join('');
}

function dockHTML() {
  const kb = k => `<kbd aria-hidden="true">${k}</kbd>`, solo = G.phase === 'combat' ? '' : ' solo';
  if (G.phase === 'sit') { const c = G.cur;
    const btns = c.type === 'choice' ? c.opts.map((o, i) => `<button class="btn ${i ? '' : 'p'} grow" type="button" data-a="sit" data-v="${i}" data-k="s${i}" ${i ? '' : 'data-primary'}>${esc(o.label)}</button>`).join('')
      : `<button class="btn p big grow" type="button" data-a="sit" data-v="0" data-k="s0" data-primary>${c.type === 'challenge' ? (c.who === 'each' ? 'Everyone rolls' : `${esc(nm(G.point))} rolls`) : 'Resolve it'}</button>`;
    return `<div class="dock${solo}"><div class="acts">${btns}</div></div>`; }
  if (G.phase === 'loot') { const room = G.held[0].length < E.slots(G, 0);
    const opts = room ? `<button class="btn p big grow" type="button" data-a="take" data-v="0" data-k="t0" data-primary>Add to the crew kit</button>` : G.held[0].map((h, i) => `<button class="btn s" type="button" data-a="take" data-v="0:${i}" data-k="t0${i}">Swap out ${esc(h.name)}</button>`).join('');
    return `<div class="dock${solo}">${room ? '' : '<p class="ask">The kit is full. Swap one out, or leave this card.</p>'}<div class="acts">${opts}<button class="btn" type="button" data-a="take" data-v="x" data-k="tx">Leave it</button></div></div>`; }
  if (G.phase !== 'combat') return '';
  if (!G.rolled) {
    const offs = G.team.length > 1 ? `<div class="offs"><span class="meta">Off-shift, one a round:</span>${G.team.map((w, k) => `<button class="btn s ${G.rest === k ? 'cy' : ''}" type="button" data-a="rest" data-v="${k}" data-k="r${k}" aria-pressed="${G.rest === k}">${G.rest === k ? ICON.check : ''}${esc(nm(k))}</button>`).join('')}</div>` : '';
    return `<div class="dock" aria-label="Round ${G.round}">${offs}<div class="acts"><button class="btn p big grow" type="button" data-a="roll" data-k="roll" data-primary aria-keyshortcuts="R">Roll everything ${kb('R')}</button></div></div>`;
  }
  UI.order = [];
  const n = liveCount();
  // Dice that can hit come first, in the tray and in the Tab order; a die with no target waits at the end of its group,
  // and while any die can still hit, the dead ones leave the Tab order (a click or its number key still picks them).
  const rank = i => G.dice[i].used ? 2 : canHit(i) ? 0 : 1;
  const groups = G.team.map((w, k) => {
    if (k === G.rest) return `<div class="dgroup"><span class="meta c">${esc(nm(k))}, off-shift</span></div>`;
    const idx = G.dice.map((d, i) => [d, i]).filter(([d]) => d.k === k).sort((a, b) => rank(a[1]) - rank(b[1]));
    return `<div class="dgroup">${G.team.length > 1 || G.blocks[k] ? `<span class="meta">${G.team.length > 1 ? esc(nm(k)) : 'You'}${G.blocks[k] ? ' · <span class="badge">blocking</span>' : ''}</span>` : ''}<div class="dice">${idx.map(([d, i]) => {
      const num = d.used ? null : (UI.order.push(i), UI.order.length), nat = d.r >= 18, burstKey = G.sit + '.' + G.round + '.' + i, burst = nat && !d.used && !UI.dice.has(burstKey); UI.dice.add(burstKey);
      // The bonus is on the die, so "no target" next to "ready" explains itself: 8 +5 still falls short of 15.
      const bb = d.used ? 0 : bestBonus(d), live = !d.used && canHit(i);
      const cap = d.kind === 'agent' ? TNAME[d.card.type] + ' agent' : UI.sel === i ? (isDouble(d) ? 'picked ×2' : 'picked') : isDouble(d) ? 'double ×2' : d.used ? 'used' : live ? 'ready' : 'no target';
      const why = d.used ? '' : bb ? `, plus ${bb} at best` : '';
      const skip = !d.used && !live && n && UI.sel !== i;
      return `<button type="button" class="die ${d.kind === 'agent' ? 'ag' : ''} ${isDouble(d) && d.kind === 'crew' ? 'nat' : ''} ${d.used ? 'used' : ''} ${!d.used && !live ? 'dead' : ''}" data-a="die" data-v="${i}" data-k="die${i}" aria-pressed="${UI.sel === i}" aria-label="${esc(d.kind === 'agent' ? d.card.name : nm(k))} die ${d.r}${why}, ${cap}${d.kind === 'agent' ? (UI.sel === i ? ', picked' : live || d.used ? '' : ', no target') : ''}" ${d.used ? 'disabled' : ''}${skip ? ' tabindex="-1"' : ''}>${burst && !reduced() ? '<i class="burst" aria-hidden="true"></i>' : ''}${num && num < 10 ? `<kbd aria-hidden="true">${num}</kbd>` : ''}<b>${d.r}${bb ? `<em>+${bb}</em>` : ''}</b><span>${cap}</span></button>`; }).join('')}</div></div>`; }).join('');
  // Narrow screens: once a die is picked, its targets sit in the dock itself, stacked, so a hit never needs a scroll.
  // Wide screens hit from the mob cards instead, so there is one Hit per target either way.
  const sd = UI.sel !== null ? G.dice[UI.sel] : null, tg = sd ? G.play.filter(m => E.beats(G, sd, m)) : [];
  const tgts = sd ? `<div class="tgts" role="group" aria-label="Targets for die ${sd.r}">${tg.length ? tg.map(m => `<button class="btn p s" type="button" data-a="hit" data-v="${m.uid}" data-k="th${m.uid}">Hit ${esc(m.name)} · ${isDouble(sd) ? `${sd.r} ×2` : `${E.total(G, sd, m)} vs ${m.def}`}</button>`).join('') : `<p class="meta">${esc(G.play.length === 1 ? missWhy(sd, G.play[0]) : `${sd.kind === 'agent' ? `The ${sd.card.name}’s ${sd.r}` : `Die ${sd.r}`} can’t hit anything in play.`)}</p>`}</div>` : '';
  const decoy = !G.decoyUsed && E.active(G, 'decoy').length ? `<button class="btn s cy" type="button" data-a="decoy" data-k="dcy">Decoy: ${esc(nm(G.point))} takes no damage</button>` : G.decoyRound ? `<span class="badge">Decoy active: ${esc(nm(G.point))} protected</span>` : '';
  const undo = E.canUndo(G) ? `<button class="btn s" type="button" data-a="undo" data-k="undo" aria-keyshortcuts="U">${ICON.undo}Undo ${kb('U')}</button>` : '';
  const endBtn = `<button class="btn ${UI.confirmEnd ? 'warn' : n ? '' : 'p'} big" type="button" data-a="end" data-k="end" ${n ? '' : 'data-primary'} aria-keyshortcuts="E">${UI.confirmEnd ? 'End anyway · take the hits' : 'End round · take the hits'} ${kb('E')}</button>`;
  return `<div class="dock" aria-label="Round ${G.round} dice"><div class="dgroups">${groups}</div>${tgts}
    ${UI.confirmEnd ? `<p class="ask" role="alert">${pl(n, 'die', 'dice')} can still hit. End the round anyway?</p>` : ''}<div class="acts">${undo}${decoy}${endBtn}</div></div>`;
}

// In a fight the persistence row is one strip of amber chips (name and comeback range) in the table header.
function rowStrip() {
  const chips = G.row.map(m => `<li class="chip" data-chip="${m.uid}"><b>${esc(m.name)}</b><span class="rg">Back on ${m.persist[0]}–${m.persist[1]}</span></li>`).join('');
  return `<section class="rowstrip infight" aria-labelledby="row-h" data-rowsum><h2 class="sech a" id="row-h">Persistence row${G.row.length ? ` · ${G.row.length}` : ''}</h2>${chips ? `<ul class="prow">${chips}</ul>` : '<p class="meta">Empty.</p>'}</section>`;
}
// Between fights the row is a fan of small amber cards beside the feed, with the last Row roll under it.
function rowCards() {
  const cards = G.row.map(m => `<li class="rcard paper am" data-chip="${m.uid}"><i class="tab" aria-hidden="true"></i><span class="scr">${crop(ART[m.id] || ART[m.domain], null)}</span><b class="nm">${esc(m.name)}</b><span class="rng">Back on ${m.persist[0]}–${m.persist[1]}</span></li>`).join('');
  const last = G.plog[G.plog.length - 1];
  const note = !G.row.length ? 'Empty, for now. Beaten mobs land here.' : G.deck.length ? 'Flipping makes a Row roll for these: one d20.' : 'The boss brings one last Row roll.';
  return `<section class="pd-row" aria-labelledby="row-h" data-rowsum><h2 class="sech a" id="row-h">Persistence row${G.row.length ? ` · ${G.row.length}` : ''}</h2>${cards ? `<ul class="rcards">${cards}</ul>` : ''}<p class="meta">${note}${last ? ` Last Row roll: ${last.r}, ${last.back.length ? esc(listOf(last.back)) + ' came back' : 'quiet'}.` : ''}</p></section>`;
}
// The feed, face down: the print card back. Tap it (or press F) to flip the next situation; an empty feed is the boss.
function feedCard() {
  const pk = E.peek(G), boss = !G.deck.length, left = G.deck.length;
  const label = boss ? `Face the boss${G.row.length ? ', with one last Row roll' : ''}` : `Flip ${lc1(sitOf(G.sit + 1))}${G.row.length ? ' and make the Row roll' : ''}`;
  return `<button class="fdown ${boss ? 'boss' : ''}" type="button" data-a="flip" data-k="flip" data-primary aria-keyshortcuts="F" aria-label="${esc(label)}" style="--stack:${Math.min(3, Math.max(0, left - 1))}">
    <span class="fd-art" aria-hidden="true">${slice(pickArt('_back', 'hero', 'event'))}</span><span class="fd-t" aria-hidden="true">${boss ? 'The boss' : 'Detect the<br>Dwellers'}</span>
    <span class="fd-b" aria-hidden="true"><b>${boss ? 'The feed is empty' : sitOf(G.sit + 1)}</b><span>Tap to flip <kbd>F</kbd></span></span></button>
    ${pk ? `<p class="meta c peek">Recon: next up is ${esc(pk.name)}${pk.kind === 'mob' ? ' (a mob: +5 all fight)' : ''}.</p>` : ''}`;
}
// Who's on point, as analyst cards. A solo analyst is always on point, so there is no choice to show.
function pointCards() {
  if (G.team.length < 2) return '';
  return `<section class="pd-point" aria-labelledby="op-h"><h2 class="sech" id="op-h">Who’s on point?</h2><div class="acards" role="group" aria-labelledby="op-h">${G.team.map((w, k) => { const on = G.point === k;
    return `<button class="acard paper cy ${on ? 'on' : ''}" type="button" data-a="point" data-v="${k}" data-k="pt${k}" aria-pressed="${on}"><i class="tab" aria-hidden="true"></i><span class="scr">${crop(ART[w], THUMB[w])}</span><b class="nm">${esc(nm(k))}</b><span class="phud ${on ? 'c' : ''}">${on ? 'On point · 2 dice' : `${G.hps[k]}/${G.max} HP`}</span></button>`; }).join('')}</div></section>`;
}
// A lone mob on a wide screen: the column beside the card carries the round in plain numbers (what a hit needs, what
// comes in at End round, where it goes when beaten), then the dice tray under it. Phones get this from the crew strip.
function roundBrief() {
  const m = G.play[0]; if (!m) return '';
  const by = E.incomingBy(G), solo = G.team.length === 1, dbl = G.team.length === 1 && G.team[0] === 'ENG' ? '16–20' : '18–20';
  const hurt = G.team.map((w, k) => [k, (by[k] || []).reduce((s, x) => s + x.d, 0)]).filter(([, d]) => d > 0).map(([k, d]) => `${solo ? 'you' : esc('the ' + nm(k))} for <b class="num">${d}</b>`);
  const end = hurt.length ? `Still up when you end the round, it hits ${listOf(hurt)}.` : solo && G.blocks[0] ? 'You rolled a double, so you block: it can’t hurt you this round.' : `It can’t hurt ${solo ? 'you' : 'anyone'} this round.`;
  const row = m.kind === 'boss' ? 'Put it down and the shift is yours.' : `Beat it and it goes to the persistence row. It comes back on a Row roll of ${m.persist[0]}–${m.persist[1]}.`;
  return `<section class="rbrief" aria-labelledby="rb-h"><h3 class="sech" id="rb-h">Round ${G.round}</h3><ul>
    <li><span class="phud c">To hit</span><span>Die plus bonus reaches Defense <b class="num">${m.def}</b>. A natural ${dbl} is a double: two hits${m.ability === 'noblock' ? '' : ', and you block'}.</span></li>
    <li class="${hurt.length ? 'hurt' : ''}"><span class="phud f">End round</span><span>${end}</span></li>
    <li class="${m.kind === 'boss' ? '' : 'rw'}"><span class="phud a">${m.kind === 'boss' ? 'The boss' : 'Beaten'}</span><span>${esc(row)}</span></li></ul></section>`;
}
const desk = (card, side) => `<div class="desk"><div class="deskc">${card}</div><div class="desks">${side}</div></div>`;

function vGame() {
  let main = tipHTML();
  if (UI.ko.length && G.phase !== 'combat') main += `<div class="inplay">${UI.ko.map(m => mobHTML(m, true)).join('')}</div>`;
  if (G.phase === 'point') {
    main += statusLine() + `<section class="pdesk" aria-label="Between fights"><div class="pd-feed">${feedCard()}</div><div class="pd-side">${pointCards()}${rowCards()}</div></section>` + kitTray();
  } else if (G.phase === 'sit') {
    const c = G.cur, kind = c.type === 'challenge' ? 'Challenge' : c.type === 'choice' ? 'Choice' : 'Event';
    // The card flips over once, when it comes off the feed; later renders (log, tips) leave it still.
    const fl = UI.seen.has('s' + G.sit) ? '' : 'flipin'; UI.seen.add('s' + G.sit);
    const card = `<article class="paper cy pcard sitc ${fl}" aria-labelledby="sit-h"><i class="tab" aria-hidden="true"></i><span class="scr">${slice(sitArt(c))}</span><div class="mh"><span class="ptag cy">${sitOf(G.sit)}</span><span class="phud c">${kind}${G.team.length > 1 ? ` · ${esc(nm(G.point))} on point` : ''}</span></div><h2 class="nm" id="sit-h">${esc(c.name)}</h2><p class="txt ${fl ? 'reveal-ln' : ''}">${aloudHint()}${readAloud(c.text, !!fl)}</p><p class="rulebox">${esc(c.rule)}</p></article>`;
    main += desk(card, persistBanner() + dockHTML());
  } else if (G.phase === 'loot') {
    const c = G.loot[0];
    const card = `<article class="paper cy pcard lootc" aria-labelledby="loot-h"><i class="tab" aria-hidden="true"></i><span class="scr">${slice(c.kind === 'agent' ? kitArt(c.type) : pickArt('gear', 'event'))}</span><div class="mh"><span class="ptag cy">Kit drop${G.loot.length > 1 ? ` · ${G.loot.length} cards` : ''}</span><span class="phud c">AI agent</span></div><h2 class="nm" id="loot-h">${esc(c.name)}</h2><p class="part"><span class="phud c">Run it</span>${esc(c.text)}</p><p class="part"><span class="phud a">Or burn it</span>${esc(c.burn)}</p></article>`;
    main += desk(card, statusLine() + dockHTML() + kitTray());
  } else if (G.phase === 'combat') {
    const banner = !G.rolled && G.round === 1 && !G.lastSit ? persistBanner() : '';
    const all = G.play.length + UI.ko.length, solo = all === 1, mobs = G.play.map(m => mobHTML(m, false, solo)).join('') + UI.ko.map(m => mobHTML(m, true, solo)).join('');
    main += `<section class="table ${solo ? 'solo' : ''}" aria-labelledby="fight-h"><div class="fhead"><h2 class="sech f" id="fight-h">${G.bossIn ? 'Boss fight' : sitOf(G.sit)} · round ${G.round}${G.team.length > 1 ? ` · ${esc(nm(G.point))} on point` : ''}</h2>${rowStrip()}${kitTray()}</div>${banner}<div class="inplay ${solo ? 'solo' : ''}">${mobs}</div>${solo ? roundBrief() : ''}${dockHTML()}</section>`;
  }
  const logs = G.log.slice(-40).reverse().map(l => `<p><span class="t">S${l.r}</span>${esc(rowWord(l.t))}</p>`).join('');
  // Between fights the situations played are done and the next one is outlined; in play, the current one is lit.
  const total = G.total, pt = G.phase === 'point', cur = pt ? G.sit + 1 : G.sit;
  const segs = Array.from({ length: total }, (_, i) => `<i class="${G.bossIn || i < cur - 1 ? 'done' : i === cur - 1 ? (pt ? 'next' : 'now') : ''}"></i>`).join('') + `<i class="boss ${G.bossIn ? 'now' : pt && !G.deck.length ? 'next' : ''}"></i>`;
  const quit = UI.quitAsk ? `<div class="quitask" role="alert"><span class="body-s" style="color:var(--ink)">Quit this shift? It won’t be scored.</span><button class="btn s tb warn" type="button" data-a="quity" data-k="quity">Quit</button><button class="btn s tb" type="button" data-a="quitn" data-k="quitn">Keep playing</button></div>`
    : `<button class="btn s tb" type="button" data-a="quit" data-k="quit">Quit</button>`;
  const logp = UI.logOpen ? `<aside class="logp" id="logp" aria-labelledby="log-h"><div class="lh"><h2 class="sech" id="log-h">Event log · kit deck ${G.kit.length}</h2><button class="btn s tb" type="button" id="logx" data-a="log" data-k="logx">Close</button></div><div class="log">${logs}</div>${keysUsed ? '' : '<p class="keys"><kbd>R</kbd>roll · <kbd>1</kbd>–<kbd>9</kbd>pick a die · <kbd>U</kbd>undo · <kbd>E</kbd>end round · <kbd>F</kbd>flip</p>'}</aside>` : '';
  return `<div class="wrap game"><div class="gtop"><header class="top"><span class="brand">Detect the Dwellers</span><div class="feed"><span class="fline">${clockStamp()}<span class="meta c" data-progress>${progressLabel()}</span>${soundBtn('m')}</span><span class="feedbar" aria-hidden="true">${segs}</span></div>
      <div class="tbtns">${soundBtn()}<button class="btn s tb" type="button" id="logb" data-a="log" data-k="logb" aria-expanded="${UI.logOpen}" aria-controls="logp">Log</button>${quit}</div></header>
    <section class="crew ${G.team.length === 3 ? 'tight' : ''}" aria-labelledby="crew-h" style="--n:${G.team.length > 3 ? 2 : G.team.length}"><h2 class="sr" id="crew-h">${G.team.length > 1 ? 'Your crew' : 'You'}</h2>${crewHTML()}</section></div>
    <main class="main">${main}</main></div>${logp}${UI.reveal ? revealHTML() : ''}`;
}

function revealHTML() {
  const b = G.play.find(m => m.kind === 'boss') || G.boss, mv = bossAdvice();
  const burn = mv.i != null && mv.now ? `<button class="btn pp w" type="button" data-a="burn" data-v="${mv.i}" data-k="rvburn">Burn the ${esc(G.held[0][mv.i].name)} first</button>` : '';
  return `<div class="reveal" role="dialog" aria-modal="true" aria-labelledby="rv-h" aria-describedby="rv-mv"><div class="rv paper"><i class="tab" aria-hidden="true"></i><span class="scr">${slice(bossArt(b.id))}</span><div class="bd"><div class="mh"><span class="ptag">Boss</span><span class="phud f">The feed is empty</span></div><h2 class="nm" id="rv-h">${esc(b.name)}</h2>
    <dl class="stat"><div class="def"><dt>Defense</dt><dd>${b.def}</dd></div><div><dt>Hits</dt><dd>${b.left != null ? b.left : b.hits}${hitsNote(b)}</dd></div><div><dt>Damage</dt><dd>${G.play.includes(b) ? dmgStat(b) : b.dmg}</dd></div></dl>
    <p class="ability"><b>${esc(b.abilityName)}.</b> ${esc(b.abilityText)}</p>
    <div class="move" id="rv-mv"><span class="phud c">Your move</span><p>${esc(mv.text)}</p></div>
    <div class="acts"><button class="btn p big w" type="button" data-a="fight" data-k="fight">Fight</button>${burn}</div></div></div></div>`;
}

// One concrete line for a loss: a real lever, read from the final state and the last action (UI.before), never a
// generic tip. In order: a burn that would have helped and wasn't used (with its real HP for a heal), off-shift never
// used by a crew, a helpful agent left behind at a kit drop, the comeback that hurt most when it shared the fight,
// and last the HP the crew carried into the boss fight.
const BOSS_KIT = ['recover', 'contain', 'triage', 'enrich', 'decoy'];
function helped() {
  const kit = G.held[0] || [], before = UI.before, k = G.dropped, who = k != null ? nm(k) : 'crew';
  const hpBefore = before && k != null ? before.hps[k] : null, took = G.lastRound && G.lastRound.inc && k != null ? G.lastRound.inc[k] : null;
  const boss = G.bossIn, useful = c => c.kind === 'agent' && (!boss || BOSS_KIT.includes(c.type));
  const heal = kit.find(c => c.type === 'recover');
  if (heal) { const gain = healGain(6), short = hpBefore != null && took != null ? took - hpBefore : null;
    return `The ${heal.name} was never burned. Burned before that roll, it heals ${gain} HP${short != null && short >= 0 ? `. The ${who} had ${hpBefore} and took ${took}${gain > short ? `: those ${gain} HP would have kept the ${who} standing` : ''}` : ''}.`; }
  const agent = kit.find(useful);
  if (agent) return `The ${agent.name} was never burned. Burn it: ${lc1(agent.burn).replace(/\.$/, '')}${boss && agent.type === 'contain' ? `, ${G.boss.name} included` : ''}.`;
  if (G.team.length > 1 && !G.stats.rests) return `Nobody went off-shift. Resting one analyst before a roll heals 1 HP${G.team.includes('PAT') ? ' (the Fixer heals 3 across the crew)' : ''}.`;
  const left = UI.left.find(useful);
  if (left) return `You left a ${left.name} at a kit drop. Kept, it burns for this: ${lc1(left.burn)}`;
  const bossName = G.boss.name, top = Object.entries(UI.dmg).filter(([n]) => n !== bossName).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) return `${top[0]} did the most damage: ${top[1]} HP across the shift. A mob you finish in a round never hits back, so it’s worth your best dice.`;
  if (boss && UI.bossHp) { const lo = Math.min(...UI.bossHp); return `You met ${bossName} with ${lo} of ${G.max} HP, and it hits for ${E.dmgOf(G, G.boss)} a round. HP you keep in the feed is what carries the boss fight.`; }
  return '';
}

function vEnd() {
  const line = { Wingman: 'Your agents carried the routine. Your crew carried the boss. That is the job.', 'Solid Shift': 'You held the line, and everybody walked out.', 'Close Call': 'Everybody made it, barely.', Flatlined: 'Who’s working your queue at 2 AM?' }[G.tier];
  const who = G.dropped != null ? nm(G.dropped) : 'crew', killers = G.downBy || [];
  const lastBy = G.lastRound && G.lastRound.by && G.dropped != null ? G.lastRound.by[G.dropped] : null;
  const fromRound = lastBy && lastBy.length && killers.every(n => lastBy.some(x => x.name === n));
  const cause = G.win ? '' : fromRound ? `The ${esc(who)} went down in round ${G.lastRound.round}: ${lastBy.map(x => `${esc(x.name)} hit for <b class="num">${x.d}</b>`).join(', ')}.` : `The ${esc(who)} went down to ${esc(listOf(killers.length ? killers : ['the mobs']))}.`;
  const killerMob = [...D.mobs, ...D.bosses].find(m => killers.includes(m.name));
  // A win shows the boss's room after the crew held the line (screens cyan, countdown stopped), else the boss scene.
  const artSvg = G.win ? ((ART._win && ART._win[G.boss.id]) || ART['win_' + G.boss.id] || bossArt(G.boss.id)) : killerMob ? (D.bosses.includes(killerMob) ? bossArt(killerMob.id) : ART[killerMob.id]) : pickArt('hero', 'event');
  const roster = G.team.map((w, k) => `<li class="${!G.win && k === G.dropped ? 'down' : ''}"><span class="art">${crop(ART[w], THUMB[w] && THUMB[w].replace(/ \d+ \d+$/, m => ' 90 90'))}</span><span><span class="nm">${esc(E.cls(w).name)}</span><br><span class="num">${G.hps[k]}/${G.max}</span> <span class="meta">HP</span></span></li>`).join('');
  const cta = BOOTH_CTA.url ? `<a class="cta" href="${esc(BOOTH_CTA.url)}" target="_blank" rel="noopener">${esc(BOOTH_CTA.text)}</a>` : `<p class="cta">${esc(BOOTH_CTA.text)}</p>`;
  const help = G.win ? '' : helped(), ah = G.stats.agentHits, ch = G.stats.crewHits;
  return `<div class="wrap"><div class="end">
    <article class="endcard ${G.win ? 'win' : 'loss'}" aria-labelledby="end-h"><div class="ec-art"><span class="art">${slice(artSvg)}</span><span class="stamp" aria-hidden="true">${G.win ? 'Contained' : 'Flatlined'}</span></div>
      <div class="ec-bd"><p class="meta ${G.win ? 'c' : 'f'}">${G.win ? 'Shift survived' : 'Shift lost'} · ${esc(D.modes[UI.mode].label)}${UI.mode === 'full' ? ' · ' + esc(UI.diff) : ''} · ${G.team.length}p</p>
        <h1 class="logo" id="end-h" tabindex="-1">${esc(G.tier)}</h1>
        ${G.win ? `<p class="lede"><time class="clk dawn">06:00</time> You made it to dawn. ${esc(G.boss.name)} is contained. ${esc(line)}</p>` : `<p class="cause"><time class="clk">${esc(UI.fellAt || clockNow())}</time> The shift fell. ${cause}</p>${help ? `<p class="helped"><b>What would have helped.</b> ${esc(help)}</p>` : ''}<p class="lede">${esc(line)}</p>`}
        <ul class="roster" aria-label="Crew">${roster}</ul>
        <div class="stats"><div><b>${G.sit}</b><span class="meta">Situations</span></div><div><b>${G.stats.rounds}</b><span class="meta">Rounds</span></div><div><b>${G.stats.back}</b><span class="meta">Comebacks</span></div><div><b>${Math.min(...G.hps)}</b><span class="meta">Lowest HP</span></div></div>
        <p class="body-s">Agents landed <b class="num" style="color:var(--cy)">${ah}</b> ${ah === 1 ? 'hit' : 'hits'}. The crew landed <b class="num" style="color:var(--ink)">${ch}</b>.</p>
        <p class="sig">${esc(UI.team || 'Night shift')} · Detect the Dwellers · Binary Defense</p></div></article>
    <div class="endbar" role="group" aria-label="Next shift"><button class="btn p big" type="button" data-a="again" data-k="again" data-primary>Run it back</button><button class="btn big" type="button" data-a="new" data-k="new">New crew</button></div>
    ${cta}
    <section class="panel pad lbp" aria-labelledby="lb-h"><h2 class="sech" id="lb-h">Leaderboard · ${esc(D.modes[UI.mode].label)}</h2>${lb()}</section>
  </div></div>`;
}
render();
