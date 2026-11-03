// Detect the Dwellers: the rules engine. DOM-free and deterministic given a seeded rng (opt.rnd or opt.seed).
// Plays exactly the paper rules sheet (../paper/build.js): the human assigns dice, the engine checks and resolves.
// Exact numbers (2026-10-30): every die is a standard pip d6, { n: 1–6, dbl }. A mob's hits are the threat dice set
// under its card (../cards.js slotsFor); a rolled die takes out one showing exactly its number. A double counts as two
// dice showing its number (d.takes holds up to two takes, on one mob or two), or guards. Once a round each player may
// reroll one of their own dice. Beaten mobs always go back to the row. Situations (2026-10-30): one flips before every
// flip after the first, and can leave conditions (Rattled, Exposed, Focused) on a player. Four analysts with signature
// doubles (2026-10-31): the Hunter's 1s match any number on any alarm; the Engineer turns a die to its opposite side once
// a round; the Soarcerer holds one more agent. Items (2026-10-31): every drawn item is dealt to a player. Agents are
// passive and sit in the holder's slots (G.agents[k]: 2, the Soarcerer 3; solo 4, or 5); consumables go in hand
// (G.hand[k], no limit) and are used once. Same rules as ../sim.js (NEWITEMS, PERSONAL, CONSFREE, slotsK, huntsAny,
// ENGFLIP, rowRoll, incoming). Guard anyone and pairs (2026-10-31): a guard blocks any one player who isn't blocking
// yet; two of a player's own unused dice showing the same number pair up into one double (sim.js GUARDANY, PAIRADD).
// Solo, the Soarcerer rolls a die on every consumable used and keeps it on a 2 or 6 (SOASOLOKEEP=roll). Solo starts with
// 1 item (QSOLO). Baselining sets 4 dice at every crew size. Crew-wide agents (2026-11-01): Triage rolls one more die
// of its holder's own, Containment, Recovery and Enrichment work for the whole crew; baselining costs 3 dice and only
// the four heavier alarms can be baselined; solo starts with 2 items; HP 10.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../data/cards.json'), require('../cards'));
  else root.CDEngine = factory(root.CD_DATA, root.CDCards);
})(typeof self !== 'undefined' ? self : this, function (D, CARDS) {
  const HP = 10; // starting HP (2026-11-01): crew-wide agents, Triage as a crew die, 3-die baselining; ~53% at 1p, 56% at 2p, 55% at 4p in the sim
  const START_ITEMS = { solo: 2, crew: 2 }; // items drawn at setup: solo 2 (since 2026-11-01), a crew of 2–4 draws 2
  // Quick Shift solo starts with 1 (2026-11-02: solo ran 12 points ahead of a crew in the short feed).
  // A crew of 3 or 4 draws one more (2026-11-03: the Responder's doubles no longer guard, and 4p fell 9–15 points behind 2p).
  const startItems = (n, mode = 'full') => n === 1 ? (MODES[mode] && MODES[mode].soloItems) || START_ITEMS.solo : START_ITEMS.crew + (n >= 3 ? 1 : 0);
  // A rolled pip die. who: the analyst's id (their doubles), or 'CREW' / 'AGENT' (only a 6 is a double).
  const pipDie = (n, who) => ({ n, dbl: CARDS.isDouble(who, n) });
  // A crew die's double after it changes number: its owner's doubles (the solo crew die: a 6), none if rolled Rattled.
  const dieDbl = (G, d, n) => !d.rattled && CARDS.isDouble(d.src === 'crew' ? 'CREW' : G.team[d.k], n);
  // Every item's name, from the shared cards (agents and consumables).
  const KIT_NAME = Object.fromEntries(Object.entries(CARDS.ITEM).map(([t, v]) => [t, v[0]]));
  const isAgent = t => CARDS.isAgent(t);

  function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clone = x => JSON.parse(JSON.stringify(x));
  const nameOf = id => CARDS.cls(id).name; // the analyst's name, from the shared cards

  // ---- Setup ------------------------------------------------------------------------------------------------
  // The modes (2026-11-02): one situation deck holds all 15 alarms and 18 situations. Quick Shift deals 8 of the 24
  // core cards (8 since 2026-11-02: 6 left too few comebacks); Full Shift deals 3 story cards and 11 core. The boss is drawn from three; its row trigger is Full Shift
  // only. Same deals as sim.js MODE, DEALQ, DEALF and STORYF.
  // The squeeze (2026-11-03): bosses hit for 5, alarms hit 1 harder from the fourth fight, and the push. Four analysts
  // with one passive line each (same day): Then (same day) guards cover only their owner, HP rose to 12 (Quick) and 16 (Full); a reroll costs 1 HP (once a
  // round); 4 item slots a player (solo 6), consumables included; solo starts with 2 items; a crew of 3–4 with 3.
  const MODES = { quick: { label: 'Quick Shift', deal: 8, story: 0, hp: 12, soloItems: 2, bossRow: false }, full: { label: 'Full Shift', deal: 14, story: 3, hp: 17, soloItems: 2, bossRow: true } };
  function newGame(opt = {}) {
    const team = opt.team || ['HUN', 'RES'], n = team.length;
    if (n < 1 || n > 4) throw new Error('1–4 players');
    const r = opt.rnd || rng(opt.seed == null ? 1 : opt.seed);
    let uid = 0;
    // slots: the threat dice under the card for this crew (base dice, then the + die once per player past three).
    const mk = (m, boss) => { const d = CARDS.diceFor(m, boss), slots = CARDS.slotsFor(m, boss, n);
      return { uid: boss ? 'boss' : 'm' + (++uid), id: m.id, name: m.name, boss, dmg: m.dmg, kw: boss ? m.id : m.ability, persist: boss ? null : m.persist.slice(),
        domain: boss ? null : m.domain, top: boss ? null : CARDS.rowTop(m.persist[1]), printed: d.base.length, extra: d.extra, hits: slots.length, slots,
        off: Array(slots.length).fill(false), offStack: [], back: 0, up: 0 }; };
    const mode = opt.mode || 'quick', M = MODES[mode]; if (!M) throw new Error('No such mode: ' + mode);
    const hp = opt.hp || M.hp, sc = id => ({ sit: id, uid: 's-' + id });
    const core = shuffle([...CARDS.mobs().map(m => mk(m, false)), ...CARDS.SIT_CORE.map(sc)], r), story = shuffle(CARDS.SIT_STORY.map(sc), r).slice(0, M.story);
    // opt.alarmsOnly (tests): the feed is all 15 alarms and no situations. opt.boss picks the boss.
    const feed = opt.alarmsOnly ? shuffle(CARDS.mobs().map(m => mk(m, false)), r) : shuffle([...story, ...core.slice(0, M.deal - story.length)], r), bossId = opt.boss || CARDS.BOSS_IDS[Math.floor(r() * CARDS.BOSS_IDS.length)];
    const G = { n, mode, team: team.slice(), hp: team.map(() => hp), max: hp, r,
      feed, feedTotal: feed.length, alarmsTotal: feed.filter(c => !c.sit).length, boss: mk(CARDS.boss(bossId), true), bossOut: false, row: [], play: [], gone: [],
      // The item deck (cards.js ITEM_DECK), each card a { uid, t }. Drawn items wait in G.deal until someone takes them.
      kit: shuffle(CARDS.ITEM_DECK.map((t, i) => ({ uid: 'k' + (i + 1), t })), r), discard: [], deal: [], dealNext: 'flip',
      agents: team.map(() => []), hand: team.map(() => []), freeze: false,
      sit: null, sitDone: false, badgeSkip: false, once: { slip: {}, ticket: {} }, spotUsed: team.map(() => 0), slipOn: [], pending: [], mute: 0, bonusDraw: 0, engUsed: false, aug: [], tuck: [], flipped: null, augReroll: false,
      cond: team.map(() => ({ rattled: false, exposed: false, focused: false })),
      point: 0, phase: 'flip', fight: 0, won: 0, round: 0, dice: [], blocks: team.map(() => false), enrichLeft: 0, wildAll: false, roundDmg: {}, undo: [],
      over: false, win: false, log: [], rows: [], lastRow: null, drawn: [], beaten: [],
      stats: { rounds: 0, back: 0, flips: 0, guards: 0, used: {}, gone: 0, healed: 0, sits: 0, items: { triage: 0, contain: 0, recover: 0, enrich: 0, surge: 0, intel: 0, isolate: 0, coffee: 0, freeze: 0, twin: 0, ghost: 0, scramble: 0, repair: 0, spotlight: 0, slip: 0, ticket: 0, momentum: 0, persist: 0, siphon: 0, callback: 0 } } };
    const si = startItems(n, mode);
    say(G, `Shift starts: ${team.map(nameOf).join(' + ')} at ${hp} HP. ${n === 1 ? 'You draw' : 'The crew draws'} ${si === 1 ? 'an item' : si + ' items'}.`);
    draw(G, si); toDeal(G, 'flip');
    return G;
  }
  const say = (G, text, kind = 'info') => { G.log.push({ text, kind, fight: G.fight, round: G.round }); };

  // ---- Helpers ----------------------------------------------------------------------------------------------
  const left = m => m.off.filter(x => !x).length;
  const remaining = m => m.slots.filter((s, i) => !m.off[i]);
  // Agent slots: 2 each (the Soarcerer 3). Solo: 4 (the Soarcerer 5). Same as sim.js slotsK.
  // Since review 2 the Soarcerer's ability is baselining, not a slot (sim.js SOAPERK=auto).
  // Item slots (2026-11-03): agents and consumables share them, 4 a player (solo 6). G.agents and G.hand still hold
  // the two kinds apart; together they fill the slots.
  const slotsOf = (G, k) => G.n === 1 ? 6 : 4;
  const heldN = (G, k) => G.agents[k].length + G.hand[k].length;
  // How many agents of type t player k holds (every player's, without k). A Twin agent (the Grifter's trait) counts as two.
  // The Rogue AI: while it's in play, agents and their traits do nothing.
  const aiUp = G => G.play.some(m => m.boss && m.kw === 'ai');
  const running = (G, t, k) => aiUp(G) ? 0 : (k == null ? G.agents.flat() : G.agents[k] || []).reduce((s, c) => s + (c.t === t ? weight(G, c.uid) : 0), 0);
  // Traits by name (two alarms carry each): on one agent card, and across every held agent. Stacked traits add up.
  const traitsOn = (G, uid, name) => G.aug.filter(a => a.host === uid && CARDS.traitName(a.id) === name).length;
  const traitCount = (G, name) => aiUp(G) ? 0 : G.aug.filter(a => a.host && CARDS.traitName(a.id) === name && G.agents.some(h => h.some(c => c.uid === a.host))).length;
  const cardOf = (G, uid) => G.agents.flat().find(c => c.uid === uid);
  const tuckedOn = (G, uid) => G.aug.filter(a => a.host === uid).length;
  // Two tucked alarms (the cap) upgrade the agent: Triage rolls one more, Enrichment one more turn, Containment cuts 1
  // more, Recovery heals 2 more (cards.js AGENT, sim.js UPGRADE).
  const upgraded = (G, uid) => tuckedOn(G, uid) >= CARDS.TUCK_CAP;
  const weight = (G, uid) => { const c = cardOf(G, uid); return 1 + traitsOn(G, uid, 'Twin') + (c && upgraded(G, uid) && (c.t === 'triage' || c.t === 'enrich') ? 1 : 0); };
  // The players holding agents that carry a trait: [{ k, uid, a }] (none while the Rogue AI is up).
  const traitHolders = (G, name) => aiUp(G) ? [] : G.aug.filter(a => a.host && CARDS.traitName(a.id) === name).map(a => ({ k: G.agents.findIndex(h => h.some(c => c.uid === a.host)), uid: a.host, a })).filter(x => x.k >= 0);
  // Every held agent with its holder: [{ c, k }].
  const heldAgents = G => G.agents.flatMap((a, k) => a.map(c => ({ c, k })));
  const on = (G, id) => G.team.includes(id);
  // Damage right now: Lockjaw +2 until it has lost two dice; Escalating +1 per round it stayed up.
  // The CEO's Inbox (plus): +2 for one visit.
  // Threat: every THREAT_AFTER fights won, every alarm (not the boss) hits 1 harder, up to THREAT_MAX.
  const threat = G => Math.min(CARDS.THREAT_MAX, Math.floor((G.won || 0) / CARDS.THREAT_AFTER));
  const dmgOf = (G, m) => (m.plus || 0) + (m.boss ? 0 : threat(G)) + (m.boss ? m.dmg + (m.kw === 'wyrm' && left(m) > m.hits - 2 ? 2 : 0) : m.dmg + (m.kw === 'ramp' ? m.up : 0));
  const d6 = G => Math.floor(G.r() * 6);
  const BOSS_STEPS = CARDS.BOSS_STEPS;
  const findMob = (G, uid) => G.play.find(m => m.uid === uid);
  // A baselined alarm gives the agent it is tucked under a trait (cards.js TRAIT), kept while anyone holds that agent:
  // Twin (Grifter) and Repair (Rootkit) change the agent itself; Ghost (Scavenger) and Scramble (Courier) guard the row.
  const aug = (G, id) => !aiUp(G) && G.aug.some(a => a.id === id && a.host && G.agents.some(h => h.some(c => c.uid === a.host)));
  // Discarding an agent ends what is tucked under it.
  // The tucked alarm card slides out from under it and goes back on the row (it was off the row while tucked).
  function loseAug(G, uid) { for (const a of G.aug.filter(a => a.host === uid)) { say(G, `${a.name} slides out from under it: its trait is lost, and it goes back on the row.`, 'kit'); if (a.mob) G.row.push(a.mob); } G.aug = G.aug.filter(a => a.host !== uid); }
  const fail = msg => { const e = new Error(msg); e.rule = true; throw e; };

  function hurt(G, k, n, why) {
    if (n <= 0 || G.over) return;
    G.hp[k] = Math.max(0, G.hp[k] - n); say(G, `${nameOf(G.team[k])} takes ${n} (${why}). ${G.hp[k]} HP left.`, 'hurt');
    // Persist: once, anyone about to drop to 0 stays at 1; then the tucked card leaves the game.
    const ps = !G.hp[k] && traitHolders(G, 'Persist')[0];
    if (ps) { G.hp[k] = 1; G.aug = G.aug.filter(a => a !== ps.a); if (ps.a.mob) G.gone.push(ps.a.mob); G.stats.items.persist++; say(G, `Persist: ${nameOf(G.team[k])} stays at 1 HP. ${ps.a.name} leaves the game.`, 'kit'); }
    if (!G.hp[k]) { G.over = true; G.win = false; G.phase = 'over'; say(G, `${nameOf(G.team[k])} is down. The shift is lost.`, 'end'); }
  }
  // Heal n HP one at a time onto whoever is lowest, never above the start.
  function spread(G, n, why) {
    let got = 0; for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) break; G.hp[k]++; got++; }
    if (n > 0) say(G, `${why}: healed ${got} HP split across the crew.`, 'heal'); G.stats.healed += got; return got;
  }
  // Draw n items from the item deck into G.deal: each waits there until the crew gives it to someone (phase 'deal').
  function draw(G, n, quiet) {
    const got = [];
    for (let i = 0; i < n; i++) {
      if (!G.kit.length && G.discard.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; say(G, 'Item deck empty: shuffled the discards into a new item deck.'); }
      const c = G.kit.pop(); if (!c) break; G.deal.push(c); got.push(c);
    }
    G.drawn = got; if (!quiet && got.length) say(G, `Drew ${got.map(c => KIT_NAME[c.t]).join(' and ')}.`, 'kit');
    return got;
  }

  // ---- Dealing items ---------------------------------------------------------------------------------------------
  // Drawn items wait in G.deal; phase 'deal' until each has a holder, then G.dealNext. Solo deals itself, except an
  // agent into full slots (the player picks which agent goes, or keeps the new one out).
  function toDeal(G, next) {
    G.dealNext = next; G.phase = G.deal.length ? 'deal' : next; autoDeal(G);
    if (G.phase === 'deal' && G.n > 1) say(G, `Deal ${G.deal.length === 1 ? 'the new item' : `the ${G.deal.length} new items`}: give each to someone.`, 'kit');
    return G;
  }
  // Does giving the item on top of the deal to player k need them to discard an agent first?
  const dealFull = (G, k) => !!G.deal[0] && heldN(G, k) >= slotsOf(G, k);
  function autoDeal(G) {
    if (G.n !== 1) return;
    while (G.phase === 'deal' && G.deal.length && !dealFull(G, 0)) give(G, 0);
  }
  // Give the item on top of the deal to player k: it takes a free slot. With their slots full, drop names an item of
  // theirs to discard (an agent takes what's tucked under it along), or the new card's own uid to keep it out.
  function give(G, k, drop) {
    if (G.phase !== 'deal' || !G.deal.length) fail('Nothing to deal.');
    if (!(k >= 0 && k < G.n)) fail('No such analyst.');
    const c = G.deal[0], who = nameOf(G.team[k]);
    if (drop != null && drop === c.uid) { G.deal.shift(); G.discard.push(c); say(G, `Kept the ${KIT_NAME[c.t]} out: discarded.`, 'kit'); return afterGive(G); }
    if (heldN(G, k) >= slotsOf(G, k)) {
      if (drop == null) fail(`${who} holds ${slotsOf(G, k)} items already: discard one of theirs, or keep the new one out.`);
      const i = G.agents[k].findIndex(x => x.uid === drop), j = G.hand[k].findIndex(x => x.uid === drop); if (i < 0 && j < 0) fail(`Pick one of ${who}’s items to discard.`);
      const [old] = i >= 0 ? G.agents[k].splice(i, 1) : G.hand[k].splice(j, 1); G.discard.push(old); say(G, `${who} discards the ${KIT_NAME[old.t]}.`, 'kit'); if (i >= 0) loseAug(G, old.uid);
    }
    G.deal.shift(); (isAgent(c.t) ? G.agents : G.hand)[k].push(c); say(G, `${who} takes the ${KIT_NAME[c.t]} (${heldN(G, k)}/${slotsOf(G, k)} slots).`, 'kit');
    // A baselined alarm waiting for an agent tucks under the next one dealt.
    if (isAgent(c.t)) for (const a of G.aug.filter(a => !a.host)) { a.host = c.uid; say(G, `${a.name} tucks under the ${KIT_NAME[c.t]}.`, 'kit'); }
    return afterGive(G);
  }
  function afterGive(G) { if (!G.deal.length) G.phase = G.dealNext; else autoDeal(G); return G; }

  // ---- The persistence row ------------------------------------------------------------------------------------
  // Roll the 2 amber dice: every row mob whose number is at least the sum comes back with all its dice. With strike,
  // the two highest-Damage comebacks hit everyone on arrival. Returns the comebacks (enter() puts them in play).
  // Change Freeze: the next row roll that would roll is skipped (any kind: a flip, a round, a Beacon, Lateral Whispers).
  function rollRow(G, strike, why) {
    if (!G.row.length) return [];
    if (G.freeze) { G.freeze = false; G.stats.frozen = (G.stats.frozen || 0) + 1; G.stats.items.freeze++; say(G, `Change Freeze: no row roll (${why}).`, 'row'); return []; }
    const plus = traitCount(G, 'Scramble'), pair = [1 + d6(G), 1 + d6(G)];
    // Callback: reroll one amber die (the page rerolls the lower one when it is 3 or less: a higher sum keeps more on the row).
    let called = null; if (traitHolders(G, 'Callback').length && Math.min(...pair) <= 3) { const j = pair[0] <= pair[1] ? 0 : 1, was = pair[j]; pair[j] = 1 + d6(G); called = [was, pair[j]]; G.stats.items.callback++; }
    const roll = pair[0] + pair[1] + plus, back = G.row.filter(m => roll <= m.top);
    G.row = G.row.filter(m => !back.includes(m));
    back.forEach(m => { m.off = Array(m.hits).fill(false); m.offStack = []; m.back++; m.up = 0; });
    G.stats.back += back.length;
    const top2 = strike ? back.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a)).slice(0, 2) : [], ghost = traitCount(G, 'Ghost') > 0, strikes = ghost ? [] : top2;
    // What the traits did: Ghost's arrival damage stopped, Scramble's comebacks that its +1 kept on the row.
    if (ghost && top2.length) { const n = top2.reduce((s, m) => s + dmgOf(G, m), 0) * G.n; G.stats.items.ghost += n; say(G, `Ghost: ${top2.map(m => m.name).join(' and ')} ${top2.length > 1 ? 'come' : 'comes'} back without hitting anyone (${n} damage stopped).`, 'kit'); }
    if (plus) { const kept = G.row.filter(m => m.top === roll - 1); G.stats.items.scramble += kept.length; if (kept.length) say(G, `Scramble: the +1 keeps ${kept.map(m => m.name).join(' and ')} on the row.`, 'kit'); }
    const rec = { roll, pair, plus, why, back: back.map(m => m.name), strikes: strikes.map(m => ({ name: m.name, dmg: dmgOf(G, m) })), seq: G.rows.length + 1, fight: G.fight, round: G.round };
    G.rows.push(rec); G.lastRow = rec;
    say(G, `Row roll ${pair.join(' + ')}${plus ? ' + 1 (Scramble)' : ''} = ${roll} (${why}): ${back.length ? back.map(m => m.name).join(', ') + (back.length > 1 ? ' come back.' : ' comes back.') : 'nothing comes back.'}`, 'row');
    if (called) say(G, `Callback: rerolled the ${called[0]}, now a ${called[1]}.`, 'kit');
    // The Responder in the crew: arrival hits deal the Responder's crewmates 1 less.
    for (const m of strikes) G.team.forEach((id, k) => hurt(G, k, dmgOf(G, m), `${m.name} arrives`));
    return back;
  }
  function enter(G, m) {
    if (G.over) return; G.play.push(m);
    if (m.kw === 'beacon') for (const b of rollRow(G, true, `${m.name}’s Beacon`)) enter(G, b);
  }

  // ---- Flip ---------------------------------------------------------------------------------------------------
  function setPoint(G, k) {
    if (G.phase !== 'flip') fail('Pick who’s on point before the flip.');
    if (G.sitDone) fail('On point is set: they stay on point through the situation and the next fight.');
    if (!(k >= 0 && k < G.n)) fail('No such analyst.'); G.point = k; return G;
  }
  // The top feed card is a situation (face down at the table: the page never shows this before the flip).
  const sitDue = G => G.phase === 'flip' && !!G.feed[0] && !!G.feed[0].sit;
  const alarmsLeft = G => G.feed.filter(c => !c.sit).length;
  function flip(G) {
    if (G.phase !== 'flip') fail('Not time to flip.');
    if (sitDue(G)) return revealSit(G);
    G.fight++; G.round = 0; G.stats.flips++; G.play = []; G.beaten = []; G.sit = null; G.sitDone = false;
    G.once = { slip: {}, ticket: {}, move: false }; // once-a-fight trait uses (Slip, Golden ticket) and the Soarcerer's move
    const pend = G.pending; G.pending = [];
    if (G.feed.length) {
      const m = G.feed.shift();
      // Fell back (The Badge That Wasn’t): this alarm goes straight on the row, unfought. No fight, no row roll, no draw.
      if (G.badgeSkip) { G.badgeSkip = false; G.pending = pend; G.row.push(m); G.stats.skipped = (G.stats.skipped || 0) + 1; G.phase = 'flip'; say(G, `Flip ${G.fight}: ${m.name}. You fell back: it goes straight on the row, unfought (back on 2–${m.top}).`, 'flip'); return G; }
      muteOn(G, m); G.flipped = m.uid; say(G, `Flip ${G.fight}: ${m.name}. ${nameOf(G.team[G.point])} is on point.`, 'flip');
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
    // Ghost in the Change Window: a copy of the first die on its card. The CEO's Inbox, let it ride: +2 Damage this visit.
    for (; G.addFirst > 0; G.addFirst--) { const v = m.slots[0]; m.slots.push(v); m.off.push(false); m.hits++; m.muted = (m.muted || 0) + 1; say(G, `${m.name} sets one more threat die: a ${v} (Ghost in the Change Window).`, 'mob'); }
    if (G.nextPlus) { m.plus = G.nextPlus; G.nextPlus = 0; say(G, `${m.name} gets +${m.plus} Damage this fight (The CEO’s Inbox).`, 'mob'); }
  }
  // Extra dice for this visit only (Pager Storm's 6, the Baseline dice) leave when it is beaten: a comeback has its printed dice.
  const unmute = m => { m.plus = 0; const k = (m.muted || 0) + (m.based || 0); if (k) { m.slots.splice(-k); m.off.splice(-k); m.offStack = m.offStack.filter(p => p < m.slots.length); m.hits -= k; m.muted = 0; m.based = 0; }
    };

  // ---- Baselining ----------------------------------------------------------------------------------------------
  // Before the first roll, on point may baseline the alarm just flipped (never a comeback or the boss): it sets the
  // four dice on its Baseline line, at every crew size. Beat it with them and it tucks under an agent.
  // Review 2: a comeback can be baselined too, with one more Baseline die; the Soarcerer makes it 2 (a comeback 3).
  const baseCost = (G, m) => CARDS.BASE_N + (m.back ? 1 : 0);
  const canBaseline = (G, m) => !!m && G.phase === 'roll' && G.round === 0 && (m.uid === G.flipped || m.back > 0) && !m.boss && !m.based && !!CARDS.BASE[m.id] && G.play.includes(m);
  function baseline(G, uid) {
    const m = findMob(G, uid); if (!m) fail('That alarm isn’t in the fight.');
    if (!canBaseline(G, m)) fail(G.round > 0 || G.phase !== 'roll' ? 'Baseline it before the first roll.' : m.based ? 'It is already being baselined.' : 'Only the alarm just flipped can be baselined.');
    const v = CARDS.baseDie(m.id), k = baseCost(G, m);
    for (let i = 0; i < k; i++) { m.slots.push(v); m.off.push(false); } m.hits += k; m.based = k; G.stats.baselines = (G.stats.baselines || 0) + 1;
    say(G, `${nameOf(G.team[G.point])} baselines ${m.name}: ${k} more dice, all ${v}s. Beat it with them and the agents learn it.`, 'mob');
    return G;
  }
  // After a won fight, each baselined alarm tucks under an agent someone holds, the crew's choice (phase 'tuck').
  function tuck(G, uid) {
    if (G.phase !== 'tuck' || !G.tuck.length) fail('Nothing to tuck.');
    const h = heldAgents(G).find(x => x.c.uid === uid); if (!h) fail('Pick an agent someone holds.');
    if (tuckedOn(G, uid) >= CARDS.TUCK_CAP) fail(`That agent already holds ${CARDS.TUCK_CAP} tucked alarms.`);
    const a = G.tuck.shift(), c = h.c; G.aug.push({ ...a, host: c.uid }); G.stats.baselined = (G.stats.baselined || 0) + 1;
    say(G, `${a.name} is baselined: it tucks under ${nameOf(G.team[h.k])}’s ${KIT_NAME[c.t]}. ${CARDS.BASE[a.id]}`, 'kit');
    if (!G.tuck.length) toDeal(G, 'flip');
    return G;
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
  const sitName = id => { const d = D.situations && D.situations.find(s => s.id === id); return d ? d.name : id; };
  function revealSit(G) {
    const id = G.feed.shift().sit;
    G.sit = { id, boss: !G.feed.length, alarms: alarmsLeft(G) }; G.phase = 'sit'; G.stats.sits++;
    const d = D.situations ? D.situations.find(s => s.id === id) : null;
    say(G, `Situation: ${d ? d.name : id}. ${nameOf(G.team[G.point])} is on point.`, 'sit');
    return G;
  }
  // Resolve the situation: opt is the option ('stay'/'run', 'ride'/'mute', 'grab'/'leave', 'dig'/'leave' with n
  // dice 1–4, 'ok', 'heal'/'agent'). The outcome stays on G.sit for the page: { opt, n, dice, won, text }.
  const SIT_OPTS = { insider: ['stay', 'run'], pager: ['ride', 'mute'], usb: ['grab', 'leave'], chatter: ['dig', 'leave'], lateral: ['ok'], patch: ['heal', 'agent'],
    travel: ['chase', 'leave'], coffee: ['round', 'shot'], blast: ['all', 'point'], ciso: ['ok'], intel: ['ok'], pentest: ['runit', 'resched'], budget: ['tools', 'training'], ceo: ['quarantine', 'letride'], change: ['ok'], ioc: ['ok'], honey: ['ok'], vendor: ['rotate', 'cutoff'] };
  function resolveSit(G, opt, n) {
    if (G.phase !== 'sit') fail('No situation to resolve.');
    const S = G.sit, p = G.point, who = nameOf(G.team[p]);
    if (!SIT_OPTS[S.id].includes(opt)) fail('Not an option on this situation.');
    if (opt === 'run' && !alarmsLeft(G)) fail('No alarm left in the feed: you can’t fall back.');
    if (opt === 'resched' && !G.hand.some(h => h.length)) fail('Nobody holds a consumable to discard.');
    if (opt === 'dig' && !(n >= 1 && n <= 4 && n === Math.floor(n))) fail('Dig in with 1 to 4 dice.');
    let text = '', dice = null, won = null;
    if (opt === 'stay') { gain(G, p, 'exposed'); G.bonusDraw = 1; text = `${who} holds the room and takes Exposed. Win the next fight: draw an item.`; }
    if (opt === 'run') { G.badgeSkip = true; const got = draw(G, 2); text = `Fell back: the next alarm that flips goes straight on the row, unfought. Drew ${got.map(c => KIT_NAME[c.t]).join(' and ') || 'nothing'}.`; }
    if (opt === 'ride') { text = 'Rode it out: everyone loses 2 HP and you draw an item.'; say(G, text, 'sit'); G.team.forEach((_, k) => hurt(G, k, 2, 'Pager Storm')); text += ` ${hpLine(G)} HP.`; if (!G.over) { const got = draw(G, 1); text += ` Drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing'}.`; } }
    if (opt === 'mute') { G.mute++; text = `Muted: the next ${alarmsLeft(G) ? 'alarm' : 'boss'} sets one more threat die, a 6.`; }
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
    if (opt === 'leave' && S.id === 'usb') { const got = draw(G, 1); text = `Left it alone and played it safe: drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing'}.`; }
    else if (opt === 'leave') text = 'Left it alone. Nothing happens.';
    const everyone = (n, why) => { if (n > 0) { G.hp = G.hp.map(h => Math.min(G.max, h + n)); G.stats.healed += n * G.n; } else G.team.forEach((_, k) => hurt(G, k, -n, why)); };
    const nm = sitName(S.id);
    // Review 2: five situations became choices. The old event paths still resolve the main option.
    if ({ chase: 'travel', runit: 'pentest', rotate: 'vendor' }[opt] === S.id) opt = 'ok';
    if (opt === 'resched') { const j = G.hand.findIndex(h => h.length); if (j < 0) fail('Nobody holds an item to discard.'); const c = G.hand[j].shift(); G.discard.push(c); text = `Rescheduled: ${nameOf(G.team[j])} discards the ${KIT_NAME[c.t]}.`; say(G, text, 'sit'); }
    if (opt === 'round') { everyone(2); text = `Passed it round: everyone heals 2. ${hpLine(G)} HP.`; say(G, text, 'sit'); }
    if (opt === 'shot') { const lo = G.hp.indexOf(Math.min(...G.hp)), h = Math.min(5, G.max - G.hp[lo]); G.hp[lo] += h; G.stats.healed += h; text = `Double shot: ${nameOf(G.team[lo])} heals ${h}. ${hpLine(G)} HP.`; say(G, text, 'sit'); }
    if (opt === 'tools') { const got = draw(G, 2); text = `Tools: drew ${got.map(c => KIT_NAME[c.t]).join(' and ') || 'nothing'}.`; say(G, text, 'sit'); }
    if (opt === 'training') { const got = draw(G, 1); everyone(2); text = `Training: drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing'}, and everyone heals 2. ${hpLine(G)} HP.`; say(G, text, 'sit'); }
    if (opt === 'cutoff') { text = `Cut them off: ${who} loses 3 HP, and the row stays put.`; say(G, text, 'sit'); hurt(G, p, 3, nm); }
    if (opt === 'ok' && S.id !== 'lateral') {
      if (S.id === 'travel' || S.id === 'ciso') { dice = rollN(G, 2); const t = dice[0] + dice[1]; won = S.id === 'travel' ? t >= 7 : t >= 6; text = `${who} rolls ${dice.join(' + ')} = ${t}.`; say(G, text, 'sit');
        if (S.id === 'travel') { if (won) { const got = draw(G, 1); text += ` Drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing'}.`; } else { hurt(G, p, 2, nm); text += ` ${who} loses 2 HP.`; } }
        else if (won) text += ' The briefing lands.'; else { hurt(G, p, 3, nm); text += ` ${who} loses 3 HP.`; } }
      if (S.id === 'pentest') { dice = rollN(G, G.n); won = dice.every(v => v > 2); text = `Everyone rolls: ${dice.map((v, k) => `${nameOf(G.team[k])} ${v}`).join(', ')}.`; say(G, text, 'sit'); dice.forEach((v, k) => { if (v <= 2) hurt(G, k, 2, nm); }); }
      if (S.id === 'coffee' || S.id === 'honey') { everyone(S.id === 'coffee' ? 3 : 2); text = `Everyone heals ${S.id === 'coffee' ? 3 : 2}. ${hpLine(G)} HP.`; say(G, text, 'sit'); }
      if (S.id === 'budget') { const got = draw(G, 2); text = `Budget approved: drew ${got.map(c => KIT_NAME[c.t]).join(' and ') || 'nothing'}.`; say(G, text, 'sit'); }
      if (S.id === 'intel') { const t = G.row.slice().sort((a, b) => b.dmg - a.dmg)[0]; if (t) { G.row = G.row.filter(m => m !== t); G.gone.push(t); G.stats.gone++; } text = t ? `${t.name} leaves the game for good.` : 'The row is empty: nothing to drop.'; say(G, text, 'sit'); }
      if (S.id === 'change') { G.addFirst = (G.addFirst || 0) + 1; text = 'The next alarm you flip sets one more threat die: a copy of its first die.'; say(G, text, 'sit'); }
      if (S.id === 'ioc') { const t = G.row.slice().sort((a, b) => b.top - a.top)[0]; if (t) { G.row = G.row.filter(m => m !== t); t.off = Array(t.hits).fill(false); t.offStack = []; t.back++; t.up = 0; G.stats.back++; G.pending.push(t); } text = t ? `${t.name} comes back now, with no arrival hit. It joins the next fight.` : 'The row is empty: nothing comes back.'; say(G, text, 'sit'); }
      if (S.id === 'vendor') { text = 'Everyone loses 2 HP, then you roll the row.'; say(G, text, 'sit'); everyone(-2, nm); if (!G.over) { const back = rollRow(G, true, nm); G.pending.push(...back); text += back.length ? ` ${back.map(m => m.name).join(', ')} ${back.length > 1 ? 'come' : 'comes'} back and joins the next fight.` : ' Nothing comes back.'; } }
    }
    if (opt === 'all') { text = 'Everyone triages: everyone loses 1 HP.'; say(G, text, 'sit'); everyone(-1, nm); }
    if (opt === 'point') { text = `${who} takes it alone: loses 3 HP and draws an item.`; say(G, text, 'sit'); hurt(G, p, 3, nm); if (!G.over) { const got = draw(G, 1); text += ` Drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing'}.`; } }
    if (opt === 'quarantine') { text = 'Quarantined everything: everyone loses 2 HP.'; say(G, text, 'sit'); everyone(-2, nm); }
    if (opt === 'letride') { G.nextPlus = (G.nextPlus || 0) + 2; text = 'You let it ride: the next alarm you flip gets +2 Damage this fight.'; say(G, text, 'sit'); }
    if (opt === 'ok' && S.id === 'lateral') {
      const had = G.row.length, back = rollRow(G, true, 'Lateral Whispers'); G.pending.push(...back);
      text = !had ? 'The row is empty: nothing comes back.' : back.length ? `${back.map(m => m.name).join(', ')} ${back.length > 1 ? 'come back and join' : 'comes back and joins'} the next fight.` : 'Nothing comes back.';
    }
    if (opt === 'heal') { G.hp = G.hp.map(h => Math.min(G.max, h + 3)); text = `Took a breather: everyone heals 3. ${hpLine(G)} HP.`; }
    if (opt === 'agent') { const got = draw(G, 1); text = `Raided the supply closet: drew ${got.length ? 'the ' + KIT_NAME[got[0].t] : 'nothing, the deck is empty'}. ${who} loses 1 HP.`; say(G, text, 'sit'); hurt(G, p, 1, 'the supply closet'); }
    if (!['ride', 'grab', 'dig', 'agent', 'all', 'point', 'quarantine', 'letride', 'resched', 'round', 'shot', 'tools', 'training', 'cutoff'].includes(opt) && !(opt === 'ok' && S.id !== 'lateral')) say(G, text, 'sit');
    Object.assign(S, { opt, n: opt === 'dig' ? n : null, dice, won, text, done: true }); G.sitDone = true;
    if (G.over) return G;
    return toDeal(G, 'flip');
  }

  // ---- A fight round -------------------------------------------------------------------------------------------
  function roll(G) {
    if (G.phase !== 'roll') fail('Not time to roll.');
    G.round++; G.stats.rounds++; G.engUsed = false; // the Engineer's turn is once a round
    if (G.round > 1) { const back = rollRow(G, true, `round ${G.round}`); back.forEach(b => enter(G, b)); if (G.over) return G; }
    const dice = [];
    G.team.forEach((id, k) => {
      // The Hunter (2026-11-03): on point, one more of their own dice (solo: one more own die, the crew die stays last).
      const nd = (G.n === 1 ? D.soloDice : k === G.point ? 2 : 1) + (id === 'HUN' && k === G.point ? 1 : 0);
      for (let i = 0; i < nd; i++) { const crewDie = G.n === 1 && i === nd - 1, hunX = id === 'HUN' && k === G.point && i === 0; /* the Hunter's extra die: never a double */ dice.push({ k, crew: true, src: crewDie ? 'crew' : 'own', ...pipDie(1 + d6(G), crewDie ? 'CREW' : id), ...(hunX ? { dbl: false, plain: true } : {}) }); }
    });
    // Each Triage Agent: its holder rolls one more of their own dice (it pairs, guards, rerolls and hits the boss like
    // any of theirs); kuid ties the die to its card (it sits under that card).
    if (!aiUp(G)) G.agents.forEach((a, k) => a.filter(c => c.t === 'triage').forEach(c => { for (let j = weight(G, c.uid); j > 0; j--) dice.push({ k, crew: true, src: 'triage', kuid: c.uid, twin: j > 1, ...pipDie(1 + d6(G), G.team[k]) }); }));
    // Momentum: from round 2 of a fight, each holder rolls one more of their own dice.
    if (G.round >= 2) traitHolders(G, 'Momentum').forEach(({ k }) => { dice.push({ k, crew: true, src: 'momentum', ...pipDie(1 + d6(G), G.team[k]) }); G.stats.items.momentum++; });
    dice.forEach((d, i) => { d.i = i; d.used = null; d.takes = []; d.turned = false; });
    // Rattled: that player's dice in this roll have no doubles (they stay single if turned later). Then it's gone.
    dice.forEach(d => { if (d.crew && G.cond[d.k].rattled) { d.rattled = true; d.dbl = false; } });
    G.cond.forEach((c, k) => { if (c.rattled) { c.rattled = false; say(G, `${nameOf(G.team[k])} rolled Rattled: no doubles. Rattled is discarded.`, 'sit'); } });
    G.dice = dice; G.augReroll = aug(G, 'spray'); G.rerolled = G.team.map(() => false); G.blocks = G.team.map(() => false); G.enrichLeft = running(G, 'enrich'); G.wildAll = false; G.undo = []; G.spotUsed = G.team.map(() => 0); G.slipOn = [];
    G.roundDmg = {}; G.play.forEach(m => { G.roundDmg[m.uid] = dmgOf(G, m); });
    G.phase = 'assign';
    say(G, `Round ${G.round}: rolled ${dice.map(faceText).join(', ')}.`, 'roll');
    return G;
  }
  const faceText = d => `${d.n}${d.dbl ? (d.paired != null ? ' (paired double)' : ' (double)') : ''}${d.turned ? ' (turned)' : ''}${d.crew ? '' : ' (agent)'}`;

  // What one die can do to one mob: { slots: indices it may take first, near: the ±1 ones, wild, dbl } or null.
  function canHit(G, d, m) {
    if (!d || !m || d.used || !left(m)) return null;               // d.used: spent (guarded, or every take made)
    if (!d.crew && m.boss) return null;                           // agent dice can't hit the boss
    if (m.kw === 'hardened' && !d.dbl) return null;               // Evasive: only a double hits it
    const free = m.slots.map((v, i) => i).filter(i => !m.off[i]);
    // Evasive: a double of another number takes out any one die (and is spent). Not after its first take.
    if (m.kw === 'hardened' && !G.wildAll && !free.some(i => m.slots[i] === d.n)) return d.takes.length ? null : { slots: free, near: [], wild: true, dbl: false, evade: true };
    if (G.wildAll) return { slots: free, near: [], wild: true, dbl: d.dbl };
    // The Soarcerer (2026-11-03): any of their dice is a double for baselining. It takes Baseline dice (the last m.based
    // slots) whatever number it shows, two of them. A second take it earned that way (d.baseTwo) goes only on Baseline dice.
    const base = soaBase(G, d, m) ? free.filter(i => i >= m.slots.length - m.based) : [];
    if (d.baseTwo && d.takes.length) return base.length ? { slots: base, near: [], wild: true, dbl: true } : null;
    const exact = [...new Set([...free.filter(i => m.slots[i] === d.n), ...base])], near = []; // no one-higher-or-lower matches in this test
    if (!exact.length && !near.length) return null;
    return { slots: [...exact, ...near], near, wild: false, dbl: d.dbl };
  }
  // A guard covers only the player who rolled it (2026-11-03; it covered anyone from 2026-10-31). The Responder's
  // doubles heal instead.
  const resDie = (G, d) => !!d && d.crew && G.team[d.k] === 'RES';
  const canGuard = (G, d) => !!d && d.crew && !resDie(G, d) && !d.flipped && !d.used && !(d.takes || []).length && d.dbl && !G.blocks[d.k];
  // The Responder: a double of theirs can't guard; instead it heals anyone 5 (CARDS.RES_HEAL), right away. Like a guard,
  // it spends the whole double. Can't be undone.
  const canHeal = (G, d) => G.phase === 'assign' && resDie(G, d) && !d.flipped && !d.used && !(d.takes || []).length && d.dbl;
  function heal(G, di, target) {
    const d = G.dice[di]; if (!canHeal(G, d)) fail('Only an unused Responder double heals.');
    const t = target == null ? d.k : target; if (!(t >= 0 && t < G.n && t === Math.floor(t))) fail('No such analyst.');
    const h = Math.min(CARDS.RES_HEAL, G.max - G.hp[t]); d.used = 'heal'; G.hp[t] += h; G.stats.healed += h; G.stats.resHeal = (G.stats.resHeal || 0) + h; G.undo = [];
    say(G, `${nameOf(G.team[d.k])} spends a ${faceText(d)} to heal ${t === d.k ? 'themselves' : nameOf(G.team[t])} ${h}. ${hpLine(G)} HP.`, 'heal');
    return G;
  }
  // Who a guard could cover now: every player not yet blocking (each covers only themselves).
  const guardable = G => G.team.map((_, k) => k).filter(k => !G.blocks[k]);
  // Pairs (2026-10-31): two of a player's own unused crew dice (their own, or the solo crew die) showing the same number
  // pair into one double. Not an agent die, a Surge Playbook die, a die turned by the Engineer, a die that is already a
  // double, or while Rattled. The pair counts as two dice showing that number (it takes two) or guards, never both.
  const pairable = d => !!d && d.crew && (d.src === 'own' || d.src === 'crew' || d.src === 'triage' || d.src === 'momentum') && !d.used && !(d.takes || []).length && !d.dbl && !d.flipped && !d.rattled && !d.paired;
  const canPair = (G, a, b) => G.phase === 'assign' && a !== b && pairable(a) && pairable(b) && a.k === b.k && a.n === b.n;
  // Every pair the crew could make right now: [[i, j], ...], i < j, each die in one pair at most.
  function pairs(G) {
    if (G.phase !== 'assign') return [];
    const out = [], seen = new Set();
    G.dice.forEach(a => { if (seen.has(a.i)) return; const b = G.dice.find(x => x.i > a.i && !seen.has(x.i) && canPair(G, a, x)); if (b) { out.push([a.i, b.i]); seen.add(a.i); seen.add(b.i); } });
    return out;
  }
  // How many takes a die has left: a double counts as two dice showing its number.
  const takesLeft = d => !d || d.used ? 0 : (d.dbl || d.baseTwo ? 2 : 1) - (d.takes || []).length;
  // A Soarcerer die against an alarm being baselined; isBase: slot p is one of its Baseline dice.
  const soaBase = (G, d, m) => !!d && d.crew && G.team[d.k] === 'SOA' && !!m && m.based > 0;
  const isBase = (m, p) => p >= m.slots.length - (m.based || 0);
  // Every legal use of a die, for the UI's slot highlights and for tests.
  function targets(G, di) {
    const d = G.dice[di]; if (!d || G.phase !== 'assign') return { hits: [], guard: false, enrich: false };
    const hits = []; for (const m of G.play) { const o = canHit(G, d, m); if (o) o.slots.forEach(p => hits.push({ uid: m.uid, p, n: m.slots[p], near: o.near.includes(p), wild: o.wild, dbl: o.dbl, evade: !!o.evade })); }
    return { hits, guard: canGuard(G, d), enrich: G.enrichLeft > 0 && d.crew && !d.used && !d.takes.length && !d.turned && !d.flipped && d.paired == null, focus: canFocus(G, d), eng: canEng(G, d) };
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
    const two = !d.dbl && soaBase(G, d, m) && isBase(m, p) && (q == null || isBase(m, q)); // the Soarcerer's double for baselining
    if (q != null) { if (takesLeft(d) < 2 || o.evade) fail('Only a double takes two.'); if (!moreSlots(G, d, m, p).includes(q)) fail(`A ${d.n} can’t take the ${m.slots[q]} under ${m.name}.`); }
    G.undo.push(snap(G)); if (two && !d.takes.length) d.baseTwo = true; // after the snapshot, so undo clears it
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
  const dieOwner = (G, d) => d.crew ? nameOf(G.team[d.k]) + (d.src === 'crew' ? ' (crew die)' : d.src === 'surge' ? ' (Surge Playbook)' : d.src === 'triage' ? ' (Triage Agent)' : '') : `${nameOf(G.team[d.k])}’s Triage Agent`;
  // A double guards: it blocks any one player who isn't blocking yet (target; default the die's owner).
  function guard(G, di, target) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Agent dice can’t guard.'); if (d.used || d.takes.length) fail('That die is already used.');
    if (d.flipped) fail('A die turned to its opposite side can’t guard.');
    if (!d.dbl) fail('Only a double can guard.'); if (resDie(G, d)) fail('The Responder’s doubles heal instead of guarding.');
    const t = target == null ? d.k : target;
    if (!(t >= 0 && t < G.n && t === Math.floor(t))) fail('No such analyst.'); if (t !== d.k) fail('A double guards only the player who rolled it.');
    if (G.blocks[t]) fail(`${nameOf(G.team[t])} is already blocking.`);
    G.undo.push(snap(G)); d.used = 'guard'; d.guards = t; G.blocks[t] = true;
    say(G, `${nameOf(G.team[d.k])} guards ${t === d.k ? 'themselves' : nameOf(G.team[t])} with a ${faceText(d)}: ${t === d.k ? 'blocking' : `${nameOf(G.team[t])} blocks`} this round.`, 'guard');
    return G;
  }
  // Pair two of a player's own dice showing the same number into one double (die i becomes the double; die j joins it
  // and is spent). Can be undone.
  function pair(G, i, j) {
    if (G.phase !== 'assign') fail('Roll first.');
    const a = G.dice[i], b = G.dice[j]; if (!a || !b || i === j) fail('Pick two dice.');
    if (!a.crew || !b.crew || a.src === 'agent' || b.src === 'agent') fail('Agent dice can’t pair.');
    if (a.src === 'surge' || b.src === 'surge') fail('Only the dice you rolled pair up.');
    if (a.k !== b.k) fail('Only two of your own dice pair up.');
    if (a.used || b.used || a.takes.length || b.takes.length) fail('Undo those dice first.');
    if (a.flipped || b.flipped) fail('A die turned to its opposite side can’t pair.');
    if (a.rattled || b.rattled) fail('Rattled: no doubles this roll, so no pairs.');
    if (a.dbl || b.dbl) fail('A double can’t pair: it is a double already.');
    if (a.n !== b.n) fail(`A ${a.n} and a ${b.n} don’t pair: they must show the same number.`);
    G.undo.push(snap(G));
    a.dbl = true; a.paired = j; b.used = 'pair'; b.pairedTo = i; G.stats.pairs = (G.stats.pairs || 0) + 1;
    say(G, `${dieOwner(G, a)} pairs two ${a.n}s: a double ${a.n}.`, 'roll');
    return G;
  }
  // Reroll (2026-11-03, one rule for the free reroll and the push): once a round, a player may take 1 damage to reroll
  // one of their own dice (crew dice they rolled, the solo crew die, their Surge Playbook dice), before it is used or
  // turned. Never at 1 HP. It can't be undone.
  const canReroll = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.used && !(d.takes || []).length && !d.turned && !d.flipped && d.paired == null && (!(G.rerolled || [])[d.k] || G.augReroll) && G.hp[d.k] > CARDS.PUSH_COST;
  function reroll(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Agent dice can’t be rerolled.'); if (d.used || d.takes.length) fail('That die is already used.'); if (d.turned || d.flipped) fail('A turned die can’t be rerolled.');
    if (d.paired != null) fail('Undo the pair first.');
    if (G.rerolled[d.k] && !G.augReroll) fail(`${nameOf(G.team[d.k])} has already rerolled this round.`);
    const extra = G.rerolled[d.k]; if (extra) G.augReroll = false; // the Password Sprayer baseline: one more reroll a round
    if (G.hp[d.k] <= CARDS.PUSH_COST) fail('You can’t reroll at 1 HP.');
    G.rerolled[d.k] = true; hurt(G, d.k, CARDS.PUSH_COST, 'reroll'); const was = d.n; d.n = 1 + d6(G); d.dbl = dieDbl(G, d, d.n); G.undo = [];
    G.stats.rerolls = (G.stats.rerolls || 0) + 1;
    say(G, `${dieOwner(G, d)} rerolls a ${was}: ${faceText(d)}${extra ? ' (Password Sprayer baseline)' : ''}.`, 'roll');
    return G;
  }
  // Enrichment Agent (crew-wide since 2026-11-01): once a round per card, turn any crew die to any number. The die keeps
  // what it was: a double stays a double, a single stays single (the sim's rule, and it stops "always turn to 6").
  function enrichTurn(G, di, n) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Enrichment turns a crew die, not an agent die.');
    if (!(G.enrichLeft > 0)) fail('No Enrichment Agent turn left this round.'); if (d.used || d.takes.length) fail('Undo that die first.'); if (d.turned || d.flipped) fail('That die is already turned.');
    if (d.paired != null) fail('Undo the pair first.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    G.undo.push(snap(G)); d.from = d.n; d.n = n; d.turned = true; d.enriched = true; G.enrichLeft--;
    say(G, `Enrichment Agent turns ${dieOwner(G, d)}’s die from ${d.from} to ${faceText(d)}.`, 'kit');
    return G;
  }
  // ---- Review 2: trait actions and the new analysts ------------------------------------------------------------
  const usesLeft = (G, name, k, used) => traitHolders(G, name).filter(h => h.k === k).length - (used[k] || 0);
  // Spotlight: once a round per trait, one of its holder's dice counts as a double.
  const canSpot = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.dbl && !d.used && !(d.takes || []).length && usesLeft(G, 'Spotlight', d.k, G.spotUsed || []) > 0;
  function spotlight(G, di) {
    const d = G.dice[di]; if (!canSpot(G, d)) fail('No Spotlight for that die.');
    G.undo.push(snap(G)); d.dbl = true; d.spot = true; G.spotUsed[d.k]++; G.stats.items.spotlight++;
    say(G, `Spotlight: ${dieOwner(G, d)}’s ${d.n} counts as a double.`, 'kit'); return G;
  }
  // Golden ticket: once a fight per trait, turn one of its holder's dice to any number (it reads as that number).
  const canTicket = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.used && !(d.takes || []).length && d.paired == null && usesLeft(G, 'Golden ticket', d.k, G.once.ticket) > 0;
  function ticket(G, di, n) {
    const d = G.dice[di]; if (!canTicket(G, d)) fail('No Golden ticket for that die.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    G.undo = []; G.once.ticket[d.k] = (G.once.ticket[d.k] || 0) + 1; d.from = d.n; d.n = n; d.dbl = dieDbl(G, d, n); d.focused = true; G.stats.items.ticket++;
    say(G, `Golden ticket: ${dieOwner(G, d)}’s die turns from ${d.from} to ${faceText(d)}.`, 'kit'); return G;
  }
  // Slip: once a fight per trait, one alarm's hit misses its holder this round (pick it before the round ends).
  const canSlip = (G, k) => G.phase === 'assign' && usesLeft(G, 'Slip', k, G.once.slip) > 0;
  function slip(G, k, uid) {
    if (!canSlip(G, k)) fail('No Slip left for that player this fight.'); const m = findMob(G, uid); if (!m || !left(m)) fail('Pick an alarm still in the fight.');
    G.undo = []; G.once.slip[k] = (G.once.slip[k] || 0) + 1; G.slipOn.push({ k, uid }); G.stats.items.slip++;
    say(G, `Slip: ${m.name}’s hit will miss ${nameOf(G.team[k])} this round.`, 'kit'); return G;
  }
  // Focused: once, after rolling, turn one of your own crew dice to any number. It reads as its new number (a double
  // if that number is one of yours). Spends the Focused card; can't be undone.
  const canFocus = (G, d) => !!d && G.phase === 'assign' && d.crew && !d.used && !(d.takes || []).length && d.paired == null && G.cond[d.k].focused;
  function focus(G, di, n) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew) fail('Focused turns one of your own dice, not an agent die.'); if (!G.cond[d.k].focused) fail(`${nameOf(G.team[d.k])} isn’t Focused.`);
    if (d.used || d.takes.length || d.paired != null) fail('Undo that die first.');
    if (!(n >= 1 && n <= 6) || n !== Math.floor(n)) fail('Pick a number from 1 to 6.');
    d.from = d.n; d.n = n; d.dbl = dieDbl(G, d, n); d.focused = true; G.cond[d.k].focused = false; G.undo = []; G.stats.focus = (G.stats.focus || 0) + 1;
    say(G, `${dieOwner(G, d)} is Focused: turns a ${d.from} to ${faceText(d)}. Focused is discarded.`, 'sit');
    return G;
  }
  // The Engineer: once a round, turn one of their own unused dice (own, solo crew die, Surge Playbook dice) to its
  // opposite side (7 − n). It counts as one die (never a double, so it can't guard) and can't be rerolled or turned
  // again. Can't be undone.
  const canEng = (G, d) => !!d && G.phase === 'assign' && d.crew && G.team[d.k] === 'ENG' && !G.engUsed && !d.used && !(d.takes || []).length && !d.flipped && d.paired == null;
  function engTurn(G, di) {
    if (G.phase !== 'assign') fail('Roll first.');
    const d = G.dice[di]; if (!d) fail('No such die.');
    if (!d.crew || G.team[d.k] !== 'ENG') fail('Only the Engineer’s own dice turn to the opposite side.');
    if (G.engUsed) fail('The Engineer has turned a die this round already.'); if (d.used || d.takes.length || d.paired != null) fail('Undo that die first.');
    d.from = d.n; d.n = 7 - d.n; d.dbl = false; d.flipped = true; G.engUsed = true; G.undo = []; G.stats.flipped = (G.stats.flipped || 0) + 1;
    say(G, `${dieOwner(G, d)} turns a ${d.from} to its opposite side: ${faceText(d)}. It counts as one die.`, 'kit');
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
  // Returns { total: per analyst, by: [{ uid, name, dmg, to: [k...] }] (per alarm, before Containment),
  // hits: [{ k, uid, name, dmg, cut }] (what reaches each analyst), contain: per analyst, exposed: [k...] }.
  function incoming(G, blocks = G.blocks) {
    const total = G.team.map(() => 0), by = [], hits = [], up = G.play.filter(m => left(m));
    const dm = new Map(up.map(m => [m, dmgOf(G, m)]));
    // Containment Agent (crew-wide since 2026-11-01): per card, the highest-Damage alarm deals 2 less, never below 1.
    const cutBy = new Map();
    // Fileless: Containment cuts the highest-Damage alarm that isn't Fileless.
    for (let i = 0; i < running(G, 'contain'); i++) { const t = [...dm.entries()].filter(([m]) => m.kw !== 'noagent').sort((a, b) => b[1] - a[1])[0]; if (!t || t[1] <= 1) break; const c = Math.min(t[1] - 1, D.containCut); dm.set(t[0], t[1] - c); cutBy.set(t[0], (cutBy.get(t[0]) || 0) + c); }
    if (!aiUp(G)) G.agents.flat().filter(c => c.t === 'contain' && upgraded(G, c.uid)).forEach(() => { const t = [...dm.entries()].filter(([m]) => m.kw !== 'noagent').sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) { dm.set(t[0], t[1] - 1); cutBy.set(t[0], (cutBy.get(t[0]) || 0) + 1); } }); // upgraded: 1 more
    if (aug(G, 'mailer')) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], t[1] - 1); } // the Mailer Daemon baseline
    for (const m of up) {
      const d = dm.get(m), pierce = m.kw === 'noblock'; let to = [], each = d;
      if (m.kw === 'onpoint') { each = d * 2; if (pierce || !blocks[G.point]) to = [G.point]; }
      else if (m.kw === 'lowest') { const lo = Math.min(...G.hp); to = G.team.map((_, k) => k).filter(k => G.hp[k] === lo && (pierce || !blocks[k])); } // Stalker
      else to = G.team.map((_, k) => k).filter(k => pierce || !blocks[k]);
      const cut = (cutBy.get(m) || 0) * (m.kw === 'onpoint' ? 2 : 1);
      to = to.filter(k => !(G.slipOn || []).some(x => x.k === k && x.uid === m.uid)); // Slip
      to.forEach(k => hits.push({ k, uid: m.uid, name: m.name, dmg: each, cut })); by.push({ uid: m.uid, name: m.name, dmg: each, base: dmgOf(G, m), cut, to });
    }
    const contain = G.team.map(() => 0); hits.forEach(h => { contain[h.k] += h.cut; });
    hits.forEach(h => { total[h.k] += h.dmg; });
    // Exposed: anyone hit this round takes 1 more.
    const exposed = G.team.map((_, k) => k).filter(k => G.cond[k].exposed && total[k] > 0); exposed.forEach(k => { total[k]++; });
    return { total, by, hits, contain, exposed };
  }

  function endRound(G) {
    if (G.phase !== 'assign' && !(G.phase === 'roll' && G.play.every(m => !left(m)))) fail('Not time to end the round.');
    G.stats.guards += G.dice.filter(d => d.used === 'guard').length;
    // What the items did this round (the end screen shows the totals): dice the Triage and Surge dice took or guarded
    // with, Enrichment turns that were used, takes made while a Threat Intel Feed made every die wild.
    const I = G.stats.items, did = d => d.takes.length + (d.used === 'guard' ? 1 : 0);
    G.dice.forEach(d => { if (d.src === 'triage') I.triage += did(d); if (d.twin) I.twin += did(d); if (d.src === 'surge') I.surge += did(d); if (d.enriched && did(d)) I.enrich++; if (G.wildAll) I.intel += d.takes.length; });
    const beaten = G.play.filter(m => !left(m)); G.beaten = beaten.map(m => m.uid);
    const bb = beaten.find(m => m.boss);
    // The Persistent Operator: the first time you beat it, it comes back with 2 dice (Full Shift: and rolls the row).
    if (bb && bb.kw === 'apt' && !bb.rose) { bb.rose = true; bb.slots = CARDS.numbersFor('apt', 2); bb.off = [false, false]; bb.offStack = []; bb.hits = 2; bb.muted = 0; G.beaten = G.beaten.filter(u => u !== bb.uid);
      say(G, `${bb.name} is beaten, and comes straight back with 2 dice.`, 'mob'); if (MODES[G.mode].bossRow) { rollRow(G, true, `${bb.name} comes back`).forEach(b => enter(G, b)); if (G.over) return G; } }
    else if (bb) { G.over = true; G.win = true; G.phase = 'over'; say(G, `${G.boss.name} is beaten. You survived the night.`, 'end'); return G; }
    // Siphon: each alarm the crew beats heals its holders 1.
    beaten.filter(m => !m.boss).forEach(() => traitHolders(G, 'Siphon').forEach(({ k }) => { if (G.hp[k] < G.max) { G.hp[k]++; G.stats.items.siphon++; G.stats.healed++; } }));
    if (beaten.some(m => !m.boss) && traitHolders(G, 'Siphon').length) say(G, 'Siphon heals its holder.', 'heal');
    for (const m of beaten) {
      if (m.boss) continue;
      // The Hunter in the crew ends persistence: a beaten comeback leaves the game.
      // Every beaten mob goes back on the row, however often it has come back.
      // Baselined: the card tucks under an agent instead of going on the row (it can't be in two places).
      if (m.based && !G.tuck.some(a => a.uid === m.uid)) { G.tuck.push({ id: m.id, name: m.name, uid: m.uid, mob: m }); unmute(m); say(G, `${m.name} is beaten with its Baseline dice. It tucks under an agent, off the row.`, 'win'); continue; }
      unmute(m); G.row.push(m); say(G, `${m.name} is beaten and goes on the persistence row (back on 2–${m.top}).`, 'beat');
    }
    G.play = G.play.filter(m => left(m));
    // The boss pulls the row (2026-11-02 review): when it is down to 6, 4 and 2 dice, roll the row; comebacks hit on
    // arrival and join the fight. Printed on the boss card. Same as sim.js BOSSROW=steps.
    const bo = G.play.find(m => m.boss);
    if (bo && MODES[G.mode].bossRow) for (const t of bo.kw === 'wyrm' ? BOSS_STEPS : bo.kw === 'apt' ? [4] : []) { if (left(bo) > t || (bo.steps || []).includes(t)) continue; bo.steps = [...(bo.steps || []), t];
      const back = rollRow(G, true, `${bo.name} down to ${t}`); back.forEach(b => enter(G, b)); G.stats.bossRow = (G.stats.bossRow || 0) + 1; if (G.over) return G; }
    const inc = incoming(G, G.blocks);
    inc.by.forEach(b => { if (b.cut && b.to.length) say(G, `Containment Agent: ${b.name} deals ${b.cut} less to ${b.to.length > 1 ? 'each of you' : nameOf(G.team[b.to[0]])}.`, 'kit'); });
    inc.hits.forEach(h => { G.stats.items.contain += h.cut; hurt(G, h.k, h.dmg, `${h.name} hits back`); });
    // Twin on a Containment Agent: its share of the damage stopped (it cuts like a second card).
    const allC = running(G, 'contain'), plainC = G.agents.flat().filter(c => c.t === 'contain').length;
    if (allC > plainC) I.twin += Math.round(inc.hits.reduce((s, h) => s + h.cut, 0) * (allC - plainC) / allC);
    inc.exposed.forEach(k => hurt(G, k, 1, 'Exposed'));
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
  // Won fight: the Recovery Agents heal the crew, then the crew draws items. Baselined alarms tuck under a held
  // agent (phase 'tuck'), then the drawn items are dealt (phase 'deal'), then the next flip.
  function afterFight(G) {
    say(G, `Fight ${G.fight} won in ${G.round} round${G.round === 1 ? '' : 's'}.`, 'win');
    const was = threat(G); G.won = (G.won || 0) + 1; if (threat(G) > was) say(G, `Fight ${G.won} won: the threat rises. Alarms deal ${threat(G)} more Damage for the rest of the shift (not the boss).`, 'mob');
    G.cond.forEach((c, k) => { if (c.exposed) { c.exposed = false; say(G, `${nameOf(G.team[k])} discards Exposed.`, 'sit'); } });
    const rec = running(G, 'recover'), recUp = G.agents.flat().filter(c => c.t === 'recover' && upgraded(G, c.uid)).length * 2; if (rec) G.stats.items.recover += spread(G, rec * D.recoverHeal + recUp, 'Recovery Agent'); // crew-wide since 2026-11-01
    G.agents.forEach((a, k) => a.forEach(c => { const n = traitsOn(G, c.uid, 'Repair') * 2, h = Math.min(n, G.max - G.hp[k]); if (!n) return; G.hp[k] += h; G.stats.healed += h; G.stats.items.repair += h; say(G, `Repair: the ${KIT_NAME[c.t]} heals ${nameOf(G.team[k])} ${h}.`, 'heal'); }));
    draw(G, (G.n === 1 ? D.kitSolo : D.kitPerFight) + G.bonusDraw); G.bonusDraw = 0; // + Hold the room
    // With no agent held, a baselined alarm waits for the next agent dealt.
    // Every held agent full (two tucked alarms each): the baselined alarm goes on the row instead, with no trait.
    if (G.tuck.length && heldAgents(G).length && heldAgents(G).every(h => tuckedOn(G, h.c.uid) >= CARDS.TUCK_CAP)) { G.tuck.forEach(a => { G.row.push(a.mob); say(G, `${a.name} is baselined, but every agent already holds two: it goes on the row.`, 'kit'); }); G.tuck = []; }
    if (G.tuck.length && !heldAgents(G).length) { G.tuck.forEach(a => { G.aug.push({ ...a, host: null }); say(G, `${a.name} is baselined. Nobody holds an agent: it waits for the next agent dealt.`, 'kit'); }); G.tuck = []; }
    if (G.tuck.length) { G.dealNext = 'flip'; G.phase = 'tuck'; return G; }
    return toDeal(G, 'flip');
  }

  // Isolation Script: which die comes off a mob. A repeated number first (it leaves the most different numbers to
  // match), else the highest. Returns a slot index, or -1.
  function containPick(m) {
    const free = m.slots.map((v, i) => i).filter(i => !m.off[i]); if (!free.length) return -1;
    const seen = {}; free.forEach(i => { seen[m.slots[i]] = (seen[m.slots[i]] || 0) + 1; });
    const dup = free.filter(i => seen[m.slots[i]] > 1);
    return (dup.length ? dup : free).reduce((a, b) => m.slots[b] >= m.slots[a] ? b : a);
  }

  // ---- Consumables ------------------------------------------------------------------------------------------------
  // Used once by whoever holds it, then discarded. When each can be used:
  //   Surge Playbook, Threat Intel Feed: after the roll (assign). Isolation Script: before or after the roll.
  //   Shift Coffee: any time outside an open roll (between fights, before or after the roll).
  //   Change Freeze: before a row roll (between fights before the flip, or before rolling from round 2 on).
  const USE_PHASES = { surge: ['assign'], intel: ['assign'], isolate: ['roll', 'assign'], coffee: ['flip', 'roll', 'assign'], freeze: ['flip', 'roll'] };
  const canUse = (G, t) => {
    if (G.over || !(USE_PHASES[t] || []).includes(G.phase)) return false;
    if (t === 'isolate') return G.play.some(m => left(m) > (m.boss ? 1 : 0));
    if (t === 'intel') return !G.wildAll;
    if (t === 'freeze') return !G.freeze && (G.phase === 'flip' || G.round >= 1);
    return true;
  };
  const soloKeep = () => false; // the solo Soarcerer's keep roll went with the slot (review 2)
  // Use a consumable: by its uid, or by type (k: whose hand; else the first hand holding one).
  function use(G, uidOrType, k) {
    let who = -1, c = null;
    G.hand.forEach((h, j) => { if (c || (k != null && j !== k)) return; const x = h.find(x => x.uid === uidOrType) || h.find(x => x.t === uidOrType); if (x) { c = x; who = j; } });
    if (!c) fail('Nobody holds that item.');
    if (!canUse(G, c.t)) fail(`Can’t use the ${KIT_NAME[c.t]} now.`);
    G.undo = []; G.stats.used[c.t] = (G.stats.used[c.t] || 0) + 1;
    const name = nameOf(G.team[who]);
    say(G, `${name} uses the ${KIT_NAME[c.t]}.`, 'burn');
    // Solo Soarcerer: roll a die; on a 2 or 6 (the Soarcerer's doubles) the consumable stays in hand. 2–4 players: discard.
    if (soloKeep(G, who)) {
      const r = 1 + d6(G), keep = CARDS.isDouble('SOA', r); G.lastKeep = { roll: r, keep, t: c.t };
      if (keep) G.stats.kept = (G.stats.kept || 0) + 1;
      say(G, `${name} rolls a ${r}: ${keep ? `a double, keeps the ${KIT_NAME[c.t]}` : `the ${KIT_NAME[c.t]} is discarded`}.`, 'kit');
      if (!keep) { G.hand[who].splice(G.hand[who].indexOf(c), 1); G.discard.push(c); }
    } else { G.hand[who].splice(G.hand[who].indexOf(c), 1); G.discard.push(c); }
    if (c.t === 'surge') {
      const id = G.team[who];
      for (let i = 0; i < 3; i++) G.dice.push({ i: G.dice.length, k: who, crew: true, src: 'surge', ...pipDie(1 + d6(G), id), used: null, takes: [], turned: false });
      say(G, `${name} rolls 3 more: ${G.dice.slice(-3).map(faceText).join(', ')}.`, 'roll');
    }
    if (c.t === 'intel') { G.wildAll = true; say(G, 'Every die matches anything this round.', 'kit'); }
    if (c.t === 'isolate') {
      for (const m of G.play) { if (!left(m) || (m.boss && left(m) <= 1)) continue; take(m, containPick(m)); G.stats.items.isolate++; }
      say(G, 'One die off every alarm.', 'kit');
      if (G.phase === 'roll' && G.play.every(m => !left(m))) endRound(G);
    }
    if (c.t === 'coffee') G.stats.items.coffee += spread(G, D.recoverBurn, 'Shift Coffee');
    if (c.t === 'freeze') { G.freeze = true; say(G, 'The next row roll is skipped.', 'kit'); }
    // The Rogue AI, Full Shift: each consumable used (not Change Freeze) rolls the row; comebacks hit and join the fight.
    if (aiUp(G) && MODES[G.mode].bossRow && c.t !== 'freeze') rollRow(G, true, 'the Rogue AI').forEach(b => enter(G, b));
    return G;
  }

  return { aug, baseline, canBaseline, tuck, HP, START_ITEMS, startItems, pair, pairs, canPair, guardable, soloKeep, KIT_NAME, SIT_OPTS, MODES, aiUp, traitCount, traitHolders, upgraded, tuckedOn, baseCost, canSpot, spotlight, canTicket, ticket, canSlip, slip, pipDie, rng, shuffle, newGame, setPoint, flip, sitDue, alarmsLeft, weight, resolveSit, focus, engTurn, canFocus, canEng, roll, assign, guard, enrichTurn, unassign, endRound,
    give, dealFull, slotsOf, heldAgents, use, canUse, USE_PHASES, targets, canHit, canGuard, canReroll, reroll, canHeal, heal, threat, heldN, takesLeft, moreSlots, containPick, incoming, dmgOf, left, remaining, running, nameOf, faceText, dieOwner, rollRow };
});
