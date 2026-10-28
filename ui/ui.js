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
  reveal: false, ko: [], confirmEnd: false, quitAsk: false, kitOpen: new Set(), order: [], dmg: {} };
let G = null, DB = null; const LS = 'dwellers-board-v18', TIPS_LS = 'dwellers-tips-v1', KEYS_LS = 'dwellers-keys-v1';
// The shortcut legend hides for good once a player has used any shortcut.
let keysUsed = (() => { try { return localStorage.getItem(KEYS_LS) === '1'; } catch (e) { return false; } })();
function markKeys() { if (keysUsed) return; keysUsed = true; try { localStorage.setItem(KEYS_LS, '1'); } catch (e) { /* private mode: hidden for this visit */ } }
function loadLocal() { try { UI.board = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { UI.board = []; } }
function saveLocal(x) { try { const b = JSON.parse(localStorage.getItem(LS) || '[]'); b.push(x); b.sort((a, c) => c.score - a.score); localStorage.setItem(LS, JSON.stringify(b.slice(0, 30))); UI.board = b.slice(0, 30); } catch (e) { UI.board = [x]; } }
loadLocal();
(async () => { try { if (window.claude && typeof window.claude.use === 'function') { DB = await window.claude.use('db'); if (DB) DB.collection('dwellers-v18').orderBy('score', 'desc').limit(30).onSnapshot(s => { UI.board = s.docs.map(d => d.data()).filter(Boolean); if (UI.screen !== 'game') render(); }, () => { DB = null; loadLocal(); }); } } catch (e) { DB = null; } })();
function saveScore(x) { if (DB) DB.collection('dwellers-v18').add(x).catch(() => { DB = null; saveLocal(x); }); else saveLocal(x); }

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
  row: 'Beaten mobs go to the persistence row. Every flip rolls the row: each mob has its own range, and anything that matches hits everyone on the way in and joins the fight, needing just one hit.',
  loot: (D.intro && D.intro.tips.loot) || 'Kit drop. Every kit card is an agent: keep it running, or burn it once for a big one-shot effect.',
  boss: (D.intro && D.intro.tips.boss) || 'The boss. Burn what you’ve got.'
};
const FIRST_FIGHT = { pre: 'Hit Roll. Every analyst rolls at once.', live: 'Tap a ready die, then hit a mob it beats. The die plus your bonus has to reach its Defense.', spent: 'Out of dice. End the round: whatever is still standing hits back.' };

let said = '';
const say = t => { if (!t) return; said = t; live.textContent = ''; setTimeout(() => { if (said === t) live.textContent = t; }, 30); };
const nP = () => String(Math.max(1, Math.min(4, UI.pick.length)));
const hpFor = () => UI.mode === 'full' ? D.hp.full[nP()][UI.diff] : D.hp[UI.mode][nP()];
const nm = k => E.cls(G.team[k]).name;
const canHit = i => { const d = G.dice[i]; return d && !d.used && G.play.some(m => E.beats(G, d, m)); };
const firstLive = () => { const i = G.dice.findIndex((d, j) => canHit(j)); return i >= 0 ? i : null; };
const liveCount = () => G.dice.filter((d, i) => canHit(i)).length;
const isDouble = d => d.dbl || d.r >= 18;
const toTop = () => { try { scrollTo(0, 0); } catch (e) { /* jsdom */ } };
const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const cap1 = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
// Glue a trailing number to the word before it so a line never orphans it.
const glue = (name, n) => `${esc(name)}&nbsp;${n}`;
const bestBonus = d => G.play.length ? Math.max(...G.play.map(m => E.bonusDie(G, d, m))) : 0;
const sitArt = c => pickArt('sit_' + c.id, c.type === 'challenge' ? 'fp' : c.type === 'choice' ? 'esc' : 'event', 'event');

function start() {
  G = E.newGame(UI.pick, UI.mode, { diff: UI.diff });
  Object.assign(UI, { screen: 'game', sel: null, aim: null, savedAt: null, seen: new Set(), dice: new Set(), reveal: false, ko: [], confirmEnd: false, quitAsk: false, dmg: {} });
  UI.logN = G.log.length; toTop(); render(); say('Shift started. Pick who is on point, then flip.');
}

