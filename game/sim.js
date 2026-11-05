// Detect the Dwellers balance sim: the same shift played several ways, to decide whether d6s (Escape the Dark
// Castle's chapter dice) beat the current d20 + bonus ≥ Defense system.
//   d20: today's rules. Hit = d20 + bonus ≥ Defense; 18–20 is two hits and blocks; a 14+ crew die can guard.
//   n6 (default, exact numbers, 2026-10-30): the mob card prints the dice to set under it, clustered round a main
//        number (1 2 2 2 3). A rolled die takes out a die showing exactly its number; a double counts as two dice
//        showing its number (or guards). Four players add a 6 under every mob. The persistence row rolls 2d6.
//   d6 (SYS=d6, the earlier symbol system): pip d6s read 1–2 Detect, 3–4 Contain, 5–6 Eradicate; a mob's hits are
//        a row of symbols (DICE=custom: the custom symbol dice before that).
// Shared: the real mobs, bosses, keywords, damage, persistence row ranges, kit economy, one bot brain that scores
// every legal dice allocation the same way in every system.
// Throwaway: nothing in src/, data/ or ui/ reads this. Usage: node game/sim.js
const D = require('../data/cards.json');

const SYM = ['D', 'C', 'E']; // Detect, Contain, Eradicate
// A mob's symbol row: its main response first. Domain sets the mix (identity is found, network is cut off...).
const MIX = { Identity: 'DCE', Endpoint: 'ECD', Network: 'CDE', Cloud: 'DEC' };
function symbolsFor(domain, n) { const [a, b, c] = MIX[domain] || 'DCE', pat = [a, a, b, c, b, a, c, a, b, c, a, b, c]; return pat.slice(0, n); }
// Two ways to make the dice. Default (the standard-d6 refactor, 2026-10-30): every die is a normal pip d6 that
// reads 1–2 Detect, 3–4 Contain, 5–6 Eradicate. What differs per analyst is which numbers are doubles for them.
// DICE=custom: the earlier custom symbol dice (tuned faces: Hunter and Responder with a third double), with the d20 row.
const KEY = ['D', 'D', 'C', 'C', 'E', 'E'];
const pipDie = dbl => KEY.map((s, i) => [s, dbl.includes(i + 1) ? 2 : 1]);
// Doubles by analyst. Every other die (the solo crew die, the Triage agent die) doubles only on a 6.
// Signature doubles (2026-10-31): each analyst has one number of their own, plus the 6 everyone has. Was three numbers
// each (Hunter 1 2 6, Responder 3 4 6, Engineer 2 4 6): half of every analyst's faces, too swingy. Which number
// goes where moved solo wins by a few points at most; the gaps come from the abilities.
const DOUBLES = { HUN: [4, 6], RES: [3, 6], ENG: [1, 6], SOA: [2, 6], PAT: [3, 6], FOR: [5, 6], LEAD: [2, 6], CREW: [6], AGENT: [6] };
const CUSTOM = process.env.DICE === 'custom';
const CUSTOM_DICE = {
  HUN: [['D', 2], ['D', 2], ['D', 1], ['C', 1], ['E', 1], ['E', 2]],
  RES: [['C', 2], ['C', 2], ['C', 1], ['D', 1], ['E', 1], ['D', 2]],
  ENG: [['E', 2], ['E', 2], ['E', 1], ['D', 1], ['C', 1], ['C', 2]],
  SOA: [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 1]],
  PAT: [['C', 1], ['D', 1], ['E', 1], ['C', 2], ['D', 1], ['E', 2]],
};
// DOUBLES_JSON overrides the double numbers (pip dice only): {"HUN":[1,2,6],...,"CREW":[6],"AGENT":[6]}.
if (process.env.DOUBLES_JSON) Object.assign(DOUBLES, JSON.parse(process.env.DOUBLES_JSON));
const DICE = {};
for (const id of ['HUN', 'RES', 'ENG', 'SOA', 'PAT']) DICE[id] = CUSTOM ? CUSTOM_DICE[id] : pipDie(DOUBLES[id]);
// DICE_JSON overrides whole dice as [symbol, count] faces (mostly for the custom dice).
if (process.env.DICE_JSON) Object.assign(DICE, JSON.parse(process.env.DICE_JSON));
const CREW_DIE = CUSTOM ? [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 2]] : pipDie(DOUBLES.CREW);
const AGENT_DIE = CUSTOM ? [['D', 1], ['C', 1], ['E', 1], ['D', 1], ['C', 1], ['E', 1]] : pipDie(DOUBLES.AGENT);
// Solo: two of your own dice plus the crew die (SOLO=mixed, the default). SOLO=own rolls three of your own dice.
const SOLO = process.env.SOLO || 'mixed';
// The row. The d20 system always rolls the d20. The d6 system rolls 2d6 (amber pair) by default, or the d20 with
// DICE=custom or ROW=d20. On 2d6 a row mob comes back if the sum is at most its number, 2–rowTop(d20 top).
const ROW = process.env.ROW || (CUSTOM ? 'd20' : '2d6');
// ROWMAP=tier (default) keeps four tiers apart: d20 top 12+ → 2–8, 10–11 → 2–7, 8–9 → 2–6, 7 or less → 2–5.
// ROWMAP=near picks the k whose 2d6 odds are closest to N/20 (rejected: it collapses every mob to 2–6 or 2–7).
const P2 = k => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b <= k) c++; return c / 36; };
const rowTopNear = N => { let best = 2; for (let k = 2; k <= 12; k++) if (Math.abs(P2(k) - N / 20) < Math.abs(P2(best) - N / 20)) best = k; return best; };
// ROWSHIFT lowers every tier by that much. Default 3 (2026-10-30): with every beaten mob going back to the row, the
// old tiers (8/7/6/5) spiral (shift 2 needs 97 HP for half the games); shift 3 gives 2–5/2–4/2–3 and ~6 comebacks a game.
const ROWSHIFT = +(process.env.ROWSHIFT ?? 2); // 2 since 2026-11-03 (one step wider), with no arrival hits (ARRIVE 0)
const rowTop = N => process.env.ROWMAP === 'near' ? rowTopNear(N) : (N >= 12 ? 8 : N >= 10 ? 7 : N >= 8 ? 6 : 5) - ROWSHIFT;
// PERSIST=always (n6 default, 2026-10-30): a beaten mob always goes back to the row; nothing removes it for good.
// PERSIST=once: the earlier rule, a mob that came back once is gone for good when beaten.
const PERSIST = process.env.PERSIST || 'always';
// NEAR=1 brings back the Hunter's and Responder's one-higher-or-lower matches (n6). Off by default since 2026-10-30.
const NEAR = process.env.NEAR === '1';
// REROLL (n6): 'all' (default, 2026-10-30) lets every player reroll one of their own dice once a round. 'perks'
// gives it to the Hunter (own dice) and the Responder (any crew die) only: solo spread 25 pts, rejected. '0' off.
// The bot rerolls a die that can't do anything.
const REROLL = process.env.REROLL || 'hpround'; // since 2026-11-03: once a round, take 1 to reroll (all: the old free reroll)
// Situations (n6, 2026-10-30): SIT=1 (default) flips a situation card before every flip after the first, the boss's
// included. SIT=0 turns them off. SITPICK forces options to test whether a choice is real: SITPICK=insider:run,chatter:0.
// Conditions: Rattled (no doubles next fight), Exposed (+1 damage each round anything hits you next fight), Focused
// (once, turn one of your dice to any number).
const SIT = process.env.SIT !== '0', FEED = process.env.FEED || 'mixed', SITV = +(process.env.SITV || 2), MODE = process.env.MODE || 'quick';
// The classic six alarms (MODE=classic). The full pool's tuck bands: two alarms per trait.
const CLASSIC = ['mailer', 'spray', 'imp', 'druid', 'wyrmling', 'mimic'];
const SITPICK = Object.fromEntries((process.env.SITPICK || '').split(',').filter(Boolean).map(x => x.split(':')));
// PERKS=new (default, 2026-10-30): the Engineer turns one of their dice to its opposite face once a round; the Hunter's
// 1s match any number on a mob that has come back. PERKS=old: doubles only. FOCUSGAIN: how much better a Focused
// turn must make the round before the bot spends it.
const NEWPERKS = (process.env.PERKS || 'new') === 'new';
const FOCUSGAIN = +(process.env.FOCUSGAIN || 8);
// ENGFLIP: how often the Engineer may turn a die, 'fight' (default: once a round was +14 pts solo) or 'round'.
const ENGFLIP = process.env.ENGFLIP || 'round'; // once a round since 2026-10-31: the turned die counts as one, so no guard loop
// EVASIVE=wild (2026-10-31): only a double hits an Evasive mob, and any double matches it (+19 pts solo, rejected).
// EVASIVE=one: a double of its number takes two as usual; any other double takes one. EVASIVE=exact: a double of
// its number (an analyst without that double could never hit it: ~1.5% of solo games stalled in an unwinnable fight).
const EVASIVE = process.env.EVASIVE || 'one';
// Analyst perks with a decision (defaults 2026-10-31, at HP 14). RESPERK=stand: once a fight, after the roll, pick a
// mob: it deals no damage this round (+6 pts solo). SOAPERK=keep: once a fight, burn an agent and keep it in the
// tray, in place of the extra draw (SOADRAW=0). PATPERK=nudge: once a fight, turn one of your dice one up or down, in
// place of the heals (healing after fights moved the Fixer under 1 pt; choose = heal or draw an agent, no gain).
// ENGDBL=0: the die the Engineer turns counts as one die (ENG solo 64% → 59%). 'old' is each earlier perk.
const NEWITEMS = (process.env.ITEMS || 'new') === 'new'; // the item deck (see KIT below)
const RESPERK = process.env.RESPERK || 'none', SOAPERK = process.env.SOAPERK || (NEWITEMS ? 'none' : 'keep'), PATPERK = process.env.PATPERK || 'nudge';
// Review 2 (2026-11-02). SOAPERK=auto (default): the Soarcerer is the baseline specialist: the crew's baselines set 2
// dice, not 3 (and once a fight it may move a tucked alarm; the bot never does). SOAPERK=slot: one more agent slot.
const SOAAUTO = SOAPERK === 'auto';
// HUNEND=1 (default): with the Hunter in the crew, a beaten comeback leaves the game (the Hunter ends persistence).
// RESARR=1 (default): with the Responder in the crew, arrival hits deal 1 less. BASEBACK=1 (default): a comeback can
// be baselined, with one more Baseline die. FORPEEK=1 (default): Forensics looks at the top of the feed before each
// flip and may put it on the bottom. Shift Lead: once a round, one of their dice goes to a crewmate (their doubles);
// solo, one more die.
// Tuning knobs (review 2): LEADSOLO=die|reroll|none (the solo Shift Lead), SOATUCK=1 (the Soarcerer draws an item when an
// alarm tucks), FORCUT=1 (Forensics: an alarm it looks at sets one fewer die).
// Defaults chosen in the review-2 tuning (solo spread 8 Quick, 9 Full): the solo Shift Lead rerolls one more die, the
// Soarcerer draws on a tuck, Forensics cuts a die.
const LEADSOLO = process.env.LEADSOLO || 'reroll', SOATUCK = process.env.SOATUCK === '1', FORCUT = process.env.FORCUT !== '0';
// HUNEND=once (default): once a fight, a beaten comeback leaves the game. RESARR=crew (default): arrivals deal the Responder's
// crewmates 1 less ('1': everyone, 'once': the first arrival hit each fight).
const HUNEND = process.env.HUNEND || '0', RESARR = process.env.RESARR || '0', BASEBACK = process.env.BASEBACK !== '0', FORPEEK = process.env.FORPEEK !== '0';
// Baselining (2026-10-31): every alarm prints a harder "Baseline it" condition. When it first flips, on point may set
// BASEDICE more threat dice (its main number's opposite side, 7 − main). Beat it with them and it is baselined: it
// tucks under an agent, which gains its ability while that agent stays in the tray (burning or discarding the agent
// ends it). It still goes back on the row (BASEROW=out: it leaves for good; +12 pts at 2p, no real choice).
// BASES lists which alarms have it: spray (once a round, reroll one more die), druid (comebacks don't hit on
// arrival), mailer (the highest-Damage alarm deals 1 less), imp (on point rolls one more die), wyrmling (add 1 to
// every row roll), mimic (after every won fight, heal 3 split across the crew). BASEPICK=always|never|bot.
const BASE = process.env.BASE !== '0', BASEPICK = process.env.BASEPICK || 'bot', BASEDICE = +(process.env.BASEDICE || 2); // 2 since 2026-11-04 (3 since 2026-11-01, was 4)
// MORE=1 (default, 2026-11-04): all 15 alarms can be baselined (the 1-Damage five, the Kerberoast Enforcer and the
// PsExec Swarm join); MORE=0 is the eight before. Since 2026-11-01 to 2026-11-04 the Mailer and Sprayer had no line.
const MORE = process.env.MORE !== '0', BASECHEAP = process.env.BASECHEAP !== '0'; // BASECHEAP: the bot baselines a 1-Damage alarm unless someone is at 3 HP or less
const BASES = (process.env.BASES || (MORE ? 'mailer,hydra,vibe,banshee,macro,spray,ogre,' : '') + 'imp,druid,wyrmling,mimic,wraith,specter,bat,leech,locker,zeroday,deepfake').split(',');
const aug = (G, id) => TRAITS ? (id === 'druid' && traitN(G, 'ghost') > 0) || (id === 'wyrmling' && traitN(G, 'scramble') > 0) : G.aug && G.aug.some(a => a.id === id && G.tray.includes(a.host));
// TRAITS=1 (default, 2026-11-02): a baselined alarm gives the agent it tucks under a trait, kept on that card (G.trayT,
// parallel to G.tray). The hybrid set (default): Grifter Twin (the agent counts as two), Scavenger Ghost (comebacks
// don't hit on arrival), Courier Scramble (+1 to every row roll), Rootkit Repair (after every won fight the agent heals
// its holder 2). TRAITSET=agent: the rejected agent-only set, Stealth (takes no slot) and Relay (passed to on point once
// a fight; solo, one more reroll a round) instead of Ghost and Scramble. TRAITS=0: the 2026-11-01 crew-wide lines (aug).
// LEVEL=1: every tucked alarm also adds one to its agent. TWINTO=contain: the bot tucks Twin under Containment first.
const TRAITS = process.env.TRAITS !== '0';
// The squeeze (2026-11-03, the fun review): BOSSDMG sets every n6 boss's Damage (default 5; the data says 9, so one
// unguarded boss round ended the shift). ESC=n: after every n fights won the threat coin moves a box and alarms (not the
// boss) deal 1 more per box, up to ESCMAX (default 3 and 1: from the fourth fight, +1). HEALX scales the after-fight heals.
// PUSH (default on, PUSH=0 off): once a round, after the free reroll, a player may take 1 damage to reroll one more of
// their own dice, never at 1 HP. The bot pushes when the reroll's average gain beats PUSHGAIN, above PUSHMIN HP.
const BOSSDMG = process.env.BOSSDMG || '5', ESC = +(process.env.ESC ?? 3), ESCMAX = +(process.env.ESCMAX || 1), HEALX = +(process.env.HEALX || 1);
const PUSH = process.env.PUSH === '1', PUSHMIN = +(process.env.PUSHMIN || 4);
const heat = G => ESC && G.sys === 'n6' ? Math.min(ESCMAX, Math.floor((G.stats.fights || 0) / ESC)) : 0;
// TUCKOUT=1 (default, 2026-11-02 review): the baselined alarm card slides under its agent, so it leaves the row while
// tucked (a discarded agent puts it back on the row; agents are never discarded by the bot). TUCKOUT=0: it also goes on the row.
const TUCKOUT = TRAITS && process.env.TUCKOUT !== '0';
// BOSSROW (2026-11-02 review): 'steps' rolls the row when the boss is down to 6, 4 and 2 dice (printed on its card);
// 'round' rolls the row at the end of every round it lost a die; 'none' (the 2026-11-02 rules) only on arrival.
// Since the full pool: boss row triggers belong to Full Shift (and classic); Quick Shift plays the core ability only.
// The Lockjaw Syndicate: down to 6, 4 and 2 dice. The Persistent Operator: when it comes back, and down to 4 dice.
// The Rogue AI: each consumable used while it is in play.
const BOSSROW = process.env.BOSSROW || (MODE === 'quick' ? 'none' : 'steps'), BOSSSTEPS = (process.env.BOSSSTEPS || '6,4,2').split(',').map(Number);
// STORYAT (2026-11-04, Full Shift): story cards are their own deck; after the 1st, 3rd and 5th fight won, flip one
// (the feed is 9 core cards; it was 11 with the 2nd, 4th and 6th earlier the same day). STORYAT=0: the old deal, 3 story cards shuffled into 11 core.
const STORYAT = process.env.STORYAT === '0' ? null : (process.env.STORYAT || '1,3,5').split(',').map(Number);
// NEWCARDS (proposal, 2026-11-04): comma list of new cards to add. Alarms: locker (Ransomware Locker, Detonate: still up
// after its 2nd round, it hits everyone for 5 and goes on the row; tuck: Locked, can't be lost), zeroday (Zero-Day
// Phantom, Unknown: its threat dice are rolled when it arrives; tuck: Day one, counts as two in round 1), stuffer
// (Credential Stuffer, Swarm: hits for 1 per threat die left), deepfake (Deepfake CFO, Mimic: hits as hard as the
// biggest other alarm in play, else 2; tuck: Mimic, the agent copies the crew's best other agent). Agents: honeypot
// (comebacks return with one fewer die), watchlist (row alarms come back one step less often), correl (pairs across
// players). Consumables: kill (beat an alarm with 2 or fewer dice left), firewall (everyone blocks this round),
// takedown (a row alarm leaves the game).
const NEWCARDS = (process.env.NEWCARDS || '').split(',').filter(Boolean), nc = c => NEWCARDS.includes(c);
const NEWMOBS = [
  { id: 'locker', name: 'Ransomware Locker', hits: 5, dmg: 1, persist: [1, 10], ability: 'detonate', def: 12, domain: 'Endpoint' },
  { id: 'zeroday', name: 'Zero-Day Phantom', hits: 4, dmg: 3, persist: [1, 10], ability: 'unknown', def: 12, domain: 'Endpoint' },
  { id: 'stuffer', name: 'Credential Stuffer', hits: 7, dmg: 0, persist: [1, 12], ability: 'swarm', def: 12, domain: 'Identity' },
  { id: 'deepfake', name: 'Deepfake CFO', hits: 5, dmg: 2, persist: [1, 9], ability: 'mimic', def: 12, domain: 'Identity' }].filter(m => nc(m.id));
