// Chapter dice web prototype: the rules engine. DOM-free and deterministic given a seeded rng (opt.rnd or opt.seed).
// Plays exactly the paper rules sheet (../paper/build.js): the human assigns dice, the engine checks and resolves.
// Exact numbers (2026-10-30): every die is a standard pip d6, { n: 1–6, dbl }. A mob's hits are the threat dice set
// under its card (../cards.js slotsFor); a rolled die takes out one showing exactly its number. Throwaway prototype code.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../data/cards.json'), require('../cards'));
  else root.CDEngine = factory(root.CD_DATA, root.CDCards);
})(typeof self !== 'undefined' ? self : this, function (D, CARDS) {
  const HP = 30; // starting HP for exact numbers (2026-10-30): about 55% at two players in the sim
  // A rolled pip die. who: the analyst's id (their doubles), or 'CREW' / 'AGENT' (only a 6 is a double).
  const pipDie = (n, who) => ({ n, dbl: CARDS.isDouble(who, n) });
  const KIT_NAME = { triage: 'Triage Agent', enrich: 'Enrichment Agent', contain: 'Containment Agent', recover: 'Recovery Agent' };

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
    // slots: the threat dice under the card for this crew (base dice, then the + die once per player past two).
    const mk = (m, boss) => { const d = CARDS.diceFor(m, boss), slots = CARDS.slotsFor(m, boss, n);
      return { uid: boss ? 'boss' : 'm' + (++uid), id: m.id, name: m.name, boss, dmg: m.dmg, kw: boss ? 'wyrm' : m.ability, persist: boss ? null : m.persist.slice(),
        domain: boss ? null : m.domain, top: boss ? null : CARDS.rowTop(m.persist[1]), printed: d.base.length, extra: d.extra, hits: slots.length, slots,
        off: Array(slots.length).fill(false), offStack: [], back: 0, up: 0 }; };
    const hp = opt.hp || HP;
    const G = { n, team: team.slice(), hp: team.map(() => hp), max: hp, r,
      feed: shuffle(CARDS.mobs().map(m => mk(m, false)), r), boss: mk(CARDS.boss(), true), bossOut: false, row: [], play: [], gone: [],
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
  const remaining = m => m.slots.filter((s, i) => !m.off[i]);
  const running = (G, t) => G.tray.filter(c => c.t === t).length;
  const on = (G, id) => G.team.includes(id);
  // Damage right now: Lockjaw +2 until it has lost two dice; Escalating +1 per round it stayed up.
  const dmgOf = (G, m) => m.boss ? m.dmg + (left(m) > m.hits - 2 ? 2 : 0) : m.dmg + (m.kw === 'ramp' ? m.up : 0);
  // The highest-Damage mob(s), judged on the Damage at the start of the round so a match can't flicker mid-assignment.
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
  // Roll the 2 amber dice: every row mob whose number is at least the sum comes back with all its dice. With strike,
  // the two highest-Damage comebacks hit everyone on arrival. Returns the comebacks (enter() puts them in play).
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
  const faceText = d => `${d.n}${d.dbl ? ' (double)' : ''}${d.turned ? ' (turned)' : ''}${d.crew ? '' : ' (agent)'}`;

  // Does this die's Hunter/Responder perk let it match one higher or one lower on this mob?
  const nearOK = (G, d, m) => { const id = d.crew ? G.team[d.k] : null; return (id === 'HUN' && m.back > 0) || (id === 'RES' && isTop(G, m)); };
  // What one die can do to one mob: { slots: indices it may take first, near: the ±1 ones, wild, dbl } or null.
  function canHit(G, d, m) {
    if (!d || !m || d.used || !left(m)) return null;
    if (!d.crew && m.boss) return null;                           // agent dice can't hit the boss
    if (m.kw === 'hardened' && !d.dbl) return null;               // Evasive: only a double hits it
    const free = m.slots.map((v, i) => i).filter(i => !m.off[i]);
    if (G.wildAll) return { slots: free, near: [], wild: true, dbl: d.dbl };
    const exact = free.filter(i => m.slots[i] === d.n), near = nearOK(G, d, m) ? free.filter(i => Math.abs(m.slots[i] - d.n) === 1) : [];
    if (!exact.length && !near.length) return null;
    return { slots: [...exact, ...near], near, wild: false, dbl: d.dbl };
  }
  const canGuard = (G, d) => !!d && d.crew && !d.used && d.dbl && !G.blocks[d.k];
  // Every legal use of a die, for the UI's slot highlights and for tests.
  function targets(G, di) {
    const d = G.dice[di]; if (!d || G.phase !== 'assign') return { hits: [], guard: false, enrich: false };
    const hits = []; for (const m of G.play) { const o = canHit(G, d, m); if (o) o.slots.forEach(p => hits.push({ uid: m.uid, p, n: m.slots[p], near: o.near.includes(p), wild: o.wild, dbl: o.dbl })); }
    return { hits, guard: canGuard(G, d), enrich: G.enrichLeft > 0 && d.crew && !d.used && !d.turned };
  }
  // After a double takes slot p on a mob: the slots it may take as its "one more" (any die still under that mob).
  const moreSlots = (m, p) => m.slots.map((v, i) => i).filter(i => i !== p && !m.off[i]);
  const snap = G => ({ dice: clone(G.dice), blocks: G.blocks.slice(), enrichLeft: G.enrichLeft, mobs: G.play.map(m => ({ uid: m.uid, off: m.off.slice(), offStack: m.offStack.slice() })) });
  const take = (m, p) => { m.off[p] = true; m.offStack.push(p); };

  // A die takes slot p (a die showing its number, or ±1 with a perk, or anything when wild). A double may also take
  // slot q: any one more die from the same mob. Omit p to take the first legal slot.
  function assign(G, di, uid, p, q) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di], m = findMob(G, uid); if (!d) fail('No such die.'); if (!m) fail('That mob isn’t in the fight.');
    if (d.used) fail('That die is already used. Undo it first.');
    const o = canHit(G, d, m); if (!o) fail(cantWhy(G, d, m));
    if (p == null) p = o.slots[0];
    if (!o.slots.includes(p)) fail(m.off[p] ? 'That die is already taken.' : `A ${d.n} can’t take the ${m.slots[p]} under ${m.name}.`);
    if (q != null) { if (!d.dbl) fail('Only a double takes one more.'); if (!moreSlots(m, p).includes(q)) fail('Pick another die still under the same mob.'); }
    G.undo.push(snap(G));
    take(m, p); const took = [m.slots[p]]; if (q != null) { take(m, q); took.push(m.slots[q]); }
    d.used = { uid, slots: q != null ? [p, q] : [p] };
    say(G, `${dieOwner(G, d)}’s ${faceText(d)} takes ${took.length > 1 ? `the ${took[0]} and the ${took[1]}` : `the ${took[0]}`} under ${m.name}${left(m) ? '' : ': beaten'}.`, 'hit');
    return G;
  }
  function cantWhy(G, d, m) {
    if (!left(m)) return `${m.name} is already beaten.`;
    if (!d.crew && m.boss) return 'Agent dice can’t hit the boss.';
    if (m.kw === 'hardened' && !d.dbl) return `${m.name} is Evasive: only a double hits it.`;
    return `No ${d.n} left under ${m.name} for that die.`;
  }
  const dieOwner = (G, d) => d.crew ? nameOf(G.team[d.k]) + (d.src === 'crew' ? ' (crew die)' : '') : 'Triage Agent';
  function guard(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Agent dice can’t guard.'); if (d.used) fail('That die is already used.');
    if (!d.dbl) fail('Only a double can guard.'); if (G.blocks[d.k]) fail(`${nameOf(G.team[d.k])} is already blocking.`);
    G.undo.push(snap(G)); d.used = 'guard'; G.blocks[d.k] = true;
    say(G, `${nameOf(G.team[d.k])} guards with a ${faceText(d)}: blocking this round.`, 'guard');
    return G;
  }
  // Running Enrichment Agent: once a round (per running card), turn one crew die to any number. The die keeps what it
  // was: a double stays a double, a single stays single (the sim's rule, and it stops "always turn to 6").
  function enrichTurn(G, di, n) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (G.enrichLeft < 1) fail('No Enrichment Agent turn left this round.');
    if (!d.crew) fail('Enrichment turns a crew die, not an agent die.'); if (d.used) fail('Undo that die first.'); if (d.turned) fail('That die is already turned.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    G.undo.push(snap(G)); d.from = d.n; d.n = n; d.turned = true; G.enrichLeft--;
    say(G, `Enrichment Agent turns ${dieOwner(G, d)}’s die from ${d.from} to ${faceText(d)}.`, 'kit');
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
      // Regen: put back the die it lost most recently.
      if (m.kw === 'regen' && m.offStack.length) { const p = m.offStack.pop(); m.off[p] = false; say(G, `${m.name} regenerates: its ${m.slots[p]} goes back under the card.`, 'mob'); }
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

  // Containment burn: which die comes off a mob. A repeated number first (it leaves the most different numbers to
  // match), else the highest. Returns a slot index, or -1.
  function containPick(m) {
    const free = m.slots.map((v, i) => i).filter(i => !m.off[i]); if (!free.length) return -1;
    const seen = {}; free.forEach(i => { seen[m.slots[i]] = (seen[m.slots[i]] || 0) + 1; });
    const dup = free.filter(i => seen[m.slots[i]] > 1);
    return (dup.length ? dup : free).reduce((a, b) => m.slots[b] >= m.slots[a] ? b : a);
  }

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
    if (c.t === 'enrich') { G.wildAll = true; say(G, 'Every die matches anything this round.', 'kit'); }
    if (c.t === 'contain') {
      for (const m of G.play) { if (!left(m) || (m.boss && left(m) <= 1)) continue; take(m, containPick(m)); }
      say(G, 'One die off every mob.', 'kit');
      if (G.phase === 'roll' && G.play.every(m => !left(m))) endRound(G);
    }
    if (c.t === 'recover') spread(G, D.recoverBurn, 'Recovery burn');
    return G;
  }

  return { HP, KIT_NAME, pipDie, rng, shuffle, newGame, setPoint, flip, roll, assign, guard, enrichTurn, unassign, endRound, burn, canBurn,
    discardKit, keepKit, targets, canHit, canGuard, moreSlots, containPick, incoming, dmgOf, left, remaining, running, nameOf, faceText, dieOwner, rollRow };
});
