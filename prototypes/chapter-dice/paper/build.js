// Paper prototype for the chapter dice test: one printable PDF with the rules sheet, a sticker sheet for seven
// blank d6s, and 21 cut-out cards (6 mobs, the boss, 5 analysts, 8 agents, a dice legend).
// Numbers come from the sim's tuned run (see ../README.md) and the game's data, so paper and sim agree.
// Usage: node prototypes/chapter-dice/paper/build.js  →  prototypes/chapter-dice/paper/chapter-dice-paper.{html,pdf}
const fs = require('fs'), path = require('path');
const D = require('../../../data/cards.json');
const { fonts } = require('../../../deck/render');
const { launch, fontsReady } = require('../../../deck/browser');
const { symbolsFor } = require('../sim');

const OUT = __dirname, HP = 29; // the sim's tuned starting HP for two players
const C = { bg: '#F6F2EC', ink: '#1A1418', mut: '#5A4B43', rule: '#D8CEC3', D: '#005F73', C: '#8A4510', E: '#A8360F', fl: '#FF5A2A' };
const NAME = { D: 'Detect', C: 'Contain', E: 'Eradicate' };
// The three response symbols: an eye, a shield, a bolt. Distinct shapes first, colour second.
const PATH = {
  D: '<path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.3" fill="currentColor"/>',
  C: '<path d="M8 1.3l5.6 2.1v4.3c0 3.5-2.4 5.9-5.6 7-3.2-1.1-5.6-3.5-5.6-7V3.4z" fill="currentColor"/>',
  E: '<path d="M9.6 1L3 9.2h4.6L6.4 15 13 6.8H8.4z" fill="currentColor"/>',
};
const icon = (s, px) => `<svg viewBox="0 0 16 16" width="${px}" height="${px}" style="color:${C[s]};display:inline-block;vertical-align:middle">${PATH[s]}</svg>`;
// Faces as [symbol, count]: the tuned dice from the sim (Hunter and Responder with a third double).
const DICE = {
  HUN: [['D', 2], ['D', 2], ['D', 1], ['C', 1], ['E', 1], ['E', 2]],
  RES: [['C', 2], ['C', 2], ['C', 1], ['D', 1], ['E', 1], ['D', 2]],
  ENG: [['E', 2], ['E', 2], ['E', 1], ['D', 1], ['C', 1], ['C', 2]],
  SOA: [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 1]],
  PAT: [['C', 1], ['D', 1], ['E', 1], ['C', 2], ['D', 1], ['E', 2]],
  CREW: [['D', 1], ['C', 1], ['E', 1], ['D', 2], ['C', 2], ['E', 2]],
  AGENT: [['D', 1], ['C', 1], ['E', 1], ['D', 1], ['C', 1], ['E', 1]],
};
const DIE_NAME = { CREW: 'Crew die (solo’s third die)', AGENT: 'Agent die (Triage)' };
const cls = id => D.classes.find(c => c.id === id);
const face = ([s, n], px) => n === 2 ? `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:0">${icon(s, px * 0.62)}${icon(s, px * 0.62)}</span>` : icon(s, px);