function snap() {
  const doc = el => { const r = el.getBoundingClientRect(); return { left: r.left + scrollX, top: r.top + scrollY, width: r.width }; };
  const rects = {}; app.querySelectorAll('[data-chip]').forEach(el => { rects[el.dataset.chip] = doc(el); });
  const sumEl = app.querySelector('[data-rowsum]'), sum = sumEl && doc(sumEl);
  return { phase: G.phase, hps: G.hps.slice(), play: G.play.slice(), bossIn: G.bossIn, logN: G.log.length, plogN: G.plog.length, sit: G.sit, round: G.round, rects, sum };
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
  else if (a === 'die') { const i = +v; if (G.dice[i] && !G.dice[i].used) UI.sel = UI.sel === i ? null : i; if (UI.sel !== null) extra = `Die ${G.dice[UI.sel].r} picked. ${G.play.filter(m => E.beats(G, G.dice[UI.sel], m)).length} mob(s) it beats.`; }
  else if (a === 'hit') { if (UI.sel !== null && E.assign(G, UI.sel, +v)) UI.sel = G.phase === 'combat' ? firstLive() : null; }
  else if (a === 'undo') { if (E.unassign(G)) { UI.sel = firstLive(); extra = 'Last hit taken back.'; } }
  else if (a === 'end') {
    const n = liveCount();
    if (n && !wasConfirm) { UI.confirmEnd = true; render(); say(`${n} ${n > 1 ? 'dice' : 'die'} can still hit. Press End again to take the hits anyway.`); return; }
    if (E.endRound(G)) UI.sel = null;
  }
  else if (a === 'burn') { const i = +v, c = G.held[0][i]; if (c && ['hunt', 'patch', 'recon'].includes(c.type)) UI.aim = UI.aim && UI.aim.i === i ? null : { i, type: c.type }; else E.burn(G, 0, i); }
  else if (a === 'aim') { if (UI.aim) { E.burn(G, 0, UI.aim.i, +v); UI.aim = null; } }
  else if (a === 'take') { const [k, drop] = v.split(':'); E.takeLoot(G, 0, k === 'x' ? null : +k, drop === undefined ? undefined : +drop); }
  if (G.over) return finish(before);
  // Mobs that just went down get a short knockout beat before they leave the board.
  if (['hit', 'aim', 'burn'].includes(a)) {
    const ko = before.play.filter(m => !G.play.includes(m)).map(m => ({ ...m }));
    if (ko.length) { UI.ko = ko; setTimeout(() => { if (UI.ko === ko) { UI.ko = []; if (UI.screen === 'game') render(); } }, 320); }
  }
  if (!before.bossIn && G.bossIn && G.phase === 'combat') UI.reveal = true;
  render(); effects(before);
  if (before.phase !== 'combat' && G.phase === 'combat' && !UI.reveal) { const h = app.querySelector('.pbanner') || document.getElementById('fight-h'); if (h && h.scrollIntoView) { const t = h.getBoundingClientRect().top; if (t < 0 || t > innerHeight * .45) h.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } }
  tally(a, before);
  say(announce(a, before, extra));
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
  const rolls = G.plog.slice(before.plogN).map(x => `Persist roll ${x.r}: ${x.back.length ? `${listOf(x.back)} came back` : 'the row stays quiet'}`);
  const out = [];
  if (a === 'flip') {
    if (rolls.length) out.push(rolls.join('. ') + (hurtK.length && G.plog.slice(before.plogN).some(x => x.back.length) ? ` and hit ${whoFor()}` : '') + '.');
    out.push(G.bossIn ? `${G.boss.name} is here.` : G.phase === 'sit' ? `Situation ${G.sit}: ${G.cur.name}.` : `Situation ${G.sit}: ${listOf(G.play.map(m => m.name))}. Roll when you’re ready.`);
  } else if (a === 'hit' || a === 'aim' || a === 'burn') {
    const last = G.log.slice(before.logN).map(l => l.t).filter(t => !/^Persist roll/.test(t));
    out.push(...last.slice(0, 3));
    if (rolls.length) out.push(rolls.join('. ') + '.');
  } else if (a === 'end') {
    out.push(`Round ${before.round} over.` + (hurtK.length ? ` Mobs hit ${whoFor()}.` : ' Nobody took damage.'));
    if (rolls.length) out.push(rolls.join('. ') + '.');
  } else if (a !== 'roll' && a !== 'die') {
    const lines = G.log.slice(before.logN).map(l => l.t); out.push(...lines.slice(-2));
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
    const v = die.querySelector('.dv'), r = die.dataset.roll; let n = 0; die.classList.add('tumble');
    const t = setInterval(() => { if (!v.isConnected || ++n >= 9) { clearInterval(t); v.textContent = r; die.classList.remove('tumble'); die.classList.add('landed'); return; } v.textContent = 1 + Math.floor(Math.random() * 20); }, 55);
  }
  const back = G.play.filter(m => m.back > 0 && !before.play.includes(m));
  back.forEach((m, n) => {
    const card = app.querySelector(`[data-mob="${m.uid}"]`), from = before.rects[m.uid] || before.sum; if (!card) return;
    if (!from || !motion || !card.animate) return;
    const r = card.getBoundingClientRect(), to = { left: r.left + scrollX, top: r.top + scrollY }, g = document.createElement('div');
    g.className = 'ghost'; g.innerHTML = `<b>${esc(m.name)}</b><span>Back on ${m.persist[0]}–${m.persist[1]}</span>`; g.setAttribute('aria-hidden', 'true');
    Object.assign(g.style, { left: from.left + 'px', top: from.top + 'px', width: Math.max(140, from.width) + 'px' }); document.body.appendChild(g);
    const dx = to.left - from.left, dy = to.top - from.top;
    g.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(0,-14px) scale(1.06)', opacity: 1, offset: .28 }, { transform: `translate(${dx}px,${dy}px) scale(1.12)`, opacity: 0 }],
      { duration: 820, delay: 380 + n * 110, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).onfinish = () => g.remove();
    setTimeout(() => g.remove(), 1800);
  });
}

function finish(before) {
  const low = Math.min(...G.hps), f = 1 - low / G.max; G.tier = !G.win ? 'Flatlined' : f <= .3 ? 'Wingman' : f <= .6 ? 'Solid Shift' : 'Close Call';
  const rank = { Wingman: 3, 'Solid Shift': 2, 'Close Call': 1 }[G.tier] || 0;
  const x = { team: (UI.team || 'Night shift').slice(0, 24), mode: UI.mode, diff: UI.mode === 'full' ? UI.diff : UI.mode === 'intro' ? 'First Shift' : 'Quick', players: G.team.length, tier: G.tier, hp: low, max: G.max, score: rank * 1000 + Math.round(low / G.max * 500) - G.stats.rounds, at: Date.now() };
  UI.savedAt = x.at; saveScore(x); UI.screen = 'end'; UI.reveal = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); toTop(); render();
  const h = document.getElementById('end-h'); if (h) h.focus({ preventScroll: true });
  say(G.win ? `Shift survived. ${G.boss.name} contained. ${G.tier}.` : `Shift lost. The ${nm(G.dropped)} went down to ${listOf(G.downBy || ['the mobs'])}.`);
}