const MOBS = [...D.mobs, ...NEWMOBS];
const aiUp = G => G.play.some(m => m.boss && m.kw === 'ai');
// SOLORES=1: solo, the alarm the Responder stands down also loses a die (never its last). Tested in the 2026-11-02
// review: +1 pt for the solo Responder, so not adopted.
const SOLORES = process.env.SOLORES === '1';
const TRAIT = process.env.TRAITSET === 'agent' ? { imp: 'twin', druid: 'stealth', wyrmling: 'relay', mimic: 'repair' } : process.env.TRAITSET === 'hybrid' ? { imp: 'twin', druid: 'ghost', wyrmling: 'scramble', mimic: 'repair', wraith: 'twin', specter: 'ghost', bat: 'scramble', leech: 'repair' }
  // TRAITSET=v3 (default, 2026-11-02 review 2): eight traits, each the beaten alarm's own trick turned around.
  : process.env.TRAITSET === 'v3' ? { imp: 'spotlight', druid: 'slip', specter: 'ticket', wyrmling: 'momentum', mimic: 'persist', leech: 'siphon', bat: 'callback', wraith: 'twin' }
  // TRAITSET=v4 (2026-11-03): one tucked alarm per agent, and each trait changes its agent for good: Overclock
  // (its Upgrade line applies), Twin, Signature (its holder also doubles on the alarm's main number), Escalate (from
  // round 2 it counts as two), Feedback (each round it works, its holder heals 1), Siphon, Callback, Hardened (it keeps
  // working against the Rogue AI).
  : process.env.TRAITSET === 'v4' ? { imp: 'overclock', wraith: 'twin', specter: 'signature', wyrmling: 'escalate', mimic: 'feedback', leech: 'siphon', bat: 'callback', druid: 'hardened' }
  // TRAITSET=v5 (default, 2026-11-04): every trait changes the agent itself, never its holder or the row. Golden
  // (counts as two against the boss), Rooted (counts as two while its holder is at half HP or less), Stealth (takes no
  // item slot; the card says Siphon), Beacon (counts as two in a fight a comeback joined).
  : { imp: 'overclock', wraith: 'twin', specter: 'golden', wyrmling: 'escalate', mimic: 'rooted', leech: 'stealth', bat: 'beacon', druid: 'hardened', locker: 'locked', zeroday: 'dayone', deepfake: 'mimica', ...(MORE ? { mailer: 'beacon', hydra: 'beacon', vibe: 'escalate', banshee: 'rooted', macro: 'targeted', spray: 'piercing', ogre: 'piercing' } : {}) };
  // Targeted (2026-11-04): its agent counts as two while its holder is on point. Piercing: in a multi-alarm fight.