// ---- Rules sheet -------------------------------------------------------------------------------------------
const rules = `<section class="page rules">
<h1>Detect the Dwellers · Chapter dice test</h1>
<p class="lede">A paper test of one idea: <b>match symbols instead of adding numbers.</b> Play it, then play today’s Quick Shift with the same group, and compare (see <i>docs/PLAYTEST.md</i>). Best with <b>2 players</b>: solo and 4 players aren’t tuned yet.</p>
<div class="cols">
<div>
<h2>You need</h2>
<p>This sheet’s cards and dice stickers. Seven blank d6s (16 mm) with the stickers on. The amber d20 for the persistence row. Coins: 2 per player for HP, about 20 to cover symbols.</p>
<h2>Setup</h2>
<ol>
<li>Each player picks an analyst and takes that analyst’s die. Start at <b>${HP} HP</b>.</li>
<li>Shuffle the six mobs face down. The Lockjaw Syndicate goes underneath.</li>
<li>Shuffle the 8 agent cards: that’s the kit deck. The crew starts with ${D.quickStartAgent} agents (${D.quickStartSolo} solo).</li>
</ol>
<h2>The symbols</h2>
<p>${icon('D', 14)} <b>Detect</b> · ${icon('C', 14)} <b>Contain</b> · ${icon('E', 14)} <b>Eradicate</b>. A mob’s row of symbols is its hits. Cover a symbol with a coin when you remove it. Bigger crews add the symbols printed for 3 and 4 players.</p>
<h2>A flip</h2>
<ol>
<li>Pick who’s on point.</li>
<li>Flip the top mob. If anything is on the row, roll the amber d20: every row mob whose range includes the roll comes back with all its symbols. The two with the highest Damage hit everyone on the way in.</li>
<li>Fight. When the feed is empty, the boss arrives with one last row roll and no arrival hits.</li>
</ol>
</div>
<div>
<h2>A fight round</h2>
<ol>
<li><b>Row.</b> From the second round on, roll the row first.</li>
<li><b>Roll.</b> Everyone rolls their die. On point rolls theirs a second time. Solo: roll yours twice, plus the crew die. Each running Triage Agent rolls the agent die.</li>
<li><b>Match.</b> A face removes one matching symbol from a mob. A <b>double face</b> removes two of that symbol from one mob, <b>or guards</b>: you block this round. Not both.</li>
<li><b>Hits back.</b> Every mob still up hits everyone who isn’t blocking, for its Damage.</li>
</ol>
<p>Agent dice can’t hit the boss, and can’t guard.</p>
<h2>After a fight</h2>
<p>Beaten mobs go on the row, unless they already came back once: then they’re gone for good. Draw ${D.kitPerFight} agent cards (${D.kitSolo} solo) into the tray, which holds ${D.sharedKit}. Run an agent every round, or burn it once for its big effect.</p>
<h2>Win or lose</h2>
<p>Beat the boss and you’ve survived the night. Anyone at 0 HP and the shift is lost.</p>
<h2>Keywords in this test</h2>
<p><b>Beacon:</b> roll the row when it arrives. <b>Piercing:</b> blocks don’t stop it. <b>Targeted:</b> only on point takes its damage, doubled. <b>Evasive:</b> only a double face can hit it. <b>Regen:</b> gets one symbol back at the end of each round. <b>Escalating:</b> +1 Damage every round it stays up.</p>
</div>
</div>
<p class="foot">Prototype only. Numbers from the bot sim of 2026-10-30 (prototypes/chapter-dice/README.md). Record: who played, time, win or loss, and every rule you played wrong.</p>
</section>`;

// ---- Sticker sheet: 12 mm squares for a 16 mm die, one row of six per die -----------------------------------
const stickers = `<section class="page">
<h1>Dice stickers</h1>
<p class="lede">Print at 100% on sticker paper. Cut on the grey lines. Each row is one die: put its six faces on a blank 16 mm d6. Double faces show the symbol twice.</p>
${Object.entries(DICE).map(([id, faces]) => `<div class="srow"><div class="slabel">${DIE_NAME[id] || cls(id).name}</div>${faces.map(f => `<div class="stk">${face(f, 34)}</div>`).join('')}</div>`).join('')}
<p class="lede" style="margin-top:6mm">Spare set for on point’s second roll, if you’d rather roll two dice than one twice:</p>
${['HUN', 'RES', 'ENG', 'SOA', 'PAT'].map(id => `<div class="srow"><div class="slabel">${cls(id).name} (spare)</div>${DICE[id].map(f => `<div class="stk">${face(f, 34)}</div>`).join('')}</div>`).join('')}
</section>`;