app.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.v); });
app.addEventListener('input', e => { if (e.target.id === 'team') UI.team = e.target.value; });
// Shortcuts for repeat players: R roll, E end round, F flip, U undo, 1–9 pick a die.
document.addEventListener('keydown', e => {
  if (UI.screen !== 'game' || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (UI.reveal) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); act('fight'); } return; }
  const k = e.key.toLowerCase(), fire = sel => { const b = app.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); markKeys(); act(b.dataset.a, b.dataset.v); } };
  if (k === 'r') fire('[data-a=roll]'); else if (k === 'e') fire('[data-a=end]'); else if (k === 'f') fire('[data-a=flip]'); else if (k === 'u') fire('[data-a=undo]');
  else if (k === 'escape' && UI.quitAsk) act('quitn');
  else if (/^[1-9]$/.test(k) && UI.order[+k - 1] != null) { const i = UI.order[+k - 1]; if (G.dice[i] && !G.dice[i].used) { e.preventDefault(); markKeys(); act('die', String(i)); } }
});

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
    return `<button type="button" class="pick" data-a="pick" data-v="${c.id}" data-k="p${c.id}" aria-pressed="${on}" ${!solo && !on && n >= 4 ? 'disabled' : ''}><span class="art">${slice(ART[c.id])}</span><span><span class="nm">${esc(c.name)}</span><br><span class="perk">${esc(c.perk)}</span></span><span class="st">${on ? ICON.check + (solo ? 'You' : 'In') : solo ? 'Pick' : 'Add'}</span></button>`; }).join('');
  const order = ['intro', 'quick', 'full'].filter(k => D.modes[k]);
  const modes = order.map(k => { const m = D.modes[k]; return `<button type="button" class="opt" data-a="mode" data-v="${k}" data-k="m${k}" aria-pressed="${UI.mode === k}"><b>${esc(m.label)}</b><span class="meta">${esc(m.minutes)} min</span></button>`; }).join('');
  const diffs = UI.mode === 'full' ? `<h2 class="sech">Difficulty</h2><div class="seg" role="group" aria-label="Difficulty">${['Recruit', 'Analyst', 'Veteran'].map(k => `<button type="button" class="opt" data-a="diff" data-v="${k}" data-k="d${k}" aria-pressed="${UI.diff === k}"><b>${k}</b><span class="meta">${D.hp.full[nP()][k]} HP each</span></button>`).join('')}</div>` : '';
  const board = lb(true);
  const more = solo ? `<button class="lnk" type="button" data-a="friends" data-k="friends">Playing with friends? Add up to 3 more</button>`
    : `<p class="meta">One analyst per player, up to 4. <button class="lnk" type="button" data-a="solo" data-k="solo">Just me</button></p>`;
  return `<div class="wrap"><div class="intro-grid">
    <section class="hero"><span class="art">${slice(pickArt('hero', 'event', 'Network'))}</span><p class="meta c">An original game by Binary Defense</p><h1 class="logo">Detect the Dwellers</h1>
      <p class="lede">A co-op d20 game for the SOC night shift. One situation at a time: pick who’s on point, flip it, and deal with whatever’s there. What you beat doesn’t stay beaten. Keep everyone breathing to the end of the feed, then face the boss.</p>
      ${board ? `<div class="lbmini"><h2 class="sech">Leaderboard · ${esc(D.modes[UI.mode].label)}</h2>${board}</div>` : ''}</section>
    <section class="setup panel" aria-labelledby="setup-h"><h2 class="sr" id="setup-h">Set up your shift</h2>
      <h2 class="sech">Mode</h2><div class="seg" role="group" aria-label="Mode">${modes}</div><p class="body-s">${esc(cap1(D.modes[UI.mode].sub))}${UI.mode === 'intro' ? '. Tips walk you through it.' : '.'}</p>${diffs}
      <h2 class="sech" id="crew-h">${solo ? 'Your analyst' : `Crew · ${n} of 4`}</h2><div class="picks" role="group" aria-labelledby="crew-h">${picks}</div>${more}
      <div class="field"><label class="sech" for="team">Crew name</label><input id="team" maxlength="24" autocomplete="off" value="${esc(UI.team)}" placeholder="Night Shift Six"></div>
      <div class="startbar"><p class="meta">${n ? `${n === 1 ? `Solo · ${hpFor()} HP` : `${n} players · ${hpFor()} HP each`} · 0 HP ends the shift` : 'Pick an analyst for each player'}</p>
        <button class="btn p w big" type="button" data-a="start" data-k="start" data-primary ${n ? '' : 'disabled'}>Jack in</button></div></section>
  </div></div>`;
}

function mobHTML(m, ko) {
  const key = 'm' + m.uid + '.' + m.back, fresh = ko || UI.seen.has(key) ? '' : 'fresh'; if (!ko) UI.seen.add(key);
  const pips = Array.from({ length: m.hits }, (_, i) => `<i class="${i < m.left ? '' : 'gone'}"></i>`).join('');
  const d = !ko && UI.sel !== null ? G.dice[UI.sel] : null, ok = d && E.beats(G, d, m);
  const btn = ok ? `<button class="btn p w" type="button" data-a="hit" data-v="${m.uid}" data-k="h${m.uid}">Hit it · ${hitWhy(d, m)}</button>`
    : d ? `<p class="nohit">Die ${d.r} can’t hit this one${d.kind === 'crew' && d.r !== 1 && !(m.ability === 'hardened' && d.r < 12) ? ` (${E.total(G, d, m)} vs ${m.def})` : ''}.</p>` : '';
  const per = m.kind === 'boss' ? '' : `<span class="tag">${m.back > 1 ? `Came back ×${m.back} · ` : ''}${m.routine ? 'Routine · ' : ''}Back on ${m.persist[0]}–${m.persist[1]}</span>`;
  const kw = m.kw && D.keywords[m.kw] ? `<svg class="kwi" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${D.keywords[m.kw].icon}</svg>` : '';
  const back = !ko && m.kind !== 'boss' && m.back > 0;
  return `<article class="mob ${m.kind === 'boss' ? 'boss' : ''} ${fresh} ${back ? 'back' : ''} ${ok ? 'can' : ''} ${ko ? 'ko' : ''}" data-mob="${m.uid}" aria-labelledby="mn${m.uid}"><span class="art">${slice(mobArt(m))}${back ? '<span class="bstamp" aria-hidden="true">Back</span>' : ''}</span><div class="bd">
    <div class="mh"><span class="meta ${m.kind === 'boss' ? 'f' : ''}">${m.kind === 'boss' ? 'Boss · ' : ''}${esc(m.domain)}${m.scouted && E.active(G, 'recon').length ? ' · scouted +5' : ''}</span>${per}</div>
    <h3 class="nm" id="mn${m.uid}">${esc(m.name)}${ko ? '<span class="sr"> is down</span>' : back ? '<span class="sr">, back from the row</span>' : ''}</h3>
    <dl class="stat"><div class="def"><dt>Defense</dt><dd>${m.def}</dd></div><div><dt>Hits</dt><dd>${ko ? 0 : m.left}/${m.hits}</dd></div><div><dt>Damage</dt><dd>${E.dmgOf(G, m)}</dd></div></dl><div class="pips" aria-hidden="true">${ko ? pips.replace(/<i class="">/g, '<i class="gone">') : pips}</div>
    <p class="ability">${kw}<b>${esc(m.abilityName)}.</b> ${esc(m.abilityText)}</p>${m.flavor ? `<p class="fl">${esc(m.flavor)}</p>` : ''}${btn}</div></article>`;
}