const V4 = !['agent', 'hybrid', 'v3'].includes(process.env.TRAITSET); // v4 and v5: one tuck, permanent traits
// KWOVER (2026-11-03): Evasive is gone; the Scavenger and the Golden Ticket Ghost are Exfil (still up at round end:
// the crew discards an item).
const KWOVER = process.env.EVASIVE === 'keep' ? {} : { druid: 'exfil', specter: 'exfil' };
// CAP: traits one agent can hold (B3); UPGRADE=1: an agent with CAP traits also gets one step of its own number.
const CAP = +(process.env.CAP || (V4 ? 1 : 2)), UPGRADE = process.env.UPGRADE !== '0';
// SOANEW (2026-11-03): wilddbl (default) = each of the Soarcerer's dice takes two Baseline dice whatever it shows;
// wildbase = one; up1 = an agent
// the Soarcerer holds is upgraded with one tucked alarm; pair5 = the Soarcerer's 2s and 5s match each other. RESNEW: top = the highest-Damage alarm deals 1 less to everyone; self = every
// hit deals the Responder 1 less.
// HUNNEW (proposal, 2026-11-03): fewer = with the Hunter in the crew, a comeback returns with one fewer die; immune =
// comebacks deal the Hunter no damage. RESNEW=heal: the Responder's doubles can't guard; a double may instead heal
// anyone RESHEAL (default 2) right away.
const HUNNEW = process.env.HUNNEW ?? 'dieplain', RESHEAL = +(process.env.RESHEAL || 3); // defaults since 2026-11-03: HUNNEW die (on point, one more die; also triple, fewer, fewer2, immune), RESNEW heal 5
const SOANEW = process.env.SOANEW ?? 'drawpoint' /* since 2026-11-04 (late): on point, a baseline draws an item; twinown (agents count as two) earlier that day, wilddbl before */, RESNEW = process.env.RESNEW ?? 'healor'; // RESNEW: heal (default), healor, top, self // defaults since 2026-11-03 (HUNBOSS=0: the Hunter's 1s on comebacks only)
const upgraded = (G, i) => V4 ? has(G, i, 'overclock') > 0 || (SOANEW === 'up1' && G.team[G.trayK[i] || 0] === 'SOA' && traitsOf(G, i).length > 0) : UPGRADE && traitsOf(G, i).length >= (SOANEW === 'up1' && G.team[G.trayK ? G.trayK[i] || 0 : 0] === 'SOA' ? 1 : 2);
// Which agent the bot tucks each trait under, best first.
const TUCK = { twin: process.env.TWINTO === 'contain' ? ['contain', 'triage', 'recover', 'enrich'] : ['triage', 'contain', 'recover', 'enrich'], stealth: ['triage', 'contain', 'recover', 'enrich'], relay: ['triage', 'contain', 'recover', 'enrich'], repair: ['recover', 'contain', 'triage', 'enrich'], ghost: ['enrich', 'recover', 'contain', 'triage'], scramble: ['enrich', 'recover', 'contain', 'triage'] };
const traitsOf = (G, i) => (G.trayT && G.trayT[i]) || [];
const has = (G, i, tr) => traitsOf(G, i).filter(x => x === tr).length;
const weight = (G, i) => 1 + has(G, i, 'twin') + (has(G, i, 'escalate') && (G.round || 0) >= 2 ? 1 : 0) + (has(G, i, 'golden') && G.play && G.play.some(m => m.boss) ? 1 : 0) + (has(G, i, 'rooted') && G.hp[G.trayK[i]] * 2 <= G.max ? 1 : 0) + (has(G, i, 'beacon') && G.cbJoin ? 1 : 0) + (has(G, i, 'targeted') && G.trayK[i] === G.point ? 1 : 0) + (has(G, i, 'piercing') && G.play && G.play.length >= 2 ? 1 : 0) + (has(G, i, 'dayone') && (G.round || 0) <= 1 ? 1 : 0) + (SOANEW === 'twinown' && G.team[G.trayK[i] || 0] === 'SOA' ? 1 : 0) /* SOANEW=twinown (proposal, 2026-11-04): the Soarcerer's agents count as two */ + (upgraded(G, i) && ['triage', 'enrich'].includes(G.tray[i]) ? 1 : 0) + (process.env.LEVEL === '1' ? traitsOf(G, i).length : 0); // LEVEL=1: every tucked alarm also adds one
const traitN = (G, tr) => G.play && aiUp(G) ? 0 : G.tray.reduce((s, _, i) => s + has(G, i, tr), 0); // the Rogue AI turns traits off too
// Returns true (tucked), 'full' (every agent holds CAP traits: the alarm goes on the row) or false (no agent: it waits).
function tuckTrait(G, tr) {
  const order = TUCK[tr] || ['triage', 'contain', 'recover', 'enrich'];
  // SOANEW=up1: one tuck upgrades a Soarcerer's agent, so the bot tucks there first.
  if (SOANEW === 'up1') for (const t of order) { const i = G.tray.findIndex((x, j) => x === t && G.team[G.trayK[j] || 0] === 'SOA' && !traitsOf(G, j).length); if (i >= 0) { G.trayT[i].push(tr); return true; } }
  for (const t of order) { const i = G.tray.findIndex((x, j) => x === t && traitsOf(G, j).length < CAP); if (i >= 0) { G.trayT[i].push(tr); return true; } }
  return G.tray.some(isAgent) ? 'full' : false;
}
// Items (2026-10-31, ITEMS=new default): the kit deck is items. Agents are passive (always on while held); consumables
// are used once. Each analyst holds 2 (the Soarcerer 3); solo holds 4. Deck: 6 agents (Triage, Containment ×2;
// Enrichment, Recovery ×1) and 10 consumables (×2 each): Surge Playbook (on point rolls 3 more dice), Threat Intel
// Feed (every die matches anything this round), Isolation Script (one die off every alarm), Shift Coffee (heal 6
// split), Change Freeze (skip a row roll). ITEMS=old: the 8 two-sided agent cards and the shared tray of 5.
const USE = NEWITEMS && process.env.TWOSIDED !== '1' ? { triage: 'surge', enrich: 'intel', contain: 'isolate', recover: 'coffee' } : { triage: 'triage', enrich: 'enrich', contain: 'contain', recover: 'recover' };
const AGENTS = ['triage', 'enrich', 'contain', 'recover', 'honeypot', 'watchlist', 'correl'], isAgent = t => AGENTS.includes(t);
const KIT = NEWITEMS ? (process.env.KITJSON ? JSON.parse(process.env.KITJSON) : ['triage', 'triage', 'contain', 'contain', 'enrich', 'recover', 'surge', 'surge', 'intel', 'intel', 'isolate', 'isolate', 'coffee', 'coffee', 'freeze', 'freeze', ...(process.env.DECK18 === '0' ? [] : ['watchlist', 'takedown']) /* DECK18: one Watchlist Agent and one Takedown Request since 2026-11-04 */, ...NEWCARDS.filter(c => !NEWMOBS.some(m => m.id === c))]) : ['triage', 'enrich', 'contain', 'recover'];
const slotsOf = G => NEWITEMS ? (G.n === 1 ? +(process.env.SOLOSLOTS || 6) : CREWSLOTS * G.n) + (on(G, 'SOA') && !SOAAUTO && SOAPERK !== 'none' && !(G.n === 1 && process.env.SOASOLO === '0') ? 1 : 0) : D.sharedKit + (on(G, 'SOA') ? D.perks.SOA.slot : 0);
// Each item has a holder (G.trayK, parallel to G.tray): 2 slots each (the Soarcerer 3), solo 4. Since 2026-11-01 agents
// work for the whole crew (Containment cuts the highest-Damage alarm for everyone, Recovery heals the crew, Enrichment
// turns any crew die) and TRIAGE=crew: a Triage Agent's holder rolls one more of their own dice. PERSONAL=1: the old
// personal agents (Triage rolls an agent die for its holder, Containment cuts what reaches its holder, Recovery heals it).
const TRIAGE = process.env.TRIAGE || (NEWITEMS ? 'crew' : 'agent'); // crew: the holder's own die (it can pair, guard and hit the boss); agent: an agent die
const CREWSLOTS = +(process.env.CREWSLOTS || 4); // item slots per player in a crew (4 since 2026-11-03)
const PERSONAL = NEWITEMS && process.env.PERSONAL === '1'; // crew-wide agents since 2026-11-01; PERSONAL=1: agents work only for their holder
const slotsK = (G, k) => G.n === 1 ? slotsOf(G) : CREWSLOTS + (G.team[k] === 'SOA' && !SOAAUTO && SOAPERK !== 'none' && process.env.SOASLOT !== '0' ? 1 : 0);
// CONSFREE=1: consumables don't take a slot (slots hold agents); you keep any number of consumables.
const CONSFREE = NEWITEMS && process.env.CONSFREE === '1'; // since 2026-11-03 consumables take slots (CONSFREE=1: the old hand)
const held = (G, k) => G.trayK.filter((x, i) => x === k && !(CONSFREE && !isAgent(G.tray[i])) && !has(G, i, 'stealth')).length;
const typeAt = (G, i) => (G.mimicAs && G.mimicAs[i]) || G.tray[i]; // Mimic trait: the agent copies another one this fight
const activeK = (G, t, k) => G.tray.reduce((s, x, i) => s + (typeAt(G, i) === t && G.trayK[i] === k && (!aiUp(G) || has(G, i, 'hardened')) ? weight(G, i) : 0), 0);
function dropItem(G, i) { const [t] = G.tray.splice(i, 1); G.trayK.splice(i, 1); if (G.trayT) G.trayT.splice(i, 1); return t; }
// Change Freeze: the bot skips a row roll when two or more alarms wait on the row.
function rowRoll(G, strike) { if (G.tray.includes('freeze') && G.row.length >= +(process.env.FREEZEMIN || (NEWITEMS ? 1 : 2))) { burn(G, 'freeze'); G.stats.freeze = (G.stats.freeze || 0) + 1; return []; } return rollRow(G, strike); }
// n6 (exact numbers, 2026-10-30): the mob card prints the dice to set under it, e.g. 1 2 2 3 + 6. A rolled die takes
// out a die showing exactly its number. A double counts as two dice showing its number, or guards (never both).
// A crew of four adds the card's + die; solo plays the two-player dice. Hunter (vs comebacks) and
// Responder (vs the biggest hitter) match one higher or lower too. N6DICE: dice per analyst (on point +1).
// Bigger crews (2026-10-30, clustered dice): one more threat die showing 6 per player past three. Past two (the
// first exact-numbers rule) left 3p at 36% and 4p at 19% once doubles stopped taking "any one more".
const XFROM = +(process.env.XFROM || 2); // review 2: one + die per player past 2 (was 3), as six analysts stack up in a crew of four
const N6DICE = +(process.env.N6DICE || 1), N6SOLO = +(process.env.N6SOLO || 3);
// Clustered dice (2026-10-30): each mob has a main number and its dice bunch around it, e.g. main 2 prints
// 1 2 2 2 3. Repeats make a double on the main number (it counts as two of that number) worth the most. MAIN
// spreads the first six mobs and the boss across the faces; any other mob takes a main from its id.
// Self-contained: web/build.js lifts this function into the page.
function numbersFor(id, n) {
  // Since the full pool (2026-11-02): every alarm and boss has a main, spread so each face is the main of 2–3 alarms.
  const MAIN = { mailer: 2, spray: 4, imp: 1, druid: 3, wyrmling: 5, mimic: 6, wyrm: 3, banshee: 1, macro: 5, vibe: 6, wraith: 2, bat: 4, ogre: 3, leech: 1, hydra: 4, specter: 5, apt: 2, ai: 5, locker: 6, zeroday: 3, stuffer: 2, deepfake: 4 };
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // Main twice, the one below, the one above, then main again: 2 dice 2 2, 3 dice 1 2 2, 4 dice 1 2 2 3, 5 dice 1 2 2 2 3. At the
  // edges both neighbours are the inside one (main 1: 1 2 2 1 1).
  const m = MAIN[id] || 1 + h % 6, lo = m > 1 ? m - 1 : m + 1, hi = m < 6 ? m + 1 : m - 1, pat = [m, m, lo, hi, m];
  return Array.from({ length: n }, (_, i) => pat[i % 5]);
}
// The dice a mob shows for this crew: its printed dice (one fewer than its d20 hits; the boss two fewer than its
// two-player hits), then a 6 once per player past three.
function slotsFor(m, crew) { const base = numbersFor(m.id, m.base), extra = 6; return [...base, ...Array(Math.max(0, crew - 2)).fill(extra)].slice(0, base.length + Math.max(0, crew - XFROM)); }

function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const needFor = (sys, m, n) => sys === 'd6' ? symbolsFor(m.domain, m.hits) : sys === 'n6' ? slotsFor(m, n) : null;
function newGame(sys, team, opt) {
  const r = opt.rnd, n = team.length;
  const mk = (m, boss) => {
    const base = boss ? m.hitsBase + D.bossAdd[2] - +(process.env.BOSSLESS ?? 2) : m.hits - +(process.env.MOBLESS ?? (sys === 'n6' ? 2 : 1)); // n6: two fewer than the d20 hits since 2026-10-31
    const hits = sys === 'n6' ? base + Math.max(0, n - XFROM) : boss ? m.hitsBase + D.bossAdd[n] : Math.max(1, m.hits + (D.mobAdd[n] || 0));
    const domain = boss ? 'Identity' : m.domain, o = { id: m.id, name: m.name, boss, def: m.def, dmg: boss && sys === 'n6' ? +BOSSDMG : m.dmg, kw: boss ? m.id : (KWOVER[m.id] || m.ability), persist: m.persist, hits, left: hits, base, domain, back: 0, up: 0 };
    o.need = needFor(sys, o, n); return o;
  };
  // MODE (2026-11-02, the full pool): one situation deck holds all 15 alarms and 18 situations. quick (default): deal
  // 8 from the 24 core cards (alarms and core situations). full: deal 3 story cards and 11 core cards. classic: the
  // earlier six alarms and six situations, all in every shift. FEED=split (classic only): a situation before every flip.
  let feed, mobs, storyDeck = [];
  if (sys === 'n6' && SIT && MODE !== 'classic') {
    const core = shuffle([...MOBS.map(m => mk(m)), ...SITS_CORE.map(s => ({ sit: s }))], r), story = shuffle(SITS_STORY.map(s => ({ sit: s })), r).slice(0, MODE === 'full' ? +(process.env.STORYF || 3) : 0);
    feed = shuffle([...story, ...core.slice(0, (MODE === 'full' ? +(process.env.DEALF || 14) : +(process.env.DEALQ || 8)) - story.length)], r); if (MODE === 'full' && STORYAT) { feed = core.slice(0, +(process.env.DEALF || 9)); storyDeck = shuffle(SITS_STORY.map(s => ({ sit: s })), r); } // STORYAT: story deck flips after these fights won // DEALQ, DEALF, STORYF: deal sizes mobs = feed.filter(c => !c.sit);
  } else { mobs = shuffle(D.mobs.filter(m => CLASSIC.includes(m.id)), r).slice(0, opt.deal || 6).map(m => mk(m)); feed = SIT && sys === 'n6' && FEED === 'mixed' ? shuffle([...mobs, ...SITS.map(s => ({ sit: s }))], r) : mobs; }
  return { storyDeck, sys, team, n, r, hp: team.map(() => opt.hp), max: opt.hp, feed, boss: mk(D.bosses[Math.floor(r() * 3)], true),
    row: [], play: [], trayK: [], trayT: [], pendT: [], kit: shuffle(NEWITEMS ? KIT.slice() : KIT.flatMap(t => [t, t]), r), discard: [], tray: [], point: 0, over: false, win: false,
    stats: { rounds: 0, choice: 0, back: 0, sit: {}, ran: 0, focus: 0, flipped: 0 }, smart: opt.smart !== false,
    cond: team.map(() => ({ rattled: false, exposed: false, focused: false })), sits: shuffle(SITS, r), pending: [], addSix: 0, runNext: false, badgeHit: false, aug: [] };
}
const d20 = G => 1 + Math.floor(G.r() * 20), d6 = G => Math.floor(G.r() * 6);
const on = (G, id) => G.team.includes(id);
const active = (G, t) => G.tray.reduce((s, x, i) => s + (typeAt(G, i) === t && (!aiUp(G) || has(G, i, 'hardened')) ? weight(G, i) : 0), 0); // Hardened: the Rogue AI doesn't switch it off
const dmgOf = (G, m) => (m.plus || 0) + (m.boss ? 0 : heat(G)) + (m.kw === 'swarm' ? m.left : m.kw === 'mimic' ? Math.max(2, ...G.play.filter(x => x !== m && x.kw !== 'mimic').map(x => dmgOf(G, x))) : 0) + (m.kw === 'swarm' || m.kw === 'mimic' ? 0 : m.boss && m.kw === 'wyrm' && m.left > m.hits - 2 ? m.dmg + 2 : m.dmg + (m.kw === 'ramp' ? m.up : 0)); // plus: The CEO's Inbox
function hurt(G, k, n) { if (n <= 0 || G.over) return; G.hp[k] = Math.max(0, G.hp[k] - n); G.low = Math.min(G.low ?? G.max, G.hp[k]);
  if (!G.hp[k] && G.trayT && !(G.play && aiUp(G))) { const i = G.tray.findIndex((_, j) => has(G, j, 'persist')); if (i >= 0) { G.trayT[i].splice(G.trayT[i].indexOf('persist'), 1); G.hp[k] = 1; G.stats.persist = (G.stats.persist || 0) + 1; } } // Persist: stay at 1
  if (!G.hp[k]) { G.over = true; G.win = false; } }

