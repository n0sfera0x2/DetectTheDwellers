// Chapter dice web prototype: the page script. Renders the engine state (CDEngine) with the shared paper card
// markup (CDCards) and adds live state around the cards: the threat dice set under each card (taken ones turned
// aside), slot highlights for the selected die, and stamps. Nothing is drawn on a card face.
// Throwaway prototype code, inlined into web/index.html by web/build.js.
(function () {
  const E = window.CDEngine, A = window.CDCards, D = window.CD_DATA;
  const app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const qs = new URLSearchParams(location.search || '');
  const UI = { G: null, sel: null, more: null, drawer: null, cards: false, start: 0, end: 0, msg: '', err: false, copied: null, seenRow: 0, seenMobs: new Set(),
    setup: { n: 2, team: ['HUN', 'RES', 'ENG', 'SOA'] }, seed: qs.has('seed') ? +qs.get('seed') : (Date.now() % 1e9) };
  const nm = id => A.cls(id).name;
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const mmss = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const dataMob = id => D.mobs.find(m => m.id === id);
  const cardFor = m => m.boss ? A.bossCard(A.boss()) : A.mobCard(dataMob(m.id));
  const cardKey = m => m.boss ? 'boss' : 'mob:' + m.id;

  // ---- Actions ------------------------------------------------------------------------------------------------
  function act(fn, okMsg) {
    try { fn(); UI.msg = okMsg || ''; UI.err = false; }
    catch (e) { if (!e.rule) throw e; UI.msg = e.message; UI.err = true; }
    const G = UI.G;
    if (G && G.over && !UI.end) UI.end = Date.now();
    render();
  }
  function startGame() {
    const team = UI.setup.team.slice(0, UI.setup.n);
    UI.G = E.newGame({ team, seed: UI.seed }); UI.start = Date.now(); UI.end = 0; UI.sel = null; UI.more = null; UI.msg = ''; UI.copied = null; UI.seenRow = 0; UI.seenMobs = new Set();
    render(); focusKey('flip');
  }
  // After a die is used, select the next unused die that can still do something.
  function nextDie() {
    const G = UI.G; if (!G || G.phase !== 'assign') { UI.sel = null; return; }
    const ok = d => { const t = E.targets(G, d.i); return !d.used && (t.hits.length || t.guard); };
    const after = G.dice.filter(d => d.i > (UI.sel == null ? -1 : UI.sel)).find(ok) || G.dice.find(ok);
    UI.sel = after ? after.i : null;
  }
  function doAssign(di, uid, p, q) { UI.more = null; act(() => E.assign(UI.G, di, uid, p, q)); if (!UI.err) { nextDie(); render(); } }
  function doGuard() { UI.more = null; const i = UI.sel; act(() => E.guard(UI.G, i)); if (!UI.err) { nextDie(); render(); } }
  // Tap a threat die under a card. With a double waiting for its "one more", this is that pick. Otherwise a double's
  // first match waits for the second pick (or "Just that one"); any other die takes the slot straight away.
  function tapSlot(uid, p) {
    const G = UI.G, m = G.play.find(x => x.uid === uid); if (!m || G.phase !== 'assign') return;
    if (UI.more) {
      if (UI.more.uid === uid && p === UI.more.p) { UI.more = null; UI.msg = ''; return render(); }
      if (UI.more.uid !== uid) { UI.msg = 'A double’s one more must come from the same mob.'; UI.err = true; return render(); }
      return doAssign(UI.more.di, uid, UI.more.p, p);
    }
    if (UI.sel == null) { UI.msg = 'Pick a die first (tap it, or press 1–9).'; UI.err = true; return render(); }
    const t = E.targets(G, UI.sel), ok = t.hits.some(h => h.uid === uid && h.p === p);
    if (!ok) return doAssign(UI.sel, uid, p); // the engine says why not
    if (G.dice[UI.sel].dbl && E.moreSlots(m, p).length) { UI.more = { di: UI.sel, uid, p }; UI.msg = ''; UI.err = false; return render(); }
    doAssign(UI.sel, uid, p);
  }

  // ---- Copy result -----------------------------------------------------------------------------------------------
  function resultLine() {
    const G = UI.G, burns = Object.entries(G.stats.burns).map(([t, n]) => `${t} ${n}`).join(', ');
    return ['Detect the Dwellers · chapter dice prototype', `${G.team.map(nm).join(' + ')} (${G.n}p)`, `${G.max} HP`,
      `${G.win ? 'Win' : 'Loss'}${G.win ? '' : ` in fight ${G.fight}${G.bossOut ? ' (boss)' : ''}`}`, mmss((UI.end || Date.now()) - UI.start),
      `${pl(G.stats.rounds, 'round')}, ${pl(G.stats.back, 'comeback')}, ${pl(G.stats.guards, 'guard')}`, `lowest HP ${Math.min(...G.hp)}/${G.max}`,
      `burns: ${burns || 'none'}`, `seed ${UI.seed}`].join(' | ');
  }
  function copyResult() {
    const t = resultLine(), done = ok => { UI.copied = ok ? 'ok' : t; render(); };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand && document.execCommand('copy'); ta.remove(); done(!!ok); } catch (e) { done(false); } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => done(true), fallback); else fallback(); } catch (e) { fallback(); }
  }

  // ---- Views --------------------------------------------------------------------------------------------------------
  function vSetup() {
    const S = UI.setup;
    return `<main class="t-setup">
      <h1>Chapter dice</h1>
      <p class="lede">Detect the Dwellers with standard d6s instead of d20 sums. Each mob card prints the dice to set under it. Roll, and a die takes out one under a mob showing <b>exactly</b> its number. Your doubles take their match and one more, or guard. Same cards as the paper prototype.</p>
      <p class="t-note"><b>Tuned for 2 players.</b> Everyone starts at ${E.HP} HP. Crews of 3–4 add each card’s + die once per player past 2; solo plays the 2-player dice.</p>
      <div class="t-field"><p class="t-h">Players</p><div class="t-seg" role="group" aria-label="Players">${[1, 2, 3, 4].map(n => `<button class="t-btn" data-a="count" data-n="${n}" data-k="count${n}" aria-pressed="${S.n === n}">${n}${n === 2 ? ' · tuned' : ''}</button>`).join('')}</div></div>
      <div class="t-field"><p class="t-h">Analysts</p>${S.team.slice(0, S.n).map((id, k) => `<div class="t-seat" role="group" aria-label="Player ${k + 1}"><span class="who">Player ${k + 1}</span>${A.ANALYST_IDS.map(c => `<button class="t-btn sm" data-a="pick" data-seat="${k}" data-id="${c}" data-k="pick${k}${c}" aria-pressed="${id === c}">${nm(c)}</button>`).join('')}</div>`).join('')}</div>
      <div class="t-acts"><button class="t-btn pri" data-a="start" data-k="start">Start the shift</button><button class="t-lnk" data-a="cards" data-k="cards">See all 21 cards</button></div>
      <div class="t-picks">${S.team.slice(0, S.n).map(id => `<div class="t-cslot" data-card="analyst:${id}">${A.analystCard(id)}</div>`).join('')}</div>
    </main>`;
  }
  function vTop() {
    const G = UI.G;
    const where = G.phase === 'flip' || G.phase === 'loot' ? (G.feed.length ? `Next: flip ${G.fight + 1}` : 'Next: the boss') : `Fight <b class="num">${G.fight}</b> · round <b class="num">${G.round || 1}</b>`;
    return `<header class="t-top"><div class="t-brand">Detect the Dwellers<small>Chapter dice · web prototype</small></div>
      <div class="t-meta">${where} · feed <b class="num">${G.feed.length}</b>${G.bossOut ? '' : ' + boss'}</div>
      <nav class="t-nav"><button class="t-lnk" data-a="cards" data-k="cards" aria-pressed="${UI.cards}">Cards</button><button class="t-lnk" data-a="log" data-k="log" aria-pressed="${UI.drawer === 'log'}">Log</button><button class="t-lnk" data-a="quit" data-k="quit">New</button></nav></header>`;
  }
  function vCrew() {
    const G = UI.G, fighting = G.phase === 'assign' || G.phase === 'roll', inc = fighting ? E.incoming(G) : null;
    return `<section class="t-crew" aria-label="Crew">${G.team.map((id, k) => {
      const hp = G.hp[k], pct = hp / G.max * 100, n = inc ? inc.total[k] : 0, after = Math.max(0, hp - n);
      const st = [k === G.point ? '<span class="pt">On point</span>' : ''];
      if (inc) { if (G.blocks[k]) st.push('<span class="bl">Blocking</span>'); st.push(n ? `<span class="in">−${n} incoming${n >= hp ? ' · lethal' : ''}</span>` : '<span class="ok">nothing incoming</span>'); }
      return `<div class="t-who${k === G.point ? ' pt' : ''}" data-who="${k}"><span class="n">${nm(id)}</span><span class="hp num"><b>${hp}</b>/${G.max}</span>
        <span class="bar" aria-hidden="true"><i class="${pct <= 35 ? 'lo' : ''}" style="transform:scaleX(${pct / 100})"></i>${n ? `<s style="transform:translateX(${after / G.max * 100}%) scaleX(${(hp - after) / G.max})"></s>` : ''}</span>
        <span class="st">${st.join('')}</span></div>`;
    }).join('')}</section>`;
  }
  // The amber pair: the two row dice, their sum, and each row mob's number against it.
  const amber = n => `<span class="t-amb">${A.pip(n, 34)}</span>`;
  function vRowRoll() {
    const G = UI.G, r = G.lastRow;
    if (!r || r.fight !== G.fight) return `<div class="t-rowroll quiet"><div class="t-pair" aria-hidden="true"><span class="t-amb blank"></span><span class="t-amb blank"></span></div><p><small>Persistence row · 2 amber dice</small>${G.row.length ? `No row roll yet this fight. ${pl(G.row.length, 'mob')} on the row.` : 'The row is empty: nothing to roll.'}</p></div>`;
    const isNew = r.seq > UI.seenRow; UI.seenRow = r.seq;
    return `<div class="t-rowroll${isNew ? ' new' : ''}" role="status" data-roll="${r.roll}"><div class="t-pair" aria-hidden="true">${r.pair.map(amber).join('')}<b class="num">=${r.roll}</b></div><p><small>Row roll · ${esc(r.why)}</small>
      Rolled <b class="num">${r.pair[0]} + ${r.pair[1]} = ${r.roll}</b>: ${r.back.length ? esc(r.back.join(', ')) + (r.back.length > 1 ? ' come back.' : ' comes back.') : 'nothing comes back.'}
      ${r.strikes.length ? `<span class="hit">${r.strikes.map(s => `${esc(s.name)} hits everyone for ${s.dmg}`).join('; ')}.</span>` : ''}</p></div>`;
  }
  // The threat dice set under a card: one per slot, taken ones turned aside. Live state only, never on the card.
  function vThreat(m) {
    const G = UI.G, t = UI.sel != null && G.phase === 'assign' && !UI.more ? E.targets(G, UI.sel) : null;
    const mine = t ? t.hits.filter(h => h.uid === m.uid) : [], more = UI.more && UI.more.uid === m.uid ? E.moreSlots(m, UI.more.p) : null;
    return `<div class="t-threat${m.slots.length > 6 ? ' big' : ''}" role="group" aria-label="Dice under ${esc(m.name)}">${m.slots.map((v, p) => {
      const off = m.off[p], h = mine.find(x => x.p === p), pend = UI.more && UI.more.uid === m.uid && UI.more.p === p, mo = more && more.includes(p);
      const c = ['t-td', off ? 'off' : '', h ? (h.near ? 'tgt near' : 'tgt') : '', pend ? 'pend' : '', mo ? 'tgt more' : '', p >= m.printed ? 'xtra' : '', (t || more) && !off && !h && !mo && !pend ? 'dim' : ''].filter(Boolean).join(' ');
      const label = `${v}${p >= m.printed ? ' (extra die for this crew)' : ''}${off ? ', taken' : h ? (h.near ? ', one off: your perk matches it' : ', matches') : mo ? ', take as one more' : ''}`;
      return `<button class="${c}" data-a="slot" data-u="${m.uid}" data-p="${p}" data-k="slot${m.uid}-${p}" aria-label="${esc(label)}" ${off ? 'disabled' : ''}>${A.pip(v, 30)}</button>`;
    }).join('')}</div>`;
  }
  function vMob(m) {
    const G = UI.G, down = !E.left(m);
    const dmg = E.dmgOf(G, m), inc = (G.phase === 'assign' || G.phase === 'roll') ? E.incoming(G).by.find(x => x.uid === m.uid) : null;
    const isNew = !UI.seenMobs.has(m.uid + ':' + m.back); UI.seenMobs.add(m.uid + ':' + m.back);
    const lines = [];
    if (down) lines.push('<span>Beaten. Leaves at the end of the round.</span>');
    else {
      lines.push(`<span>${E.left(m)} of ${m.hits} dice left · hits for <b>${dmg}</b>${dmg !== m.dmg ? ` <span class="hot">(${dmg > m.dmg ? '+' : ''}${dmg - m.dmg})</span>` : ''}</span>`);
      if (inc) lines.push(inc.to.length ? `<span class="hot">At round end: ${inc.dmg} to ${inc.to.map(k => nm(G.team[k])).join(', ')}</span>` : '<span>At round end: blocked</span>');
    }
    if (G.n >= 3) lines.push(`<span>${G.n} players: + die set ${G.n - 2}× (marked +)</span>`);
    return `<div class="t-slot${down ? ' down' : ''}${isNew ? ' enter' : ''}" data-card="${cardKey(m)}" data-uid="${m.uid}">${cardFor(m)}
      ${m.back ? '<span class="t-stamp">Came back</span>' : ''}${down ? '<span class="t-stamp beat">Beaten</span>' : ''}
      ${vThreat(m)}<div class="t-under">${lines.join('')}</div></div>`;
  }
  function vTable() {
    const G = UI.G;
    let body;
    if (G.play.length) body = `<div class="t-mobs${G.play.length > 1 ? ' many' : ''}">${G.play.map(vMob).join('')}</div>`;
    else if (G.phase === 'flip') body = `<p class="t-empty">${G.fight ? 'Fight won. ' : ''}${G.feed.length ? `${pl(G.feed.length, 'mob')} left in the feed, then the boss.` : 'The feed is empty. The boss is next.'}</p>`;
    else body = '';
    return `<section class="t-table" aria-label="The fight">${vRowRoll()}${body}</section>`;
  }
  function vSide() {
    const G = UI.G, r = G.lastRow;
    // Each row mob's number against the 2d6 sums 2–12: lit cells bring it back; the last roll is marked.
    const rowHtml = G.row.length ? `<div class="t-rowlist">${G.row.map(m => `<div class="t-rowmob"><span>${esc(m.name)}</span><span class="r num">2–${m.top}</span>
      <span class="t-track" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i class="${i + 2 <= m.top ? 'on' : ''}${r && r.fight === G.fight && r.roll === i + 2 ? ' roll' : ''}">${i + 2}</i>`).join('')}</span></div>`).join('')}</div>`
      : '<p class="t-empty">Empty. Beaten mobs land here and come back on the 2 amber dice.</p>';
    const loot = G.phase === 'loot', drawn = new Set(G.drawn.map(c => c.uid));
    const kit = G.tray.length ? `<div class="t-kit">${G.tray.map(c => `<div class="t-kslot${loot && drawn.has(c.uid) ? ' drawn' : ''}" data-card="agent:${c.t}" data-kuid="${c.uid}">${A.agentCard(c.t)}
      <div class="row"><span class="run">${loot ? (drawn.has(c.uid) ? 'New' : '') : 'Running'}</span>${loot ? `<button class="t-btn sm warn" data-a="discard" data-u="${c.uid}" data-k="disc${c.uid}">Discard</button>` : `<button class="t-btn sm" data-a="burn" data-u="${c.uid}" data-k="burn${c.uid}" ${E.canBurn(G, c.t) ? '' : 'disabled'} aria-label="Burn the ${E.KIT_NAME[c.t]}">Burn</button>`}</div></div>`).join('')}</div>`
      : '<p class="t-empty">No agents. Win a fight to draw more.</p>';
    return `<aside class="t-side">
      <div class="t-panel"><p class="t-h"><span>Persistence row</span><span>${G.gone.length ? `${G.gone.length} gone for good` : ''}</span></p>${rowHtml}</div>
      <div class="t-panel"><p class="t-h"><span>Kit tray</span><span class="num">${G.tray.length}/${G.cap} · deck ${G.kit.length}</span></p>${kit}</div>
      <div class="t-panel"><p class="t-h"><span>Crew</span><span>${nm(G.team[G.point])} on point</span></p><div class="t-crewcards">${G.team.map((id, k) => `<div class="t-cslot${k === G.point ? ' pt' : ''}" data-card="analyst:${id}">${A.analystCard(id)}${k === G.point ? '<div class="lbl">On point</div>' : ''}</div>`).join('')}
        <div class="t-cslot" data-card="legend">${A.legend}</div></div></div>
    </aside>`;
  }
  function dieHtml(d) {
    const G = UI.G, owner = d.src === 'agent' ? 'Agent' : d.src === 'crew' ? 'Crew' : G.team[d.k] + (d.src === 'burn' ? '+' : '');
    const usedTo = d.used === 'guard' ? 'Guard' : d.used ? (G.play.find(m => m.uid === d.used.uid) || { name: '?' }).name : '';
    const label = `${E.faceText(d)}, ${E.dieOwner(G, d)}${d.used ? ', used: ' + usedTo : ''}${d.turned ? ', turned by Enrichment' : ''}`;
    return `<button class="t-die${d.src === 'agent' || d.src === 'crew' ? ' agent' : ''}${d.dbl ? ' dbl' : ''}${UI.sel === d.i ? ' sel' : ''}${d.used ? ' used' : ''}${UI.fresh ? ' rolled' : ''}" data-a="die" data-i="${d.i}" data-k="die${d.i}" aria-pressed="${UI.sel === d.i}" aria-label="Die ${d.i + 1}: ${esc(label)}" title="${esc(label)}" style="animation-delay:${d.i * 40}ms">
      <span class="f">${A.pip(d.n, 36)}</span><span class="o">${owner}${d.dbl ? ' · <b>double</b>' : ''}</span>${d.used === 'guard' ? '<span class="badge g">Guard</span>' : d.used ? '<span class="badge g">✓</span>' : d.turned ? '<span class="badge w">EN</span>' : ''}</button>`;
  }
  function vDock() {
    const G = UI.G; let hint = '', ctl = '';
    if (G.phase === 'flip') {
      hint = `<b>Pick who’s on point</b>, then ${G.feed.length ? 'flip the next mob' : 'bring on the boss'}. On point rolls twice${G.n === 1 ? '' : ' and takes Targeted hits'}.`;
      ctl = `<div class="t-acts"><div class="t-pts" role="group" aria-label="On point">${G.team.map((id, k) => `<button class="t-btn sm" data-a="point" data-n="${k}" data-k="point${k}" aria-pressed="${G.point === k}">${nm(id)}</button>`).join('')}</div><span class="sp"></span>
        <button class="t-btn pri" data-a="flip" data-k="flip">${G.feed.length ? 'Flip the next mob' : 'Bring on the boss'} <span class="num">(F)</span></button></div>`;
    } else if (G.phase === 'roll') {
      hint = G.round >= 1 ? '<b>New round.</b> Roll the row first, then everyone rolls.' : '<b>Fight!</b> Burn a Containment or Recovery Agent now if you want, then roll.';
      if (G.round >= 1 && !G.row.length) hint = '<b>New round.</b> The row is empty, so just roll the dice.';
      ctl = `<div class="t-acts"><span class="t-inc">${incText()}</span><span class="sp"></span><button class="t-btn pri" data-a="roll" data-k="roll">${G.round >= 1 && G.row.length ? 'Roll the row, then the dice' : 'Roll the dice'} <span class="num">(R)</span></button></div>`;
    } else if (G.phase === 'assign') {
      const d = UI.sel != null ? G.dice[UI.sel] : null, t = d ? E.targets(G, d.i) : null, mo = UI.more && G.play.find(m => m.uid === UI.more.uid);
      if (mo) hint = `<b>Double ${d.n} takes the ${mo.slots[UI.more.p]} under ${esc(mo.name)}.</b> Tap any one more die under it, or keep just the one.`;
      else if (!d) hint = G.dice.some(x => !x.used) ? '<b>Tap a die</b>, then a matching die under a mob. Keys 1–9 pick dice.' : '<b>All dice placed.</b> End the round when you’re ready.';
      else if (d.used) hint = `That die is used. <b>Undo</b> to take it back.`;
      else hint = `<b>${esc(E.dieOwner(G, d))}: ${E.faceText(d)}.</b> ${t.hits.length ? (d.dbl ? 'A double: tap a matching die under a mob to take it and one more, <b>or Guard</b>.' : 'Tap a glowing die under a mob that shows the same number.') + (t.hits.some(h => h.near) ? ' Dashed rings are one off: your perk matches them.' : '') : 'Nothing it can hit.'}${G.wildAll ? ' Every die matches anything this round.' : ''}${!d.crew ? ' Agent dice can’t hit the boss or guard.' : ''}`;
      const sel = d && !d.used;
      ctl = `<div class="t-dice" role="group" aria-label="Dice">${G.dice.map(dieHtml).join('')}</div>
        <div class="t-acts">${mo ? `<button class="t-btn pri" data-a="one" data-k="one">Just that one <span class="num">(J)</span></button><button class="t-btn" data-a="back" data-k="back">Back <span class="num">(Esc)</span></button>` : ''}
        ${!mo && sel && t.guard ? `<button class="t-btn" data-a="guard" data-k="guard">Guard <span class="num">(G)</span></button>` : ''}
        ${!mo && sel && t.enrich ? `<span class="t-inc">Enrichment: turn to</span><span class="t-turn">${[1, 2, 3, 4, 5, 6].filter(n => n !== d.n).map(n => `<button class="t-btn sm" data-a="turn" data-n="${n}" data-k="turn${n}" aria-label="Turn this die to ${n}">${A.pip(n, 20)}</button>`).join('')}</span>` : ''}
        <span class="t-inc">${incText()}</span><span class="sp"></span>
        <button class="t-btn" data-a="undo" data-k="undo" ${G.undo.length ? '' : 'disabled'}>Undo <span class="num">(U)</span></button>
        <button class="t-btn pri" data-a="end" data-k="end">End round <span class="num">(E)</span></button></div>`;
    } else if (G.phase === 'loot') {
      hint = `<b>The tray holds ${G.cap}.</b> Discard ${G.tray.length - G.cap} agent${G.tray.length - G.cap === 1 ? '' : 's'} from the kit tray (new ones are ringed).`;
    }
    UI.fresh = false;
    return `<div class="t-dock" role="region" aria-label="Controls"><div class="t-dockin"><p class="t-hint" aria-live="polite">${UI.msg ? `<span class="${UI.err ? 'err' : ''}">${esc(UI.msg)}</span> ` : ''}${hint}</p>${ctl}</div></div>`;
  }
  function incText() {
    const G = UI.G, inc = E.incoming(G), tot = inc.total.reduce((a, b) => a + b, 0);
    return tot ? `Incoming at round end: ${G.team.map((id, k) => `${nm(id)} <b>${inc.total[k]}</b>`).join(' · ')}` : 'Nothing hits back this round.';
  }
  function vLog() {
    if (UI.drawer !== 'log') return '';
    const L = UI.G.log.slice().reverse();
    return `<aside class="t-drawer" aria-label="Game log"><h2>Log <button class="t-lnk" data-a="log" data-k="logx">Close</button></h2><ol class="t-log">${L.map(l => `<li class="${l.kind}"><span class="when">${l.fight ? `F${l.fight}${l.round ? '·R' + l.round : ''}` : '—'}</span>${esc(l.text)}</li>`).join('')}</ol></aside>`;
  }
  function vGallery() {
    if (!UI.cards) return '';
    const all = [...A.mobs().map(m => ['mob:' + m.id, A.mobCard(m)]), ['boss', A.bossCard(A.boss())], ['legend', A.legend], ...A.ANALYST_IDS.map(id => ['analyst:' + id, A.analystCard(id)]), ...A.AGENT_IDS.map(t => ['agent:' + t, A.agentCard(t)])];
    return `<div class="t-gallery" role="dialog" aria-label="All cards"><div class="in"><p class="t-h"><span>Every card in the prototype · the same markup as the paper PDF</span><button class="t-lnk" data-a="cards" data-k="cardsx">Close</button></p>
      <div class="grid">${all.map(([k, h]) => `<div class="t-gslot" data-card="${k}">${h}</div>`).join('')}</div></div></div>`;
  }
  function vEnd() {
    const G = UI.G; if (!G.over) return '';
    const ms = (UI.end || Date.now()) - UI.start;
    return `<div class="t-end" role="dialog" aria-label="Shift over"><div class="t-endc">
      <h2 class="${G.win ? 'win' : 'loss'}">${G.win ? 'Shift survived' : 'Shift lost'}</h2>
      <p class="sub">${G.win ? `${esc(G.boss.name)} is beaten. Everybody walks out.` : `Fight ${G.fight}${G.bossOut ? ', against the boss' : ''}. Someone hit 0 HP.`}</p>
      <div class="t-stats">
        <div><b>${G.stats.rounds}</b><span>Rounds</span></div><div><b>${G.stats.back}</b><span>Comebacks</span></div><div><b>${mmss(ms)}</b><span>Time</span></div>
        <div><b>${G.fight}</b><span>Fights</span></div><div><b>${G.stats.guards}</b><span>Guards</span></div><div><b>${Math.min(...G.hp)}</b><span>Lowest HP</span></div></div>
      <div class="t-acts"><button class="t-btn" data-a="copy" data-k="copy">${UI.copied === 'ok' ? 'Copied' : 'Copy result'}</button><button class="t-btn" data-a="log" data-k="log2">Log</button><span class="sp"></span><button class="t-btn pri" data-a="quit" data-k="again">New shift</button></div>
      ${UI.copied && UI.copied !== 'ok' ? `<textarea class="t-line" rows="4" readonly aria-label="Result line">${esc(UI.copied)}</textarea>` : ''}
      <p class="t-hint" data-line style="margin-top:10px;font-family:var(--mono);font-size:11px">${esc(resultLine())}</p>
    </div></div>`;
  }

  // ---- Render and events ------------------------------------------------------------------------------------------
  function render() {
    const k = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    app.innerHTML = UI.G ? vTop() + vCrew() + `<div class="t-main">${vTable()}${vSide()}</div>` + vDock() + vLog() + vGallery() + vEnd() : vSetup() + vGallery();
    if (k) focusKey(k);
  }
  function focusKey(k) { const el = app.querySelector(`[data-k="${k}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }

  app.addEventListener('click', e => {
    const G = UI.G;
    const b = e.target.closest && e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'count') { UI.setup.n = +b.dataset.n; return render(); }
    if (a === 'pick') { const s = UI.setup.team, k = +b.dataset.seat, j = s.indexOf(b.dataset.id); if (j >= 0 && j !== k) s[j] = s[k]; s[k] = b.dataset.id; return render(); }
    if (a === 'start') return startGame();
    if (a === 'cards') { UI.cards = !UI.cards; return render(); }
    if (a === 'log') { UI.drawer = UI.drawer === 'log' ? null : 'log'; return render(); }
    if (a === 'quit') { if (G && !G.over && !confirmQuit()) return; UI.G = null; UI.drawer = null; UI.seed = (UI.seed * 7 + 13) % 1e9; return render(); }
    if (a === 'copy') return copyResult();
    if (!G) return;
    if (a === 'point') return act(() => E.setPoint(G, +b.dataset.n));
    if (a === 'flip') { act(() => E.flip(G)); return focusKey('roll'); }
    if (a === 'roll') { act(() => E.roll(G)); UI.fresh = true; UI.sel = null; UI.more = null; nextDie(); render(); return focusKey('die' + (UI.sel || 0)); }
    if (a === 'die') { const i = +b.dataset.i; UI.more = null; UI.sel = UI.sel === i ? null : i; UI.msg = ''; return render(); }
    if (a === 'slot') return tapSlot(b.dataset.u, +b.dataset.p);
    if (a === 'one') return UI.more && doAssign(UI.more.di, UI.more.uid, UI.more.p);
    if (a === 'back') { UI.more = null; return render(); }
    if (a === 'guard') return doGuard();
    if (a === 'turn') { const i = UI.sel; return act(() => E.enrichTurn(G, i, +b.dataset.n)); }
    if (a === 'undo') { UI.more = null; act(() => E.unassign(G)); const last = G.dice.filter(d => !d.used).map(d => d.i); if (UI.sel == null || (G.dice[UI.sel] && G.dice[UI.sel].used)) UI.sel = last.length ? last[last.length - 1] : null; return render(); }
    if (a === 'end') { UI.sel = null; UI.more = null; act(() => E.endRound(G)); return focusKey(G.phase === 'roll' ? 'roll' : 'flip'); }
    if (a === 'burn') { act(() => E.burn(G, b.dataset.u)); if (G.phase === 'assign' && UI.sel == null) { nextDie(); render(); } return; }
    if (a === 'discard') { act(() => E.discardKit(G, b.dataset.u)); return; }
  });
  const confirmQuit = () => { try { return window.confirm('Abandon this shift?'); } catch (e) { return true; } };
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    const G = UI.G, key = e.key.toLowerCase(), click = k => { const el = app.querySelector(`[data-a="${k}"]`); if (el && !el.disabled) { el.click(); e.preventDefault(); } };
    if (key === 'escape') { if (UI.cards) UI.cards = false; else if (UI.drawer) UI.drawer = null; else if (UI.more) UI.more = null; else UI.sel = null; return render(); }
    if (!G) return;
    if (key === 'l') return click('log');
    if (G.phase === 'flip' && key === 'f') return click('flip');
    if (G.phase === 'roll' && key === 'r') return click('roll');
    if (G.phase === 'assign') {
      if (key === 'j') return click('one');
      if (/^[1-9]$/.test(key) && G.dice[+key - 1]) { UI.more = null; UI.sel = +key - 1; UI.msg = ''; render(); return focusKey('die' + UI.sel); }
      if (key === 'g') return click('guard');
      if (key === 'u' || key === 'backspace') return click('undo');
      if (key === 'e') return click('end');
    }
  });
  window.CDUI = { UI, render, resultLine };
  render();
})();
