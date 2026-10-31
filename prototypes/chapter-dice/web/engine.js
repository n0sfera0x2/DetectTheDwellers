// Chapter dice web prototype: the rules engine. DOM-free and deterministic given a seeded rng (opt.rnd or opt.seed).
// Plays exactly the paper rules sheet (../paper/build.js): the human assigns dice, the engine checks and resolves.
// Exact numbers (2026-10-30): every die is a standard pip d6, { n: 1–6, dbl }. A mob's hits are the threat dice set
// under its card (../cards.js slotsFor); a rolled die takes out one showing exactly its number. A double counts as two
// dice showing its number (d.takes holds up to two takes, on one mob or two), or guards. Once a round each player may
// reroll one of their own dice. Beaten mobs always go back to the row. Situations (2026-10-30): one flips before every
// flip after the first, and can leave conditions (Rattled, Exposed, Focused) on a player. The Hunter's 1s are wild on
// a mob that came back; the Engineer turns a die to its opposite side once a fight. Same rules as ../sim.js
// situation(), choose() and incoming(). Throwaway prototype code.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../data/cards.json'), require('../cards'));
  else root.CDEngine = factory(root.CD_DATA, root.CDCards);
})(typeof self !== 'undefined' ? self : this, function (D, CARDS) {
  const HP = 12; // starting HP (2026-10-31): situations, an analyst call each, Evasive takes any double, baselining; ~50% at 1–4 players in the sim
  // A rolled pip die. who: the analyst's id (their doubles), or 'CREW' / 'AGENT' (only a 6 is a double).
  const pipDie = (n, who) => ({ n, dbl: CARDS.isDouble(who, n) });
  // A crew die's double after it changes number: its owner's doubles (the solo crew die: a 6), none if rolled Rattled.
  const dieDbl = (G, d, n) => !d.rattled && CARDS.isDouble(d.src === 'crew' ? 'CREW' : G.team[d.k], n);
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
      sits: shuffle(CARDS.SIT_IDS, r), sit: null, sitDone: false, pending: [], mute: 0, bonusDraw: 0, engUsed: false, resUsed: false, stand: null, patUsed: false, soaUsed: false, aug: [], tuck: [], flipped: null, augReroll: false,
      cond: team.map(() => ({ rattled: false, exposed: false, focused: false })),
      point: 0, phase: 'flip', fight: 0, round: 0, dice: [], blocks: team.map(() => false), enrichLeft: 0, wildAll: false, roundDmg: {}, undo: [],
      over: false, win: false, log: [], rows: [], lastRow: null, drawn: [], beaten: [],
      stats: { rounds: 0, back: 0, flips: 0, guards: 0, burns: {}, gone: 0, healed: 0, sits: 0 } };
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
  const d6 = G => Math.floor(G.r() * 6);
  const findMob = (G, uid) => G.play.find(m => m.uid === uid);
  // A baselined alarm's line works while the agent it is tucked under is in the tray.
  const aug = (G, id) => G.aug.some(a => a.id === id && a.host && G.tray.some(c => c.uid === a.host));
  // Burning or discarding an agent ends what is tucked under it (unless the Soarcerer keeps the card).
  function loseAug(G, uid) { for (const a of G.aug.filter(a => a.host === uid)) say(G, `${a.name}’s baseline goes with it.`, 'kit'); G.aug = G.aug.filter(a => a.host !== uid); }
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
      // A baselined alarm waiting for an empty tray tucks under the next agent drawn.
      for (const a of G.aug.filter(a => !a.host)) { a.host = c.uid; say(G, `${a.name} tucks under the new ${KIT_NAME[c.t]}.`, 'kit'); }
    }
    G.drawn = got; if (!quiet && got.length) say(G, `Drew ${got.map(c => KIT_NAME[c.t]).join(' and ')}.`, 'kit');
    return got;
  }

  // ---- The persistence row ------------------------------------------------------------------------------------
  // Roll the 2 amber dice: every row mob whose number is at least the sum comes back with all its dice. With strike,
  // the two highest-Damage comebacks hit everyone on arrival. Returns the comebacks (enter() puts them in play).
  function rollRow(G, strike, why) {
    if (!G.row.length) return [];
    const plus = aug(G, 'wyrmling') ? 1 : 0, pair = [1 + d6(G), 1 + d6(G)], roll = pair[0] + pair[1] + plus, back = G.row.filter(m => roll <= m.top);
    G.row = G.row.filter(m => !back.includes(m));
    back.forEach(m => { m.off = Array(m.hits).fill(false); m.offStack = []; m.back++; m.up = 0; });
    G.stats.back += back.length;
    const strikes = strike && !aug(G, 'druid') ? back.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a)).slice(0, 2) : [];
    const rec = { roll, pair, plus, why, back: back.map(m => m.name), strikes: strikes.map(m => ({ name: m.name, dmg: dmgOf(G, m) })), seq: G.rows.length + 1, fight: G.fight, round: G.round };
    G.rows.push(rec); G.lastRow = rec;
    say(G, `Row roll ${pair.join(' + ')}${plus ? ' + 1 (Exfil Courier baseline)' : ''} = ${roll} (${why}): ${back.length ? back.map(m => m.name).join(', ') + (back.length > 1 ? ' come back.' : ' comes back.') : 'nothing comes back.'}`, 'row');
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
    if (G.sitDone) fail('On point is set: the situation already happened to them.');
    if (!(k >= 0 && k < G.n)) fail('No such analyst.'); G.point = k; return G;
  }
  // A situation is due before every flip after the first (the boss's too), once per flip.
  const sitDue = G => G.phase === 'flip' && G.fight > 0 && G.sits.length > 0 && !G.sitDone;
  function flip(G) {
    if (G.phase !== 'flip') fail('Not time to flip.');
    if (sitDue(G)) return revealSit(G);
    G.fight++; G.round = 0; G.stats.flips++; G.play = []; G.beaten = []; G.sit = null; G.sitDone = false; G.engUsed = false; G.resUsed = false; G.stand = null; G.patUsed = false; G.soaUsed = false;
    const pend = G.pending; G.pending = [];
    if (G.feed.length) {
      const m = G.feed.shift(); muteOn(G, m); G.flipped = m.uid; say(G, `Flip ${G.fight}: ${m.name}. ${nameOf(G.team[G.point])} is on point.`, 'flip');
      const back = rollRow(G, true, 'the flip'); if (G.over) return G;
      enter(G, m); [...pend, ...back].forEach(b => enter(G, b));
    } else {
      muteOn(G, G.boss); G.flipped = null; G.bossOut = true; say(G, `05:59. ${G.boss.name} arrives. ${nameOf(G.team[G.point])} is on point.`, 'flip');
      const back = rollRow(G, false, 'the boss arrives'); enter(G, G.boss); [...pend, ...back].forEach(b => enter(G, b));
    }
    if (!G.over) G.phase = 'roll';
    return G;
  }
  // Pager Storm muted: the mob flipped sets one more threat die, a 6, for this visit only (dropped when it is beaten).
  function muteOn(G, m) {
    for (; G.mute > 0; G.mute--) { m.slots.push(6); m.off.push(false); m.hits++; m.muted = (m.muted || 0) + 1; say(G, `${m.name} sets one more threat die: a 6 (Pager Storm).`, 'mob'); }
  }
  // Extra dice for this visit only (Pager Storm's 6, the Baseline dice) leave when it is beaten: a comeback has its printed dice.
  const unmute = m => { const k = (m.muted || 0) + (m.based || 0); if (!k) return; m.slots.splice(-k); m.off.splice(-k); m.offStack = m.offStack.filter(p => p < m.slots.length); m.hits -= k; m.muted = 0; m.based = 0; };

  // ---- Baselining ----------------------------------------------------------------------------------------------
  // Before the first roll, on point may baseline the alarm just flipped (never a comeback or the boss): it sets the
  // four dice on its Baseline line (+1 per player past 3). Beat it with them and it tucks under an agent.
  const canBaseline = (G, m) => !!m && G.phase === 'roll' && G.round === 0 && m.uid === G.flipped && !m.back && !m.boss && !m.based && !!CARDS.BASE[m.id] && G.play.includes(m);
  function baseline(G, uid) {
    const m = findMob(G, uid); if (!m) fail('That alarm isn’t in the fight.');
    if (!canBaseline(G, m)) fail(G.round > 0 || G.phase !== 'roll' ? 'Baseline it before the first roll.' : m.back ? 'A comeback can’t be baselined.' : m.based ? 'It is already being baselined.' : 'Only the alarm just flipped can be baselined.');
    const v = CARDS.baseDie(m.id), k = CARDS.BASE_N + Math.max(0, G.n - CARDS.PAST);
    for (let i = 0; i < k; i++) { m.slots.push(v); m.off.push(false); } m.hits += k; m.based = k; G.stats.baselines = (G.stats.baselines || 0) + 1;
    say(G, `${nameOf(G.team[G.point])} baselines ${m.name}: ${k} more dice, all ${v}s. Beat it with them and the agents learn it.`, 'mob');
    return G;
  }
  // After a won fight, each baselined alarm tucks under an agent of the crew's choice (phase 'tuck').
  function tuck(G, uid) {
    if (G.phase !== 'tuck' || !G.tuck.length) fail('Nothing to tuck.');
    const c = G.tray.find(x => x.uid === uid); if (!c) fail('Pick an agent in the tray.');
    const a = G.tuck.shift(); G.aug.push({ ...a, host: c.uid }); G.stats.baselined = (G.stats.baselined || 0) + 1;
    say(G, `${a.name} is baselined: it tucks under the ${KIT_NAME[c.t]}. ${CARDS.BASE[a.id]}`, 'kit');
    if (!G.tuck.length) toLoot(G);
    return G;
  }
  function toLoot(G) {
    G.phase = G.tray.length > G.cap ? 'loot' : 'flip';
    if (G.phase === 'loot') say(G, `The tray holds ${G.cap}. Discard ${G.tray.length - G.cap}.`, 'kit');
  }

  // ---- Situations and conditions -------------------------------------------------------------------------------
  // A condition card: a player can't hold two of the same (taking one you hold does nothing).
  function gain(G, k, c) {
    const name = CARDS.COND[c][0];
    if (G.cond[k][c]) { say(G, `${nameOf(G.team[k])} already holds ${name}.`, 'sit'); return; }
    G.cond[k][c] = true; say(G, `${nameOf(G.team[k])} takes ${name}.`, 'sit');
  }
  const rollN = (G, n) => Array.from({ length: n }, () => 1 + d6(G));
  const hpLine = G => G.team.map((id, k) => `${nameOf(id)} ${G.hp[k]}`).join(', ');
  function revealSit(G) {
    const id = G.sits.pop(), top = id === 'insider' ? (G.feed[0] || G.boss) : null;
    G.sit = { id, top: top && top.uid, topName: top && top.name, boss: !G.feed.length }; G.phase = 'sit'; G.stats.sits++;
    const d = D.situations ? D.situations.find(s => s.id === id) : null;
    say(G, `Situation: ${d ? d.name : id}. ${nameOf(G.team[G.point])} is on point.${top ? ` The top alarm, face up: ${top.name}.` : ''}`, 'sit');
    return G;
  }
  // Resolve the situation: opt is the option ('stay'/'run', 'ride'/'mute', 'grab'/'leave', 'dig'/'leave' with n
  // dice 1–4, 'ok', 'heal'/'agent'). The outcome stays on G.sit for the page: { opt, n, dice, won, text }.
  const SIT_OPTS = { insider: ['stay', 'run'], pager: ['ride', 'mute'], usb: ['grab', 'leave'], chatter: ['dig', 'leave'], lateral: ['ok'], patch: ['heal', 'agent'] };
  function resolveSit(G, opt, n) {
    if (G.phase !== 'sit') fail('No situation to resolve.');
    const S = G.sit, p = G.point, who = nameOf(G.team[p]);
    if (!SIT_OPTS[S.id].includes(opt)) fail('Not an option on this situation.');
    if (opt === 'run' && !G.feed.length) fail('The boss is next: you can’t fall back from it.');
    if (opt === 'dig' && !(n >= 1 && n <= 4 && n === Math.floor(n))) fail('Dig in with 1 to 4 dice.');
    let text = '', dice = null, won = null;
    if (opt === 'stay') { gain(G, p, 'exposed'); G.bonusDraw = 1; text = `${who} holds the room and takes Exposed. Win the next fight: draw an extra agent.`; }
    if (opt === 'run') {
      const m = G.feed.shift(), dm = dmgOf(G, m); text = `Fell back: ${m.name} hits everyone for ${dm} and goes on the row unfought.`; say(G, text, 'sit');
      G.team.forEach((_, k) => hurt(G, k, dm, `${m.name}, falling back`)); G.row.push(m); text += ` ${hpLine(G)} HP.`;
    }
    if (opt === 'ride') { text = 'Rode it out: everyone loses 2 HP.'; say(G, text, 'sit'); G.team.forEach((_, k) => hurt(G, k, 2, 'Pager Storm')); text += ` ${hpLine(G)} HP.`; }
    if (opt === 'mute') { G.mute++; text = `Muted: the next ${G.feed.length ? 'mob' : 'boss'} sets one more threat die, a 6.`; }
    if (opt === 'grab') {
      dice = rollN(G, 3); won = new Set(dice).size < 3;
      text = `${who} rolls ${dice.join(', ')}: ${won ? 'a pair' : 'no pair'}.`; say(G, text, 'sit');
      if (won) { const got = draw(G, 2); gain(G, p, 'focused'); text += ` Drew ${got.map(c => KIT_NAME[c.t]).join(' and ') || 'nothing'}; ${who} takes Focused.`; }
      else { gain(G, p, 'rattled'); text += ` ${who} takes Rattled.`; }
    }
    if (opt === 'dig') {
      dice = rollN(G, n); won = dice.includes(6);
      text = `${who} digs in with ${n} ${n === 1 ? 'die' : 'dice'}: ${dice.join(', ')}. ${won ? 'A 6.' : 'No 6.'}`; say(G, text, 'sit');
      if (won) { const got = draw(G, 2); text += ` Drew ${got.map(c => KIT_NAME[c.t]).join(' and ') || 'nothing'}.`; }
      else { hurt(G, p, n, 'Dark Web Chatter'); text += ` ${who} loses ${n} HP (${G.hp[p]} left).`; }
    }
    if (opt === 'leave') text = 'Left it alone. Nothing happens.';
    if (opt === 'ok') {
      const had = G.row.length, back = rollRow(G, true, 'Lateral Whispers'); G.pending.push(...back);
      text = !had ? 'The row is empty: nothing comes back.' : back.length ? `${back.map(m => m.name).join(', ')} ${back.length > 1 ? 'come back and join' : 'comes back and joins'} the next fight.` : 'Nothing comes back.';
    }
    if (opt === 'heal') { G.hp = G.hp.map(h => Math.min(G.max, h + 2)); text = `Took a breather: everyone heals 2. ${hpLine(G)} HP.`; }
    if (opt === 'agent') { const got = draw(G, 1); text = `Raided the supply closet: ${got.length ? KIT_NAME[got[0].t] : 'nothing left'}.`; }
    if (!['run', 'ride', 'grab', 'dig'].includes(opt)) say(G, text, 'sit');
    Object.assign(S, { opt, n: opt === 'dig' ? n : null, dice, won, text, done: true }); G.sitDone = true;
    if (G.over) return G;
    G.phase = G.tray.length > G.cap ? 'loot' : 'flip';
    if (G.phase === 'loot') say(G, `The tray holds ${G.cap}. Discard ${G.tray.length - G.cap}.`, 'kit');
    return G;
  }

  // ---- A fight round -------------------------------------------------------------------------------------------
  function roll(G) {
    if (G.phase !== 'roll') fail('Not time to roll.');
    G.round++; G.stats.rounds++;
    if (G.round > 1) { const back = rollRow(G, true, `round ${G.round}`); back.forEach(b => enter(G, b)); if (G.over) return G; }
    const dice = [];
    G.team.forEach((id, k) => {
      const nd = (G.n === 1 ? D.soloDice : k === G.point ? 2 : 1) + (k === G.point && aug(G, 'imp') ? 1 : 0); // + the Grifter baseline
      for (let i = 0; i < nd; i++) { const crewDie = G.n === 1 && i === D.soloDice - 1; dice.push({ k, crew: true, src: crewDie ? 'crew' : 'own', ...pipDie(1 + d6(G), crewDie ? 'CREW' : id) }); }
    });
    // Each running Triage Agent rolls its own die; kuid ties the die to its card (it sits under that card on the mat).
    for (const c of G.tray.filter(c => c.t === 'triage')) dice.push({ k: G.point, crew: false, src: 'agent', kuid: c.uid, ...pipDie(1 + d6(G), 'AGENT') });
    dice.forEach((d, i) => { d.i = i; d.used = null; d.takes = []; d.turned = false; });
    // Rattled: that player's dice in this roll have no doubles (they stay single if turned later). Then it's gone.
    dice.forEach(d => { if (d.crew && G.cond[d.k].rattled) { d.rattled = true; d.dbl = false; } });
    G.cond.forEach((c, k) => { if (c.rattled) { c.rattled = false; say(G, `${nameOf(G.team[k])} rolled Rattled: no doubles. Rattled is discarded.`, 'sit'); } });
    G.dice = dice; G.augReroll = aug(G, 'spray'); G.rerolled = G.team.map(() => false); G.blocks = G.team.map(() => false); G.enrichLeft = running(G, 'enrich'); G.wildAll = false; G.undo = [];
    G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = dmgOf(G, m); });
    G.phase = 'assign';
    say(G, `Round ${G.round}: rolled ${dice.map(faceText).join(', ')}.`, 'roll');
    return G;
  }
  const faceText = d => `${d.n}${d.dbl ? ' (double)' : ''}${d.turned ? ' (turned)' : ''}${d.crew ? '' : ' (agent)'}`;

  // What one die can do to one mob: { slots: indices it may take first, near: the ±1 ones, wild, dbl } or null.
  function canHit(G, d, m) {
    if (!d || !m || d.used || !left(m)) return null;               // d.used: spent (guarded, or every take made)
    if (!d.crew && m.boss) return null;                           // agent dice can't hit the boss
    if (m.kw === 'hardened' && !d.dbl) return null;               // Evasive: only a double hits it
    const free = m.slots.map((v, i) => i).filter(i => !m.off[i]);
    // Evasive: a double of another number takes out any one die (and is spent). Not after its first take.
    if (m.kw === 'hardened' && !G.wildAll && !hunts(G, d, m) && !free.some(i => m.slots[i] === d.n)) return d.takes.length ? null : { slots: free, near: [], wild: true, dbl: false, evade: true };
    if (G.wildAll || hunts(G, d, m)) return { slots: free, near: [], wild: true, dbl: d.dbl };
    const exact = free.filter(i => m.slots[i] === d.n), near = []; // no one-higher-or-lower matches in this test
    if (!exact.length && !near.length) return null;
    return { slots: [...exact, ...near], near, wild: false, dbl: d.dbl };
  }
  // The Hunter's 1s (own or solo crew die) match any number on a mob that has come back from the row.
  const hunts = (G, d, m) => d.crew && m.back > 0 && G.team[d.k] === 'HUN' && d.n === 1;
  const canGuard = (G, d) => !!d && d.crew && !d.flipped && !d.used && !(d.takes || []).length && d.dbl && !G.blocks[d.k];
  // How many takes a die has left: a double counts as two dice showing its number.
  const takesLeft = d => !d || d.used ? 0 : (d.dbl ? 2 : 1) - (d.takes || []).length;
  // Every legal use of a die, for the UI's slot highlights and for tests.
  function targets(G, di) {
    const d = G.dice[di]; if (!d || G.phase !== 'assign') return { hits: [], guard: false, enrich: false };
    const hits = []; for (const m of G.play) { const o = canHit(G, d, m); if (o) o.slots.forEach(p => hits.push({ uid: m.uid, p, n: m.slots[p], near: o.near.includes(p), wild: o.wild, dbl: o.dbl, evade: !!o.evade })); }
    return { hits, guard: canGuard(G, d), enrich: G.enrichLeft > 0 && d.crew && !d.used && !d.takes.length && !d.turned && !d.flipped, focus: canFocus(G, d), eng: canEng(G, d), nudge: canNudge(G, d) };
  }
  // After a double takes slot p on mob m: the other slots under m its second take may have (it may also go to
  // another mob; this is for taking both at once).
  const moreSlots = (G, d, m, p) => { const o = canHit(G, d, m); return o ? o.slots.filter(i => i !== p) : []; };
  const snap = G => ({ dice: clone(G.dice), blocks: G.blocks.slice(), enrichLeft: G.enrichLeft, mobs: G.play.map(m => ({ uid: m.uid, off: m.off.slice(), offStack: m.offStack.slice() })) });
  const take = (m, p) => { m.off[p] = true; m.offStack.push(p); };

  // A die takes slot p (a die showing its number, or ±1 with a perk, or anything when wild). A double counts as two
  // dice showing its number: call assign again (same mob or another) for its second take, or pass q to take a second
  // slot on this mob at once. Omit p to take the first legal slot.
  function assign(G, di, uid, p, q) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di], m = findMob(G, uid); if (!d) fail('No such die.'); if (!m) fail('That alarm isn’t in the fight.');
    if (d.used) fail('That die is already used. Undo it first.');
    const o = canHit(G, d, m); if (!o) fail(cantWhy(G, d, m));
    if (p == null) p = o.slots[0];
    if (!o.slots.includes(p)) fail(m.off[p] ? 'That die is already taken.' : `A ${d.n} can’t take the ${m.slots[p]} under ${m.name}.`);
    if (q != null) { if (takesLeft(d) < 2 || o.evade) fail('Only a double takes two.'); if (!moreSlots(G, d, m, p).includes(q)) fail(`A ${d.n} can’t take the ${m.slots[q]} under ${m.name}.`); }
    G.undo.push(snap(G));
    const took = [m.slots[p]]; take(m, p); d.takes.push({ uid, p });
    if (q != null) { took.push(m.slots[q]); take(m, q); d.takes.push({ uid, p: q }); }
    if (o.evade || !takesLeft(d)) d.used = { uid, slots: d.takes.map(t => t.p) };
    const rest = o.evade ? ` Evasive: a double of another number takes one die, and is spent.` : takesLeft(d) ? ` One more ${d.n} to place.` : '';
    say(G, `${dieOwner(G, d)}’s ${faceText(d)} takes ${took.length > 1 ? `the ${took[0]} and the ${took[1]}` : `the ${took[0]}`} under ${m.name}${left(m) ? '' : ': beaten'}.${rest}`, 'hit');
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
    if (!d.crew) fail('Agent dice can’t guard.'); if (d.used || d.takes.length) fail('That die is already used.');
    if (d.flipped) fail('A die turned to its opposite side can’t guard.');
    if (!d.dbl) fail('Only a double can guard.'); if (G.blocks[d.k]) fail(`${nameOf(G.team[d.k])} is already blocking.`);
    G.undo.push(snap(G)); d.used = 'guard'; G.blocks[d.k] = true;
    say(G, `${nameOf(G.team[d.k])} guards with a ${faceText(d)}: blocking this round.`, 'guard');
    return G;
  }
  // Reroll: once a round each player may reroll one of their own dice (crew dice they rolled, the solo crew die, and
  // Triage burn dice for whoever is on point), before it is used or turned. It can't be undone.
  const canReroll = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.used && !(d.takes || []).length && !d.turned && !d.flipped && (!(G.rerolled || [])[d.k] || G.augReroll);
  function reroll(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Agent dice can’t be rerolled.'); if (d.used || d.takes.length) fail('That die is already used.'); if (d.turned || d.flipped) fail('A turned die can’t be rerolled.');
    if (G.rerolled[d.k] && !G.augReroll) fail(`${nameOf(G.team[d.k])} has already rerolled this round.`);
    const extra = G.rerolled[d.k]; if (extra) G.augReroll = false; // the Password Sprayer baseline: one more reroll a round
    const was = d.n; d.n = 1 + d6(G); d.dbl = dieDbl(G, d, d.n); G.rerolled[d.k] = true; G.undo = [];
    G.stats.rerolls = (G.stats.rerolls || 0) + 1;
    say(G, `${dieOwner(G, d)} rerolls a ${was}: ${faceText(d)}${extra ? ' (Password Sprayer baseline)' : ''}.`, 'roll');
    return G;
  }
  // Running Enrichment Agent: once a round (per running card), turn one crew die to any number. The die keeps what it
  // was: a double stays a double, a single stays single (the sim's rule, and it stops "always turn to 6").
  function enrichTurn(G, di, n) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (G.enrichLeft < 1) fail('No Enrichment Agent turn left this round.');
    if (!d.crew) fail('Enrichment turns a crew die, not an agent die.'); if (d.used || d.takes.length) fail('Undo that die first.'); if (d.turned || d.flipped) fail('That die is already turned.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    G.undo.push(snap(G)); d.from = d.n; d.n = n; d.turned = true; G.enrichLeft--;
    say(G, `Enrichment Agent turns ${dieOwner(G, d)}’s die from ${d.from} to ${faceText(d)}.`, 'kit');
    return G;
  }
  // Focused: once, after rolling, turn one of your own crew dice to any number. It reads as its new number (a double
  // if that number is one of yours). Spends the Focused card; can't be undone.
  const canFocus = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.used && !(d.takes || []).length && G.cond[d.k].focused;
  function focus(G, di, n) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Focused turns one of your own dice, not an agent die.'); if (!G.cond[d.k].focused) fail(`${nameOf(G.team[d.k])} isn’t Focused.`);
    if (d.used || d.takes.length) fail('Undo that die first.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    d.from = d.n; d.n = n; d.dbl = dieDbl(G, d, n); d.focused = true; G.cond[d.k].focused = false; G.undo = []; G.stats.focus = (G.stats.focus || 0) + 1;
    say(G, `${dieOwner(G, d)} is Focused: turns a ${d.from} to ${faceText(d)}. Focused is discarded.`, 'sit');
    return G;
  }
  // The Engineer: once a fight, turn one of their own unused dice (own, solo crew die, Triage burn dice) to its
  // opposite side (7 − n). It counts as one die (never a double, so it can't guard) and can't be rerolled or turned
  // again. Can't be undone.
  const canEng = (G, d) => !!d && G.phase === 'assign' && d.crew && G.team[d.k] === 'ENG' && !G.engUsed && !d.used && !(d.takes || []).length && !d.flipped;
  function engTurn(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew || G.team[d.k] !== 'ENG') fail('Only the Engineer’s own dice turn to the opposite side.');
    if (G.engUsed) fail('The Engineer has turned a die this fight already.'); if (d.used || d.takes.length) fail('Undo that die first.');
    d.from = d.n; d.n = 7 - d.n; d.dbl = false; d.flipped = true; G.engUsed = true; G.undo = []; G.stats.flipped = (G.stats.flipped || 0) + 1;
    say(G, `${dieOwner(G, d)} turns a ${d.from} to its opposite side: ${faceText(d)}. It counts as one die.`, 'kit');
    return G;
  }
  // The Responder: once a fight, after rolling, pick a mob in the fight: it deals no damage this round. Can't be undone.
  const canStand = G => G.phase === 'assign' && on(G, 'RES') && !G.resUsed;
  function stand(G, uid) {
    if (G.phase !== 'assign') fail('Roll first.');
    if (!on(G, 'RES')) fail('Only the Responder stands an alarm down.'); if (G.resUsed) fail('The Responder has stood an alarm down this fight already.');
    const m = findMob(G, uid); if (!m || !left(m)) fail('Pick an alarm still in the fight.');
    G.stand = m.uid; G.resUsed = true; G.undo = []; G.stats.stand = (G.stats.stand || 0) + 1;
    say(G, `The Responder stands ${m.name} down: it deals no damage this round.`, 'kit');
    return G;
  }
  // The Fixer: once a fight, after rolling, turn one of their own unused dice one up or one down. It reads as its new
  // number (a double if that number is one of theirs). Can't be undone.
  const canNudge = (G, d) => !!d && G.phase === 'assign' && d.crew && G.team[d.k] === 'PAT' && !G.patUsed && !d.used && !(d.takes || []).length;
  function nudge(G, di, by) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew || G.team[d.k] !== 'PAT') fail('Only the Fixer’s own dice turn one up or down.');
    if (G.patUsed) fail('The Fixer has turned a die this fight already.'); if (d.used || d.takes.length) fail('Undo that die first.');
    const n = d.n + by; if (Math.abs(by) !== 1 || n < 1 || n > 6) fail('Turn it one up or one down, from 1 to 6.');
    d.from = d.n; d.n = n; d.dbl = d.rattled ? false : dieDbl(G, d, n); d.nudged = true; G.patUsed = true; G.undo = []; G.stats.nudge = (G.stats.nudge || 0) + 1;
    say(G, `The Fixer turns a ${d.from} to ${faceText(d)}.`, 'kit');
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
    const total = G.team.map(() => 0), by = [], up = G.play.filter(m => left(m) && m.uid !== G.stand); // a stood-down mob deals nothing
    const dm = new Map(up.map(m => [m, dmgOf(G, m)]));
    for (let i = 0; i < running(G, 'contain'); i++) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
    if (aug(G, 'mailer')) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], t[1] - 1); } // the Mailer Daemon baseline
    for (const m of up) {
      const d = dm.get(m), pierce = m.kw === 'noblock'; let to = [], each = d;
      if (m.kw === 'onpoint') { each = d * 2; if (pierce || !blocks[G.point]) to = [G.point]; }
      else to = G.team.map((_, k) => k).filter(k => pierce || !blocks[k]);
      to.forEach(k => { total[k] += each; }); by.push({ uid: m.uid, name: m.name, dmg: each, base: dmgOf(G, m), to });
    }
    // Exposed: anyone hit this round takes 1 more.
    const exposed = G.team.map((_, k) => k).filter(k => G.cond[k].exposed && total[k] > 0); exposed.forEach(k => { total[k]++; });
    return { total, by, exposed };
  }

  function endRound(G) {
    if (G.phase !== 'assign' && !(G.phase === 'roll' && G.play.every(m => !left(m)))) fail('Not time to end the round.');
    G.stats.guards += G.dice.filter(d => d.used === 'guard').length;
    const beaten = G.play.filter(m => !left(m)); G.beaten = beaten.map(m => m.uid);
    if (beaten.some(m => m.boss)) { G.over = true; G.win = true; G.phase = 'over'; say(G, `${G.boss.name} is beaten. You survived the night.`, 'end'); return G; }
    for (const m of beaten) {
      // Every beaten mob goes back on the row, however often it has come back.
      if (m.based && !G.tuck.some(a => a.uid === m.uid)) { G.tuck.push({ id: m.id, name: m.name, uid: m.uid }); say(G, `${m.name} is beaten with its Baseline dice.`, 'win'); }
      unmute(m); G.row.push(m); say(G, `${m.name} is beaten and goes on the persistence row (back on 2–${m.top}).`, 'beat');
    }
    G.play = G.play.filter(m => left(m));
    const inc = incoming(G, G.blocks);
    inc.by.forEach(x => x.to.forEach(k => hurt(G, k, x.dmg, `${x.name} hits back`)));
    inc.exposed.forEach(k => hurt(G, k, 1, 'Exposed'));
    G.dice = []; G.undo = []; G.wildAll = false; G.blocks = G.team.map(() => false); G.stand = null;
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
  // Won fight: running Recovery Agents heal, then draw agents. Over the tray's limit, the player discards.
  function afterFight(G) {
    say(G, `Fight ${G.fight} won in ${G.round} round${G.round === 1 ? '' : 's'}.`, 'win');
    G.cond.forEach((c, k) => { if (c.exposed) { c.exposed = false; say(G, `${nameOf(G.team[k])} discards Exposed.`, 'sit'); } });
    const rec = running(G, 'recover'); if (rec) spread(G, rec * D.recoverHeal, 'Recovery Agent');
    if (aug(G, 'mimic')) spread(G, 5, 'Rootkit Implant baseline');
    draw(G, (G.n === 1 ? D.kitSolo : D.kitPerFight) + G.bonusDraw); G.bonusDraw = 0; // + Hold the room
    // Baselined alarms tuck under an agent (the crew picks which); with an empty tray they wait for the next one drawn.
    if (G.tuck.length && !G.tray.length) { G.tuck.forEach(a => { G.aug.push({ ...a, host: null }); say(G, `${a.name} is baselined. The tray is empty: it waits for the next agent drawn.`, 'kit'); }); G.tuck = []; }
    if (G.tuck.length) { G.phase = 'tuck'; return G; }
    toLoot(G);
    return G;
  }
  function discardKit(G, uid) {
    if (G.phase !== 'loot') fail('The tray isn’t over its limit.');
    const i = G.tray.findIndex(c => c.uid === uid); if (i < 0) fail('No such agent in the tray.');
    const [c] = G.tray.splice(i, 1); G.discard.push(c); say(G, `Discarded ${KIT_NAME[c.t]}.`, 'kit'); loseAug(G, c.uid);
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
    // The Soarcerer: the first agent burned each fight stays in the tray.
    const kept = on(G, 'SOA') && !G.soaUsed; if (kept) { G.soaUsed = true; G.stats.kept = (G.stats.kept || 0) + 1; } else { G.tray.splice(G.tray.indexOf(c), 1); G.discard.push(c); }
    G.undo = []; G.stats.burns[c.t] = (G.stats.burns[c.t] || 0) + 1;
    say(G, `Burned the ${KIT_NAME[c.t]}${kept ? '. The Soarcerer keeps it in the tray' : ''}.`, 'burn');
    if (!kept) loseAug(G, c.uid);
    if (c.t === 'triage') {
      const id = G.team[G.point];
      for (let i = 0; i < 3; i++) G.dice.push({ i: G.dice.length, k: G.point, crew: true, src: 'burn', ...pipDie(1 + d6(G), id), used: null, takes: [], turned: false });
      say(G, `${nameOf(id)} rolls 3 more: ${G.dice.slice(-3).map(faceText).join(', ')}.`, 'roll');
    }
    if (c.t === 'enrich') { G.wildAll = true; say(G, 'Every die matches anything this round.', 'kit'); }
    if (c.t === 'contain') {
      for (const m of G.play) { if (!left(m) || (m.boss && left(m) <= 1)) continue; take(m, containPick(m)); }
      say(G, 'One die off every alarm.', 'kit');
      if (G.phase === 'roll' && G.play.every(m => !left(m))) endRound(G);
    }
    if (c.t === 'recover') spread(G, D.recoverBurn, 'Recovery burn');
    return G;
  }

  return { aug, baseline, canBaseline, tuck, HP, KIT_NAME, SIT_OPTS, pipDie, rng, shuffle, newGame, setPoint, flip, sitDue, resolveSit, focus, engTurn, canFocus, canEng, stand, canStand, nudge, canNudge, hunts, roll, assign, guard, enrichTurn, unassign, endRound, burn, canBurn,
    discardKit, keepKit, targets, canHit, canGuard, canReroll, reroll, takesLeft, moreSlots, containPick, incoming, dmgOf, left, remaining, running, nameOf, faceText, dieOwner, rollRow };
});