// Row roll: anything in range comes back at full hits; the two highest-Damage comebacks strike on arrival.
function rollRow(G, strike) {
  if (!G.row.length) return []; const two = G.sys !== 'd20' && ROW === '2d6';
  let a1 = 1 + d6(G), a2 = 1 + d6(G); if (two && traitN(G, 'callback') && Math.min(a1, a2) <= 3) { if (a1 < a2) a1 = 1 + d6(G); else a2 = 1 + d6(G); G.stats.callback = (G.stats.callback || 0) + 1; } // Callback: reroll one amber die
  const r = two ? a1 + a2 + (TRAITS ? traitN(G, 'scramble') : aug(G, 'wyrmling') ? 1 : 0) : d20(G), back = G.row.filter(m => two ? r <= rowTop(m.persist[1]) - (G.play ? active(G, 'watchlist') + G.tray.filter((x, i) => x === 'watchlist' && upgraded(G, i) && (!aiUp(G) || has(G, i, 'hardened'))).length : 0) : r >= m.persist[0] && r <= m.persist[1]);
  G.row = G.row.filter(m => !back.includes(m)); back.forEach(m => { m.left = m.hits; m.need = needFor(G.sys, m, G.n); m.back++; m.up = 0; });
  G.stats.back += back.length;
  if (strike && !aug(G, 'druid')) for (const m of back.slice().sort((a, b) => b.dmg - a.dmg).slice(0, +(process.env.ARRIVE ?? 0))) { const cut = on(G, 'RES') && RESARR === '1' ? 1 : on(G, 'RES') && RESARR === 'once' && !G.resArr ? 99 : 0; if (cut === 99) G.resArr = true; G.team.forEach((id, k) => hurt(G, k, HUNNEW === 'immune' && id === 'HUN' ? 0 : Math.max(0, dmgOf(G, m) - cut - (on(G, 'RES') && RESARR === 'crew' && id !== 'RES' ? 1 : 0)))); } // the Responder: arrival hits deal 1 less (RESARR=once: the first arrival hit each fight deals nothing)
  return back;
}
function enter(G, m) { if ((HUNNEW === 'fewer' || HUNNEW === 'fewer2') && G.sys === 'n6' && on(G, 'HUN') && m.back > 0 && !m.boss && m.need) for (let i = HUNNEW === 'fewer2' ? 2 : 1; i > 0 && m.left > 1; i--) { m.need.pop(); m.left--; } if (m.kw === 'unknown' && m.need) m.need = m.need.map(() => 1 + d6(G)); if (m.back > 0 && !m.boss && m.need) for (let i = active(G, 'honeypot'); i > 0 && m.left > 1; i--) { m.need.pop(); m.left--; } G.play.push(m); if (m.back > 0) G.cbJoin = true; /* Beacon trait: a comeback joined */ if (m.kw === 'beacon') for (const b of rollRow(G, true)) enter(G, b); }

