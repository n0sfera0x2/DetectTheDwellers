// Paper prototype for the chapter dice test: one printable PDF with the rules sheet and 37 cut-out cards (6 alarms,
// the boss, 4 analysts, 16 items, a dice reference, 6 situations, 3 conditions). The dice are standard pip d6s with exact numbers: no stickers.
// Numbers come from the sim's tuned run (see ../README.md) and the game's data, so paper and sim agree.
// Usage: node prototypes/chapter-dice/paper/build.js  →  prototypes/chapter-dice/paper/chapter-dice-paper.{html,pdf}
const fs = require('fs'), path = require('path');
const D = require('../../../data/cards.json');
const { fonts } = require('../../../deck/render');
const { launch, fontsReady } = require('../../../deck/browser');
const { C, pip, DOUBLES, cls, mobCard, bossCard, analystCard, agentCard, legend, mobs: cardMobs, boss, ANALYST_IDS, AGENT_IDS, ITEM_DECK, CARD_CSS, SIT_IDS, sitCard, COND_IDS, condCard } = require('../cards');

const OUT = __dirname, HP = 19; // starting HP (2026-10-31): signature doubles, four analysts, items (agents hold slots, consumables in hand), alarms one die fewer; ~50% at 1–4 players in the sim

// ---- Rules sheet -------------------------------------------------------------------------------------------
const P = (n, px = 15) => pip(n, px);
const rules = `<section class="page rules">
<h1>Detect the Dwellers · Chapter dice test</h1>
<p class="lede">A paper test of one idea: <b>match exact numbers instead of adding them up.</b> Then play today’s Quick Shift with the same group and compare. Tuned for <b>2 players</b>; 1–4 play the same rules.</p>
<div class="cols">
<div>
<h2>You need</h2>
<p>This sheet’s cards. <b>Standard d6s in four colours:</b> crew dice (2 per player), 3 in a second colour for the solo crew die and agent dice, 2 amber dice for the row, and about <b>16 threat dice</b> to set under the alarm cards. Coins for HP and to mark alarms that came back.</p>
<h2>Setup</h2>
<ol>
<li>Each player picks an analyst. Start at <b>${HP} HP</b>.</li>
<li>Shuffle the six alarms face down. The Lockjaw Syndicate goes underneath.</li>
<li>Shuffle the 6 situations face down. Set the 3 conditions aside.</li>
<li>Shuffle the 16 items: that’s the item deck. The crew draws 2.</li>
</ol>
<h2>Threat dice</h2>
<p>When an alarm arrives, set threat dice <b>just below its card</b>, turned to the numbers printed along its bottom edge. Those dice are its hits. Each alarm’s numbers bunch round one main number, so a double on that number goes a long way. <b>4 players:</b> add the card’s <b>+</b> die (a 6). Solo to 3 players use the printed dice.</p>
<p class="ex3"><span>Card</span>${[1, 2, 2, 3].map(n => P(n, 20)).join('')}<b>+</b>${P(6, 16)}<span>per player past 3</span></p>
<p class="ex3"><span>1–3 players set</span>${[1, 2, 2, 3].map(n => P(n, 17)).join('')}<span>· 4 players</span>${[1, 2, 2, 3, 6].map(n => P(n, 17)).join('')}</p>
<h2>A flip</h2>
<ol>
<li>Pick who’s on point. From the second flip on, flip a <b>situation</b> first and play it.</li>
<li>Flip the top alarm and set its dice. On point may <b>baseline it</b> (below). If anything is on the row, roll the row: every row alarm that comes back returns with its printed dice, and the two with the highest Damage hit everyone on the way in. Two or more in play: a <b>multi-alarm</b> fight.</li>
<li>Fight. When the feed is empty, the boss arrives with one last row roll and no arrival hits.</li>
</ol>
<h2>The row</h2>
<p>Roll the <b>2 amber dice</b> and add them. A row alarm comes back if the sum is <b>at most its number</b> (“back on 2–5” comes back on 5 or less). The first time an alarm comes back, put a coin on it. It stays.</p>
</div>
<div>
<h2>Baseline it</h2>
<p>A newly flipped alarm (never a comeback) can be baselined: set the 4 dice on its <b>Baseline</b> line too (+1 per player past 3). Beat it with them all and the agents have learned it: tuck it under an agent someone holds. That agent gains the alarm’s Baseline line until it is discarded. No agents: it waits for the next one drawn. The alarm still goes on the row.</p>
<h2>A fight round</h2>
<ol>
<li><b>Row.</b> From the second round on, roll the row first.</li>
<li><b>Roll.</b> Everyone rolls one crew die. On point rolls two. Solo: two of your own dice plus the crew die (second colour). Each Triage Agent rolls an agent die (second colour) for whoever holds it. <b>Once a round, each player may reroll one of their own dice</b> before using it.</li>
<li><b>Match.</b> A die takes out one threat die showing <b>exactly</b> its number: a ${P(4)} takes a ${P(4)}. Turn the taken die aside.</li>
<li><b>Hits back.</b> Every alarm with dice left hits everyone who isn’t blocking, for its Damage. An alarm with no dice left is beaten.</li>
</ol>
<h2>Doubles</h2>
<p>Your analyst card shows your doubles. Every other die (the solo crew die, agent dice): <b>only a 6</b>. A double <b>counts as two dice showing its number</b>: a Hunter’s ${P(4)} takes two ${P(4)}s, under one alarm or two. <b>Or</b> it guards: you block this round. Never both. Agent dice can’t guard or hit the boss.</p>
<h2>After a fight</h2>
<p>Beaten alarms go back on the row, <b>every time</b>: nothing removes them for good. Draw ${D.kitPerFight} items (${D.kitSolo} solo) and decide who takes each. <b>Agents</b> are passive and work for whoever holds them: 2 each (the Soarcerer 3; solo 4). Full? Discard one to take another. <b>Consumables</b> don’t take a slot: keep them in hand and use each once.</p>
<h2>Situations and conditions</h2>
<p>Most situations make you choose: stay or run, grab it or leave it. On point rolls any grab with spare dice. Conditions are cards you keep in front of you. <b>Rattled</b> and <b>Exposed</b> wear off; <b>Focused</b> waits until you use it. Nobody holds two of the same.</p>
<h2>Win or lose</h2>
<p>Beat the boss and you’ve survived the night. Anyone at 0 HP and the shift is lost.</p>
</div>
</div>
<p class="foot">Prototype only. Numbers from the bot sim of 2026-10-31, exact numbers with situations and baselining (prototypes/chapter-dice/README.md). Record: who played, time, win or loss, and every rule you played wrong.</p>
</section>`;