const hitWhy = (d, m) => isDouble(d) ? `${d.r}: double, two hits` : `${E.total(G, d, m)} vs ${m.def}`;
function canBurn(c) { const f = G.phase === 'combat', r = f && G.rolled;
  return { triage: r, hunt: f && G.play.some(m => m.kind !== 'boss' && m.left <= 2), contain: f, enrich: r, patch: G.row.length > 0, recover: G.hps.some(h => h < G.max), decoy: r, recon: G.deck.length >= 2 }[c.type] && !G.over; }
function aimTargets() { if (!UI.aim) return ''; const t = UI.aim.type;
  const opts = t === 'hunt' ? G.play.filter(m => m.kind !== 'boss' && m.left <= 2).map(m => [m.uid, `Finish ${m.name}`]) : t === 'patch' ? G.row.map(m => [m.uid, `Patch out ${m.name}`]) : G.deck.slice(-3).map((c, i) => [i, `Bury ${c.name}`]).reverse();
  return `<div class="row" style="margin-top:6px">${opts.map(([v, l]) => `<button class="btn s cy" type="button" data-a="aim" data-v="${v}" data-k="aim${v}">${esc(l)}</button>`).join('')}</div>`; }
function kitTray() {
  const cap = E.slots(G, 0), groups = [];
  G.held[0].forEach((c, i) => { const g = groups.find(x => x.c.type === c.type); if (g) g.n++; else groups.push({ c, i, n: 1 }); });
  const cards = groups.map(({ c, i, n }) => {
    const can = canBurn(c), aiming = UI.aim && UI.aim.i === i, open = can || aiming || UI.kitOpen.has(c.type);
    return `<div class="kitc ${can ? 'live' : ''}"><span class="art">${slice(kitArt(c.type))}</span><div style="display:flex;flex-direction:column;gap:4px;min-width:0"><h4>${esc(c.name)}${n > 1 ? `<span class="x" aria-label="${n} copies">×${n}</span>` : ''}</h4>
      <p class="kt"><b class="kl c">Agent.</b> ${esc(c.text)}</p>${open ? `<p class="kb"><b class="kl f">Burn it.</b> ${esc(c.burn)}</p>` : ''}
      <div class="row">${can || aiming ? `<button class="btn s ${aiming ? '' : 'cy'}" type="button" data-a="burn" data-v="${i}" data-k="b${c.type}">${aiming ? 'Cancel' : 'Burn it'}</button>` : `<button class="lnk" type="button" data-a="kitx" data-v="${c.type}" data-k="kx${c.type}" aria-expanded="${open}">${open ? 'Less' : 'Burn effect'}</button>`}</div>${aiming ? aimTargets() : ''}</div></div>`; }).join('');
  return `<section class="sec" style="display:flex;flex-direction:column;gap:8px" aria-labelledby="kit-h"><h2 class="sech" id="kit-h">Crew kit · ${G.held[0].length}/${cap}</h2>${cards || '<p class="empty">No kit yet. Win a fight to draw one.</p>'}${aiOnUI() ? '<p class="meta f">The Rogue AI has shut your agents down. You can still burn them.</p>' : ''}</section>`;
}
function aiOnUI() { return G.play.some(m => m.ability === 'takeover' || (m.kind === 'boss' && m.id === 'ai')); }

function persistBanner() { const p = G.persist; if (!p || !p.pre) return '';
  return `<div class="panel prompt pbanner ${p.back.length ? 'hot' : ''}" role="status"><div class="d20 ${p.back.length ? '' : 'cy'}" data-roll="${p.r}"><span class="sr">Persist roll </span><span class="dv" aria-hidden="true">${p.r}</span><span class="sr">${p.r}</span></div><div style="flex:1 1 240px"><span class="meta ${p.back.length ? 'f' : 'c'}">Persist roll with the flip</span><p style="margin-top:2px">${p.back.length ? `${esc(listOf(p.back))} came back from the row and hit everyone on the way in. ${p.back.length > 1 ? 'Each needs' : 'It needs'} just one hit.` : 'Nothing in the row matched. Quiet.'}</p></div></div>`; }

function tipHTML() {
  if (G.over) return '';
  const fight = G.phase === 'combat', dbl = fight && G.rolled && G.dice.some(d => d.kind === 'crew' && !d.used && isDouble(d));
  if (G.mode === 'intro' && D.intro) { const T = D.intro.tips;
    // Situation 1 teaches one step at a time; the doubles rule waits for a later fight.
    const first = G.sit === 1 && fight && !G.bossIn ? (!G.rolled ? (G.team.length > 1 ? FIRST_FIGHT.pre : `Hit Roll. Playing solo, you roll ${D.soloDice || 3} dice.`) : liveCount() ? FIRST_FIGHT.live : FIRST_FIGHT.spent) : null;
    const t = G.phase === 'loot' ? T.loot : G.bossIn ? T.boss : G.phase === 'point' ? (G.sit === 0 ? (G.team.length > 1 ? 'Pick who’s on point, then flip the first situation.' : 'Flip the first situation.') : null) : first || (dbl ? TIPS.double : T[String(G.sit)]);
    return t ? `<div class="tip" role="note"><p>${esc(t)}</p></div>` : ''; }
  const hurt = G.team.length > 1 && G.hps.some(h => h < G.max);
  const want = G.phase === 'loot' ? ['loot'] : G.phase === 'point' ? ['point', 'row'].filter(k => k === 'row' ? G.row.length : G.team.length > 1) : fight ? (G.bossIn ? ['boss'] : []).concat(G.rolled ? (liveCount() ? ['assign'].concat(dbl ? ['double'] : []) : ['end']) : ['roll'].concat(hurt ? ['rest'] : [])) : [];
  const k = want.find(x => !tipsSeen.has(x)); if (!k) return '';
  const txt = k === 'roll' && G.team.length === 1 ? `Roll. Playing solo, you get ${D.soloDice || 3} dice a round.` : TIPS[k];
  return `<div class="tip" role="note"><p>${esc(txt)}</p><button class="btn s cy" type="button" data-a="tipx" data-v="${k}" data-k="tip${k}">Got it</button></div>`;
}

