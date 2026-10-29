// Generates docs/CARDS.md from data/cards.json so the card list never drifts from the game.
const fs = require('fs'), path = require('path');
const D = require('../data/cards.json');
const row = a => `| ${a.join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const hp = D.hp.full[1];
const md = `# Card list

Generated from \`data/cards.json\` by \`npm run cards\`. Don't edit by hand.

**54 cards:** 15 mobs and 9 situations (the shuffled situation pool), 3 bosses, 5 analysts, 16 kit cards, 4 HP trackers, 2 double-sided reference cards.

## Starting HP (each analyst, any player count)

${table(['Recruit', 'Analyst', 'Veteran', 'Quick Shift', 'First Shift'], [[hp.Recruit, hp.Analyst, hp.Veteran, D.hp.quick[1], D.hp.intro[1]]])}

## Keywords

${table(['Keyword', 'Rule'], Object.values(D.keywords).map(k => [k.name, k.text]))}

## Mobs

Printed hits are for two players. In play: printed + analysts − 2, never below 1. Each mob comes back from the persistence row when the row die lands in its Back range.

${table(['Mob', 'Domain', 'Def', 'Hits', 'Dmg', 'Back', 'Keyword'], D.mobs.map(m => [m.name, m.domain, m.def, m.hits, m.dmg, `${m.persist[0]}–${m.persist[1]}`, D.keywords[m.kw].name]))}

## Situations

${table(['Situation', 'Type', 'Rule'], D.situations.map(s => [s.name, s.type, s.rule + (s.opts ? ' ' + s.opts.map(o => o.label).join(' / ') : '')]))}

## Bosses

Hits by crew size (1p / 2p / 3p / 4p). Agents can't hit the boss.

${table(['Boss', 'Domain', 'Def', 'Hits', 'Dmg', 'Ability'], D.bosses.map(b => [b.name, b.domain, b.def, [1, 2, 3, 4].map(n => b.hitsBase + D.bossAdd[n]).join(' / '), b.dmg, `${b.abilityName}: ${b.abilityText}`]))}

## Analysts

${table(['Analyst', 'Trait', 'Perk', 'Agent link'], D.classes.map(c => [c.name, c.trait, c.perk, c.agent || '']))}

## Kit (2 of each, shared crew tray of ${D.sharedKit}, ${D.sharedKit + 1} with the Soarcerer)

${table(['Agent', 'Run it', 'Or burn it'], [...new Map(D.kit.map(k => [k.type, k])).values()].map(k => [k.name, k.text, k.burn]))}

## First Shift (tutorial)

Situations in order: ${D.intro.deck.map(id => [...D.mobs, ...D.situations].find(x => x.id === id).name).join(' → ')}. Boss: ${D.bosses.find(b => b.id === D.intro.boss).name}. Kit on top: ${D.intro.kit.map(t => D.kit.find(k => k.type === t).name).join(', ')}.
`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'CARDS.md'), md);
console.log('docs/CARDS.md updated');