// ---- Cards (2.5 × 3.5 in, nine to a page): the markup lives in ../cards.js, shared with the web prototype ----
const cards = [...cardMobs().map(mobCard), bossCard(boss()), legend, ...ANALYST_IDS.map(analystCard), ...ITEM_DECK.map(agentCard), ...SIT_IDS.map(sitCard), ...COND_IDS.map(condCard)];
const pages = []; for (let i = 0; i < cards.length; i += 9) pages.push(`<section class="page cards"><div class="grid">${cards.slice(i, i + 9).join('')}</div></section>`);

const css = `${fonts()}
@page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Chakra Petch',sans-serif;color:${C.ink};background:#fff}
.page{width:8.5in;height:11in;padding:0.5in;page-break-after:always;overflow:hidden}
h1{font-weight:700;font-size:22px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.02em}h2{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.E};margin:10px 0 3px}
.lede{font-size:13px;line-height:1.4;margin:0 0 8px}.rules p,.rules li{font-size:12.5px;line-height:1.38;margin:0 0 4px}.rules ol{padding-left:18px;margin:0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}.foot{margin-top:12px;font-size:10.5px!important;color:${C.mut}}
.ex3{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-size:11.5px!important;background:#F6F2EC;border:1px solid #D8CEC3;padding:5px 8px}.rules li svg,.rules p svg{vertical-align:-3px}
.page.cards{padding:0.25in 0.5in}.cards .grid{display:grid;grid-template-columns:repeat(3,2.5in);grid-auto-rows:3.5in;gap:0;justify-content:center;margin-top:0}
${CARD_CSS}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Chapter dice paper prototype</title><style>${css}</style></head><body>${rules}${pages.join('')}</body></html>`;
fs.writeFileSync(path.join(OUT, 'chapter-dice-paper.html'), html);

(async () => {
  const b = await launch(), p = await b.newPage();
  await p.setContent(html); await fontsReady(p);
  await p.pdf({ path: path.join(OUT, 'chapter-dice-paper.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  // Overflow check: nothing may spill out of a card or a page.
  const over = await p.evaluate(() => [...document.querySelectorAll('.card,.page')].filter(e => e.scrollHeight > e.clientHeight + 2).map(e => (e.querySelector('.nm,h1') || e).textContent.slice(0, 40)));
  await b.close();
  console.log(`wrote chapter-dice-paper.pdf (${1 + pages.length} pages, ${cards.length} cards)` + (over.length ? `\nOVERFLOW: ${over.join(' | ')}` : '\nno overflow'));
})().catch(e => { console.error(e); process.exit(1); });