// The dice of one round: crew dice (one each, two on point, three solo), plus a die per running Triage Agent.
function roll(G) {
  const dice = [];
  if (G.sys === 'n6') {
    const raw = [];
    G.team.forEach((id, k) => { const nd = (G.n === 1 ? N6SOLO : N6DICE + (k === G.point ? 1 : 0)) + (k === G.point && aug(G, 'imp') ? 1 : 0) + ((HUNNEW === 'die' || HUNNEW === 'dieplain') && id === 'HUN' && k === G.point ? 1 : 0); for (let i = 0; i < nd; i++) raw.push({ k, crew: true, v: 1 + d6(G), dbl: G.cond[k].rattled ? [] : G.n === 1 && i === nd - 1 && SOLO === 'mixed' ? DOUBLES.CREW : HUNNEW === 'dieplain' && id === 'HUN' && k === G.point && i === 0 ? [] : DOUBLES[id] }); }); // dieplain: the Hunter's extra die is never a double
    if (TRIAGE === 'crew') G.team.forEach((id, k) => { for (let i = 0; i < activeK(G, 'triage', k); i++) raw.push({ k, crew: true, v: 1 + d6(G), dbl: G.cond[k].rattled ? [] : DOUBLES[id] }); });
    // DBLMODE=pair (proposal, 2026-10-31): no number is a double by itself; two of your own dice showing the same
    // number are a double (they take two of it, as they would anyway, or together they guard).
    if (process.env.DBLMODE === 'pair') raw.forEach(r => { r.dbl = process.env.PAIR6 === '1' ? [6] : []; }); // PAIR6=1: a 6 is a double on its own too
    // Momentum (from round 2) and the solo Shift Lead's extra die roll with the rest.
    if (TRAITS && !aiUp(G) && (G.round || 0) >= 2) G.tray.forEach((_, i) => { const k = G.trayK[i]; for (let j = has(G, i, 'momentum'); j > 0; j--) raw.push({ k, crew: true, v: 1 + d6(G), dbl: G.cond[k].rattled ? [] : DOUBLES[G.team[k]] }); });
    if (G.n === 1 && on(G, 'LEAD') && LEADSOLO === 'die') raw.push({ k: 0, crew: true, v: 1 + d6(G), dbl: DOUBLES.LEAD });
    // Signature (TRAITSET v4): its holder's dice also double on the tucked alarm's main number.
    if (V4) raw.forEach(r => { if (!r.crew || G.cond[r.k].rattled || aiUp(G)) return; G.tray.forEach((_, i) => { if (G.trayK[i] === r.k) traitsOf(G, i).forEach(t => { if (/^sig\d$/.test(t)) r.dbl = [...r.dbl, +t[3]]; }); }); }); // traits 'sig5' etc.
    if (REROLL !== '0') rerolls(G, raw);
    // Spotlight: once a round per trait, one of the holder's dice counts as a double.
    if (TRAITS && !aiUp(G)) G.tray.forEach((_, i) => { const k = G.trayK[i]; for (let j = has(G, i, 'spotlight'); j > 0; j--) { const r = raw.find(x => x.k === k && x.crew && !x.dbl.includes(x.v)); if (r) r.dbl = [...r.dbl, r.v]; } });
    // Shift Lead (crew): once a round, hand one die to a crewmate whose doubles include it.
    if (G.n > 1 && on(G, 'LEAD')) { const L = G.team.indexOf('LEAD'), r = raw.find(x => x.k === L && x.crew && !x.dbl.includes(x.v)); const j = r && G.team.findIndex((id, k) => k !== L && DOUBLES[id].includes(r.v)); if (r && j >= 0) { r.k = j; r.dbl = G.cond[j].rattled ? [] : DOUBLES[G.team[j]]; G.stats.handed = (G.stats.handed || 0) + 1; } }
    if (process.env.DBLMODE === 'pair') for (let i = 0; i < raw.length; i++) { const j = raw.findIndex((r, x) => x > i && r.k === raw[i].k && r.v === raw[i].v && !r.paired && !raw[i].paired); if (j > 0 && !(process.env.PAIR6 === '1' && raw[i].v === 6)) { raw[i].dbl = [raw[i].v]; raw[i].paired = true; raw.splice(j, 1); } }
    if (process.env.PAIRADD !== '0') /* since 2026-10-31: two of your own dice showing the same number are a double */ for (let i = 0; i < raw.length; i++) { const r = raw[i]; if (!r.crew || r.dbl.includes(r.v) || G.cond[r.k].rattled) continue; const j = raw.findIndex((x, y) => y > i && x.crew && (x.k === r.k || active(G, 'correl') > 0 && !G.cond[x.k].rattled) && x.v === r.v && !x.dbl.includes(x.v)); if (j > 0) { raw[i] = { ...r, dbl: [r.v] }; raw.splice(j, 1); G.stats.pairs = (G.stats.pairs || 0) + 1; } }
    if (process.env.RATTLED !== 'fight') G.cond.forEach(c => { c.rattled = false; }); // Rattled lasts one roll
    if (TRIAGE === 'crew') { /* rolled with the crew dice, above */ } else if (PERSONAL) G.team.forEach((_, k) => { for (let i = 0; i < activeK(G, 'triage', k); i++) raw.push({ k, crew: false, v: 1 + d6(G), dbl: DOUBLES.AGENT }); });
    else for (let i = 0; i < active(G, 'triage'); i++) raw.push({ k: G.point, crew: false, v: 1 + d6(G), dbl: DOUBLES.AGENT });
    return choose(G, raw);
  }
  G.team.forEach((id, k) => { const nd = G.n === 1 ? D.soloDice : k === G.point ? 2 : 1;
    for (let i = 0; i < nd; i++) dice.push(G.sys === 'd20' ? { k, crew: true, r: d20(G) } : { k, crew: true, f: (SOLO === 'mixed' && G.n === 1 && i === nd - 1 ? CREW_DIE : DICE[id])[d6(G)] }); });
  for (let i = 0; i < active(G, 'triage'); i++) dice.push(G.sys === 'd20' ? { k: G.point, crew: false, r: d20(G) } : { k: G.point, crew: false, f: AGENT_DIE[d6(G)] });
  return dice;
}
// n6 rerolls: a die is dead if it isn't a double (doubles can always guard) and no mob in play shows its number.
function rerolls(G, raw) {
  const dead = r => !r.dbl.includes(r.v) && !(hunts(G, r.k, r.v) && G.play.some(m => m.back)) && !G.play.some(m => m.need.includes(r.v) && m.kw !== 'hardened');
  const go = r => { if (r) { r.v = 1 + d6(G); G.stats.rerolls = (G.stats.rerolls || 0) + 1; } };
  // all: everyone may reroll one of their own dice once a round (a shared rule instead of two perks).
  // REROLL=hpfight (proposal, 2026-11-03): no free rerolls and no push; once a fight, each player may take 1 damage to
  // reroll one of their own dice (never at 1 HP). The bot uses the push's value test (PUSHGAIN, PUSHMIN).
  if (REROLL === 'hpfight' || REROLL === 'hpround') { G.rrFight = (REROLL === 'hpfight' && G.rrFight) || G.team.map(() => false); /* hpround: once a round */ G.team.forEach((_, k) => { if (G.rrFight[k] || G.hp[k] <= 1) return; const r = raw.find(x => x.k === k && x.crew && dead(x)); if (!r) return; G.offered = true;
      const best = rs => { const d = []; rs.forEach(x => n6die(G, d, x.k, x.crew, x.dbl, x.v)); return allocations(G, d).reduce((a, b) => Math.max(a, b.score), -Infinity); };
      const keep = best(raw), gain = [1, 2, 3, 4, 5, 6].reduce((t, v) => t + best(raw.map(x => x === r ? { ...x, v } : x)), 0) / 6 - keep;
      if (G.smart ? G.hp[k] > PUSHMIN && gain > +(process.env.PUSHGAIN || 6) : G.r() < 0.5) { hurt(G, k, 1); go(r); G.rrFight[k] = true; G.stats.push = (G.stats.push || 0) + 1; } }); return; }
  if (REROLL === 'all') { G.team.forEach((_, k) => go(raw.find(r => r.k === k && dead(r)))); if (G.n === 1 && on(G, 'LEAD') && LEADSOLO === 'reroll') go(raw.find(dead)); if (aug(G, 'spray')) go(raw.find(dead)); if (G.n === 1) for (let i = traitN(G, 'relay'); i > 0; i--) go(raw.find(dead));
    if (PUSH && G.sys === 'n6' && G.play.length) G.team.forEach((_, k) => { const r = raw.find(x => x.k === k && x.crew && dead(x)); if (!r || G.hp[k] <= 1) return; G.stats.pushOffer = (G.stats.pushOffer || 0) + 1; G.offered = true;
      // The bot pushes when the reroll's average gain beats the HP: best round over the six faces, against keeping it.
      const best = rs => { const d = []; rs.forEach(x => n6die(G, d, x.k, x.crew, x.dbl, x.v)); return allocations(G, d).reduce((a, b) => Math.max(a, b.score), -Infinity); };
      const keep = best(raw), gain = [1, 2, 3, 4, 5, 6].reduce((t, v) => t + best(raw.map(x => x === r ? { ...x, v } : x)), 0) / 6 - keep;
      if (G.smart ? G.hp[k] > PUSHMIN && gain > +(process.env.PUSHGAIN || 6) : G.r() < 0.5) { hurt(G, k, 1); go(r); G.stats.push = (G.stats.push || 0) + 1; } });
    return; }
  const h = G.team.indexOf('HUN'); if (h >= 0) go(raw.find(r => r.k === h && dead(r)));
  if (on(G, 'RES')) go(raw.find(dead));
}
// The Hunter's 1s are wild on a mob that has come back (PERKS=new).
const hunts = (G, k, v) => NEWPERKS && G.sys === 'n6' && G.team[k] === 'HUN' && v === 1 && process.env.HUNWILD === '1'; // HUNWILD=1: the old wild 1s (off since 2026-11-03)
// HUNANY=1: the Hunter's 1s match any number on any alarm, not only one that came back.
const huntsAny = () => process.env.HUNANY === '1'; // review 2: the Hunter's 1s are wild on comebacks only (HUNANY=1: any alarm) // default since 2026-10-31 (+11 pts solo); HUNANY=0: came-back alarms only
// n6 choices made after the roll: the Engineer's opposite-face turn and a Focused player's any-number turn. The bot
// tries each and keeps the best round (a Focused turn only when it gains FOCUSGAIN).
function choose(G, raw) {
  // A die the Engineer turned can't guard (it hits): otherwise a turn makes a double, and a guard, every round.
  const build = rs => { const dice = []; rs.forEach(r => { const at = dice.length; n6die(G, dice, r.k, r.crew, r.dbl, r.v); if (r.flip) dice.slice(at).forEach(d => { d.noguard = true; }); }); return dice; };
  if (!G.smart) return build(raw);
  const set = (rs, i, v) => rs.map((x, j) => j === i ? { ...x, v } : x), e = G.team.indexOf('ENG');
  const cands = [{ raw, focus: -1 }];
  if (NEWPERKS && e >= 0 && !G.engUsed) raw.forEach((r, i) => { if (r.crew && r.k === e) cands.push({ raw: raw.map((x, j) => j === i ? { ...x, v: 7 - x.v, flip: true, dbl: process.env.ENGDBL === '1' ? x.dbl : [] } : x), focus: -1, flip: true }); });
  // PATPERK=nudge: once a fight the Fixer turns one of their dice one up or one down.
  const pf = G.team.indexOf('PAT');
  if (PATPERK === 'nudge' && pf >= 0 && !G.patUsed) for (const c of cands.slice()) c.raw.forEach((r, i) => { if (r.crew && r.k === pf) for (const v of [r.v - 1, r.v + 1]) if (v >= 1 && v <= 6) cands.push({ raw: set(c.raw, i, v), focus: c.focus, flip: c.flip, nudge: true }); });
  for (const c of cands.slice()) c.raw.forEach((r, i) => { if (r.crew && G.cond[r.k].focused) for (let v = 1; v <= 6; v++) if (v !== r.v) cands.push({ raw: set(c.raw, i, v), focus: r.k, flip: c.flip }); });
  if (cands.length === 1) return build(raw);
  cands.forEach(c => { c.s = allocations(G, build(c.raw)).reduce((a, b) => Math.max(a, b.score), -Infinity) - (c.focus >= 0 ? FOCUSGAIN : 0) - (c.nudge ? +(process.env.NUDGEGAIN || 4) : 0); });
  const pick = cands.reduce((a, b) => b.s > a.s ? b : a);
  if (pick.focus >= 0) { G.cond[pick.focus].focused = false; G.stats.focus++; }
  if (pick.nudge) { G.patUsed = true; G.stats.nudge = (G.stats.nudge || 0) + 1; }
  if (pick.flip) { G.stats.flipped++; if (ENGFLIP === 'fight') G.engUsed = true; }
  return build(pick.raw);
}
// n6: roll one die into the list. A double counts as two dice showing that number: two entries, the second with
// half: 1 and pair pointing at the first. The pair guards as one (the first half guards; the second then sits out).
function n6die(G, dice, k, crew, dbl, v = 1 + d6(G)) {
  // SOANEW=wilddbl: while an alarm is being baselined, each of the Soarcerer's dice takes two Baseline dice, any number
  // (a second entry that can only take Baseline dice).
  const sb = SOANEW === 'wilddbl' && crew && G.team[k] === 'SOA' && G.play && G.play.some(m => m.baselining);
  if (!dbl.includes(v)) { const a = { k, crew, f: [v, 1] }; dice.push(a); if (sb) dice.push({ k, crew, f: [v, 1], half: 1, pair: a, baseOnly: true }); return; }
  const a = { k, crew, f: [v, 2], half: 0 }; dice.push(a, { k, crew, f: [v, 2], half: 1, pair: a });
  if (HUNNEW === 'triple' && crew && G.team[k] === 'HUN') dice.push({ k, crew, f: [v, 2], half: 2, pair: a }); // HUNNEW=triple: a Hunter double counts as three
}
// What one die can do: a list of { mob, hits removed } targets, and whether it can guard. d20 doubles block on their own.
function options(G, d, m, enrichLeft) {
  if (!d.crew && (m.boss || m.kw === 'noagent')) return 0;
  if (G.sys === 'd20') {
    const id = G.team[d.k], dbl = d.crew && d.r >= (id === 'ENG' ? D.perks.ENG.dbl : 18);
    if (m.kw === 'hardened' && d.r < 12) return 0;
    let b = (d.boost || 0) + (d.crew ? active(G, 'enrich') * D.enrichBonus + (id === 'HUN' && m.back ? D.perks.HUN.back : 0) + (id === 'RES' && m === top(G) ? D.perks.RES.top : 0) : D.triageBonus);
    return dbl || d.r >= 18 ? 2 : d.r !== 1 && d.r + b >= m.def ? 1 : 0;
  }
  if (G.sys === 'n6') return matchAt(G, d, m, m.need, enrichLeft) < 0 ? 0 : 1;
  // d6: the face must match a symbol still needed. Hunter: any face is wild against comebacks; Responder: Contain
  // faces are wild against the biggest hitter. A running Enrichment Agent turns one die a round into any symbol.
  const [s, c] = d.f, id = d.crew ? G.team[d.k] : null;
  if (m.kw === 'hardened' && c < 2) return 0;
  const wild = d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && s === 'C' && m === top(G)) || enrichLeft;
  const need = wild ? m.need.length : m.need.filter(x => x === s).length;
  return Math.min(c, need);
}
// n6: which slot this die takes: an exact match first; Hunter/Responder one off; wild (Enrichment) anything.
function matchAt(G, d, m, need, wild) {
  const v = d.f[0], id = d.crew ? G.team[d.k] : null;
  if (m.kw === 'hardened' && d.f[1] < 2) return -1;
  if (m.kw === 'hardened' && EVASIVE === 'wild') return need.length ? 0 : -1;
  // EVASIVE=one: a double of another number still takes out one of its dice (the pair's second half can't).
  if (m.kw === 'hardened' && EVASIVE === 'one' && !need.includes(d.f[0])) return need.length && !d.half ? 0 : -1;
  if (wild || d.wildAll || (d.crew && (m.back || huntsAny() || (process.env.HUNBOSS !== '0' && m.boss)) && hunts(G, d.k, v))) return need.length ? 0 : -1;
  // SOANEW=wildbase: any of the Soarcerer's dice takes a Baseline die, whatever it shows.
  if (d.baseOnly && !m.baselining) return -1;
  if (d.baseOnly) { const j = need.indexOf(7 - numbersFor(m.id, 1)[0]); return j; }
  if ((SOANEW === 'wildbase' || SOANEW === 'wilddbl') && id === 'SOA' && m.baselining) { const j = need.indexOf(7 - numbersFor(m.id, 1)[0]); if (j >= 0) return j; }
  const i = need.indexOf(v); if (i >= 0) return i;
  if (SOANEW === 'pair5' && id === 'SOA' && (v === 2 || v === 5)) { const j = need.indexOf(7 - v); if (j >= 0) return j; }
  const adj = NEAR && ((id === 'HUN' && m.back) || (id === 'RES' && m === top(G)));
  return adj ? need.findIndex(x => Math.abs(x - v) === 1) : -1;
}
const GUARDANY = process.env.GUARDANY === '1'; // 2026-10-31 to 2026-11-03 a guard covered any player; now only its owner (GUARDANY=1: anyone)
const top = G => G.play.slice().sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0];
const resHeals = (G, d) => (RESNEW === 'heal' || RESNEW === 'healor') && G.sys === 'n6' && d.crew && G.team[d.k] === 'RES' && d.f[1] === 2 && !d.half && !d.noguard;
const canGuard = (G, d) => d.crew && !(RESNEW === 'heal' && resHeals(G, d)) && (G.sys === 'd20' ? d.r >= D.guard.min && d.r < (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18) : d.f[1] === 2 && !d.half && !d.noguard);
const autoBlock = (G, d) => G.sys === 'd20' && d.crew && d.r >= (G.team[d.k] === 'ENG' ? D.perks.ENG.dbl : 18);

