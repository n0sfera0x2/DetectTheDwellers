# Detect the Dwellers

**22:00. The SOC is yours until dawn, and the alarms are already going off.** A co-op dice-and-card game for 1–4 players. Work through a feed of alarms and situations in a rain-soaked megacity, knock the alarms down before they hit back, and hold the line until 06:00. Beaten alarms never really die: they wait on the persistence row and come back swinging. At 05:59 the boss arrives.

An original game by Binary Defense.

- **Play in the browser:** https://n0sfera0x2.github.io/DetectTheDwellers/ (one page, works offline once loaded)
- **Print and play:** [detect-the-dwellers-print-and-play.pdf](https://n0sfera0x2.github.io/DetectTheDwellers/detect-the-dwellers-print-and-play.pdf), a rules sheet and 63 cards to cut out (8 Letter pages)

## What you need

The 63 cards, standard dice in four colours, and a few coins: crew dice (3 per player), 1 in a second colour for the solo crew die, 2 amber dice for the row, about 16 threat dice, and coins for HP and the shift tracker. 1–4 players, four analysts to pick from. Quick Shift (8 cards, 11 HP, about 20 minutes) or Full Shift (9 cards and 3 story cards, 14 HP, about 30 minutes), dealt fresh every shift from the situation deck, with one of three bosses waiting underneath. Full Shift adds a small story deck: a story card after your 1st, 3rd and 5th win.

## How it plays

Pick who's on point and flip the top card of the feed. A situation asks you to choose. An alarm sets threat dice under its card. Everyone rolls (on point rolls two), and each die takes out a threat die showing exactly its number. A double counts as two dice, or guards you (a Responder's double may heal anyone 3 instead). Once a round you may take 1 damage to reroll a die. Whatever's left hits back.

Win a fight and draw items: agents that work for the whole crew every round, and consumables you use once. Baseline an alarm (beat it with two more dice) and it slides under an agent, which changes for good: it counts as two, or overclocks, or takes no slot, or keeps working against the Rogue AI. Beaten alarms go on the row and roll to come back, often: they rejoin the fight. Full rules: [game/README.md](game/README.md#the-rules-now).

## Feedback

After each game, send back who played and which analysts, Quick or Full Shift, how long it took, win or loss and roughly when it was lost, and any rule you played wrong. The playtest kit is in [docs/PLAYTEST.md](docs/PLAYTEST.md).

## Run it locally

```bash
npm install                            # once
npm run serve                          # build the page and play it at http://localhost:8080
node game/paper/build.js               # the print-and-play PDF: game/paper/chapter-dice-paper.pdf
node --test game/web/spec.js           # the game's tests
SYS=n6 HP=11 node game/sim.js          # the balance sim (Quick Shift); MODE=full HP=14 for Full
```

## Repo map

| Path | |
| --- | --- |
| `game/` | **The game:** rules and history (`README.md`), cards, sim, web page, print-and-play PDF |
| `data/` | Card data and art the game reads (alarm names, flavour, Damage, scenes) |
| `tools/ink/` | The Ink & Static art generators |
| `docs/PLAYTEST.md` | The playtest kit |
| `.github/workflows/pages.yml` | Publishes the page and the PDF to GitHub Pages |

The other folders (`src/`, `ui/`, `sim/`, `deck/`, `scripts/`, `test/`) hold an older build. `npm test` still runs its suites.

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md).

## Status

Rules as of 2026-11-04 (late): 2 Baseline dice, a 9-card Full Shift at 14 HP, Quick at 11 HP; four analysts with one line each, a reroll costs 1 HP (once a round), agents and consumables share 4 item slots, one tucked alarm changes its agent for good, a wider row whose comebacks rejoin the fight, and Full Shift story cards in their own deck, one after the 1st, 3rd and 5th fight won, and 18 items with the Watchlist Agent and Takedown Request. Bot sims (600 games per crew size) win 62% / 59% / 56% in Quick Shift and 56% / 56% / 55% in Full Shift at 1 / 2 / 4 players, with a 24–34 point gap between smart and random play and a real decision in 94–97% of rounds. No human table yet: a playtest is next. Details in [game/README.md](game/README.md#where-it-stands).
