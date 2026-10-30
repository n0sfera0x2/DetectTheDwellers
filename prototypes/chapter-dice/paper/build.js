// Paper prototype for the chapter dice test: one printable PDF with the rules sheet and 21 cut-out cards (6 mobs,
// the boss, 5 analysts, 8 agents, a dice reference). The dice are standard pip d6s: no stickers.
// Numbers come from the sim's tuned run (see ../README.md) and the game's data, so paper and sim agree.
// Usage: node prototypes/chapter-dice/paper/build.js  →  prototypes/chapter-dice/paper/chapter-dice-paper.{html,pdf}
const fs = require('fs'), path = require('path');
const D = require('../../../data/cards.json');
const { fonts } = require('../../../deck/render');
const { launch, fontsReady } = require('../../../deck/browser');
const { C, icon, pip, DOUBLES, cls, mobCard, bossCard, analystCard, agentCard, legend, mobs: cardMobs, boss, ANALYST_IDS, AGENT_IDS, CARD_CSS } = require('../cards');

const OUT = __dirname, HP = 23; // the sim's tuned starting HP for two players (standard d6, 2026-10-30)

// ---- Rules sheet -------------------------------------------------------------------------------------------
const rules = `<section class="page rules">
<h1>Detect the Dwellers · Chapter dice test</h1>
<p class="lede">A paper test of one idea: <b>match symbols instead of adding numbers.</b> Play it, then play today’s Quick Shift with the same group, and compare (see <i>docs/PLAYTEST.md</i>). Best with <b>2 players</b>: solo and 4 players aren’t tuned yet.</p>
<div class="cols">
<div>
<h2>You need</h2>
<p>This sheet’s cards. <b>Standard d6s in three colours:</b> crew dice in one colour (2 per player), 3 dice in a second colour for the solo crew die and agent dice, and 2 amber dice for the row. Coins: 2 per player for HP, about 20 to cover symbols.</p>
<h2>Setup</h2>
<ol>
<li>Each player picks an analyst. Start at <b>${HP} HP</b>.</li>
<li>Shuffle the six mobs face down. The Lockjaw Syndicate goes underneath.</li>
<li>Shuffle the 8 agent cards: that’s the kit deck. The crew starts with ${D.quickStartAgent} agents (${D.quickStartSolo} solo).</li>
</ol>
<h2>The key</h2>
<p class="key3">${[['D', 'Detect', [1, 2]], ['C', 'Contain', [3, 4]], ['E', 'Eradicate', [5, 6]]].map(([s, n, ns]) => `<span>${ns.map(x => pip(x, 16)).join('')} ${icon(s, 15)} <b>${n}</b></span>`).join('')}</p>
<p>Every die reads the same: <b>1–2 Detect, 3–4 Contain, 5–6 Eradicate.</b> A mob’s row of symbols is its hits. Cover a symbol with a coin when you remove it. Bigger crews add the symbols printed for 3 and 4 players.</p>
<h2>Doubles</h2>
<p>Some numbers are <b>doubles</b> for you: they’re on your analyst card. ${['HUN', 'RES', 'ENG', 'SOA', 'PAT'].map(id => `${cls(id).name} ${DOUBLES[id].join(', ')}`).join(' · ')}. On every other die (the solo crew die, agent dice) <b>only a 6</b> is a double.</p>
<h2>A flip</h2>
<ol>
<li>Pick who’s on point.</li>
<li>Flip the top mob. If anything is on the row, roll the row: every row mob that comes back returns with all its symbols. The two with the highest Damage hit everyone on the way in.</li>
<li>Fight. When the feed is empty, the boss arrives with one last row roll and no arrival hits.</li>
</ol>
</div>
<div>
<h2>The row</h2>
<p>Roll the <b>2 amber dice</b> and add them. A row mob comes back if the sum is <b>at most its number</b> (“back on 2–7” comes back on 7 or less).</p>
<h2>A fight round</h2>
<ol>
<li><b>Row.</b> From the second round on, roll the row first.</li>
<li><b>Roll.</b> Everyone rolls one crew die. On point rolls two. Solo: two of your own dice plus the crew die (second colour). Each running Triage Agent rolls an agent die (second colour).</li>
<li><b>Match.</b> A die removes one matching symbol from a mob. A <b>double</b> removes two of that symbol from one mob, <b>or guards</b>: you block this round. Not both.</li>
<li><b>Hits back.</b> Every mob still up hits everyone who isn’t blocking, for its Damage.</li>
</ol>
<p>Agent dice can’t hit the boss, and can’t guard.</p>
<h2>After a fight</h2>
<p>Beaten mobs go on the row, unless they already came back once: then they’re gone for good. Draw ${D.kitPerFight} agent cards (${D.kitSolo} solo) into the tray, which holds ${D.sharedKit}. Run an agent every round, or burn it once for its big effect. Enrichment’s turn keeps a double a double.</p>
<h2>Win or lose</h2>
<p>Beat the boss and you’ve survived the night. Anyone at 0 HP and the shift is lost.</p>
<h2>Keywords in this test</h2>
<p><b>Beacon:</b> roll the row when it arrives. <b>Piercing:</b> blocks don’t stop it. <b>Targeted:</b> only on point takes its damage, doubled. <b>Evasive:</b> only a double can hit it. <b>Regen:</b> gets one symbol back at the end of each round. <b>Escalating:</b> +1 Damage every round it stays up.</p>
</div>
</div>
<p class="foot">Prototype only. Numbers from the bot sim of 2026-10-30, standard d6 (prototypes/chapter-dice/README.md). Record: who played, time, win or loss, and every rule you played wrong.</p>
</section>`;

// ---- Cards (2.5 × 3.5 in, nine to a page): the markup lives in ../cards.js, shared with the web prototype ----
const cards = [...cardMobs().map(mobCard), bossCard(boss()), legend, ...ANALYST_IDS.map(analystCard), ...AGENT_IDS.flatMap(t => [agentCard(t), agentCard(t)])];
const pages = []; for (let i = 0; i < cards.length; i += 9) pages.push(`<section class="page cards"><div class="grid">${cards.slice(i, i + 9).join('')}</div></section>`);

const css = `${fonts()}
@page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Chakra Petch',sans-serif;color:${C.ink};background:#fff}
.page{width:8.5in;height:11in;padding:0.5in;page-break-after:always;overflow:hidden}
h1{font-weight:700;font-size:22px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.02em}h2{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.E};margin:10px 0 3px}
.lede{font-size:13px;line-height:1.4;margin:0 0 8px}.rules p,.rules li{font-size:12.5px;line-height:1.38;margin:0 0 4px}.rules ol{padding-left:18px;margin:0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}.foot{margin-top:12px;font-size:10.5px!important;color:${C.mut}}
.key3{display:flex;flex-wrap:wrap;gap:6px 14px}.key3 span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
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