function sitResult() { const r = G.lastSit; if (!r || G.phase === 'combat') return '';
  return `<div class="panel prompt" role="status"><div><span class="meta c">${esc(r.name)}</span><p style="margin-top:2px">${r.choice ? `You chose: ${esc(r.choice)}.` : r.rolls.length ? r.rolls.map(x => `${esc(nm(x.k))} rolled ${x.t}: ${x.ok ? 'pass' : 'fail'}`).join(' · ') : 'Resolved.'}</p></div></div>`; }

function crewHTML() {
  const fight = G.phase === 'combat', by = fight ? E.incomingBy(G) : null, L = G.lastRound;
  return `<h2 class="sech">${G.team.length > 1 ? 'Your crew' : 'You'}</h2>` + G.team.map((w, k) => { const c = E.cls(w), on = G.point === k && G.team.length > 1, low = G.hps[k] <= G.max * .25;
    let inc = '';
    if (fight) {
      const list = by[k], sum = list.reduce((s, x) => s + x.d, 0);
      inc = k === G.rest ? `<p class="inc safe"><b>Off-shift</b><span class="src"> · no damage, +1 HP</span></p>` : !sum ? `<p class="inc safe"><b>Incoming&nbsp;0</b>${G.blocks[k] ? ' · blocking' : G.decoyRound && on ? ' · decoyed' : ''}</p>`
        : `<p class="inc"><b>Incoming&nbsp;−${sum}</b><span class="src"> · ${list.map(x => glue(x.m.name, x.d)).join(' · ')}</span></p>`;
    }
    if (L && !L.ended && L.by && (!fight || !G.rolled)) {
      const got = L.by[k] || [], sum = L.inc[k];
      inc += `<p class="inc ${sum ? '' : 'safe'}">Round ${L.round}: ${k === L.rest ? '<b>off-shift</b>' : sum ? `<b>took&nbsp;−${sum}</b><span class="src"> · ${got.map(x => glue(x.name, x.d)).join(' · ')}</span>` : L.blocks[k] ? '<b>blocked</b>' : L.decoy && k === G.point ? '<b>decoyed</b>' : '<b>not targeted</b>'}</p>`;
    }
    // The perk lives in the intro and in this tooltip; the dice show it in play as a +bonus.
    return `<article class="pc ${on ? 'on' : ''}" data-hp="${k}" aria-labelledby="pc${k}"><span class="art">${slice(ART[w])}</span><div class="bd"><div class="pc-h"><h3 class="nm" id="pc${k}" title="${esc(c.perk)}">${esc(c.name)}</h3>${on ? `<span class="badge on">${ICON.check}On point</span>` : ''}</div>
      <div class="hpline"><b class="num">${G.hps[k]}</b><span class="of">/ ${G.max} HP</span></div><div class="hpbar ${low ? 'low' : ''}" role="img" aria-label="${G.hps[k]} of ${G.max} HP"><i style="width:${Math.round(G.hps[k] / G.max * 1000) / 10}%"></i></div>${inc}</div></article>`; }).join('');
}

