function DTD12(D) {
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cls = id => D.classes.find(c => c.id === id);
  const d20 = G => 1 + Math.floor(G.rnd() * 20);
  const log = (G, t) => G.log.push({ r: G.sit, t });
  const nm = (G, k) => cls(G.team[k]).name;
  // Mob hits by crew size: printed (2p) hits + D.mobAdd[n], never below 1.
  function mobHits(h, n) { const add = (D.mobAdd && D.mobAdd[n]) || 0; return Math.max(1, h + add); }
  function newGame(team, mode, opt = {}) {
    const rnd = opt.rnd || Math.random, per = D.rolls[team.length] || 1;
    const hpT = D.hp[mode][team.length]; const hp = opt.hp || (typeof hpT === 'number' ? hpT : hpT[opt.diff || 'Analyst']);
    const G = { mode, team: team.slice(), per, rnd, uid: 0, max: hp, hps: team.map(() => hp), deck: [], play: [], row: [], kit: [], held: team.map(() => []), discard: [],
      point: 0, phase: 'point', plog: [], pendingBack: [], cur: null, sit: 0, round: 0, rest: -1, dice: [], rolled: false, blocks: [], bossIn: false, over: false, win: false, log: [], loot: [], lastSit: null, persist: null, aiming: null,
      noAgents: !!opt.noAgents, stats: { auto: { hits: 0, assist: 0, saved: 0, healed: 0, removed: 0, dodged: 0, recon: 0 }, agentHits: 0, crewHits: 0, back: 0, maxBack: 0, rounds: 0, beaten: 0, blocks: 0, rests: 0 } };
    const mk = c => { const h = D.mobs.includes(c) ? mobHits(c.hits, (G.team || team).length) : c.hits; return { ...c, hits: h, uid: ++G.uid, left: h, back: 0, up: 0 }; };
    const pool = [...D.mobs.map(m => ({ ...mk(m), kind: 'mob' })), ...D.situations.map(x => ({ ...x, kind: 'sit', uid: ++G.uid }))];
    const intro = mode === 'intro' && D.intro;
    // Every shift gets its story beats: D.storyDeal[mode] story cards, the rest of the feed from mobs and the other situations.
    const n = opt.deal || D.deal[mode], ns = Math.min(n, (D.storyDeal && D.storyDeal[mode]) || 0), mixed = shuffle(pool, rnd);
    const story = mixed.filter(x => x.story).slice(0, ns), rest = mixed.filter(x => !x.story).slice(0, n - story.length);
    G.deck = intro ? D.intro.deck.map(id => pool.find(x => x.id === id)).reverse() : shuffle([...story, ...rest], rnd);
    G.total = G.deck.length;
    G.kit = shuffle(D.kit.filter(c => !(G.noAgents && c.kind === 'agent')).map(c => ({ ...c })), rnd);
    const bb = intro ? D.bosses.find(x => x.id === D.intro.boss) : D.bosses[Math.floor(rnd() * D.bosses.length)];
    if (intro) { const top = D.intro.kit.map(t => G.kit.find(c => c.type === t)).filter(Boolean); G.kit = G.kit.filter(c => !top.includes(c)); G.kit.push(...top.slice().reverse()); }
    G.boss = { ...mk({ ...bb, hits: bb.hitsBase != null ? bb.hitsBase + team.length : bb.hits }), kind: 'boss' };
    if (mode === 'quick' && D.quickStartAgent && !G.noAgents) for (let j = 0; j < (D.sharedKit ? D.quickStartAgent : G.team.length); j++) { const i = G.kit.findIndex(c => c.kind === 'agent'); if (i >= 0) G.held[D.sharedKit ? 0 : j].push(G.kit.splice(i, 1)[0]); }
    log(G, 'Shift start. Pick who is on point and flip the first situation.');
    return G;
  }
  const alive = G => G.hps.every(h => h > 0);
  const slots = (G, k) => D.sharedKit ? D.sharedKit + (G.team.includes('SOA') ? 1 : 0) : ((D.slotsBy && D.slotsBy[G.team.length]) || D.slots) + (k != null && G.team[k] === 'SOA' ? 1 : 0);
  // src: the mob names behind this damage, kept so the end screen can say what took the analyst down.
  function hurt(G, k, n, why, src) {
    if (n <= 0 || G.over) return; G.hps[k] = Math.max(0, G.hps[k] - n); G.stats.low = Math.min(G.stats.low ?? 1, G.hps[k] / G.max); log(G, `${nm(G, k)} −${n} HP (${why}).`);
    if (G.hps[k] <= 0) { G.over = true; G.win = false; G.phase = 'over'; G.dropped = k; G.downBy = src || [why]; log(G, `The ${nm(G, k)} flatlined. Shift lost.`); }
  }
  const heal = (G, k, n) => { G.hps[k] = Math.min(G.max, G.hps[k] + n); };
  function spread(G, n) { let h = 0; for (let i = 0; i < n; i++) { const k = G.hps.indexOf(Math.min(...G.hps)); if (G.hps[k] >= G.max) break; heal(G, k, 1); h++; } return h; }
  function setPoint(G, k) { if (G.phase !== 'point' || k < 0 || k >= G.team.length) return false; G.point = k; return true; }
  // The Hunt Agent's prey: by default a mob that came back from the row (D.hunt 'back'); 'low' is the old 1-or-2-hits-left rule.
  const huntable = m => m.kind !== 'boss' && (D.hunt === 'low' ? m.left <= 2 : D.hunt === 'either' ? m.back > 0 || m.left <= 2 : m.back > 0);
  function rowDie(G) {
    const first = d20(G), n = aiOn(G) ? 0 : carried(G, 'patch'); let r = first; for (let i = 0; i < n; i++) r = Math.max(r, d20(G));
    const hits = x => G.row.filter(m => x >= m.persist[0] && x <= m.persist[1]).length; if (r !== first) G.stats.auto.dodged += Math.max(0, hits(first) - hits(r));
    return r;
  }
  // Only the strikeCap highest-Damage comebacks of one roll hit on the way in; the rest just rejoin the fight.
  function strikers(G, back) { if (!D.returnStrike) return []; const cap = D.strikeCap || back.length; return back.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a)).slice(0, cap); }
  function rollRow(G) {
    if (!G.row.length) { G.persist = null; return []; }
    const r = rowDie(G), back = G.row.filter(m => r >= m.persist[0] && r <= m.persist[1]);
    G.persist = { r, back: back.map(m => m.name), round: 0, pre: true }; G.plog.push({ sit: G.sit, r, back: back.map(m => m.name) });
    if (back.some(m => m.ability === 'spread')) { const extra = G.row.find(m => !back.includes(m)); if (extra) back.push(extra); }
    G.row = G.row.filter(m => !back.includes(m)); G.stats.back += back.length; if (!G.bossIn) G.stats.midBack = (G.stats.midBack || 0) + back.length; G.stats.maxBack = Math.max(G.stats.maxBack, back.length);
    back.forEach(m => { m.left = m.hits; m.back++; m.up = 0; });
    const hitters = strikers(G, back); G.persist.hit = hitters.map(m => m.name); for (const m of hitters) { if (G.over) break; G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m), `${m.name} hits on the way back`, [m.name])); }
    log(G, back.length ? `Persist roll ${r}: ${back.map(m => m.name).join(', ')} came back. Put ${back.length > 1 ? 'them' : 'it'} down before the next flip.` : `Persist roll ${r}: the row stays quiet.`);
    return back;
  }
  function flip(G) {
    if (G.phase !== 'point' || G.over) return false;
    G.lastRound = null; G.lastSit = null;
    if (!G.deck.length) {
      G.bossIn = true; let back = [];
      if (G.row.length) { const r = rowDie(G); back = G.row.filter(m => r >= m.persist[0] && r <= m.persist[1]); G.row = G.row.filter(m => !back.includes(m)); G.persist = { r, back: back.map(m => m.name), hit: [], pre: true }; G.plog.push({ sit: 'Boss', r, back: back.map(m => m.name) }); }
      back.forEach(m => { m.left = m.hits; m.back++; });
      log(G, `${G.boss.name} is here${back.length ? `, with ${back.length} from the persistence row` : ''}.`); const p = G.persist; startCombat(G, [G.boss, ...back]); G.persist = p; return true;
    }
    const c = G.deck.pop(); G.sit++;
    const back = rollRow(G); const p = G.persist;
    if (G.over) return true;
    if (c.kind === 'mob') { if (G.nextMob) { c.mod = G.nextMob; c.def += c.mod.def; c.dmg += c.mod.dmg; G.nextMob = null; } log(G, `Situation ${G.sit}: ${c.name}. ${nm(G, G.point)} is on point.`); c.scouted = true; startCombat(G, [c, ...back]); G.persist = p; }
    else { G.cur = c; G.phase = 'sit'; G.pendingBack = back; log(G, `Situation ${G.sit}: ${c.name}.${back.length ? ' Deal with it, then fight what came back.' : ''}`); }
    return true;
  }
  function fx(G, f, k) {
    if (!f) return;
    if (f.hp) { const who = f.to === 'all' ? G.team.map((_, i) => i) : [f.to === 'self' ? k : G.point]; for (const i of who) { if (f.hp > 0) heal(G, i, f.hp); else hurt(G, i, -f.hp, G.cur.name); } }
    if (f.pointExtra) hurt(G, G.point, -f.pointExtra, G.cur.name);
    if (f.unrow && G.row.length) { const m = G.row.sort((a, b) => b.persist[1] - a.persist[1]).shift(); log(G, `${m.name} is gone from the persistence row.`); }
    if (f.kit) drawLoot(G, f.kit);
    // Story effects: stir the row (comebacks fight after the card), call one mob back, mark the next mob, bury a card.
    if (f.row && G.row.length) G.pendingBack.push(...rollRow(G));
    if (f.call && G.row.length) { const m = G.row.slice().sort((a, b) => b.persist[1] - a.persist[1])[0]; G.row = G.row.filter(x => x !== m); m.left = m.hits; m.back++; m.up = 0; G.stats.back++; G.pendingBack.push(m); log(G, `${m.name} comes back from the row.`); }
    if (f.nextMob) { const n = G.nextMob || { def: 0, dmg: 0 }; G.nextMob = { def: n.def + (f.nextMob.def || 0), dmg: n.dmg + (f.nextMob.dmg || 0) }; }
    if (f.bury && G.deck.length > 1) { const c = G.deck.pop(); G.deck.unshift(c); log(G, `${c.name} goes to the bottom of the feed.`); }
  }
  function resolveSit(G, opt) {
    if (G.phase !== 'sit' || G.over) return null; const c = G.cur, res = { name: c.name, rolls: [] };
    // Story cards: a Recon Agent in the tray swaps the whole outcome for the card's recon line.
    if (c.recon && active(G, 'recon').length) { res.recon = true; G.stats.auto.recon++; log(G, `Recon Agent: ${c.reconText}`); fx(G, c.recon); }
    else if (c.type === 'event') fx(G, c.fx);
    else if (c.type === 'choice') { const o = c.opts[opt] || c.opts[0]; res.choice = o.label; fx(G, o.fx); }
    else if (c.type === 'challenge') {
      const who = c.who === 'each' ? G.team.map((_, i) => i) : [G.point];
      for (const k of who) { const r = d20(G), t = r + bonusFor(G, k, null); const ok = r === 20 || (r !== 1 && t >= c.need); res.rolls.push({ k, r, t, ok }); log(G, `${nm(G, k)} rolled ${t} vs ${c.need}: ${ok ? 'pass' : 'fail'}.`); fx(G, ok ? c.pass : c.fail, k); if (G.over) break; }
    }
    G.lastSit = res; G.cur = null; if (!G.over) { if (G.pendingBack.length) { const b = G.pendingBack; G.pendingBack = []; const p = G.persist; startCombat(G, b); G.persist = p; } else G.phase = G.loot.length ? 'loot' : 'point'; } return res;
  }
  function drawLoot(G, n) { for (let i = 0; i < n && G.kit.length; i++) G.loot.push(G.kit.pop()); if (G.loot.length) log(G, `Kit: ${G.loot.map(c => c.name).join(', ')}.`); }
  // A Beacon's roll chains: everything it brings back rolls the row again, until a roll is quiet or the row is empty.
  function persistRoll(G, why = 'beacon') {
    if (!G.row.length || G.over) return; const r = rowDie(G), back = G.row.filter(m => r >= m.persist[0] && r <= m.persist[1]);
    G.persist = { r, back: back.map(m => m.name), round: G.round }; G.plog.push({ sit: G.sit, r, back: back.map(m => m.name), why });
    if (!back.length) { log(G, `Persist roll ${r}: the row stays quiet.`); return; }
    if (back.some(m => m.ability === 'spread')) { const extra = G.row.find(m => !back.includes(m)); if (extra) back.push(extra); }
    G.row = G.row.filter(m => !back.includes(m)); G.stats.back += back.length; if (!G.bossIn) G.stats.midBack = (G.stats.midBack || 0) + back.length; G.stats.maxBack = Math.max(G.stats.maxBack, back.length);
    log(G, `Persist roll ${r}: ${back.map(m => m.name).join(', ')} came back.`);
    const hitters = strikers(G, back); G.persist.hit = hitters.map(m => m.name);
    for (const m of back) { m.left = m.hits; m.back++; m.up = 0; if (hitters.includes(m) && !G.over) G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m), `${m.name} hits on the way back`, [m.name])); enter(G, m, true, true); }
  }
  function enter(G, m, fromRow, chained) {
    G.play.push(m);
    if (m.ability === 'beacon') { log(G, `${m.name}: ${m.abilityName}. Persist roll now.`); persistRoll(G); }
    else if (chained) { G.stats.chained = (G.stats.chained || 0) + 1; log(G, `${m.name} answered the beacon. Persist roll now.`); persistRoll(G, 'chain'); }
  }
  function startCombat(G, mobs) { G.decoyUsed = false; G.scouted = false; G.phase = 'combat'; G.round = 0; G.play = []; mobs.forEach(m => enter(G, m, m.kind === 'boss' || G.bossIn)); beginRound(G); }
  function beginRound(G) {
    if (G.over) return; G.round++; G.stats.rounds++; G.dice = []; G.rolled = false; G.rest = -1; G.blocks = G.team.map(() => false); G.persist = null; G.decoyRound = false; G.blocksPre = null; G.boost = 0; G.undo = []; G.mark = G.play.length ? G.play.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0].uid : null;
    if (G.round > 1 && !D.flipOnlyPersist) persistRoll(G);
    if (G.round > 1 && G.play.some(m => m.kind === 'boss' && m.id === 'wyrm')) { log(G, 'Double extortion: the Lockjaw Syndicate rolls for the row.'); persistRoll(G, 'boss'); }
  }
  function setRest(G, k) { if (G.phase !== 'combat' || G.rolled || G.team.length < 2) return false; G.rest = G.rest === k ? -1 : k; return true; }
  const has = (G, k, kind) => G.held[k].some(c => c.kind === kind);
  function bonusFor(G, k, m) {
    const id = G.team[k]; let b = 0;
    if (m && id === 'HUN' && m.back > 0) b = 5;
    if (m && id === 'RES' && G.play.length && dmgOf(G, m) >= Math.max(...G.play.map(x => dmgOf(G, x)))) b = 5;
    if (m) b += active(G, 'enrich').length * (D.enrichBonus || 2) + (G.boost || 0);
    if (m && m.scouted && active(G, 'recon').length) b += D.reconBonus || 5;
    return b + (has(G, k, 'forensic') ? 2 : 0);
  }
  // The share of a crew die's bonus that comes from agents (Enrichment run and burn, Recon), for the automation report.
  const agentBonus = (G, m) => active(G, 'enrich').length * (D.enrichBonus || 2) + (G.boost || 0) + (m.scouted && active(G, 'recon').length ? D.reconBonus || 5 : 0);
  function active(G, type) { if (aiOn(G)) return []; return G.held.flatMap((h, k) => k === G.rest && !D.sharedKit ? [] : h.filter(c => c.kind === 'agent' && c.type === type)); }
  const carried = (G, type) => G.held.flat().filter(c => c.kind === 'agent' && c.type === type).length;
  const aiOn = G => G.play.some(m => m.kind === 'boss' && m.id === 'ai');
  function rollAll(G) {
    if (G.phase !== 'combat' || G.rolled || G.over) return false; G.rolled = true;
    const evasive = G.play.some(m => m.ability === 'evasive');
    G.team.forEach((w, k) => {
      if (k === G.rest) { if (w === 'PAT') { spread(G, 3); log(G, 'The Fixer goes off-shift and patches up the crew: 3 HP.'); } else { heal(G, k, D.restHeal ?? 1); log(G, `${nm(G, k)} goes off-shift: +1 HP.`); } G.stats.rests++; return; }
      const nd = G.team.length === 1 ? (D.soloDice || 3) : 1 + (k === G.point ? 1 : 0); for (let i = 0; i < nd; i++) { const r = d20(G), dbl = r >= (w === 'ENG' ? 16 : 18); G.stats.crewDice = (G.stats.crewDice || 0) + 1; G.dice.push({ kind: 'crew', k, r, dbl, used: false }); if (dbl) G.blocks[k] = true; if (evasive && r <= 2) hurt(G, k, 1, 'a hallucinating app', G.play.filter(m => m.ability === 'evasive').map(m => m.name)); }
      if (!aiOn(G)) G.held[k].filter(c => c.kind === 'agent' && (c.type === 'triage' || c.type === 'hunt')).forEach(a => G.dice.push({ kind: 'agent', k, card: a, r: d20(G), used: false }));
    });
    G.blocks.forEach((b, k) => { if (b) { G.stats.blocks++; log(G, `${nm(G, k)} rolled a double and blocks this round.`); } });
    return true;
  }
  function bonusDie(G, d, m) { return d.kind === 'agent' ? (d.card.type === 'hunt' ? (D.huntBonus || 7) : (D.triageBonus || 2)) : bonusFor(G, d.k, m); }
  const total = (G, d, m) => d.r + bonusDie(G, d, m);
  function beats(G, d, m) {
    if (d.used || !G.play.includes(m)) return false;
    if (d.kind === 'agent' && (m.kind === 'boss' || m.ability === 'noagent' || (d.card.type === 'hunt' && !huntable(m)))) return false;
    if (m.ability === 'hardened' && d.r < 12) return false;
    return d.dbl || d.r >= 18 || (d.r !== 1 && total(G, d, m) >= m.def);
  }
  function assign(G, i, uid) {
    const d = G.dice[i], m = G.play.find(x => x.uid === uid); if (G.over || !d || !m || !beats(G, d, m)) return false;
    d.used = true; if (d.kind === 'crew') G.stats.crewUsed = (G.stats.crewUsed || 0) + 1; const n = (d.dbl || d.r >= 18) ? 2 : 1, was = m.left; m.left = Math.max(0, m.left - n); G.stats[d.kind === 'agent' ? 'agentHits' : 'crewHits'] += n;
    const auto = d.kind === 'agent' ? 'hits' : !(d.dbl || d.r >= 18) && total(G, d, m) - agentBonus(G, m) < m.def ? 'assist' : null; if (auto) G.stats.auto[auto] += n;
    log(G, `${d.kind === 'agent' ? d.card.name : nm(G, d.k)} hits ${m.name}${n > 1 ? ' twice' : ''}.`);
    if (m.left <= 0) { G.undo = []; beaten(G, m); } else (G.undo = G.undo || []).push({ i, m, was, n, auto, left: m.left, logAt: G.log.length });
    if (n === 2 && m.kind === 'boss' && m.id === 'apt' && !G.over && G.row.length) { G.undo = []; log(G, 'Living off your network: the double stirs the row.'); persistRoll(G, 'boss'); }
    return true;
  }
  // Takes back the last die put on a mob this round, as long as that hit didn't beat it and nothing has touched the mob since.
  const canUndo = G => { const u = G.undo && G.undo[G.undo.length - 1]; return !!u && !G.over && G.phase === 'combat' && G.play.includes(u.m) && u.m.left === u.left && G.dice[u.i] && G.dice[u.i].used; };
  function unassign(G) {
    if (!canUndo(G)) return false; const u = G.undo.pop(), d = G.dice[u.i];
    d.used = false; u.m.left = u.was; if (d.kind === 'crew') G.stats.crewUsed--; G.stats[d.kind === 'agent' ? 'agentHits' : 'crewHits'] -= u.n; if (u.auto) G.stats.auto[u.auto] -= u.n;
    if (G.log.length === u.logAt) G.log.pop(); return true;
  }
  function beaten(G, m) {
    if (m.kind === 'boss' && m.id === 'apt' && !m.rose) { m.rose = true; m.left = 2; log(G, `${m.name} comes back with 2 hits left.`); return; }
    G.play = G.play.filter(x => x !== m); G.stats.beaten++; if (m.mod) { m.def -= m.mod.def; m.dmg -= m.mod.dmg; m.mod = null; }
    if (m.kind === 'boss') { G.over = true; G.win = true; G.phase = 'over'; log(G, `${m.name} is down. Shift survived.`); return; }
    const lim = m.ability === 'sticky' ? 2 : 1;
    if (D.alwaysPersist || m.back < lim) { G.row.push(m); log(G, `${m.name} is down. Into the persistence row: back on ${m.persist[0]}–${m.persist[1]}.`); }
    else log(G, `${m.name} is down for good.`);
    if (!G.play.length) endCombat(G);
  }
  function endCombat(G) { G.lastRound = { ended: true }; G.dice.forEach(d => { d.used = true; }); log(G, 'The fight is over.'); const rc = carried(G, 'recover'), rh = D.recoverHeal || 3; if (rc) { G.stats.auto.healed += spread(G, rh * rc); log(G, `Recovery Agent${rc > 1 ? 's' : ''}: ${rh * rc} HP across the crew.`); } drawLoot(G, D.kitPerFight || 1); G.phase = G.loot.length ? 'loot' : 'point'; }
  function useItem(G, k, idx, target) {
    const c = G.held[k][idx]; if (!c || G.over || ['agent', 'forensic'].includes(c.kind)) return false;
    if (c.kind === 'jump') { if (G.hps[k] >= G.max) return false; heal(G, k, D.jumpHeal ?? 4); }
    else if (c.kind === 'fw') { if (G.phase !== 'combat' || G.blocks[k]) return false; G.blocks[k] = true; }
    else if (c.kind === 'zd') { const m = G.row.find(x => x.uid === target) || G.row[0]; if (!m) return false; G.row = G.row.filter(x => x !== m); log(G, `${m.name} patched out of the persistence row.`); }
    else if (c.kind === 'iso') { if (G.phase !== 'combat' || !G.play.length) return false; for (const m of G.play.slice()) { m.left = Math.max(0, m.left - 1); if (m.left <= 0) beaten(G, m); if (G.over) break; } }
    else return false;
    G.held[k].splice(idx, 1); log(G, `${nm(G, k)} used ${c.name}.`); return true;
  }
  function burn(G, k, idx, target) {
    const c = G.held[k][idx]; if (!c || G.over || c.kind !== 'agent') return false; G.undo = [];
    const inFight = G.phase === 'combat';
    if (c.type === 'triage') { if (!inFight || !G.rolled) return false; for (let i = 0; i < 3; i++) { const r = d20(G); G.dice.push({ kind: 'crew', k: G.point, r, dbl: r >= (G.team[k] === 'ENG' ? 16 : 18), used: false }); } }
    else if (c.type === 'hunt') { const m = G.play.find(x => x.uid === target); if (!inFight || !m || m.kind === 'boss' || !huntable(m)) return false; m.left = 0; G.stats.auto.removed++; beaten(G, m); }
    else if (c.type === 'contain') { if (!inFight || !G.play.length) return false; for (const m of G.play.slice()) { m.left = Math.max(0, m.left - 1); if (m.left <= 0) beaten(G, m); if (G.over || G.phase !== 'combat') break; } }
    else if (c.type === 'enrich') { if (!inFight || !G.rolled) return false; G.boost = (G.boost || 0) + 5; }
    else if (c.type === 'patch') { const m = G.row.find(x => x.uid === target) || null; if (!m) return false; G.row = G.row.filter(x => x !== m); G.stats.auto.removed++; log(G, `${m.name} is patched out of the persistence row for good.`); }
    else if (c.type === 'recover') { if (G.hps.every(h => h >= G.max)) return false; G.stats.auto.healed += spread(G, D.recoverBurn || 6); }
    else if (c.type === 'decoy') { if (!inFight || !G.rolled) return false; G.blocksPre = G.blocksPre || G.blocks.slice(); G.blocks = G.blocks.map(() => true); }
    else if (c.type === 'recon') { if (!G.deck.length) return false; const top = G.deck.slice(-3); const pick = top[Math.max(0, Math.min(top.length - 1, target ?? top.length - 1))]; G.deck = G.deck.filter(x => x !== pick); G.stats.auto.removed++; log(G, `${pick.name} is pulled from the feed for good.`); }
    G.held[k] = G.held[k].filter(x => x !== c); if (!G.held[k].includes(c)) { G.discard.push(c); log(G, `${nm(G, k)} burned the ${c.name}.`); }
    if (aiOn(G) && G.phase === 'combat' && !G.over) { log(G, 'Hostile takeover: the Rogue AI answers the burn with a Row roll.'); persistRoll(G, 'boss'); }
    return true;
  }
  function takeLoot(G, i, k, drop) { if (D.sharedKit && k != null) k = 0;
    const c = G.loot[i]; if (G.phase !== 'loot' || !c) return false;
    if (k != null) { if (G.held[k].length >= slots(G, k)) { if (drop == null || !G.held[k][drop]) return false; G.discard.push(G.held[k].splice(drop, 1)[0]); } G.held[k].push(c); log(G, `${nm(G, k)} takes ${c.name}.`); }
    else G.discard.push(c);
    G.loot.splice(i, 1); if (!G.loot.length) G.phase = 'point'; return true;
  }
  function trade(G, k, idx, j) { if (G.phase !== 'point' || !G.held[k][idx] || G.held[j].length >= slots(G, j)) return false; G.held[j].push(G.held[k].splice(idx, 1)[0]); return true; }
  function dmgOf(G, m) { if (m.kind === 'boss' && m.id === 'wyrm' && m.left > m.hits - 2) return m.dmg + 2; return m.dmg + (m.ability === 'ramp' ? m.up : 0); }
  // Who takes what at the end of this round, mob by mob: one list per analyst of { m, d }.
  function incomingBy(G, raw) {
    const out = G.team.map(() => []); const fight = G.team.map((_, k) => k !== G.rest), blocks = raw && G.blocksPre ? G.blocksPre : G.blocks;
    const dm = new Map(G.play.map(m => [m, dmgOf(G, m)]));
    if (!raw) for (let i = 0; i < active(G, 'contain').length; i++) { const top = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (top && top[1] > 1) dm.set(top[0], Math.max(1, top[1] - (D.containCut || 1))); }
    for (const m of G.play) {
      const d = dm.get(m), pierce = m.ability === 'noblock'; if (!d) continue;
      if (m.ability === 'onpoint') { const k = G.point; if (fight[k] && (pierce || !blocks[k])) out[k].push({ m, d: d * 2 }); continue; }
      let ts = G.team.map((_, k) => k).filter(k => fight[k]);
      if (m.ability === 'lowest') { const lo = Math.min(...ts.map(k => G.hps[k])); ts = ts.filter(k => G.hps[k] === lo); }
      for (const k of ts) if (pierce || !blocks[k]) out[k].push({ m, d });
    }
    if (G.decoyRound && !raw) out[G.point] = [];
    return out;
  }
  const incoming = G => incomingBy(G).map(l => l.reduce((s, x) => s + x.d, 0));
  function setMark(G, uid) { if (G.phase !== 'combat' || G.rolled || !active(G, 'enrich').length || !G.play.some(m => m.uid === uid)) return false; G.mark = uid; return true; }
  function decoy(G) { if (G.phase !== 'combat' || !G.rolled || G.decoyUsed || !active(G, 'decoy').length) return false; G.decoyUsed = true; G.decoyRound = true; log(G, `The Decoy Agent draws fire: ${nm(G, G.point)} takes no damage this round.`); return true; }
  const peek = G => carried(G, 'recon') && G.deck.length ? G.deck[G.deck.length - 1] : null;
  function endRound(G) {
    if (G.phase !== 'combat' || !G.rolled || G.over) return false;
    const by = incomingBy(G), inc = by.map(l => l.reduce((s, x) => s + x.d, 0)), sum = a => a.reduce((s, x) => s + x, 0);
    G.stats.auto.saved += Math.max(0, sum(incomingBy(G, true).map(l => l.reduce((s, x) => s + x.d, 0))) - sum(inc)); G.blocksPre = null; G.lastHit = inc; G.lastRound = { inc: inc.slice(), by: by.map(l => l.map(x => ({ name: x.m.name, d: x.d }))), blocks: G.blocks.slice(), rest: G.rest, decoy: !!G.decoyRound, contain: active(G, 'contain').length > 0, round: G.round };
    inc.forEach((n, k) => { if (!G.over && n) hurt(G, k, n, 'mobs still in play', by[k].map(x => x.m.name)); });
    if (G.over) return true;
    for (const m of G.play) { m.up++; if (m.ability === 'regen' && m.left < m.hits) m.left++; }
    beginRound(G); return true;
  }
  return { huntable, mobHits, slots, setMark, decoy, peek, burn, active, carried, newGame, setPoint, flip, resolveSit, setRest, rollAll, assign, beats, total, bonusDie, useItem, takeLoot, trade, endRound, incoming, incomingBy, unassign, canUndo, dmgOf, cls, alive };
}
if (typeof module !== 'undefined') module.exports = DTD12;