// Damage the crew takes at the end of the round, given who is blocking.
function incoming(G, blocks) {
  const out = G.team.map(() => 0); const cut = PERSONAL ? 0 : active(G, 'contain'), top1 = G.team.map(() => 0);
  const dm = new Map(G.play.map(m => [m, dmgOf(G, m)]));
  // Fileless (2026-11-02, d6): Containment cuts the highest-Damage alarm that isn't Fileless.
  for (let i = 0; i < cut; i++) { const t = [...dm.entries()].filter(([m]) => m.kw !== 'noagent').sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], Math.max(1, t[1] - D.containCut)); }
  if (!PERSONAL && !aiUp(G)) G.tray.forEach((x, i) => { if (x !== 'contain' || !upgraded(G, i)) return; const t = [...dm.entries()].filter(([m]) => m.kw !== 'noagent').sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], t[1] - 1); }); // upgraded: 1 more
  if (aug(G, 'mailer')) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t && t[1] > 1) dm.set(t[0], t[1] - 1); }
  if (RESNEW === 'top' && on(G, 'RES')) { const t = [...dm.entries()].sort((a, b) => b[1] - a[1])[0]; if (t) dm.set(t[0], Math.max(0, t[1] - 1)); }
  for (const m of G.play) {
    const d = dm.get(m), pierce = m.kw === 'noblock';
    if (m.kw === 'onpoint') { if (pierce || !blocks[G.point]) { out[G.point] += d * 2; top1[G.point] = Math.max(top1[G.point], d * 2); } continue; }
    let ts = G.team.map((_, k) => k); if (m.kw === 'lowest') { const lo = Math.min(...G.hp); ts = ts.filter(k => G.hp[k] === lo); }
    for (const k of ts) if ((pierce || !blocks[k]) && !(HUNNEW === 'immune' && m.back > 0 && G.team[k] === 'HUN')) { const e = RESNEW === 'self' && G.team[k] === 'RES' ? Math.max(0, d - 1) : d; out[k] += e; top1[k] = Math.max(top1[k], e); }
  }
  // Personal Containment: what reaches its holder from their biggest hitter is 2 less per card, never below 1.
  if (PERSONAL && G.trayK) G.team.forEach((_, k) => { const c = activeK(G, 'contain', k); if (c && top1[k] > 1) out[k] -= Math.min(top1[k] - 1, c * D.containCut); });
  if (G.cond) G.cond.forEach((c, k) => { if (c.exposed && out[k] > 0) out[k]++; });
  return out;
}
// Every legal way to use this round's dice: each die goes on a mob it can hit, guards, or sits out.
// Returns the end states with the bot's score. The same scorer judges both systems.
const cp = b => { const n = b.slice(); if (b.heal) n.heal = b.heal.slice(); return n; };
function allocations(G, dice) {
  if (Math.pow(G.play.length + 2, dice.length) > +(process.env.ENUM || 200000)) return greedy(G, dice);
  const res = [], hasEnrich = G.sys !== 'd20' && (active(G, 'enrich') > 0 || G.ticket > 0 && !aiUp(G)); // Golden ticket: a once-a-fight wild die
  const rec = (i, left, blocks, enrichUsed, plan) => {
    if (i === dice.length) { res.push({ plan: plan.slice(), left: new Map(left), blocks: cp(blocks), score: score(G, left, blocks) }); return; }
    const d = dice[i]; let any = false;
    // A guarding pair, or a double spent taking a die of another number off an Evasive mob: its second half sits out.
    if (d.pair && plan.some(p => dice[p[0]] === d.pair && (p[1] === 'guard' || p[1] === 'heal' || p[1].kw === 'hardened' && !p[1].need.includes(d.f[0])))) { plan.push([i, 'idle', false]); rec(i + 1, left, blocks, enrichUsed, plan); plan.pop(); return; }
    for (const m of G.play) {
      const L = left.get(m); if (!L.n) continue;
      for (const useE of hasEnrich && !enrichUsed && d.crew ? [false, true] : [false]) {
        const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, useE);
        if (!h) continue; any = true;
        const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, useE));
        const nb = cp(blocks); if (autoBlock(G, d)) nb[d.k] = true;
        plan.push([i, m, useE]); rec(i + 1, nl, nb, enrichUsed || useE, plan); plan.pop();
      }
    }
    if (canGuard(G, d)) for (const t of GUARDANY ? G.team.map((_, k) => k) : [d.k]) if (!blocks[t]) { const nb = cp(blocks); nb[t] = true; plan.push([i, 'guard']); rec(i + 1, left, nb, enrichUsed, plan); plan.pop(); any = true; }
    if (resHeals(G, d)) for (const t of G.team.map((_, k) => k)) { const nb = cp(blocks); nb.heal = [...(blocks.heal || []), [t, RESHEAL]]; plan.push([i, 'heal']); rec(i + 1, left, nb, enrichUsed, plan); plan.pop(); any = true; }
    const nb = cp(blocks); if (autoBlock(G, d)) nb[d.k] = true;
    plan.push([i, 'idle', any]); rec(i + 1, left, nb, enrichUsed, plan); plan.pop();
  };
  rec(0, new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), G.team.map(() => false), false, []);
  return res;
}
// Too many dice to enumerate (big Triage turns): place dice one at a time, each where it scores best.
function greedy(G, dice) {
  let left = new Map(G.play.map(m => [m, { n: m.left, need: m.need ? m.need.slice() : null }])), blocks = G.team.map(() => false);
  const guarded = new Set();
  for (const d of dice) {
    if (d.pair && guarded.has(d.pair)) continue;
    if (autoBlock(G, d)) blocks[d.k] = true;
    let best = { s: score(G, left, blocks), left, blocks };
    for (const m of G.play) { const L = left.get(m); if (!L.n) continue; const h = G.sys === 'd20' ? Math.min(options(G, d, m), L.n) : options(G, d, { ...m, need: L.need }, false); if (!h) continue;
      const nl = new Map(left); nl.set(m, takeHits(G, m, L, d, h, false)); const sc = score(G, nl, blocks); if (sc > best.s) best = { s: sc, left: nl, blocks }; }
    if (canGuard(G, d)) for (const t of GUARDANY ? G.team.map((_, k) => k) : [d.k]) if (!blocks[t]) { const nb = blocks.slice(); nb[t] = true; const sc = score(G, left, nb); if (sc > best.s) best = { s: sc, left, blocks: nb, g: true }; }
    if (best.g) guarded.add(d); left = best.left; blocks = best.blocks;
  }
  return [{ plan: [], left, blocks, score: score(G, left, blocks), greedy: true }];
}
function takeHits(G, m, L, d, h, wild) {
  if (G.sys === 'd20') return { n: L.n - h, need: null };
  if (G.sys === 'n6') { const need = L.need.slice(), i = matchAt(G, d, m, need, wild); if (i >= 0) need.splice(i, 1); return { n: need.length, need }; }
  const need = L.need.slice(); const id = d.crew ? G.team[d.k] : null;
  for (let j = 0; j < h; j++) { let i = need.indexOf(d.f[0]); if (i < 0 && (wild || d.wildAll || (id === 'HUN' && m.back) || (id === 'RES' && d.f[0] === 'C' && m === top(G)))) i = 0; if (i < 0) break; need.splice(i, 1); }
  return { n: need.length, need };
}
// The bot's judgement of an end state: kills weighted by damage, progress, then damage taken (lethal is a disaster).
function score(G, left, blocks) {
  let s = 0; const alive = [];
  for (const m of G.play) { const L = left.get(m), w = dmgOf(G, m) + 1; if (!L.n) s += 10 * w + 5; else { s += (m.left - L.n) * w; alive.push(m); } }
  const saved = G.play; G.play = alive; const inc = incoming(G, blocks); G.play = saved;
  const hp = G.hp.slice(); (blocks.heal || []).forEach(([t, n]) => { const h = Math.min(n, G.max - hp[t]); hp[t] += h; s += 3 * h; });
  inc.forEach((x, k) => { s -= 3 * x; if (x >= hp[k]) s -= 1000; });
  return s;
}