function dockHTML() {
  const kb = k => `<kbd aria-hidden="true">${k}</kbd>`;
  const onp = G.team.length > 1 ? ` · ${esc(nm(G.point))} on point` : '';
  if (G.phase === 'point') return `<div class="dock"><div class="acts"><button class="btn p big grow" type="button" data-a="flip" data-k="flip" data-primary aria-keyshortcuts="F">${G.deck.length ? (G.row.length ? `Flip it and roll the row${onp}` : `Flip it${onp}`) : 'Face the boss'} ${kb('F')}</button></div></div>`;
  if (G.phase === 'sit') { const c = G.cur;
    const btns = c.type === 'choice' ? c.opts.map((o, i) => `<button class="btn ${i ? '' : 'p'} grow" type="button" data-a="sit" data-v="${i}" data-k="s${i}" ${i ? '' : 'data-primary'}>${esc(o.label)}</button>`).join('')
      : `<button class="btn p big grow" type="button" data-a="sit" data-v="0" data-k="s0" data-primary>${c.type === 'challenge' ? (c.who === 'each' ? 'Everyone rolls' : `${esc(nm(G.point))} rolls`) : 'Resolve it'}</button>`;
    return `<div class="dock"><div class="acts">${btns}</div></div>`; }
  if (G.phase === 'loot') { const room = G.held[0].length < E.slots(G, 0);
    const opts = room ? `<button class="btn p big grow" type="button" data-a="take" data-v="0" data-k="t0" data-primary>Add to the crew kit</button>` : G.held[0].map((h, i) => `<button class="btn s" type="button" data-a="take" data-v="0:${i}" data-k="t0${i}">Swap out ${esc(h.name)}</button>`).join('');
    return `<div class="dock">${room ? '' : '<p class="ask">The kit is full. Swap one out, or leave this card.</p>'}<div class="acts">${opts}<button class="btn" type="button" data-a="take" data-v="x" data-k="tx">Leave it</button></div></div>`; }
  if (G.phase !== 'combat') return '';
  if (!G.rolled) {
    const offs = G.team.length > 1 ? `<div class="offs"><span class="meta">Off-shift, one a round:</span>${G.team.map((w, k) => `<button class="btn s ${G.rest === k ? 'cy' : ''}" type="button" data-a="rest" data-v="${k}" data-k="r${k}" aria-pressed="${G.rest === k}">${G.rest === k ? ICON.check : ''}${esc(nm(k))}</button>`).join('')}</div>` : '';
    return `<div class="dock" aria-label="Round ${G.round}">${offs}<div class="acts"><button class="btn p big grow" type="button" data-a="roll" data-k="roll" data-primary aria-keyshortcuts="R">Roll everything ${kb('R')}</button></div></div>`;
  }
  UI.order = [];
  const groups = G.team.map((w, k) => {
    if (k === G.rest) return `<div class="dgroup"><span class="meta c">${esc(nm(k))}, off-shift</span></div>`;
    const idx = G.dice.map((d, i) => [d, i]).filter(([d]) => d.k === k);
    return `<div class="dgroup">${G.team.length > 1 || G.blocks[k] ? `<span class="meta">${G.team.length > 1 ? esc(nm(k)) : 'You'}${G.blocks[k] ? ' · <span class="badge">blocking</span>' : ''}</span>` : ''}<div class="dice">${idx.map(([d, i]) => {
      const n = d.used ? null : (UI.order.push(i), UI.order.length), nat = d.r >= 18, burstKey = G.sit + '.' + G.round + '.' + i, burst = nat && !d.used && !UI.dice.has(burstKey); UI.dice.add(burstKey);
      // The bonus is on the die, so "no target" next to "ready" explains itself: 8 +5 still falls short of 15.
      const bb = d.used ? 0 : bestBonus(d), live = !d.used && canHit(i);
      const cap = UI.sel === i ? (isDouble(d) && d.kind === 'crew' ? 'picked ×2' : 'picked') : d.kind === 'agent' ? TNAME[d.card.type] + ' agent' : isDouble(d) ? 'double ×2' : d.used ? 'used' : live ? 'ready' : 'no target';
      const why = d.used ? '' : bb ? `, plus ${bb} at best` : '';
      return `<button type="button" class="die ${d.kind === 'agent' ? 'ag' : ''} ${isDouble(d) && d.kind === 'crew' ? 'nat' : ''} ${d.used ? 'used' : ''} ${!d.used && !live ? 'dead' : ''}" data-a="die" data-v="${i}" data-k="die${i}" aria-pressed="${UI.sel === i}" aria-label="${esc(d.kind === 'agent' ? d.card.name : nm(k))} die ${d.r}${why}, ${cap}" ${d.used ? 'disabled' : ''}>${burst && !reduced() ? '<i class="burst" aria-hidden="true"></i>' : ''}${n && n < 10 ? `<kbd aria-hidden="true">${n}</kbd>` : ''}<b>${d.r}${bb ? `<em>+${bb}</em>` : ''}</b><span>${cap}</span></button>`; }).join('')}</div></div>`; }).join('');
  const n = liveCount(), inc = E.incoming(G);
  // Narrow screens: once a die is picked, its targets sit in the dock itself, so a hit never needs a scroll.
  const sd = UI.sel !== null ? G.dice[UI.sel] : null, tg = sd ? G.play.filter(m => E.beats(G, sd, m)) : [];
  const tgts = sd ? `<div class="tgts" role="group" aria-label="Targets for die ${sd.r}">${tg.length ? tg.map(m => `<button class="btn p s" type="button" data-a="hit" data-v="${m.uid}" data-k="th${m.uid}">Hit ${esc(m.name)} · ${isDouble(sd) ? `${sd.r} ×2` : `${E.total(G, sd, m)} vs ${m.def}`}</button>`).join('') : `<p class="meta">Die ${sd.r} can’t hit anything in play.</p>`}</div>` : '';
  const decoy = !G.decoyUsed && E.active(G, 'decoy').length ? `<button class="btn s cy" type="button" data-a="decoy" data-k="dcy">Decoy: ${esc(nm(G.point))} takes no damage</button>` : G.decoyRound ? `<span class="badge">Decoy active: ${esc(nm(G.point))} protected</span>` : '';
  const undo = E.canUndo(G) ? `<button class="btn s" type="button" data-a="undo" data-k="undo" aria-keyshortcuts="U">${ICON.undo}Undo ${kb('U')}</button>` : '';
  const endBtn = `<button class="btn ${UI.confirmEnd ? 'warn' : n ? '' : 'p'} big grow" type="button" data-a="end" data-k="end" ${n ? '' : 'data-primary'} aria-keyshortcuts="E">${UI.confirmEnd ? 'End anyway · take the hits' : 'End round · take the hits'} ${kb('E')}</button>`;
  return `<div class="dock" aria-label="Round ${G.round} dice"><div class="dgroups">${groups}</div>${tgts}<p class="inc mobonly">If you end now: ${G.team.length > 1 ? G.team.map((w, k) => `${esc(nm(k))}&nbsp;<b>−${inc[k]}</b>`).join(' · ') : inc[0] ? `<b>−${inc[0]}</b>` : 'no damage'}</p>
    ${UI.confirmEnd ? `<p class="ask" role="alert">${n} ${n > 1 ? 'dice' : 'die'} can still hit. End the round anyway?</p>` : ''}<div class="acts">${undo}${decoy}${endBtn}</div></div>`;
}

// The persistence row is always on screen as a strip of chips (name and comeback range), in fights too.
function rowHTML() {
  const fight = G.phase === 'combat', p = G.persist, justBack = p && p.back.length ? p.back : [];
  const chips = G.row.map(m => `<li class="chip" data-chip="${m.uid}"><b>${esc(m.name)}</b><span class="meta">Back on ${m.persist[0]}–${m.persist[1]}</span></li>`).join('');
  const note = !G.row.length ? (justBack.length ? `Empty: ${esc(listOf(justBack))} came back from the row this flip.` : fight ? 'Empty for now.' : 'Empty, for now. Beaten mobs land here.')
    : justBack.length ? `${esc(listOf(justBack))} came back this flip. Every flip rolls for the rest.` : 'Every flip rolls a d20 for these.';
  const plog = fight ? '' : G.plog.slice(-6).reverse().map(x => `<p><span class="meta">${x.sit === 'Boss' ? 'Boss' : 'S' + x.sit}${x.why ? ' · ' + x.why : ''}</span> rolled <b class="num">${x.r}</b> → ${x.back.length ? esc(listOf(x.back)) + ' came back' : 'quiet'}</p>`).join('');
  return `<section class="rowstrip ${fight ? 'infight' : ''}" aria-labelledby="row-h" data-rowsum><h2 class="sech a" id="row-h">Persistence row${G.row.length ? ` · ${G.row.length}` : ''}</h2>
    ${chips ? `<ul class="prow">${chips}</ul>` : ''}<p class="meta">${note}</p>${plog ? `<div class="log" style="max-height:140px">${plog}</div>` : ''}</section>`;
}