// ---- Cards (2.5 × 3.5 in, nine to a page) ---------------------------------------------------------------------
const row = (syms, px = 20) => syms.map(s => icon(s, px)).join('');
const extra = (domain, hits, k) => symbolsFor(domain, hits + k).slice(hits);
const kw = { beacon: 'Beacon', noblock: 'Piercing', onpoint: 'Targeted', hardened: 'Evasive', regen: 'Regen', ramp: 'Escalating' };
const kwText = { beacon: 'Roll the row when it arrives or comes back.', noblock: 'Blocks don’t stop it.', onpoint: 'Only on point takes its damage, doubled.', hardened: 'Only a double face can hit it.', regen: 'Gets one symbol back at the end of each round.', ramp: '+1 Damage every round it stays up.' };
function mobCard(m) {
  const syms = symbolsFor(m.domain, m.hits);
  return `<div class="card"><div class="tag">${m.domain} · back on ${m.persist[0]}–${m.persist[1]}</div><div class="nm">${m.name}</div>
  <div class="dmg">Damage <b>${m.dmg}</b></div><div class="syms">${row(syms, 22)}</div>
  <div class="add">3 players add ${row(extra(m.domain, m.hits, D.mobAdd[3]), 13)} · 4 players add ${row(extra(m.domain, m.hits, D.mobAdd[4]), 13)}</div>
  <div class="kw"><b>${kw[m.ability]}.</b> ${kwText[m.ability]}</div><div class="fl">${m.flavor}</div></div>`;
}
function bossCard(b) {
  const base = b.hitsBase + D.bossAdd[2], syms = symbolsFor('Identity', base);
  return `<div class="card boss"><div class="tag">Boss · arrives at 05:59</div><div class="nm">${b.name}</div><div class="dmg">Damage <b>${b.dmg}</b></div>
  <div class="syms">${row(syms, 18)}</div><div class="add">3 players add ${row(extra('Identity', base, D.bossAdd[3] - D.bossAdd[2]), 13)} · 4 players add ${row(extra('Identity', base, D.bossAdd[4] - D.bossAdd[2]), 13)}</div>
  <div class="kw"><b>${b.abilityName}.</b> +2 Damage until it has lost two symbols. Agent dice can’t hit it.</div></div>`;
}
const PERK = {
  HUN: 'Any face you roll is wild against a mob that came back from the row. A comeback you finish is gone for good.',
  RES: 'Your Contain faces are wild against the highest-Damage mob, boss included.',
  ENG: 'Your die has three double faces: hit twice or guard, more often.',
  SOA: `The tray holds one more agent (${D.sharedKit + 1}). Every won fight draws one more agent card.`,
  PAT: `After every fight, heal ${D.perks.PAT.fight} HP split across the crew. Recovery Agents heal ${D.perks.PAT.recover} more.`,
};
const analystCard = id => `<div class="card"><div class="tag">Analyst · your die</div><div class="nm">${cls(id).name}</div>
  <div class="die">${DICE[id].map(f => `<div class="dface">${face(f, 26)}</div>`).join('')}</div><div class="kw">${PERK[id]}</div></div>`;
const AGENT = {
  triage: ['Triage Agent', 'Rolls the agent die every round.', 'On point rolls their die 3 more times this round.'],
  enrich: ['Enrichment Agent', 'Once a round, turn one crew die to any symbol.', 'Every die is wild this round.'],
  contain: ['Containment Agent', `The highest-Damage mob deals ${D.containCut} less, never below 1.`, 'Remove one symbol from every mob (the boss keeps at least one).'],
  recover: ['Recovery Agent', `After every fight, heal ${D.recoverHeal} HP split across the crew.`, `Heal ${D.recoverBurn} HP split across the crew.`],
};
const agentCard = t => `<div class="card agent"><div class="tag">Agent</div><div class="nm">${AGENT[t][0]}</div>
  <div class="mode"><b>Run it</b> ${AGENT[t][1]}</div><div class="mode"><b>Or burn it</b> ${AGENT[t][2]}</div></div>`;
const legend = `<div class="card"><div class="tag">Reference</div><div class="nm">Dice</div>
  ${['CREW', 'AGENT'].map(id => `<div class="small">${DIE_NAME[id]}</div><div class="die">${DICE[id].map(f => `<div class="dface">${face(f, 22)}</div>`).join('')}</div>`).join('')}
  <div class="kw">A double face: two of that symbol from one mob, <b>or</b> guard. Never both.</div></div>`;