function fight(G, mobs) {
  G.play = []; G.cbJoin = false; G.mimicAs = G.tray.map((x, i) => has(G, i, 'mimica') ? ['triage', 'contain', 'enrich', 'recover', 'honeypot', 'watchlist', 'correl'].find(t => G.tray.some((y, j) => j !== i && y === t)) || null : null); G.rrFight = null; G.engUsed = false; G.resUsed = false; G.patUsed = false; G.soaKeep = (SOAPERK === 'keep' || G.n === 1 && process.env.SOASOLOKEEP === '1') && on(G, 'SOA'); G.soaRoll = G.n === 1 && !SOAAUTO && (process.env.SOASOLOKEEP || 'roll') === 'roll' && on(G, 'SOA');
  G.ticket = TRAITS ? traitN(G, 'ticket') : 0; G.slipK = G.team.map((_, k) => G.tray.reduce((n, _, i) => n + (G.trayK[i] === k ? has(G, i, 'slip') : 0), 0)); G.resArr = false; G.hunEnded = false; mobs.forEach(m => enter(G, m)); let round = 0; // ticket and slip: once a fight
  while (!G.over && G.play.length) {
    round++; G.round = round; G.stats.rounds++; if (round > 200) { G.over = true; G.win = false; G.stats.stall = 1; return; } /* a fight nobody can end */ if (G.play.some(m => m.boss)) G.stats.bossR = (G.stats.bossR || 0) + 1; if (round > 1) for (const b of rowRoll(G, true)) enter(G, b); if (G.over) return;
    const boss = G.play.some(m => m.boss);
    const free = G.soaKeep;
    const used = NEWITEMS && process.env.ITEMBOT !== 'old', dl = G.play.reduce((a, m) => a + m.left, 0); // consumables have no other use: spend them
    // LOOSE=1: spend freely (a held consumable does nothing, and a full hand discards new draws).
    const loose = used && process.env.LOOSE !== '0';
    if (G.tray.includes(USE.contain) && (loose ? dl >= 4 : G.play.length >= (free || used ? 2 : 3) || boss && G.play.length >= 2)) burn(G, USE.contain);
    if (G.tray.includes(USE.recover) && Math.min(...G.hp) <= (loose ? G.max - D.recoverBurn : G.max * (G.soaKeep || used ? 0.6 : 0.4))) burn(G, USE.recover);
    if (G.tray.includes('takedown') && G.row.some(m => m.dmg >= 3)) { const t = G.row.slice().sort((a, b) => b.dmg - a.dmg)[0]; burn(G, 'takedown'); G.row = G.row.filter(m => m !== t); G.stats.takedown = (G.stats.takedown || 0) + 1; }
    if (G.tray.includes('kill')) { const t = G.play.filter(m => !m.boss && m.left <= 2).sort((a, b) => dmgOf(G, b) - dmgOf(G, a))[0]; if (t && (dmgOf(G, t) >= 3 || t.kw === 'detonate' && t.up >= 1)) { burn(G, 'kill'); G.play = G.play.filter(m => m !== t); if (!t.baselining) G.row.push(t); else t.baselining = false; G.stats.kill = (G.stats.kill || 0) + 1; if (!G.play.length) break; } }
    let dice = roll(G);
    // SOLO_REROLL=1: playing solo, once a round reroll one crew die that can't hit anything.
    if (process.env.SOLO_REROLL && G.n === 1 && G.sys === 'd6') { const i = dice.findIndex(d => d.crew && G.play.every(m => !options(G, d, m))); if (i >= 0) dice[i] = { ...dice[i], f: (G.r() < 1 / 3 ? CREW_DIE : DICE[G.team[0]])[d6(G)] }; }
    if ((G.soaKeep || used) && !boss && G.tray.includes(USE.triage) && dl >= +(process.env.SURGEMIN || (loose ? 3 : 5))) { burn(G, USE.triage); for (let i = 0; i < 3; i++) n6die(G, dice, G.point, true, DOUBLES[G.team[G.point]]); }
    if (boss && G.tray.includes(USE.triage)) { burn(G, USE.triage); for (let i = 0; i < 3; i++) { const id = G.team[G.point]; if (G.sys === 'n6') n6die(G, dice, G.point, true, DOUBLES[id]); else dice.push(G.sys === 'd20' ? { k: G.point, crew: true, r: d20(G) } : { k: G.point, crew: true, f: DICE[id][d6(G)] }); } }
    let wildAll = false; if ((boss || used && dl >= +(process.env.INTELMIN || (loose ? 4 : 6))) && G.tray.includes(USE.enrich)) { burn(G, USE.enrich); wildAll = true; }
    if (G.aiBack) { G.aiBack.forEach(b => enter(G, b)); G.aiBack = null; }
    if (G.over || !G.play.length) break;
    if (wildAll) dice = dice.map(d => G.sys === 'd20' ? { ...d, r: d.r, boost: 5 } : d);
    const all = allocations(G, wildAll && G.sys !== 'd20' ? dice.map(d => ({ ...d, wildAll: true })) : dice);
    // A real choice: two allocations that use every usable die end in states the bot scores differently.
    const full = all.filter(a => a.plan.every(p => p[1] !== 'idle' || !p[2]));
    if (full.length > 1 && full.reduce((a, b) => Math.max(a, b.score), -Infinity) - full.reduce((a, b) => Math.min(a, b.score), Infinity) > 0.5) { G.stats.choice++; G.offered = true; } if (G.offered) G.stats.decide = (G.stats.decide || 0) + 1; G.offered = false;
    const pick = G.smart ? all.reduce((a, b) => b.score > a.score ? b : a) : full[Math.floor(G.r() * full.length)] || all[0];
    if (G.ticket > 0 && !(active(G, 'enrich') > 0) && pick.plan && pick.plan.some(p => p[2] === true)) G.ticket--;
    for (const m of G.play) { const L = pick.left.get(m); m.left = L.n; m.need = L.need; }
    const beaten = G.play.filter(m => !m.left), alive = G.play.filter(m => m.left);
    for (const m of beaten) {
      if (m.boss) { if (m.kw === 'apt' && !m.rose) { m.rose = true; m.left = 2; m.need = G.sys === 'd6' ? ['D', 'C'] : G.sys === 'n6' ? numbersFor(m.id, 2) : null; alive.push(m); if (G.sys === 'n6' && BOSSROW !== 'none') rowRoll(G, true).forEach(b => alive.push(b)); continue; } G.over = true; G.win = true; return; }
      if (m.baselining) { m.baselining = false; G.stats.baselined = (G.stats.baselined || 0) + 1;
        if (TRAITS) { const tr0 = TRAIT[m.id] === 'signature' ? 'sig' + numbersFor(m.id, 1)[0] : TRAIT[m.id], t = tuckTrait(G, tr0); if (SOANEW === 'drawpoint' && G.team[G.point] === 'SOA') draw(G, 1); /* the Soarcerer on point: a baseline draws an item */ if (t === 'full') { G.row.push(m); continue; } if (!t) G.pendT.push(tr0); if (SOATUCK && on(G, 'SOA')) draw(G, 1); } else { const host = G.tray.filter(isAgent).pop(); G.aug.push({ id: m.id, host: host || null, pend: !host }); }
        if (process.env.BASEROW === 'out' || TUCKOUT) continue; } // TUCKOUT: tucked under its agent, so not on the row
      if (G.sys === 'n6' && HUNEND !== '0' && on(G, 'HUN') && m.back > 0 && (HUNEND !== 'point' || G.team[G.point] === 'HUN') && (HUNEND !== 'once' || !G.hunEnded)) { G.hunEnded = true; G.stats.ended = (G.stats.ended || 0) + 1; continue; } // the Hunter ends persistence
      if (G.sys === 'n6' && PERSIST === 'always') { G.row.push(m); continue; }
      const gone = on(G, 'HUN') && m.back > 0; if (!gone && m.back < 1) G.row.push(m);
    }
    for (const m of beaten) if (!m.boss) G.tray.forEach((_, i) => { const n = has(G, i, 'siphon'); if (n && !aiUp(G)) { const k = G.trayK[i]; G.hp[k] = Math.min(G.max, G.hp[k] + n); } }); // Siphon
    {
    }
    G.play = alive;
    const bo = G.play.find(m => m.boss);
    if (bo && BOSSROW !== 'none') { // the boss pulls the row: comebacks hit on arrival and join the fight
      let n = 0; if (BOSSROW === 'round') n = bo.left < (bo.was ?? bo.hits) ? 1 : 0; else for (const t of bo.kw === 'wyrm' ? BOSSSTEPS : bo.kw === 'apt' ? [4] : []) if (bo.left <= t && !(bo.steps || []).includes(t)) { bo.steps = [...(bo.steps || []), t]; n++; }
      bo.was = bo.left; for (let i = 0; i < n && !G.over; i++) { const back = rowRoll(G, true); back.forEach(b => enter(G, b)); G.stats.bossRow = (G.stats.bossRow || 0) + 1; G.stats.bossBack = (G.stats.bossBack || 0) + back.length; }
      if (G.over) return;
    }
    (pick.blocks.heal || []).forEach(([t, n]) => { G.hp[t] = Math.min(G.max, G.hp[t] + n); G.stats.resHeal = (G.stats.resHeal || 0) + 1; });
    let inc = incoming(G, pick.blocks);
    if (RESPERK === 'stand' && on(G, 'RES') && !G.resUsed && G.play.length) { // stand down the mob that would hurt most, when it matters
      const saved = G.play, opts = saved.map(m => { G.play = saved.filter(x => x !== m); const o = incoming(G, pick.blocks); return [m, o]; }); G.play = saved;
      const best = opts.reduce((a, b) => b[1].reduce((x, y) => x + y, 0) < a[1].reduce((x, y) => x + y, 0) ? b : a), cut = inc.reduce((x, y) => x + y, 0) - best[1].reduce((x, y) => x + y, 0);
      if (cut >= +(process.env.RESMIN || 6) || inc.some((x, k) => x >= G.hp[k])) { inc = best[1]; G.resUsed = true; G.stats.stand = (G.stats.stand || 0) + 1;
        if (SOLORES && G.n === 1 && best[0].left > 1) { best[0].left--; if (best[0].need) best[0].need.pop(); } }
    }
    // Slip: once a fight per trait, the biggest hit on its holder misses (the bot saves it for a 3+ or lethal round).
    if (TRAITS && !aiUp(G)) inc.forEach((x, k) => { if (G.slipK[k] > 0 && (x >= 3 || x >= G.hp[k])) { inc[k] = Math.max(0, x - Math.max(...G.play.map(m => dmgOf(G, m)))); G.slipK[k]--; G.stats.slip = (G.stats.slip || 0) + 1; } });
    if (G.tray.includes('firewall') && (inc.some((x, k) => x >= G.hp[k]) || inc.reduce((a, b) => a + b, 0) >= 4 * G.n)) { burn(G, 'firewall'); inc = incoming(G, G.team.map(() => true)); G.stats.firewall = (G.stats.firewall || 0) + 1; }
    inc.forEach((x, k) => hurt(G, k, x)); if (G.over) return;
    // Feedback: each round an agent works (Triage, Containment and Enrichment every round), its holder heals 1.
    if (V4 && !aiUp(G)) G.tray.forEach((t, i) => { if (has(G, i, 'feedback') && t !== 'recover') { const k = G.trayK[i]; G.hp[k] = Math.min(G.max, G.hp[k] + 1); G.stats.feedback = (G.stats.feedback || 0) + 1; } });
    // Exfil: each one still up at round end, the crew discards an item (the bot: a consumable first, then a bare agent).
    for (const m of G.play.slice()) if (m.kw === 'detonate' && m.left > 0 && m.up >= 1) { G.team.forEach((_, k) => hurt(G, k, 5 + heat(G))); G.play = G.play.filter(x => x !== m); G.row.push(m); G.stats.detonate = (G.stats.detonate || 0) + 1; if (G.over) return; } // Detonate: still up at the end of its 2nd round (m.up counts rounds ended)
    for (const m of G.play) if (m.kw === 'exfil' && m.left > 0 && G.tray.some((_, x) => !has(G, x, 'locked'))) { let j = G.tray.findIndex(x => !isAgent(x)); if (j < 0) j = G.tray.findIndex((_, x) => !traitsOf(G, x).length); if (j < 0) j = G.tray.findIndex((_, x) => !has(G, x, 'locked')); G.discard.push(dropItem(G, j)); G.stats.exfil = (G.stats.exfil || 0) + 1; }
    for (const m of G.play) { m.up++; if (m.kw === 'regen' && m.left < m.hits) { m.left++; if (m.need) m.need.push(G.sys === 'n6' ? slotsFor(m, G.n)[m.need.length] : symbolsFor(m.domain, m.hits)[m.need.length]); } }
  }
  // Rattled and Exposed last one fight. The CEO's +2 lasts one visit.
  G.cond.forEach(c => { c.rattled = false; c.exposed = false; }); [...G.row, ...mobs].forEach(m => { m.plus = 0; });
  G.stats.fights = (G.stats.fights || 0) + 1; // fights finished (the threat coin moves after each)
  if (STORYAT && STORYAT.includes(G.stats.fights) && G.storyDeck.length) G.feed.push(G.storyDeck.pop()); // the story card is the next flip
  // Won fight: heals, then kit.
  if (on(G, 'PAT') && PATPERK !== 'nudge') { if (PATPERK === 'choose' && Math.min(...G.hp) > G.max - +(process.env.PATMIN || 4)) { draw(G, +(process.env.PATDRAW || 1)); G.stats.patDraw = (G.stats.patDraw || 0) + 1; } else spread(G, Math.floor(HEALX * +(process.env.PATHEAL || D.perks.PAT.fight))); }
  if (aug(G, 'mimic')) spread(G, Math.floor(HEALX * +(process.env.BASEHEAL || 5)));
  G.tray.forEach((_, i) => { const k = G.trayK[i], h = has(G, i, 'repair') * 2; if (h) G.hp[k] = Math.min(G.max, G.hp[k] + h); }); // Repair
  if (PERSONAL) G.team.forEach((_, k) => { G.hp[k] = Math.min(G.max, G.hp[k] + activeK(G, 'recover', k) * D.recoverHeal); });
  else spread(G, Math.floor(HEALX * ((aiUp(G) ? 0 : G.tray.filter((x, i) => x === 'recover' && upgraded(G, i)).length * 2) + active(G, 'recover') * (D.recoverHeal + (on(G, 'PAT') && (PATPERK !== 'nudge' || process.env.PATREC === '1') ? D.perks.PAT.recover : 0)))));
  draw(G, (process.env.DRAWS ? (G.n === 1 ? +process.env.DRAWS.split(',')[0] : +process.env.DRAWS.split(',')[1] * (process.env.DRAWPER === '1' ? G.n : 1)) : G.n === 1 ? D.kitSolo : D.kitPerFight) + (on(G, 'SOA') ? +(process.env.SOADRAW ?? (SOAPERK === 'keep' || NEWITEMS ? 0 : D.perks.SOA.draw)) + (G.n === 1 ? +(process.env.SOASOLODRAW || 0) : 0) : 0) + (G.bonusDraw || 0)); G.bonusDraw = 0;
}
function spread(G, n) { for (let i = 0; i < n; i++) { const k = G.hp.indexOf(Math.min(...G.hp)); if (G.hp[k] >= G.max) return; G.hp[k]++; } }
function burn(G, t) {
  if (G.sys === 'n6' && BOSSROW !== 'none' && aiUp(G) && !isAgent(t) && t !== 'freeze') G.aiBack = [...(G.aiBack || []), ...rowRoll(G, true)]; // the Rogue AI pulls the row
  if (G.aug && !G.soaKeep) { const i = G.aug.findIndex(a => a.host === t); if (i >= 0 && G.tray.filter(x => x === t).length <= 1) G.aug.splice(i, 1); }
  G.stats.used = G.stats.used || {}; G.stats.used[t] = (G.stats.used[t] || 0) + 1;
  const lucky = G.soaRoll && !isAgent(t) && DOUBLES.SOA.includes(1 + d6(G)); // SOASOLOKEEP=roll: a double (2 or 6) keeps it
  if (lucky) G.stats.kept = (G.stats.kept || 0) + 1; else if (G.soaKeep) { G.soaKeep = false; G.stats.kept = (G.stats.kept || 0) + 1; } else { dropItem(G, G.tray.indexOf(t)); G.discard.push(t); }
  if (t === USE.contain) for (const m of G.play.slice()) { if (m.boss) { m.left = Math.max(1, m.left - 1); if (m.need) m.need.pop(); continue; } m.left--; if (m.need) m.need.pop(); if (!m.left) { G.play = G.play.filter(x => x !== m); if (m.back < 1 || (G.sys === 'n6' && PERSIST === 'always')) G.row.push(m); } }
  if (t === USE.recover) spread(G, D.recoverBurn);
}
function draw(G, n) {
  const cap = slotsOf(G);
  for (let i = 0; i < n; i++) { if (!G.kit.length) { G.kit = shuffle(G.discard, G.r); G.discard = []; } const c = G.kit.pop(); if (!c) return; // The bot gives an item to whoever holds fewest (Triage to on point first). Full: an agent replaces a consumable.
    const ks = G.team.map((_, k) => k).filter(k => held(G, k) < slotsK(G, k)).sort((a, b) => held(G, a) - held(G, b) || (b === G.point) - (a === G.point));
    let owner = !NEWITEMS ? (G.tray.length < cap ? 0 : -1) : CONSFREE && !isAgent(c) ? G.point : ks.length ? ks[0] : -1;
    if (owner < 0 && NEWITEMS && isAgent(c)) { const j = G.tray.findIndex(x => !isAgent(x)); if (j >= 0) { owner = G.trayK[j]; G.discard.push(dropItem(G, j)); } }
    if (owner >= 0) { G.tray.push(c); G.trayK.push(owner); G.trayT.push(isAgent(c) ? G.pendT.splice(0) : []); if (isAgent(c)) (G.aug || []).filter(a => a.pend).forEach(a => { a.host = c; a.pend = false; }); } else G.discard.push(c); }
}
// ---- Situations (n6) ------------------------------------------------------------------------------------------
// One flips before every flip after the first (the boss's too), once who's on point is picked. Six cards, one each.
const SITS = ['insider', 'pager', 'usb', 'chatter', 'lateral', 'patch'];
// The full pool (2026-11-02): the production deck's 18 situations, 9 core and 9 story (story cards: Full Shift only).
const FOR_BURY = ['ciso', 'pentest', 'vendor', 'lateral', 'ceo', 'change'];
const SITS_CORE = ['travel', 'coffee', 'blast', 'patch', 'ciso', 'intel', 'pentest', 'pager', 'budget'];
const SITS_STORY = ['insider', 'lateral', 'ceo', 'change', 'chatter', 'usb', 'ioc', 'honey', 'vendor'];
const rollN = (G, n) => Array.from({ length: n }, () => 1 + d6(G));
function situation(G, s) {
  if (!s) return;
  const p = G.point, f = SITPICK[s], lo = Math.min(...G.hp); let pick;
  if (s === 'insider') { // Stay or run: hold the room (on point is Exposed; win the next fight, draw an item) or fall back. SITV=2
    // (default, 2026-11-02 review): the next alarm that flips goes straight on the row, unfought (never the boss). SITV=1:
    // it hits everyone once on arrival, then is fought.
    const alarmLeft = G.feed.some(c => !c.sit);
    pick = !alarmLeft ? 'stay' : f || (G.hp[p] <= +(process.env.BADGEHP || 5) ? 'run' : 'stay');
    if (pick === 'stay') { G.cond[p].exposed = true; G.bonusDraw = 1; } else if (SITV === 2) { G.badgeSkip = true; draw(G, +(process.env.BADGEDRAW ?? 2)); } else G.badgeHit = true; // fall back also draws 2 items (BADGEDRAW)
  }
  if (s === 'pager') { // Ride it out (everyone loses 2; SITV=2: and draw an item) or mute it (the next mob sets one more threat die, a 6).
    pick = f || (lo <= +(process.env.PAGERHP || 8) ? 'mute' : 'ride');
    if (pick === 'ride') { G.team.forEach((_, k) => hurt(G, k, 2)); if (SITV === 2 && !G.over) draw(G, 1); } else G.addSix++;
  }
  if (s === 'usb') { // A grab: on point rolls 3. Any pair: draw an agent and become Focused. No pair: Rattled.
    pick = f || (SITV === 2 && G.hp[p] <= +(process.env.USBHP || 0) ? 'leave' : 'grab');
    if (pick === 'leave' && SITV === 2) { if ((process.env.USBLEAVE || 'item') === 'item') draw(G, 1); else G.hp[p] = Math.min(G.max, G.hp[p] + +(process.env.USBHEAL || 2)); } // SITV=2: leave it, on point heals 2 (default since the review: USBLEAVE=item, draw an item; USBLEAVE=heal: on point heals 2)
    if (pick === 'grab') { const r = rollN(G, 3); if (new Set(r).size < 3) { draw(G, +(process.env.USBDRAW || 2)); G.cond[p].focused = true; pick = 'grab won'; } else { G.cond[p].rattled = true; pick = 'grab lost'; } }
  }
  if (s === 'chatter') { // A grab: on point rolls 0–4 dice. Any 6: draw two agents. No 6: lose 1 HP per die rolled.
    const k = f != null ? +f : G.hp[p] > 12 ? 3 : G.hp[p] > 6 ? 2 : 0; pick = 'roll ' + k;
    if (k) { if (rollN(G, k).includes(6)) { draw(G, 2); pick += ' won'; } else { hurt(G, p, k); pick += ' lost'; } }
  }
  if (s === 'lateral') { pick = 'event'; G.pending.push(...rollRow(G, true)); } // Roll for the row now; comebacks join the next fight.
  const all = n => G.team.forEach((_, k) => { if (n < 0) hurt(G, k, -n); else G.hp[k] = Math.min(G.max, G.hp[k] + n); });
  const sum2 = () => rollN(G, 2).reduce((a, b) => a + b, 0);
  if (s === 'travel') { pick = f || (G.hp[p] > 4 ? 'chase' : 'leave'); if (pick === 'chase') { pick = sum2() >= 7 ? 'won' : 'lost'; if (pick === 'won') draw(G, 1); else hurt(G, p, 2); } } // chase it or let it go // on point rolls 2: 7+ draws an item; under, lose 2
  if (s === 'coffee') { pick = f || (Math.max(...G.hp) - lo >= 4 ? 'one' : 'all'); if (pick === 'all') all(2); else { const k = G.hp.indexOf(lo); G.hp[k] = Math.min(G.max, G.hp[k] + 5); } } // everyone heals 2, or one heals 5
  if (s === 'blast') { pick = f || (G.n > 1 && G.hp[p] > 6 ? 'point' : 'all'); if (pick === 'all') all(-1); else { hurt(G, p, 3); if (!G.over) draw(G, +(process.env.BLASTDRAW ?? 1)); } } // on point takes 3 and draws an item
  if (s === 'ciso') { pick = sum2() >= 6 ? 'won' : 'lost'; if (pick === 'lost') hurt(G, p, 3); } // on point rolls 2: under 6 loses 3
  if (s === 'intel') { pick = 'event'; const t = G.row.slice().sort((a, b) => b.dmg - a.dmg)[0]; if (t) { G.row = G.row.filter(m => m !== t); G.stats.intel = (G.stats.intel || 0) + 1; } } // the biggest row alarm leaves the game
  if (s === 'pentest') { const cons = G.tray.findIndex(x => !isAgent(x)); pick = f || (cons >= 0 && lo <= 4 ? 'skip' : 'run'); if (pick === 'skip' && cons >= 0) G.discard.push(dropItem(G, cons)); else G.team.forEach((_, k) => { if (1 + d6(G) <= 2) hurt(G, k, 2); }); } // or discard an item to skip it
  if (s === 'budget') { pick = f || (lo <= G.max - 3 ? 'training' : 'tools'); if (pick === 'tools') draw(G, 2); else { draw(G, 1); all(2); } } // tools: draw 2; training: draw 1, everyone heals 2
  if (s === 'ceo') { pick = f || (lo > 6 ? 'quarantine' : 'ride'); if (pick === 'quarantine') all(-2); else G.nextPlus = (G.nextPlus || 0) + 2; } // or the next alarm gets +2 Damage
  if (s === 'change') { pick = 'event'; G.addMain = (G.addMain || 0) + 1; } // the next alarm sets one more die, its main number
  if (s === 'ioc') { pick = 'event'; const t = G.row.slice().sort((a, b) => rowTop(b.persist[1]) - rowTop(a.persist[1]))[0]; if (t) { G.row = G.row.filter(m => m !== t); t.left = t.hits; t.need = needFor(G.sys, t, G.n); t.back++; t.up = 0; G.stats.back++; G.pending.push(t); } }
  if (s === 'honey') { pick = 'event'; all(2); }
  if (s === 'vendor') { pick = f || (G.row.length >= 2 && G.hp[p] > 5 ? 'contain' : 'take'); if (pick === 'contain') hurt(G, p, 3); else { all(-2); if (!G.over) G.pending.push(...rollRow(G, true)); } } // or on point takes 3 and no row roll
  if (s === 'patch') { // Take a breather (everyone heals 2) or raid the supply closet (draw an agent).
    pick = f || (lo <= G.max - 4 ? 'heal' : 'agent');
    if (pick === 'heal') G.hp = G.hp.map(h => Math.min(G.max, h + (SITV === 2 ? +(process.env.PATCHHEAL || 3) : 2))); else { draw(G, 1); hurt(G, p, +(process.env.PATCHCOST ?? 1)); } // SITV=2: heal 3; PATCHCOST: the raid costs on point HP
  }
  const t = G.stats.sit[s] = G.stats.sit[s] || {}; t[pick] = (t[pick] || 0) + 1;
}
// Relay: at the start of a fight, the bot passes a Relay Triage Agent to on point (two crew dice to pair with) when on
// point has a free slot. Its other agents work for the whole crew wherever they sit.
function relay(G) {
  if (G.n === 1) return;
  G.tray.forEach((t, i) => { if (t === 'triage' && has(G, i, 'relay') && G.trayK[i] !== G.point && (has(G, i, 'stealth') || held(G, G.point) < slotsK(G, G.point))) { G.trayK[i] = G.point; G.stats.relays = (G.stats.relays || 0) + 1; } });
}
function play(sys, team, opt) {
  const G = newGame(sys, team, opt);
  for (const q of G.team.map((_, i) => i).slice(0, G.n === 1 ? D.quickStartSolo : D.quickStartAgent)) draw(G, 1);
  if (G.n >= 3 && NEWITEMS) draw(G, +(process.env.START34 ?? 1)); // START34: extra setup items for a crew of 3 or 4 (1; 2 for part of 2026-11-04; 1 since 2026-11-03)
  if (G.n === 1 && NEWITEMS) draw(G, +(process.env.QSOLO || 1) - 1); // QSOLO: items a solo player starts with (1 since 2026-11-04, was 2)
  const sits = SIT && G.sys === 'n6';
  for (let f = 0; !G.over; f++) {
    G.point = G.hp.indexOf(Math.max(...G.hp));
    if (sits && FEED !== 'mixed' && f) { situation(G, G.sits.pop()); if (G.over) break; }
    // Forensics: look at the top card; bury a heavy alarm when the crew is hurt, or a harmful situation.
    if (FORPEEK && on(G, 'FOR') && G.feed.length > 1) { const t = G.feed[G.feed.length - 1], hurtx = Math.min(...G.hp) <= G.max * .6;
      if (FORCUT && !t.sit) { t.fewer = 1; } else if (t.sit ? FOR_BURY.includes(t.sit) : t.dmg >= 4 && hurtx) { G.feed.unshift(G.feed.pop()); G.stats.buried = (G.stats.buried || 0) + 1; } }
    let m = G.feed.pop();
    if (m && m.sit) { situation(G, m.sit); if (G.over) break; continue; } // a situation card from the mixed feed
    const boss = !m; if (boss) { m = G.boss; G.stats.boss = 1; }
    if (!boss && G.badgeHit) { G.badgeHit = false; G.stats.ran++; G.team.forEach((_, k) => hurt(G, k, dmgOf(G, m))); if (G.over) break; } // fell back (SITV=1)
    if (!boss && G.badgeSkip) { G.badgeSkip = false; G.stats.ran++; G.row.push(m); continue; } // fell back: on the row, unfought
    relay(G);
    if (BASE && m && !boss && (!m.back || BASEBACK) && BASES.includes(m.id) && (BASEPICK === 'always' || BASEPICK === 'bot' && BASECHEAP && dmgOf(G, m) <= 1 && Math.min(...G.hp) > 3 || BASEPICK === 'bot' && Math.min(...G.hp) >= G.max * +(process.env.BASEHP || 0.8))) {
      const v = 7 - numbersFor(m.id, 1)[0], nb = (SOAAUTO && on(G, 'SOA') ? 2 : BASEDICE) + (m.back ? 1 : 0) + (process.env.BASEPLUS !== '1' ? 0 : Math.max(0, G.n - XFROM)); m.need.push(...Array(nb).fill(v)); m.left += nb; m.baselining = true; G.stats.baselines = (G.stats.baselines || 0) + 1; }
    if (m.fewer && m.left > 1) { m.need.pop(); m.left--; m.fewer = 0; } // Forensics read it first: one fewer die
    if (G.addSix) { m.need.push(...Array(G.addSix).fill(6)); m.left += G.addSix; G.addSix = 0; }
    if (G.addMain) { const v = numbersFor(m.id, 1)[0]; m.need.push(...Array(G.addMain).fill(v)); m.left += G.addMain; G.addMain = 0; } // Ghost in the Change Window
    if (G.nextPlus) { m.plus = G.nextPlus; G.nextPlus = 0; } // The CEO's Inbox: this visit only
    const back = rowRoll(G, !boss); if (G.over) break;
    fight(G, [m, ...G.pending, ...back]); G.pending = [];
    if (boss) break;
  }
  return G;
}