function vGame() {
  let main = tipHTML();
  if (UI.ko.length && G.phase !== 'combat') main += `<div class="inplay">${UI.ko.map(m => mobHTML(m, true)).join('')}</div>`;
  if (G.phase === 'point' || G.phase === 'loot') { main += sitResult(); if (G.lastRound && G.lastRound.ended) main += `<div class="panel prompt" role="status"><div><span class="meta c">Fight over</span><p style="margin-top:2px">The last mob went down before it could hit back.</p></div></div>`; }
  if (G.phase === 'point') {
    const pk = E.peek(G);
    const crew = G.team.length > 1;
    main += `<section class="panel pad pointp" aria-labelledby="pt-h"><span class="meta c">${G.deck.length ? `Next: situation ${G.sit + 1} of ${G.total}` : 'The feed is empty'}</span><h2 class="nm" id="pt-h">${G.deck.length ? (crew ? 'Who is on point?' : 'Flip the next situation') : `The boss is waiting${G.row.length ? `, and it rolls for the ${G.row.length} in the row` : ''}`}</h2>
      ${pk ? `<p class="meta c">Recon: next up is ${esc(pk.name)}${pk.kind === 'mob' ? ' (a mob: +5 for the whole fight)' : ''}</p>` : ''}
      ${crew ? `<div class="seg" role="group" aria-label="On point" style="--n:${G.team.length}">${G.team.map((w, k) => `<button class="opt" type="button" data-a="point" data-v="${k}" data-k="pt${k}" aria-pressed="${G.point === k}"><b>${esc(nm(k))}</b><span class="meta">${G.point === k ? 'On point' : `${G.hps[k]} HP`}</span></button>`).join('')}</div>` : ''}</section>` + rowHTML();
  } else if (G.phase === 'sit') {
    const c = G.cur; main += persistBanner(); if (G.pendingBack.length) main += `<p class="meta f">After this: fight ${esc(listOf(G.pendingBack.map(x => x.name)))}, back from the row.</p>`;
    main += `<article class="panel sitcard" aria-labelledby="sit-h"><span class="art">${slice(sitArt(c))}</span><div class="bd"><span class="meta c">Situation ${G.sit}${G.team.length > 1 ? ` · ${esc(nm(G.point))} on point` : ''}</span><h2 class="nm" id="sit-h">${esc(c.name)}</h2><p class="fl">${esc(c.text)}</p><p class="rule">${esc(c.rule)}</p></div></article>`;
  } else if (G.phase === 'loot') {
    const c = G.loot[0];
    main += `<article class="panel sitcard c" aria-labelledby="loot-h"><span class="art">${slice(c.kind === 'agent' ? kitArt(c.type) : pickArt('gear', 'event'))}</span><div class="bd"><span class="meta c">Kit drop${G.loot.length > 1 ? ` · ${G.loot.length} cards` : ''}</span><h2 class="nm" id="loot-h">${esc(c.name)}</h2><p><b class="kl c">Agent.</b> ${esc(c.text)}</p><p><b class="kl f">Burn it.</b> ${esc(c.burn)}</p>${G.team.length > 1 ? `<p class="body-s">${esc(nm(G.point))} is on point and takes the draw for the crew.</p>` : ''}</div></article>`;
  } else if (G.phase === 'combat') {
    if (!G.rolled && G.round === 1) main += persistBanner();
    const mobs = G.play.map(m => mobHTML(m)).join('') + UI.ko.map(m => mobHTML(m, true)).join('');
    main += rowHTML() + `<section aria-labelledby="fight-h" style="display:flex;flex-direction:column;gap:10px"><h2 class="sech f" id="fight-h">${G.bossIn ? 'Boss fight' : `Situation ${G.sit}`} · round ${G.round}${G.team.length > 1 ? ` · ${esc(nm(G.point))} on point` : ''}</h2><div class="inplay">${mobs}</div></section>`;
  } else main += rowHTML();
  main += dockHTML();
  const logs = G.log.slice(-14).reverse().map(l => `<p><span class="meta">S${l.r}</span> ${esc(l.t)}</p>`).join('');
  const total = G.total, segs = Array.from({ length: total }, (_, i) => `<i class="${i < G.sit - (G.bossIn ? 0 : 1) ? 'done' : i === G.sit - 1 && !G.bossIn ? 'now' : ''}"></i>`).join('') + `<i class="boss ${G.bossIn ? 'now' : ''}"></i>`;
  const quit = UI.quitAsk ? `<div class="quitask" role="alert"><span class="body-s" style="color:var(--ink)">Quit this shift? It won’t be scored.</span><button class="btn s warn" type="button" data-a="quity" data-k="quity">Quit</button><button class="btn s" type="button" data-a="quitn" data-k="quitn">Keep playing</button></div>`
    : `<button class="btn s" type="button" data-a="quit" data-k="quit">Quit shift</button>`;
  return `<div class="wrap"><header class="top"><span class="brand">Detect the Dwellers</span><div class="feed"><span class="meta c">${G.bossIn ? 'Boss fight' : G.sit ? `Situation ${G.sit} of ${total}` : `${total} situations, then the boss`}</span><span class="feedbar" aria-hidden="true">${segs}</span></div><span class="crewname meta">${esc(UI.team || 'Night shift')}</span>${quit}</header>
    <div class="board"><section class="crew" aria-label="Crew" style="--n:${G.team.length > 3 ? 2 : G.team.length}">${crewHTML()}</section><main class="main">${main}</main>
    <aside class="side">${kitTray()}<section aria-labelledby="log-h" style="display:flex;flex-direction:column;gap:6px"><h2 class="sech" id="log-h">Event log · kit deck ${G.kit.length}</h2><div class="log">${logs}</div></section>
    ${keysUsed ? '' : '<p class="keys"><kbd>R</kbd>roll · <kbd>1</kbd>–<kbd>9</kbd>pick a die · <kbd>U</kbd>undo · <kbd>E</kbd>end round · <kbd>F</kbd>flip</p>'}</aside></div></div>${UI.reveal ? revealHTML() : ''}`;
}