const mobs = ['mailer', 'spray', 'imp', 'druid', 'wyrmling', 'mimic'].map(id => D.mobs.find(m => m.id === id));
const cards = [...mobs.map(mobCard), bossCard(D.bosses.find(b => b.id === 'wyrm')), legend, ...['HUN', 'RES', 'ENG', 'SOA', 'PAT'].map(analystCard), ...['triage', 'enrich', 'contain', 'recover'].flatMap(t => [agentCard(t), agentCard(t)])];
const pages = []; for (let i = 0; i < cards.length; i += 9) pages.push(`<section class="page cards"><div class="grid">${cards.slice(i, i + 9).join('')}</div></section>`);

const css = `${fonts()}
@page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Chakra Petch',sans-serif;color:${C.ink};background:#fff}
.page{width:8.5in;height:11in;padding:0.5in;page-break-after:always;overflow:hidden}
h1{font-weight:700;font-size:22px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.02em}h2{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.E};margin:10px 0 3px}
.lede{font-size:13px;line-height:1.4;margin:0 0 8px}.rules p,.rules li{font-size:12.5px;line-height:1.38;margin:0 0 4px}.rules ol{padding-left:18px;margin:0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}.foot{margin-top:12px;font-size:10.5px!important;color:${C.mut}}
.srow{display:flex;align-items:center;gap:0;margin:0 0 2mm}.slabel{width:56mm;font-size:12px;font-weight:700}
.stk{width:12mm;height:12mm;border:0.3mm solid #bbb;display:flex;align-items:center;justify-content:center;background:#fff}
.page.cards{padding:0.25in 0.5in}.cards .grid{display:grid;grid-template-columns:repeat(3,2.5in);grid-auto-rows:3.5in;gap:0;justify-content:center;margin-top:0}
.card{border:1px dashed #999;background:${C.bg};padding:12px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.tag{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:${C.mut}}
.nm{font-weight:700;font-size:17px;line-height:1.1;text-transform:uppercase}.dmg{font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:${C.mut}}.dmg b{font-size:20px;color:${C.ink}}
.syms{display:flex;flex-wrap:wrap;gap:3px;background:#fff;border:1px solid ${C.rule};padding:6px}.add{font-size:10.5px;color:${C.mut}}
.kw{font-size:12px;line-height:1.35;background:#FCE6DC;border:1px solid ${C.fl};padding:5px 7px}.fl{font-size:10.5px;line-height:1.35;color:${C.mut};margin-top:auto;border-top:1px solid ${C.rule};padding-top:5px}
.die{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}.dface{background:#fff;border:1px solid ${C.rule};height:36px;display:flex;align-items:center;justify-content:center}
.mode{font-size:12px;line-height:1.35}.mode b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;color:${C.D}}.small{font-size:11px;font-weight:700}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Chapter dice paper prototype</title><style>${css}</style></head><body>${rules}${stickers}${pages.join('')}</body></html>`;
fs.writeFileSync(path.join(OUT, 'chapter-dice-paper.html'), html);

(async () => {
  const b = await launch(), p = await b.newPage();
  await p.setContent(html); await fontsReady(p);
  await p.pdf({ path: path.join(OUT, 'chapter-dice-paper.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  // Overflow check: nothing may spill out of a card or a page.
  const over = await p.evaluate(() => [...document.querySelectorAll('.card,.page')].filter(e => e.scrollHeight > e.clientHeight + 2).map(e => (e.querySelector('.nm,h1') || e).textContent.slice(0, 40)));
  await b.close();
  console.log(`wrote chapter-dice-paper.pdf (${2 + pages.length} pages, ${cards.length} cards)` + (over.length ? `\nOVERFLOW: ${over.join(' | ')}` : '\nno overflow'));
})().catch(e => { console.error(e); process.exit(1); });
