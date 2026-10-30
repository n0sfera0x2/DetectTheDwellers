// Chapter dice web prototype: the rules engine. DOM-free and deterministic given a seeded rng (opt.rnd or opt.seed).
// Plays exactly the paper rules sheet (../paper/build.js): the human assigns dice, the engine checks and resolves.
// Numbers come from data/cards.json and ../cards.js (the d6 key, each analyst's doubles, the 2d6 row). Every die is a
// standard pip d6: a die is { n: 1–6, face: [symbol, 1 or 2] }. Throwaway prototype code.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../data/cards.json'), require('../sim').symbolsFor, require('../cards'));
  else root.CDEngine = factory(root.CD_DATA, root.CD_SYMBOLS, root.CDCards);
})(typeof self !== 'undefined' ? self : this, function (D, symbolsFor, CARDS) {
  const HP = 23; // the sim's tuned starting HP for two players (standard d6, 2026-10-30)
  // A rolled pip die. own: the analyst's id (their doubles); otherwise 'CREW' or 'AGENT' (only a 6 is a double).
  const pipDie = (n, who) => ({ n, face: [CARDS.symOf(n), CARDS.isDouble(who, n) ? 2 : 1] });
  const KIT_NAME = { triage: 'Triage Agent', enrich: 'Enrichment Agent', contain: 'Containment Agent', recover: 'Recovery Agent' };
  const SYM_NAME = { D: 'Detect', C: 'Contain', E: 'Eradicate' };

  function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clone = x => JSON.parse(JSON.stringify(x));
  const nameOf = id => D.classes.find(c => c.id === id).name;

  // ---- Setup ------------------------------------------------------------------------------------------------
  function newGame(opt = {}) {
    const team = opt.team || ['HUN', 'RES'], n = team.length;
    if (n < 1 || n > 4) throw new Error('1–4 players');
    const r = opt.rnd || rng(opt.seed == null ? 1 : opt.seed);
    let uid = 0;
    const mkMob = m => { const hits = Math.max(1, m.hits + (D.mobAdd[n] || 0));
      return { uid: 'm' + (++uid), id: m.id, name: m.name, boss: false, dmg: m.dmg, kw: m.ability, persist: m.persist.slice(), domain: m.domain,
        top: CARDS.rowTop(m.persist[1]), printed: m.hits, hits, row: symbolsFor(m.domain, hits), off: Array(hits).fill(false), offStack: [], back: 0, up: 0 }; };
    const b = CARDS.boss(), bh = b.hitsBase + D.bossAdd[n];
    const boss = { uid: 'boss', id: b.id, name: b.name, boss: true, dmg: b.dmg, kw: 'wyrm', persist: null, domain: 'Identity',
      printed: b.hitsBase + D.bossAdd[2], hits: bh, row: symbolsFor('Identity', bh), off: Array(bh).fill(false), offStack: [], back: 0, up: 0 };
    const hp = opt.hp || HP;
    const G = { n, team: team.slice(), hp: team.map(() => hp), max: hp, r,
      feed: shuffle(CARDS.mobs().map(mkMob), r), boss, bossOut: false, row: [], play: [], gone: [],
      kit: shuffle(CARDS.AGENT_IDS.flatMap(t => [t, t]).map((t, i) => ({ uid: 'k' + (i + 1), t })), r), discard: [], tray: [],
      cap: D.sharedKit + (team.includes('SOA') ? D.perks.SOA.slot : 0),
      point: 0, phase: 'flip', fight: 0, round: 0, dice: [], blocks: team.map(() => false), enrichLeft: 0, wildAll: false, roundDmg: {}, undo: [],
      over: false, win: false, log: [], rows: [], lastRow: null, drawn: [], beaten: [],
      stats: { rounds: 0, back: 0, flips: 0, guards: 0, burns: {}, gone: 0, healed: 0 } };
    draw(G, n === 1 ? D.quickStartSolo : D.quickStartAgent, true);
    say(G, `Shift starts: ${team.map(nameOf).join(' + ')} at ${hp} HP. Kit tray: ${G.tray.map(c => KIT_NAME[c.t]).join(', ') || 'empty'}.`);
    return G;
  }
  const say = (G, text, kind = 'info') => { G.log.push({ text, kind, fight: G.fight, round: G.round }); };

  // ---- Helpers ----------------------------------------------------------------------------------------------
  const left = m => m.off.filter(x => !x).length;
  const remaining = m => m.row.filter((s, i) => !m.off[i]);
  const running = (G, t) => G.tray.filter(c => c.t === t).length;
  const on = (G, id) => G.team.includes(id);
  // Damage right now: Lockjaw +2 until it has lost two symbols; Escalating +1 per round it stayed up.
  const dmgOf = (G, m) => m.boss ? m.dmg + (left(m) > m.hits - 2 ? 2 : 0) : m.dmg + (m.kw === 'ramp' ? m.up : 0);
  // The highest-Damage mob(s), judged on the Damage at the start of the round so a wild can't flicker mid-assignment.
  const isTop = (G, m) => { const d = x => G.roundDmg[x.uid] != null ? G.roundDmg[x.uid] : dmgOf(G, x); const up = G.play.filter(x => left(x) || x === m); return up.length && d(m) >= Math.max(...up.map(d)); };
  const d6 = G => Math.floor(G.r() * 6);
  const findMob = (G, uid) => G.play.find(m => m.uid === uid);
  const fail = msg => { const e = new Error(msg); e.rule = true; throw e; };

  function hurt(G, k, n, why) {
    if (n <= 0 || G.over) return;
    G.hp[k] = Math.max(0, G.hp[k] - n); say(G, `${nameOf(G.team[k])} takes ${n} (${why}). ${G.hp[k]} HP left.`, 'hurt');
    if (!G.hp[k]) { G.over = true; G.win = false; G.phase = 'over'; say(G, `${nameOf(G.team[k])} is down. The shift is lost.`, 'end'); }
  }
  // Heal n HP one at a time onto whoever is lowest, never above the start.
  function spread(G, n, why) {
    let got = 0; for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) break; G.hp[k]++; got++; }
    if (n > 0) say(G, `${why}: healed ${got} HP split across the crew.`, 'heal'); G.stats.healed += got; return got;
  }
  function draw(G, n, quiet) {
    const got = [];
    for (let i = 0; i < n; i++) {
      if (!G.kit.length && G.discard.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; say(G, 'Kit deck empty: shuffled the discards into a new kit deck.'); }
      const c = G.kit.pop(); if (!c) break; G.tray.push(c); got.push(c);
    }
    G.drawn = got; if (!quiet && got.length) say(G, `Drew ${got.map(c => KIT_NAME[c.t]).join(' and ')}.`, 'kit');
    return got;
  }

  // ---- The persistence row ------------------------------------------------------------------------------------
  // Roll the 2 amber dice: every row mob whose number is at least the sum comes back with all its symbols. With strike, the two highest-Damage
  // comebacks hit everyone on arrival. Returns the comebacks (not yet in play: enter() puts them there).
  function rollRow(G, strike, why) {
    if (!G.row.length) return [];
    const pair = [1 + d6(G), 1 + d6(G)], roll = pair[0] + pair[1], back = G.row.filter(m => roll <= m.top);
    G.row = G.row.filter(m => !back.includes(m));
    back.forEach(m => { m.off = Array(m.hits).fill(false); m.offStack = []; m.back++; m.up = 0; });
    G.stats.back += back.length;
    const strikes = strike ? back.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a)).slice(0, 2) : [];
    const rec = { roll, pair, why, back: back.map(m => m.name), strikes: strikes.map(m => ({ name: m.name, dmg: dmgOf(G, m) })), seq: G.rows.length + 1, fight: G.fight, round: G.round };
    G.rows.push(rec); G.lastRow = rec;
    say(G, `Row roll ${pair.join(' + ')} = ${roll} (${why}): ${back.length ? back.map(m => m.name).join(', ') + (back.length > 1 ? ' come back.' : ' comes back.') : 'nothing comes back.'}`, 'row');
    for (const m of strikes) G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m), `${m.name} arrives`));
    return back;
  }
  function enter(G, m) {
    if (G.over) return; G.play.push(m);
    if (m.kw === 'beacon') for (const b of rollRow(G, true, `${m.name}’s Beacon`)) enter(G, b);
  }

  // ---- Flip ---------------------------------------------------------------------------------------------------
  function setPoint(G, k) {
    if (G.phase !== 'flip') fail('Pick who’s on point before the flip.');
    if (!(k >= 0 && k < G.n)) fail('No such analyst.'); G.point = k; return G;
  }
  function flip(G) {
    if (G.phase !== 'flip') fail('Not time to flip.');
    G.fight++; G.round = 0; G.stats.flips++; G.play = []; G.beaten = [];
    if (G.feed.length) {
      const m = G.feed.shift(); say(G, `Flip ${G.fight}: ${m.name}. ${nameOf(G.team[G.point])} is on point.`, 'flip');
      const back = rollRow(G, true, 'the flip'); if (G.over) return G;
      enter(G, m); back.forEach(b => enter(G, b));
    } else {
      G.bossOut = true; say(G, `05:59. ${G.boss.name} arrives. ${nameOf(G.team[G.point])} is on point.`, 'flip');
      const back = rollRow(G, false, 'the boss arrives'); enter(G, G.boss); back.forEach(b => enter(G, b));
    }
    if (!G.over) G.phase = 'roll';
    return G;
  }

  // ---- A fight round -------------------------------------------------------------------------------------------
  function roll(G) {
    if (G.phase !== 'roll') fail('Not time to roll.');
    G.round++; G.stats.rounds++;
    if (G.round > 1) { const back = rollRow(G, true, `round ${G.round}`); back.forEach(b => enter(G, b)); if (G.over) return G; }
    const dice = [];
    G.team.forEach((id, k) => {
      const nd = G.n === 1 ? D.soloDice : k === G.point ? 2 : 1;
      for (let i = 0; i < nd; i++) { const crewDie = G.n === 1 && i === nd - 1; dice.push({ k, crew: true, src: crewDie ? 'crew' : 'own', ...pipDie(1 + d6(G), crewDie ? 'CREW' : id) }); }
    });
    for (let i = 0; i < running(G, 'triage'); i++) dice.push({ k: G.point, crew: false, src: 'agent', ...pipDie(1 + d6(G), 'AGENT') });
    dice.forEach((d, i) => { d.i = i; d.used = null; d.turned = false; });
    G.dice = dice; G.blocks = G.team.map(() => false); G.enrichLeft = running(G, 'enrich'); G.wildAll = false; G.undo = [];
    G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = dmgOf(G, m); });
    G.phase = 'assign';
    say(G, `Round ${G.round}: rolled ${dice.map(faceText).join(', ')}.`, 'roll');
    return G;
  }
  const faceText = d => `${d.n != null ? d.n + ' ' : ''}${d.face[1] === 2 ? 'double ' : ''}${SYM_NAME[d.face[0]]}${d.turned ? ' (turned)' : ''}${d.crew ? '' : ' (agent)'}`;

  // What one die can do to one mob: { syms: symbols you may pick, max: how many it removes, wild } or null.
  function canHit(G, d, m) {
    if (!d || !m || d.used || !left(m)) return null;
    if (!d.crew && m.boss) return null;                           // agent dice can't hit the boss
    const [s, c] = d.face, id = d.crew ? G.team[d.k] : null;
    if (m.kw === 'hardened' && c < 2) return null;                // Evasive: only a double hits it
    const wild = G.wildAll || (id === 'HUN' && m.back > 0) || (id === 'RES' && s === 'C' && isTop(G, m));
    const rem = remaining(m), syms = wild ? [...new Set(rem)] : rem.includes(s) ? [s] : [];
    if (!syms.length) return null;
    return { syms, wild, max: Math.min(c, wild ? rem.length : rem.filter(x => x === s).length) };
  }
  const canGuard = (G, d) => !!d && d.crew && !d.used && d.face[1] === 2 && !G.blocks[d.k];
  // Every legal use of a die, for the UI's target buttons and for tests.
  function targets(G, di) {
    const d = G.dice[di]; if (!d || G.phase !== 'assign') return { hits: [], guard: false, enrich: false };
    const hits = []; for (const m of G.play) { const o = canHit(G, d, m); if (o) o.syms.forEach(s => hits.push({ uid: m.uid, sym: s, n: o.max, wild: o.wild })); }
    return { hits, guard: canGuard(G, d), enrich: G.enrichLeft > 0 && d.crew && !d.used && !d.turned };
  }
  const snap = G => ({ dice: clone(G.dice), blocks: G.blocks.slice(), enrichLeft: G.enrichLeft, mobs: G.play.map(m => ({ uid: m.uid, off: m.off.slice(), offStack: m.offStack.slice() })) });
  function removeSym(m, s) { const i = m.row.findIndex((x, j) => !m.off[j] && x === s); if (i < 0) return false; m.off[i] = true; m.offStack.push(i); return true; }

  // A face removes one matching symbol; a double removes two of that symbol from the same mob.
  function assign(G, di, uid, sym) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di], m = findMob(G, uid); if (!d) fail('No such die.'); if (!m) fail('That mob isn’t in the fight.');
    if (d.used) fail('That die is already used. Undo it first.');
    const o = canHit(G, d, m); if (!o) fail(cantWhy(G, d, m));
    sym = sym || (o.syms.includes(d.face[0]) ? d.face[0] : o.syms[0]);
    if (!o.syms.includes(sym)) fail(`That die can’t take a ${SYM_NAME[sym]} off ${m.name}.`);
    G.undo.push(snap(G));
    const took = [];
    for (let j = 0; j < o.max; j++) {
      const rem = remaining(m), pick = j === 0 ? sym : rem.includes(sym) ? sym : o.wild ? (rem.includes(d.face[0]) ? d.face[0] : rem[0]) : null;
      if (!pick || !removeSym(m, pick)) break; took.push(pick);
    }
    d.used = { uid, syms: took };
    say(G, `${dieOwner(G, d)}’s ${faceText(d)} takes ${took.map(s => SYM_NAME[s]).join(' + ')} off ${m.name}${left(m) ? '' : ': beaten'}.`, 'hit');
    return G;
  }
  function cantWhy(G, d, m) {
    if (!left(m)) return `${m.name} is already beaten.`;
    if (!d.crew && m.boss) return 'Agent dice can’t hit the boss.';
    if (m.kw === 'hardened' && d.face[1] < 2) return `${m.name} is Evasive: only a double hits it.`;
    return `No ${SYM_NAME[d.face[0]]} left on ${m.name} for that die.`;
  }
  const dieOwner = (G, d) => d.crew ? nameOf(G.team[d.k]) + (d.src === 'crew' ? ' (crew die)' : '') : 'Triage Agent';
  function guard(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Agent dice can’t guard.'); if (d.used) fail('That die is already used.');
    if (d.face[1] !== 2) fail('Only a double can guard.'); if (G.blocks[d.k]) fail(`${nameOf(G.team[d.k])} is already blocking.`);
    G.undo.push(snap(G)); d.used = 'guard'; G.blocks[d.k] = true;
    say(G, `${nameOf(G.team[d.k])} guards with a ${faceText(d)}: blocking this round.`, 'guard');
    return G;
  }
  // Running Enrichment Agent: once a round (per running card), turn one crew die to any symbol. A double stays a
  // double (the sim's rule); the die keeps its number for the record.
  function enrichTurn(G, di, sym) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (G.enrichLeft < 1) fail('No Enrichment Agent turn left this round.');
    if (!d.crew) fail('Enrichment turns a crew die, not an agent die.'); if (d.used) fail('Undo that die first.'); if (d.turned) fail('That die is already turned.');
    if (!SYM_NAME[sym]) fail('Pick Detect, Contain or Eradicate.');
    G.undo.push(snap(G)); d.from = d.face.slice(); d.face = [sym, d.face[1]]; d.turned = true; G.enrichLeft--;
    say(G, `Enrichment Agent turns ${dieOwner(G, d)}’s die to ${faceText(d)}.`, 'kit');
    return G;
  }
  function unassign(G) {
    if (G.phase !== 'assign' || !G.undo.length) fail('Nothing to undo.');
    const s = G.undo.pop(); G.dice = s.dice; G.blocks = s.blocks; G.enrichLeft = s.enrichLeft;
    for (const x of s.mobs) { const m = findMob(G, x.uid); if (m) { m.off = x.off; m.offStack = x.offStack; } }
    say(G, 'Undid the last move.', 'undo');
    return G;
  }

  // Damage the crew would take at the end of the round from the mobs still up, given who is blocking.
  // Returns { total: per analyst, by: [{ uid, name, dmg, to: [k...] }] }.
  function incoming(G, blocks = G.blocks) {
    const total = G.team.map(() => 0), by = [], up = G.play.filter(m => left(m));
    const dm = new Map(up.map(m => [m, dmgOf(G, m)]));
    for (let i = 0; i < running(G, 'contain'); i++) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
    for (const m of up) {
      const d = dm.get(m), pierce = m.kw === 'noblock'; let to = [], each = d;
      if (m.kw === 'onpoint') { each = d * 2; if (pierce || !blocks[G.point]) to = [G.point]; }
      else to = G.team.map((_, k) => k).filter(k => pierce || !blocks[k]);
      to.forEach(k => { total[k] += each; }); by.push({ uid: m.uid, name: m.name, dmg: each, base: dmgOf(G, m), to });
    }
    return { total, by };
  }

  function endRound(G) {
    if (G.phase !== 'assign' && !(G.phase === 'roll' && G.play.every(m => !left(m)))) fail('Not time to end the round.');
    G.stats.guards += G.dice.filter(d => d.used === 'guard').length;
    const beaten = G.play.filter(m => !left(m)); G.beaten = beaten.map(m => m.uid);
    if (beaten.some(m => m.boss)) { G.over = true; G.win = true; G.phase = 'over'; say(G, `${G.boss.name} is beaten. You survived the night.`, 'end'); return G; }
    for (const m of beaten) {
      const hunted = on(G, 'HUN') && m.back > 0 && G.dice.some(d => d.crew && G.team[d.k] === 'HUN' && d.used && d.used.uid === m.uid);
      if (m.back >= 1) { G.gone.push(m); G.stats.gone++; say(G, `${m.name} is beaten and gone for good${hunted ? ' (the Hunter finished it)' : ' (it already came back once)'}.`, 'beat'); }
      else { G.row.push(m); say(G, `${m.name} is beaten and goes on the persistence row (back on 2–${m.top}).`, 'beat'); }
    }
    G.play = G.play.filter(m => left(m));
    const inc = incoming(G, G.blocks);
    inc.by.forEach(x => x.to.forEach(k => hurt(G, k, x.dmg, `${x.name} hits back`)));
    G.dice = []; G.undo = []; G.wildAll = false; G.blocks = G.team.map(() => false);
    if (G.over) return G;
    for (const m of G.play) {
      m.up++;
      if (m.kw === 'regen' && m.offStack.length) { m.off[m.offStack.pop()] = false; say(G, `${m.name} regenerates a symbol.`, 'mob'); }
      if (m.kw === 'ramp') say(G, `${m.name} escalates: Damage ${dmgOf(G, m)} now.`, 'mob');
    }
    if (G.play.length) { G.phase = 'roll'; return G; }
    return afterFight(G);
  }
  // Won fight: Fixer and running Recovery Agents heal, then draw agents. Over the tray's limit, the player discards.
  function afterFight(G) {
    say(G, `Fight ${G.fight} won in ${G.round} round${G.round === 1 ? '' : 's'}.`, 'win');
    if (on(G, 'PAT')) spread(G, D.perks.PAT.fight, 'Fixer');
    const rec = running(G, 'recover'); if (rec) spread(G, rec * (D.recoverHeal + (on(G, 'PAT') ? D.perks.PAT.recover : 0)), 'Recovery Agent');
    draw(G, (G.n === 1 ? D.kitSolo : D.kitPerFight) + (on(G, 'SOA') ? D.perks.SOA.draw : 0));
    G.phase = G.tray.length > G.cap ? 'loot' : 'flip';
    if (G.phase === 'loot') say(G, `The tray holds ${G.cap}. Discard ${G.tray.length - G.cap}.`, 'kit');
    return G;
  }
  function discardKit(G, uid) {
    if (G.phase !== 'loot') fail('The tray isn’t over its limit.');
    const i = G.tray.findIndex(c => c.uid === uid); if (i < 0) fail('No such agent in the tray.');
    const [c] = G.tray.splice(i, 1); G.discard.push(c); say(G, `Discarded ${KIT_NAME[c.t]}.`, 'kit');
    if (G.tray.length <= G.cap) G.phase = 'flip';
    return G;
  }
  // Keep exactly these agents (up to the tray's limit), discard the rest.
  function keepKit(G, uids) {
    if (G.phase !== 'loot') fail('The tray isn’t over its limit.');
    if (uids.length > G.cap) fail(`The tray holds ${G.cap}.`);
    G.tray.filter(c => !uids.includes(c.uid)).forEach(c => discardKit(G, c.uid));
    return G;
  }
  const takeLoot = keepKit;

  // ---- Burns ------------------------------------------------------------------------------------------------------
  const BURN_PHASES = { triage: ['assign'], enrich: ['assign'], contain: ['roll', 'assign'], recover: ['flip', 'roll', 'assign'] };
  const canBurn = (G, t) => !G.over && (BURN_PHASES[t] || []).includes(G.phase) && !(t === 'contain' && !G.play.some(m => left(m) > (m.boss ? 1 : 0)));
  function burn(G, typeOrUid) {
    const c = G.tray.find(x => x.uid === typeOrUid) || G.tray.find(x => x.t === typeOrUid);
    if (!c) fail('No such agent in the tray.');
    if (!canBurn(G, c.t)) fail(`Can’t burn the ${KIT_NAME[c.t]} now.`);
    G.tray.splice(G.tray.indexOf(c), 1); G.discard.push(c); G.undo = [];
    G.stats.burns[c.t] = (G.stats.burns[c.t] || 0) + 1;
    say(G, `Burned the ${KIT_NAME[c.t]}.`, 'burn');
    if (c.t === 'triage') {
      const id = G.team[G.point];
      for (let i = 0; i < 3; i++) G.dice.push({ i: G.dice.length, k: G.point, crew: true, src: 'burn', ...pipDie(1 + d6(G), id), used: null, turned: false });
      say(G, `${nameOf(id)} rolls 3 more: ${G.dice.slice(-3).map(faceText).join(', ')}.`, 'roll');
    }
    if (c.t === 'enrich') { G.wildAll = true; say(G, 'Every die is wild this round.', 'kit'); }
    if (c.t === 'contain') {
      for (const m of G.play) { if (!left(m) || (m.boss && left(m) <= 1)) continue; const i = m.off.lastIndexOf(false); m.off[i] = true; m.offStack.push(i); }
      say(G, 'One symbol off every mob.', 'kit');
      if (G.phase === 'roll' && G.play.every(m => !left(m))) endRound(G);
    }
    if (c.t === 'recover') spread(G, D.recoverBurn, 'Recovery burn');
    return G;
  }

  return { HP, KIT_NAME, SYM_NAME, pipDie, rng, shuffle, newGame, setPoint, flip, roll, assign, guard, enrichTurn, unassign, endRound, burn, canBurn,
    discardKit, keepKit, takeLoot, targets, canHit, canGuard, incoming, dmgOf, left, remaining, running, nameOf, faceText, dieOwner, rollRow };
});