function revealHTML() {
  const b = G.play.find(m => m.kind === 'boss') || G.boss, more = G.play.filter(m => m.kind !== 'boss');
  return `<div class="reveal" role="dialog" aria-modal="true" aria-labelledby="rv-h"><div class="rv"><span class="art">${slice(bossArt(b.id))}</span><div class="bd"><span class="meta f">The feed is empty. The boss is here.</span><h2 class="nm" id="rv-h">${esc(b.name)}</h2>
    <dl class="stat"><div class="def"><dt>Defense</dt><dd>${b.def}</dd></div><div><dt>Hits</dt><dd>${b.hits}</dd></div><div><dt>Damage</dt><dd>${E.dmgOf(G, b)}</dd></div></dl>
    <p class="ability"><b>${esc(b.abilityName)}.</b> ${esc(b.abilityText)}</p>${more.length ? `<p class="meta f">With ${esc(listOf(more.map(m => m.name)))}, back from the row.</p>` : ''}<p class="body-s">Agents can’t touch a boss. Burn what you’ve got.</p>
    <button class="btn p big w" type="button" data-a="fight" data-k="fight">Fight</button></div></div></div>`;
}

// One concrete line for a loss, read from the final state: an agent never burned, off-shift healing never used,
// or the mob that did the most damage across the shift.
function helped() {
  const kit = G.held[0] || [], agent = kit.find(c => c.kind === 'agent');
  if (agent) return `The ${agent.name} was never burned. Burn it: ${(agent.burn.charAt(0).toLowerCase() + agent.burn.slice(1)).replace(': ', ', ')}`;
  if (G.team.length > 1 && !G.stats.rests) return `Nobody went off-shift. Resting one analyst before a roll heals 1 HP${G.team.includes('PAT') ? ' (the Fixer heals 3 across the crew)' : ''}.`;
  const top = Object.entries(UI.dmg).sort((a, b) => b[1] - a[1])[0];
  if (top) return `${top[0]} did the most damage: ${top[1]} HP across the shift. Put it down first.`;
  return '';
}

function vEnd() {
  const line = { Wingman: 'Your agents carried the routine. Your crew carried the boss. That is the job.', 'Solid Shift': 'You held the line, and everybody walked out.', 'Close Call': 'Everybody made it, barely.', Flatlined: 'Who’s working your queue at 2 AM?' }[G.tier];
  const who = G.dropped != null ? nm(G.dropped) : 'crew', killers = G.downBy || [];
  const lastBy = G.lastRound && G.lastRound.by && G.dropped != null ? G.lastRound.by[G.dropped] : null;
  const fromRound = lastBy && lastBy.length && killers.every(n => lastBy.some(x => x.name === n));
  const cause = G.win ? '' : fromRound ? `The ${esc(who)} went down in round ${G.lastRound.round}: ${lastBy.map((x, i) => `${esc(x.name)} hit for <b class="num">${x.d}</b>`).join(', ')}.` : `The ${esc(who)} went down to ${esc(listOf(killers.length ? killers : ['the mobs']))}.`;
  const killerMob = [...D.mobs, ...D.bosses].find(m => killers.includes(m.name));
  const artSvg = G.win ? bossArt(G.boss.id) : killerMob ? (D.bosses.includes(killerMob) ? bossArt(killerMob.id) : ART[killerMob.id]) : pickArt('hero', 'event');
  const roster = G.team.map((w, k) => `<li class="${!G.win && k === G.dropped ? 'down' : ''}"><span class="art">${slice(ART[w])}</span><span><span class="nm">${esc(E.cls(w).name)}</span><br><span class="meta">${G.hps[k]}/${G.max} HP</span></span></li>`).join('');
  const cta = BOOTH_CTA.url ? `<a class="cta" href="${esc(BOOTH_CTA.url)}" target="_blank" rel="noopener">${esc(BOOTH_CTA.text)}</a>` : `<p class="cta">${esc(BOOTH_CTA.text)}</p>`;
  const help = G.win ? '' : helped();
  return `<div class="wrap"><div class="end">
    <article class="endcard ${G.win ? 'win' : 'loss'}" aria-labelledby="end-h"><div class="ec-art"><span class="art">${slice(artSvg)}</span><span class="stamp" aria-hidden="true">${G.win ? 'Contained' : 'Flatlined'}</span></div>
      <div class="ec-bd"><p class="meta ${G.win ? 'c' : 'f'}">${G.win ? 'Shift survived' : 'Shift lost'} · ${esc(D.modes[UI.mode].label)}${UI.mode === 'full' ? ' · ' + esc(UI.diff) : ''} · ${G.team.length}p</p>
        <h1 class="logo" id="end-h" tabindex="-1">${esc(G.tier)}</h1>
        ${G.win ? `<p class="lede">${esc(G.boss.name)} is contained. ${esc(line)}</p>` : `<p class="cause">${cause}</p>${help ? `<p class="helped"><b>What would have helped.</b> ${esc(help)}</p>` : ''}<p class="lede">${esc(line)}</p>`}
        <ul class="roster" aria-label="Crew">${roster}</ul>
        <div class="stats"><div><b>${G.sit}</b><span class="meta">Situations</span></div><div><b>${G.stats.rounds}</b><span class="meta">Rounds</span></div><div><b>${G.stats.back}</b><span class="meta">Comebacks</span></div><div><b>${Math.min(...G.hps)}</b><span class="meta">Lowest HP</span></div></div>
        <p class="body-s">Agents landed <b class="num" style="color:var(--cy)">${G.stats.agentHits}</b> hits. The crew landed <b class="num" style="color:var(--ink)">${G.stats.crewHits}</b>.</p>
        <p class="sig">${esc(UI.team || 'Night shift')} · Detect the Dwellers · Binary Defense</p></div></article>
    <div style="display:flex;flex-direction:column;gap:18px">${cta}<div class="row"><button class="btn p big" type="button" data-a="again" data-k="again" data-primary style="min-width:190px">Run it back</button><button class="btn big" type="button" data-a="new" data-k="new">New crew</button></div>
      <section class="panel pad" aria-labelledby="lb-h"><h2 class="sech" id="lb-h">Leaderboard · ${esc(D.modes[UI.mode].label)}</h2>${lb()}</section></div></div></div>`;
}
render();
