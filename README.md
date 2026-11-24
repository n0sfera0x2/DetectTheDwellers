# Detect the Dwellers

**22:00. The SOC is yours until dawn, and the alarms are already going off.** A co-op dice-and-card game for 1–4 players. Work through a feed of alarms and situations in a rain-soaked megacity, knock the alarms down before they hit back, and hold the line until 06:00. Beaten alarms never really die: they wait on the persistence row and come back swinging. At 05:59 the boss arrives.

An original game by Binary Defense.

- **Play in the browser:** https://n0sfera0x2.github.io/DetectTheDwellers/ (one page, works offline once loaded)
- **Print and play:** [detect-the-dwellers-print-and-play.pdf](https://n0sfera0x2.github.io/DetectTheDwellers/detect-the-dwellers-print-and-play.pdf), a rules sheet and 63 cards to cut out (8 Letter pages)

## What you need

The 63 cards, standard dice in four colours, and a pencil and paper: crew dice (3 per player), 2 in a second colour (the solo crew die, the Hunter’s extra die), 2 amber dice for the row, about 24 threat dice, and the pencil and paper for HP and the shift tracker. 1–4 players, four analysts to pick from. Quick Shift (8 cards, 10 HP, about 20 minutes) or Full Shift (9 cards and 3 story cards, 13 HP, about 30 minutes), dealt fresh every shift from the situation deck, with one of three bosses waiting underneath. Full Shift adds a small story deck: a story card after your 1st, 3rd and 5th win.

## How it plays

Pick who's on point and flip the top card of the feed. A situation asks you to choose. An alarm sets threat dice under its card. Everyone rolls (on point rolls two), and each die takes out a threat die showing exactly its number. A double counts as two dice, or guards you (a Responder's double may heal anyone 3 instead). Once a round you may take 1 damage to reroll a die. Whatever's left hits back.

Win a fight and draw items: agents that work for the whole crew every round, and consumables you use once. Baseline any alarm (beat it with two more dice) and it slides under an agent, which changes for good: most overclock it, and a few let it take no slot, keep working against the Rogue AI, or stay safe from Exfil. Beaten alarms go on the row and roll to come back, often: they rejoin the fight. Full rules: [game/README.md](game/README.md#the-rules-now).

## Feedback

After each game, send back who played and which analysts, Quick or Full Shift, how long it took, win or loss and roughly when it was lost, and any rule you played wrong. The playtest kit is in [docs/PLAYTEST.md](docs/PLAYTEST.md).

## Run it locally

```bash
npm install                            # once
npm run serve                          # build the page and play it at http://localhost:8080
node game/paper/build.js               # the print-and-play PDF: game/paper/chapter-dice-paper.pdf
node --test game/web/spec.js           # the game's tests
SYS=n6 HP=10 node game/sim.js          # the balance sim (Quick Shift); MODE=full HP=13 for Full
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

Rules as of 2026-11-24: every alarm can be baselined (2 Baseline dice; Full Shift with 3 or 4 players adds one per player past 2), Quick at 10 HP (solo 13, 2 players 11, 3 players 13, 4 players 13) and a 9-card Full Shift at 13 HP (solo 14, 2 players 14, 3 players 16, 4 players 18); four analysts with one line each (the Hunter’s extra die comes in a fight’s first round, the Engineer turns a die once a fight and on point can guard a crewmate, the Soarcerer on point baselines with two more dice), one setup item per player (solo 2), split however the crew likes, solo draws one more item after a fight where an alarm came back off the row, a Triage Agent that rolls two in a multi-alarm fight, a reroll costs 1 HP (once a round), Regen puts a die back only after a round nothing hit it, agents and consumables share 4 item slots, one tucked alarm changes its agent for good (most overclock it), a wide row (back on 2–4 to 2–7 since 2026-11-23) whose alarms rejoin the fight when they come back (with 3 or 4 players, on one more number), Full Shift story cards in their own deck after the 1st, 3rd and 5th fight won, and 18 items. Each analyst doubles on two magic numbers (no 6), the second-colour die (the solo crew die, the Hunter’s extra die) never doubles alone (it can still pair), no card adds a fixed 6 by accident, and a crew of 3 or 4 rolls one or two extra threat dice for each alarm. Bot sims (600 games per crew size, 2026-11-24) win 59% / 55% / 60% / 60% in Quick Shift and 59% / 59% / 58% / 59% in Full Shift at 1 / 2 / 3 / 4 players, with a 20–27 point gap between smart and random play. The solo spread across analysts is 15 points in Quick and 14 in Full. The page has a first-shift guide: one line the first time each rule comes up. The owner has played; a group playtest is next. Details in [game/README.md](game/README.md#where-it-stands).
