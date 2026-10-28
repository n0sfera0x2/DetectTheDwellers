const D = __DATA__;
const ART = __ART__;
__ENGINE__

const E = DTD12(D);
const AART = { triage: 'Network', hunt: 'Identity', contain: 'Endpoint', enrich: 'Cloud', patch: 'Endpoint', recover: 'Identity', decoy: 'Network', recon: 'Cloud' };
const TNAME = { triage: 'Triage', hunt: 'Hunt' };
const app = document.getElementById('app'), live = document.getElementById('live');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const UI = { screen: 'intro', mode: 'full', diff: 'Analyst', pick: ['HUN', 'RES', 'SOA'], team: '', sel: null, aim: null, board: [], savedAt: null, seen: new Set() };
let G = null, DB = null; const LS = 'dwellers-board-v17';
function loadLocal() { try { UI.board = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { UI.board = []; } }
function saveLocal(x) { try { const b = JSON.parse(localStorage.getItem(LS) || '[]'); b.push(x); b.sort((a, c) => c.score - a.score); localStorage.setItem(LS, JSON.stringify(b.slice(0, 30))); UI.board = b.slice(0, 30); } catch (e) { UI.board = [x]; } }
loadLocal();
(async () => { try { if (window.claude && typeof window.claude.use === 'function') { DB = await window.claude.use('db'); if (DB) DB.collection('dwellers-v17').orderBy('score', 'desc').limit(30).onSnapshot(s => { UI.board = s.docs.map(d => d.data()).filter(Boolean); if (UI.screen !== 'game') render(); }, () => { DB = null; loadLocal(); }); } } catch (e) { DB = null; } })();
function saveScore(x) { if (DB) DB.collection('dwellers-v17').add(x).catch(() => { DB = null; saveLocal(x); }); else saveLocal(x); }
const say = t => { live.textContent = t; };
const nP = () => String(Math.max(1, Math.min(4, UI.pick.length)));
const hpFor = () => UI.mode === 'full' ? D.hp.full[nP()][UI.diff] : D.hp[UI.mode][nP()];
const nm = k => E.cls(G.team[k]).name;
const canHit = i => { const d = G.dice[i]; return d && !d.used && G.play.some(m => E.beats(G, d, m)); };
const firstLive = () => { const i = G.dice.findIndex((d, j) => canHit(j)); return i >= 0 ? i : null; };
function start() { G = E.newGame(UI.pick, UI.mode, { diff: UI.diff }); UI.screen = 'game'; UI.sel = null; UI.aim = null; UI.savedAt = null; UI.seen = new Set(); render(); say('Pick who is on point.'); }
function act(a, v) {
  if (UI.screen === 'intro') { if (a === 'mode') UI.mode = v; if (a === 'diff') UI.diff = v; if (a === 'pick') { const i = UI.pick.indexOf(v); if (i >= 0) UI.pick.splice(i, 1); else if (UI.pick.length < 4) UI.pick.push(v); } if (a === 'start' && UI.pick.length) return start(); return render(); }
  if (UI.screen === 'end') { if (a === 'again') return start(); if (a === 'new') { UI.screen = 'intro'; return render(); } return; }
  if (a === 'point') E.setPoint(G, +v);
  else if (a === 'flip') { G.lastSit = null; E.flip(G); UI.sel = null; }
  else if (a === 'sit') E.resolveSit(G, +v);
  else if (a === 'rest') E.setRest(G, +v);
  else if (a === 'decoy') E.decoy(G);
  else if (a === 'roll') { E.rollAll(G); UI.sel = firstLive(); }
  else if (a === 'die') { const i = +v; if (G.dice[i] && !G.dice[i].used) UI.sel = UI.sel === i ? null : i; }
  else if (a === 'hit') { if (UI.sel !== null && E.assign(G, UI.sel, +v)) UI.sel = G.phase === 'combat' ? firstLive() : null; }
  else if (a === 'end') { if (E.endRound(G)) UI.sel = null; }
  else if (a === 'burn') { const i = +v, c = G.held[0][i]; if (c && ['hunt', 'patch', 'recon'].includes(c.type)) UI.aim = UI.aim && UI.aim.i === i ? null : { i, type: c.type }; else E.burn(G, 0, i); }
  else if (a === 'aim') { if (UI.aim) { E.burn(G, 0, UI.aim.i, UI.aim.type === 'recon' ? +v : +v); UI.aim = null; } }
  else if (a === 'take') { const [k, drop] = v.split(':'); E.takeLoot(G, 0, k === 'x' ? null : +k, drop === undefined ? undefined : +drop); }
  if (G.over) return finish();
  render();
}
function finish() {
  const low = Math.min(...G.hps), f = 1 - low / G.max; G.tier = !G.win ? 'Flatlined' : f <= .3 ? 'Wingman' : f <= .6 ? 'Solid Shift' : 'Close Call';
  const rank = { Wingman: 3, 'Solid Shift': 2, 'Close Call': 1 }[G.tier] || 0;
  const x = { team: (UI.team || 'Night shift').slice(0, 24), mode: UI.mode, diff: UI.mode === 'full' ? UI.diff : UI.mode === 'intro' ? 'First Shift' : 'Quick', players: G.team.length, tier: G.tier, hp: low, max: G.max, score: rank * 1000 + Math.round(low / G.max * 500) - G.stats.rounds, at: Date.now() };
  UI.savedAt = x.at; saveScore(x); UI.screen = 'end'; render(); const h = document.getElementById('end-h'); if (h) h.focus(); say(G.win ? 'Shift survived.' : 'Flatlined.');
}
app.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; act(b.dataset.a, b.dataset.v); });
app.addEventListener('input', e => { if (e.target.id === 'team') UI.team = e.target.value; });
function render() { const k = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null; app.innerHTML = UI.screen === 'intro' ? vIntro() : UI.screen === 'end' ? vEnd() : vGame(); if (k) { const el = app.querySelector(`[data-k="${k}"]`); if (el && !el.disabled) el.focus(); } }
function lb() { const rows = UI.board.filter(r => r.mode === UI.mode).slice(0, 10); if (!rows.length) return `<p class="hud" style="margin-top:8px">No shifts logged yet.</p>`; return `<div style="overflow-x:auto"><table class="lb"><thead><tr><th scope="col">#</th><th scope="col">Crew</th><th scope="col">Result</th><th scope="col" style="text-align:right">Lowest HP</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.at === UI.savedAt ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.team)}</td><td>${esc(r.tier)} · ${esc(r.players)}p${r.mode === 'full' ? ' · ' + esc(r.diff) : ''}</td><td class="n">${esc(r.hp)}/${esc(r.max)}</td></tr>`).join('')}</tbody></table></div>`; }
function vIntro() {
  const picks = D.classes.map(c => { const on = UI.pick.includes(c.id); return `<button type="button" data-a="pick" data-v="${c.id}" data-k="p${c.id}" aria-pressed="${on}" ${!on && UI.pick.length >= 4 ? 'disabled' : ''}><span class="art">${ART[c.id]}</span><span class="nm" style="font-size:20px">${esc(c.name)}</span><span style="font-size:15px;line-height:1.35">${esc(c.perk)}</span></button>`; }).join('');
  const modes = Object.entries(D.modes).map(([k, m]) => `<button type="button" data-a="mode" data-v="${k}" data-k="m${k}" aria-pressed="${UI.mode === k}"><b>${esc(m.label)}</b><br><span class="hud" style="color:inherit">${esc(m.minutes)} min · ${esc(m.sub)}</span></button>`).join('');
  const diffs = UI.mode === 'full' ? `<h2 class="hud c" style="margin-top:14px">Difficulty</h2><div class="seg" role="group" aria-label="Difficulty">${['Recruit', 'Analyst', 'Veteran'].map(k => `<button type="button" data-a="diff" data-v="${k}" data-k="d${k}" aria-pressed="${UI.diff === k}">${k}<br><span class="hud" style="color:inherit">${D.hp.full[nP()][k]} HP each</span></button>`).join('')}</div>` : '';
  return `<div class="wrap"><div class="hero-top"><div class="banner">${ART._boss.ai}</div><p class="hud c">An original game by Binary Defense</p><h1 class="logo" style="margin-top:12px">Detect the<br>Dwellers</h1>
    <p class="lede">One situation at a time. Pick who's on point, flip it, and deal with whatever's there. What you beat doesn't stay beaten. Keep everyone breathing to the end of the feed, then face the boss and everything that came back with it.</p></div>
    <div class="setup"><div class="panel c pad"><h2 class="hud c">One analyst per player · ${UI.pick.length} chosen</h2><p style="font-size:15px;margin-top:4px">Everyone rolls one d20 a round; whoever's on point rolls two. The crew shares one kit tray of four cards (five with the Soarcerer). Every kit card is an agent you can keep running, or burn once for a big one-shot effect.</p><div class="picks">${picks}</div>
      <div class="field"><label class="hud" for="team">Crew name</label><input id="team" maxlength="24" autocomplete="off" value="${esc(UI.team)}" placeholder="Night Shift Six"></div></div>
    <div class="panel pad"><h2 class="hud c">Mode</h2><div class="seg" role="group" aria-label="Mode">${modes}</div>${diffs}
      <p class="hud" style="margin-top:12px">${UI.pick.length ? `${UI.pick.length} player${UI.pick.length > 1 ? 's' : ''} · ${hpFor()} HP each · anyone at 0 and the shift is lost` : 'Pick an analyst for each player'}</p>
      <button class="btn p w" type="button" data-a="start" data-k="start" style="min-height:54px;font-size:16px;margin-top:14px" ${UI.pick.length ? '' : 'disabled'}>Jack in</button>
      <ol class="steps"><li><span class="n">01</span><span><b>Pick who's on point, then flip.</b> Some situations only hit whoever is on point.</span></li>
        <li><span class="n">02</span><span><b>Fight.</b> Everyone rolls a d20 at once. Assign each die to a mob it beats. 18–20 is a double (16–20 for the Engineer): two hits, and you block that round.</span></li>
        <li><span class="n">03</span><span><b>Take the hits.</b> Every mob still up hits everyone who didn't block, unless its ability says otherwise. One analyst a round can go off-shift: no roll, no damage, +1 HP.</span></li>
        <li><span class="n">04</span><span><b>Loot and persistence.</b> Win a fight, draw a kit card. Beaten mobs always go back to the persistence row. Every flip rolls the row too: anything that matches hits everyone on the way in and joins the fight, needing just one hit.</span></li></ol>
      <h2 class="hud c" style="margin-top:20px">Leaderboard · ${esc(D.modes[UI.mode].label)}</h2>${lb()}</div></div></div>`;
}
function mobHTML(m) {
  const key = 'm' + m.uid + '.' + m.back, fresh = UI.seen.has(key) ? '' : 'fresh'; UI.seen.add(key);
  const art = m.kind === 'boss' ? ART._boss[m.id] : ART[m.id];
  const pips = Array.from({ length: m.hits }, (_, i) => `<i class="${i < m.left ? '' : 'gone'}"></i>`).join('');
  const d = UI.sel !== null ? G.dice[UI.sel] : null;
  const btn = d && E.beats(G, d, m) ? `<button class="btn s p w" type="button" data-a="hit" data-v="${m.uid}" data-k="h${m.uid}">Hit it · ${d.dbl || d.r >= 18 ? `${d.r}: double, two hits` : `${E.total(G, d, m)} vs ${m.def}`}</button>` : '';
  const rng = m.ability === 'wide' ? D.persist.routine[1] + 4 : D.persist[m.routine ? 'routine' : 'novel'][1];
  const per = m.kind === 'boss' ? '' : `<span class="tag">${m.back ? `Came back ×${m.back} · ` : ''}${m.routine ? 'Routine · ' : ''}Back on 1–${rng}</span>`;
  return `<div class="panel mob ${m.kind === 'boss' ? 'boss' : ''} ${fresh}"><span class="art">${art}</span><div class="bd"><div class="row" style="justify-content:space-between"><span class="hud ${m.kind === 'boss' ? 'f' : ''}">${m.kind === 'boss' ? 'Boss · ' : ''}${esc(m.domain)}${m.scouted && E.active(G, 'recon').length ? ' · scouted +5' : ''}</span>${per}</div>
    <div class="nm">${esc(m.name)}</div><div class="stat"><div class="def"><span class="hud">Defense</span><b>${m.def}</b></div><div><span class="hud">Hits</span><b>${m.left}/${m.hits}</b></div><div><span class="hud">Damage</span><b>${E.dmgOf(G, m)}</b></div></div><div class="pips">${pips}</div>
    <div class="ability">${m.kw && D.keywords[m.kw] ? `<svg class="kwi" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${D.keywords[m.kw].icon}</svg>` : ''}<b>${esc(m.abilityName)}.</b> ${esc(m.abilityText)}</div>${m.flavor ? `<p class="fl">${esc(m.flavor)}</p>` : ''}${btn}</div></div>`;
}
function canBurn(c) { const f = G.phase === 'combat', r = f && G.rolled;
  return { triage: r, hunt: f && G.play.some(m => m.kind !== 'boss' && m.left <= 2), contain: f, enrich: r, patch: G.row.length > 0, recover: G.hps.some(h => h < G.max), decoy: r, recon: G.deck.length >= 2 }[c.type] && !G.over; }
function aimTargets() { if (!UI.aim) return ''; const t = UI.aim.type;
  const opts = t === 'hunt' ? G.play.filter(m => m.kind !== 'boss' && m.left <= 2).map(m => [m.uid, `Finish ${m.name}`]) : t === 'patch' ? G.row.map(m => [m.uid, `Patch out ${m.name}`]) : G.deck.slice(-3).map((c, i) => [i, `Bury ${c.name}`]).reverse();
  return `<div class="row" style="margin-top:6px">${opts.map(([v, l]) => `<button class="btn s cy" type="button" data-a="aim" data-v="${v}" data-k="aim${v}">${esc(l)}</button>`).join('')}</div>`; }
function kitTray() { const cap = E.slots(G, 0);
  const cards = G.held[0].map((c, i) => `<div class="kitc"><b style="color:var(--cy)">${esc(c.name)}</b><span style="font-size:14px;line-height:1.3"><span class="hud c">Agent</span> ${esc(c.text)}</span><span style="font-size:14px;line-height:1.3"><span class="hud f">Burn</span> ${esc(c.burn)}</span><button class="btn s" type="button" data-a="burn" data-v="${i}" data-k="b${i}" ${canBurn(c) ? '' : 'disabled'}>${UI.aim && UI.aim.i === i ? 'Cancel' : 'Burn it'}</button>${UI.aim && UI.aim.i === i ? aimTargets() : ''}</div>`).join('');
  return `<section class="sec"><h3>Crew kit · ${G.held[0].length}/${cap}</h3>${cards || '<span class="hud" style="color:var(--mut)">No kit yet. Win a fight to draw one.</span>'}${aiOnUI() ? '<p class="hud f">The Rogue AI has shut your agents down. You can still burn them.</p>' : ''}</section>`; }
function aiOnUI() { return G.play.some(m => m.ability === 'takeover'); }
function persistBanner() { const p = G.persist; if (!p || !p.pre) return ''; return `<div class="panel prompt" role="status"><div class="row" style="gap:14px"><div class="d20 ${p.back.length ? '' : 'cy'}">${p.r}</div><div><span class="hud ${p.back.length ? 'f' : 'c'}">Persist roll with the flip</span><div style="font-size:18px;margin-top:4px">${p.back.length ? `${esc(p.back.join(', '))} came back and hit everyone on the way in. ${p.back.length > 1 ? 'Each needs' : 'It needs'} just one hit.` : 'Nothing in the row matched. Quiet.'}</div></div></div></div>`; }
function roundReport() { const L = G.lastRound; if (!L) return ''; if (L.ended) return `<div class="panel prompt" role="status"><div><span class="hud c">Fight over</span><div style="font-size:17px;margin-top:4px">The last mob went down before it could hit back.</div></div></div>`;
  const parts = G.team.map((w, k) => k === L.rest ? `${esc(nm(k))}: off-shift, no damage` : L.blocks[k] && !L.inc[k] ? `${esc(nm(k))}: blocked` : L.decoy && k === G.point && !L.inc[k] ? `${esc(nm(k))}: decoyed` : L.inc[k] ? `${esc(nm(k))} −${L.inc[k]}` : `${esc(nm(k))}: not targeted`);
  return `<div class="panel prompt" role="status"><div><span class="hud f">Round ${L.round} damage</span><div style="font-size:17px;margin-top:4px">${parts.join(' · ')}${L.contain ? ' · Containment took 1 off the biggest hitter' : ''}</div></div></div>`; }
function introTip() { if (G.mode !== 'intro' || !D.intro || G.over) return ''; const T = D.intro.tips;
  const t = G.phase === 'loot' ? T.loot : G.bossIn ? T.boss : G.phase === 'point' ? (G.sit === 0 ? 'Pick who is on point, then flip. Every flip also rolls for the persistence row once something is in it.' : null) : T[String(G.sit)];
  return t ? `<div class="panel prompt tip" role="note"><div><span class="hud c">First Shift tip</span><div style="font-size:17px;margin-top:4px">${esc(t)}</div></div></div>` : ''; }
function vGame() {
  const inc = G.phase === 'combat' ? E.incoming(G) : null;
  let main = ''; main += introTip();
  if (G.lastSit && G.phase !== 'combat') { const r = G.lastSit; main += `<div class="panel prompt" role="status"><div><span class="hud c">${esc(r.name)}</span><div style="font-size:18px;margin-top:4px">${r.choice ? `You chose: ${esc(r.choice)}.` : r.rolls.length ? r.rolls.map(x => `${esc(nm(x.k))} rolled ${x.t}: ${x.ok ? 'pass' : 'fail'}`).join(' · ') : 'Resolved.'}</div></div></div>`; }
  if ((G.phase === 'point' || G.phase === 'loot') && G.lastRound) main += roundReport();
  if (G.phase === 'point') {
    main += `<div class="panel pad"><span class="hud c">${G.deck.length ? `Next: situation ${G.sit + 1} of ${G.total}` : 'The feed is empty'}</span><div class="nm" style="font-size:24px;margin-top:6px">${G.deck.length ? 'Who is on point?' : `The boss is waiting${G.row.length ? `, and it will roll for the ${G.row.length} in the row` : ''}`}</div>
      ${E.peek(G) ? `<p class="hud c" style="margin-top:6px">Recon: next up is ${esc(E.peek(G).name)}${E.peek(G).kind === 'mob' ? ' (a mob: +5 for the whole fight)' : ''}</p>` : ''}<div class="row" style="margin-top:10px">${G.team.map((w, k) => `<button class="btn ${G.point === k ? 'cy' : ''}" type="button" data-a="point" data-v="${k}" data-k="pt${k}" aria-pressed="${G.point === k}">${esc(nm(k))} · ${G.hps[k]} HP</button>`).join('')}</div>
      <button class="btn p" type="button" data-a="flip" data-k="flip" style="min-height:54px;font-size:16px;margin-top:12px">${G.deck.length ? (G.row.length ? `Flip it and roll for the row · ${esc(nm(G.point))} on point` : `Flip it · ${esc(nm(G.point))} on point`) : 'Face the boss'}</button></div>`;
  } else if (G.phase === 'sit') {
    const c = G.cur; main += persistBanner(); if (G.pendingBack.length) main += `<p class="hud f" style="margin-bottom:8px">After this: fight ${esc(G.pendingBack.map(x => x.name).join(', '))}, back from the row.</p>`; const btns = c.type === 'choice' ? c.opts.map((o, i) => `<button class="btn ${i ? '' : 'p'}" type="button" data-a="sit" data-v="${i}" data-k="s${i}">${esc(o.label)}</button>`).join('') : `<button class="btn p" type="button" data-a="sit" data-v="0" data-k="s0">${c.type === 'challenge' ? (c.who === 'each' ? 'Everyone rolls' : `${esc(nm(G.point))} rolls`) : 'Resolve it'}</button>`;
    main += `<div class="panel sitcard"><span class="art">${c.type === 'challenge' ? ART.fp : ART.event}</span><div class="bd"><span class="hud c">Situation ${G.sit} · ${esc(nm(G.point))} on point</span><div class="nm" style="font-size:26px">${esc(c.name)}</div><p class="fl">${esc(c.text)}</p><p style="font-size:17px"><b>${esc(c.rule)}</b></p><div class="row">${btns}</div></div></div>`;
  } else if (G.phase === 'loot') {
    const c = G.loot[0];
    const room = G.held[0].length < E.slots(G, 0);
    const opts = room ? `<button class="btn p" type="button" data-a="take" data-v="0" data-k="t0">Add to the crew kit</button>` : G.held[0].map((h, i) => `<button class="btn s" type="button" data-a="take" data-v="0:${i}" data-k="t0${i}">Swap out ${esc(h.name)}</button>`).join('');
    main += `<div class="panel sitcard c"><span class="art">${c.kind === 'agent' ? ART[AART[c.type]] : ART.event}</span><div class="bd"><span class="hud c">Kit drop${G.loot.length > 1 ? ` · ${G.loot.length} cards` : ''}</span><div class="nm" style="font-size:26px">${esc(c.name)}</div><p style="font-size:17px"><span class="hud c">Agent</span> ${esc(c.text)}</p><p style="font-size:17px"><span class="hud f">Burn</span> ${esc(c.burn)}</p><p class="hud" style="margin-bottom:8px">${esc(nm(G.point))} is on point and takes the draw for the crew.</p><div class="row">${opts}<button class="btn" type="button" data-a="take" data-v="x" data-k="tx">Leave it</button></div></div></div>`;
  } else if (G.phase === 'combat') {
    if (!G.rolled && G.round === 1) main += persistBanner(); if (!G.rolled && G.round > 1) main += roundReport();
    main += `<div class="sec"><h3>${G.bossIn ? 'Boss fight' : `Situation ${G.sit}`} · round ${G.round} · ${esc(nm(G.point))} on point</h3><div class="inplay">${G.play.map(mobHTML).join('')}</div></div>`;
  }
  const plog = G.plog.slice(-6).reverse().map(x => `<p><span class="hud">${x.sit === 'Boss' ? 'Boss' : 'S' + x.sit}${x.why ? ' · ' + x.why : ''}</span> rolled <b>${x.r}</b> → ${x.back.length ? esc(x.back.join(', ')) + ' came back' : 'quiet'}</p>`).join('');
  const row = `<div class="sec" style="margin-top:14px"><h3>Persistence row · ${G.row.length} · back on 1–${D.persist.routine[1]}</h3>${plog ? `<div class="log" style="max-height:140px;margin-bottom:8px">${plog}</div>` : '<p class="hud" style="color:var(--mut)">No persist rolls yet. The row rolls with every flip once something is in it.</p>'}${G.row.length ? `<div class="prow">${G.row.map(m => `<div class="chip"><b>${esc(m.name)}</b><span class="hud">${esc(m.domain)} · back on ${m.persist[0]}–${m.persist[1]}</span></div>`).join('')}</div>` : '<div class="dash">Empty, for now.</div>'}</div>`;
  let tray = '';
  if (G.phase === 'combat') {
    if (!G.rolled) tray = `<div class="panel tray"><span class="hud c">Round ${G.round}</span>${G.team.length > 1 ? `<div class="row">${G.team.map((w, k) => `<button class="btn s ${G.rest === k ? 'cy' : ''}" type="button" data-a="rest" data-v="${k}" data-k="r${k}" aria-pressed="${G.rest === k}">${G.rest === k ? `${esc(nm(k))} is off-shift` : `${esc(nm(k))} off-shift`}</button>`).join('')}</div><p class="hud" style="color:var(--mut)">Off-shift: skip your roll and your agents, take no damage, +1 HP. One per round.</p>` : ''}
      <button class="btn p w" type="button" data-a="roll" data-k="roll" style="min-height:54px;font-size:16px">Roll everything</button></div>`;
    else {
      const groups = G.team.map((w, k) => { const idx = G.dice.map((d, i) => [d, i]).filter(([d]) => d.k === k); if (k === G.rest) return `<div><span class="hud c">${esc(nm(k))} · off-shift</span></div>`; return `<div><span class="hud">${esc(nm(k))}${G.blocks[k] ? ' · <span class="badge">blocking</span>' : ''}</span><div class="dice" style="margin-top:4px">${idx.map(([d, i]) => `<button type="button" class="die ${d.kind === 'agent' ? 'ag' : ''} ${d.used ? 'used' : ''} ${!d.used && !canHit(i) ? 'dead' : ''}" data-a="die" data-v="${i}" data-k="die${i}" aria-pressed="${UI.sel === i}" ${d.used ? 'disabled' : ''}><b>${d.r}</b><span>${d.kind === 'agent' ? TNAME[d.card.type] + ' agent' : d.dbl || d.r >= 18 ? 'double' : d.used ? 'used' : canHit(i) ? 'ready' : 'no target'}</span></button>`).join('')}</div></div>`; }).join('');
      tray = `<div class="panel tray"><span class="hud c">Round ${G.round} · the dice</span>${groups}<p class="hud" style="color:var(--mut)">Incoming: ${G.team.map((w, k) => `${esc(nm(k))} −${inc[k]}`).join(' · ')}</p>${!G.decoyUsed && E.active(G, 'decoy').length ? `<button class="btn s cy" type="button" data-a="decoy" data-k="dcy">Decoy: ${esc(nm(G.point))} takes no damage this round</button>` : G.decoyRound ? `<span class="badge">Decoy active: ${esc(nm(G.point))} protected</span>` : ''}<button class="btn p" type="button" data-a="end" data-k="end" style="min-height:50px">End round · take the hits</button></div>`;
    }
  }
  const crew = G.team.map((w, k) => { const c = E.cls(w); return `<div class="pc" style="cursor:default"><span class="art">${ART[w]}</span><span class="bd"><span class="nm">${esc(c.name)}${G.point === k ? ' <span class="badge f">on point</span>' : ''}</span><span style="font-size:14px">${esc(c.perk)}</span><span class="hud">HP ${G.hps[k]}/${G.max}</span><span class="hpbar">${Array.from({ length: G.max }, (_, i) => `<i class="${i < G.hps[k] ? '' : 'gone'}" style="width:4px;height:9px"></i>`).join('')}</span></span></div>`; }).join('');
  const logs = G.log.slice(-12).reverse().map(l => `<p><span class="hud">S${l.r}</span> ${esc(l.t)}</p>`).join('');
  return `<div class="wrap"><header class="top"><div><span class="hud c">${G.bossIn ? 'Boss fight' : `Situation ${G.sit} of ${G.total}`} · kit deck ${G.kit.length}</span><div class="mini" style="margin-top:6px">Detect the Dwellers</div></div>
    <div><span class="hud">${G.team.map((w, k) => `${esc(nm(k))} <b style="color:var(--fl)">${G.hps[k]}</b>`).join(' · ')} / ${G.max} HP</span></div><div class="hud c" style="text-align:right">${esc(UI.team || 'Night shift')}</div></header>
    <div class="board"><main>${main}${row}</main><aside class="side">${tray ? `<section class="sec">${tray}</section>` : ''}${kitTray()}<section class="sec"><h3>Your crew</h3>${crew}</section><section class="sec"><h3>Event log</h3><div class="log">${logs}</div></section></aside></div></div>`;
}
function vEnd() {
  const line = { Wingman: 'Your agents carried the routine. Your crew carried the boss. That is the job.', 'Solid Shift': 'You held the line, and everybody walked out.', 'Close Call': 'Everybody made it, barely.', Flatlined: `The ${G.dropped != null ? nm(G.dropped) : 'crew'} went down, and the shift went with them. Who's working your queue at 2 AM?` }[G.tier];
  return `<div class="wrap"><div class="end"><div><p class="hud c">${G.win ? 'Shift survived' : 'Shift lost'} · ${esc(D.modes[UI.mode].label)}${UI.mode === 'full' ? ' · ' + esc(UI.diff) : ''} · ${G.team.length}p</p><h1 class="logo" id="end-h" tabindex="-1" style="font-size:clamp(46px,8vw,96px);margin-top:10px">${esc(G.tier)}</h1>
    <p style="font-size:20px;line-height:1.45;margin-top:18px;max-width:46ch">Your agents landed <b style="color:var(--cy)">${G.stats.agentHits}</b> hits. Your crew landed <b style="color:var(--fl)">${G.stats.crewHits}</b>${G.win ? ` and took down ${esc(G.boss.name)}` : ''}. Mobs came back ${G.stats.back} time${G.stats.back === 1 ? '' : 's'}.</p>
    <div class="stats"><div><b>${G.sit}</b><span class="hud">Situations</span></div><div><b>${G.stats.blocks}</b><span class="hud">Blocks</span></div><div><b>${Math.min(...G.hps)}</b><span class="hud">Lowest HP</span></div></div>
    <p style="font-size:19px;line-height:1.45;margin-top:20px;max-width:44ch">${esc(line)}</p>
    <div class="row" style="margin-top:22px"><button class="btn p" type="button" data-a="again" data-k="again" style="min-height:50px;min-width:170px">Run it back</button><button class="btn" type="button" data-a="new" data-k="new" style="min-height:50px">New crew</button></div></div>
    <div class="panel pad"><h2 class="hud c">Leaderboard</h2>${lb()}</div></div></div>`;
}
render();
