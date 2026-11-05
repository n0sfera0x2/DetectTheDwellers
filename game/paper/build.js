// The print-and-play PDF: one printable file with the rules sheet and 63 cut-out cards (15 alarms,
// 3 bosses, 4 analysts, 18 items, a dice reference, the shift tracker, 18 situations, 3 conditions). The dice are standard pip d6s with exact numbers: no stickers.
// Numbers come from the sim's tuned run (see ../README.md) and the game's data, so paper and sim agree.
// Usage: node game/paper/build.js  →  game/paper/chapter-dice-paper.{html,pdf}
const fs = require('fs'), path = require('path');
const D = require('../../data/cards.json');
const { fonts } = require('../../deck/render');
const { launch, fontsReady } = require('../../deck/browser');
const { C, pip, DOUBLES, cls, mobCard, bossCard, analystCard, agentCard, legend, tracker, mobs: cardMobs, boss, BOSS_IDS, ANALYST_IDS, AGENT_IDS, ITEM_DECK, CARD_CSS, SIT_IDS, sitCard, COND_IDS, condCard } = require('../cards');

const OUT = __dirname, HP = 13; // Full Shift starting HP (Quick: 10), 2026-11-04; the numbers are in the README

// ---- Rules sheet -------------------------------------------------------------------------------------------
const P = (n, px = 15) => pip(n, px);
const rules = `<section class="page rules">
<h1>Detect the Dwellers</h1>
<p class="lede">One night in the SOC. Match the numbers, hold the line, beat the boss at 05:59. 1–4 players, co-op.</p>
<div class="cols">
<div>
<h2>You need</h2>
<p>This sheet’s cards. <b>Standard d6s in four colours:</b> crew dice (3 per player), 1 in a second colour for the solo crew die, 2 amber dice for the row, and about <b>16 threat dice</b> to set under the alarm cards. Coins for HP, comebacks and the shift tracker.</p>
<h2>Setup</h2>
<ol>
<li>Pick the shift. <b>Quick:</b> everyone starts at <b>10 HP</b>. <b>Full:</b> <b>13 HP</b>, and the bosses’ <b>Full Shift</b> lines play. Each player picks an analyst.</li>
<li>Shuffle the <b>situation deck</b>, the 15 alarms and 9 situations. <b>Quick:</b> deal 8. <b>Full:</b> deal 9. That’s the <b>feed</b>. <b>Full</b> also shuffles the 9 <b>story</b> cards into their own deck.</li>
<li>Shuffle the 3 bosses and put one face down under the feed. Set the 3 conditions aside.</li>
<li>Shuffle the 18 items: the item deck. The crew draws 2 (3 or 4 players: 3); solo 1.</li>
<li>Set out the shift tracker: coin a box for anything once a round or fight; clear it as that ends.</li>
</ol>
<h2>Threat dice</h2>
<p>When an alarm arrives, set threat dice <b>just below its card</b>, turned to the numbers printed along its bottom edge. <b>3 or 4 players:</b> add the card’s <b>+</b> die (a 6) per player past 2.</p>
<p class="ex3"><span>Card</span>${[1, 2, 2, 3].map(n => P(n, 20)).join('')}<b>+</b>${P(6, 16)}<span>per player past 2</span></p>
<h2>A flip</h2>
<ol>
<li>Pick who’s on point. They stay on point through any situations until the next fight ends.</li>
<li>Flip the top card of the feed. A <b>situation</b>: play it, then flip again.</li>
<li>An <b>alarm</b>: set its dice. On point may <b>baseline it</b> (below). If anything is on the row, roll the row: every row alarm that comes back returns with its printed dice and joins the fight. Two or more in play: a <b>multi-alarm</b> fight.</li>
<li>Fight. When the feed is empty, turn the boss up: it arrives with one last row roll. <b>Full Shift:</b> its card says when it pulls the row (comebacks join the fight).</li>
</ol>
<h2>The row</h2>
<p>Roll the <b>2 amber dice</b> and add them. A row alarm comes back if the sum is <b>at most its number</b> (“back on 2–5” comes back on 5 or less). The first time an alarm comes back, put a coin on it. It stays.</p>
</div>
<div>
<h2>Baseline it</h2>
<p>Every alarm has a <b>tuck band</b>. A newly flipped alarm can be baselined (a comeback too, with one more die): set the band’s 2 dice as well. Beat it with them all and slide it under an agent someone holds, so only its band shows. That agent gains the band’s <b>trait</b> for good. <b>One</b> alarm per agent. Tucked, the alarm is <b>off the row</b>; discard the agent and it goes back on the row. No agents: set it aside until one is drawn.</p>
<h2>A fight round</h2>
<ol>
<li><b>Row.</b> From the second round on, roll the row first.</li>
<li><b>Roll.</b> Everyone rolls one crew die. On point rolls two. Solo: two of your own dice plus the crew die (second colour). Each Triage Agent: its holder rolls one more of their own dice. <b>Once a round, each player may take 1 to reroll one of their own dice</b> before using it (not at 1 HP).</li>
<li><b>Match.</b> A die takes out one threat die showing <b>exactly</b> its number: a ${P(4)} takes a ${P(4)}. Turn the taken die aside.</li>
<li><b>Hits back.</b> Every alarm with dice left hits everyone who isn’t blocking, for its Damage. An alarm with no dice left is beaten.</li>
</ol>
<h2>Doubles</h2>
<p>Your analyst card shows your doubles. The solo crew die: <b>only a 6</b>. A double <b>counts as two dice showing its number</b>: a Hunter’s ${P(4)} takes two ${P(4)}s, under one alarm or two. <b>Or</b> it guards: you block this round. Never both. <b>Pairs:</b> two of your own dice showing the same number make a double too.</p>
<h2>After a fight</h2>
<p>Beaten alarms go back on the row, <b>every time</b>, unless they were baselined. Coin the next <b>fights won</b> box: from 3 won, alarms (not the boss) deal <b>+1</b>. <b>Full:</b> after the 1st, 3rd and 5th, the top story card goes on the feed: flip it next. Draw ${D.kitPerFight} items (${D.kitSolo} solo) and decide who takes each. <b>Agents</b> are passive and work for the whole crew. <b>Consumables</b> are used once. Both kinds take a slot: each player holds 4 items (solo 6). Full? Discard one to take another.</p>
<h2>Situations and conditions</h2>
<p>Most situations make you choose: stay or run, grab it or leave it. On point rolls any grab with spare dice. Conditions are cards you keep in front of you. <b>Rattled</b> and <b>Exposed</b> wear off; <b>Focused</b> waits until you use it. Nobody holds two of the same.</p>
<h2>Win or lose</h2>
<p>Beat the boss and you’ve survived the night. Anyone at 0 HP and the shift is lost.</p>
</div>
</div>
<p class="foot">Playtest build; numbers from the sim of 2026-11-03. Record who played, time, win or loss, every rule played wrong.</p>
</section>`;

// ---- Cards (2.5 × 3.5 in, nine to a page): the markup lives in ../cards.js, shared with the web page ----
const cards = [...cardMobs().map(mobCard), ...BOSS_IDS.map(id => bossCard(boss(id))), legend, tracker, ...ANALYST_IDS.map(analystCard), ...ITEM_DECK.map(agentCard), ...SIT_IDS.map(sitCard), ...COND_IDS.map(condCard)];
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
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Detect the Dwellers: print and play</title><style>${css}</style></head><body>${rules}${pages.join('')}</body></html>`;
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