// Every crew of the six analysts (2026-11-02 review 2: Forensics and Shift Lead): 6 solos, 15 pairs, 15 fours.
function teams(ids = ANALYSTS) { const c = (a, n) => n === 0 ? [[]] : a.flatMap((x, i) => c(a.slice(i + 1), n - 1).map(r => [x, ...r])); return { 1: c(ids, 1), 2: c(ids, 2), 4: c(ids, 4) }; }
const ANALYSTS = (process.env.ANALYSTS || 'HUN,RES,ENG,SOA').split(','); // Forensics and the Shift Lead cut 2026-11-03 (FOR, LEAD still run)
module.exports = { SITS, play, teams, ANALYSTS, rng, DICE, symbolsFor, numbersFor, slotsFor, XFROM, ROWSHIFT, pipDie, rowTop, KEY, DOUBLES };

if (require.main === module) {
  const N = +(process.env.N || 600), TEAMS = teams(); // the Fixer is gone (2026-10-31)
  const run = (sys, teams, hp, smart = true) => { let w = 0, rounds = 0, choice = 0, back = 0, early = 0, seed = 5; for (let g = 0; g < N; g++) { const G = play(sys, teams[g % teams.length], { hp, rnd: rng(seed++ * 2654435761), smart }); w += G.win; rounds += G.stats.rounds; choice += G.stats.choice; back += G.stats.back; early += !G.win && !G.stats.boss; } return { win: w / N, choice: choice / rounds, rounds: rounds / N, back: back / N, early: early / Math.max(1, N - w) }; };
  // Tune HP per system so the smart bot wins about half its two-player games: spreads only compare at equal odds.
  const tune = sys => { let lo = 5, hi = 200; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (run(sys, TEAMS[2], mid).win < 0.5) lo = mid; else hi = mid; } return hi; };
  const pct = x => Math.round(x * 100) + '%';
  for (const sys of (process.env.SYS || 'd20,n6').split(',')) {
    const hp = process.env.HP ? +process.env.HP : tune(sys); console.log(`\n== ${sys} · HP ${hp} ${process.env.HP ? '(set by HP)' : '(tuned to ~50% at 2p)'} ==`);
    for (const n of [1, 2, 4]) { const s = run(sys, TEAMS[n], hp), r = run(sys, TEAMS[n], hp, false); console.log(`${n}p  win ${pct(s.win)} | random placement ${pct(r.win)} (skill gap ${Math.round((s.win - r.win) * 100)} pts) | rounds with a real dice choice ${pct(s.choice)} | rounds ${s.rounds.toFixed(1)} | comebacks ${s.back.toFixed(1)} | losses before the boss ${pct(s.early)}`); }
    const solo = ANALYSTS.map(id => [id, run(sys, [[id]], hp).win]);
    console.log('solo by analyst: ' + solo.map(([id, w]) => `${id} ${pct(w)}`).join(' · ') + `  (spread ${Math.round((Math.max(...solo.map(x => x[1])) - Math.min(...solo.map(x => x[1]))) * 100)} pts)`);
    const pairs = TEAMS[2].map(t => [t, run(sys, [t], hp).win]);
    pairs.sort((a, b) => a[1] - b[1]); console.log(`pairs: ${pct(pairs[0][1])} (${pairs[0][0].join('+')}) to ${pct(pairs[pairs.length - 1][1])} (${pairs[pairs.length - 1][0].join('+')})`);
  }
}
