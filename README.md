# Detect the Dwellers

**A co-op dice-and-card game about surviving a SOC night shift.** One to four analysts work through a feed of situations in a rain-soaked megacity, fight the alarms crawling out of the network, and face a boss at the end of the shift. Beaten alarms never really die: they wait in the persistence row and come back swinging.

An original game by Binary Defense.

**The game is played with standard d6s** (the chapter dice system, since 2026-10-31). Its rules, cards, sim, print-and-play sheet and web version live in [`prototypes/chapter-dice/`](prototypes/chapter-dice/README.md). Start there.

- **38 cards, standard d6s in four colours, a few coins.** 1–4 players, 10 HP each.
- **You need:** crew dice (3 per player), 1 in a second colour for the solo crew die, 2 amber for the row, about 16 threat dice, and coins.

The repo also still holds the **legacy d20 build** (72 cards, 10 d20s): its engine, web page, print deck, exports and balance sims. It builds and passes its tests, but new design work goes into the d6 game. When the d6 game is rewritten to production standards, it replaces the d20 build.

## Quick start

```bash
npm install
npm run build      # legacy d20: playable page + print deck into dist/
npm test           # legacy d20: engine, print deck, headless UI, balance gate
npm run serve      # build and play the d6 game at http://localhost:8080
npm run serve:classic  # play the legacy d20 game at http://localhost:8080
npm run export:cards   # legacy d20: 300 dpi singles with bleed + manifest + zip, in exports/
npm run export:pdf     # legacy d20: print-and-play PDF, in exports/
npm run proof:cmyk     # legacy d20: CMYK soft proof of the exports (macOS), in exports/cmyk_proof/
```

The d6 game's paper prototype: `node prototypes/chapter-dice/paper/build.js` writes `prototypes/chapter-dice/paper/chapter-dice-paper.pdf` (a rules sheet and 38 cut-out cards). The bullets below are the legacy d20 build.

- **Play:** open `dist/index.html` in a browser. It's a single file and works offline.
- **Print:** open `dist/deck/index.html`. Print each sheet's fronts, then its backs on the reverse: 100% scale, duplex, flip on the long edge.
- **Print preview:** open `dist/deck/preview.html` to check every card against its bleed, trim and safe-zone guides, one at a time, as a grid, or on its sheet.
- **Print shop:** `npm run export:cards` writes one 825 × 1125 PNG per distinct card (2.75 × 3.75 in at 300 dpi, 1/8 in bleed) to `exports/cards_singles/`, a shared `card_back.png`, `exports/manifest.csv` with copy counts (kit cards print 2 each, the HP tracker 4, the Came back marker 6), and a zip of the lot for MakePlayingCards or The Game Crafter.
- **Print-and-play PDF:** `npm run export:pdf` writes `exports/detect-the-dwellers-pnp.pdf`, 16 Letter pages (eight sheets; the eighth is the markers), each fronts page followed by its backs. Print duplex at 100%, flip on the long edge.

## How it plays

**The d6 game:** pick who's on point and flip the top card of the feed, where alarms and situations are shuffled together. An alarm: set its threat dice under the card. Everyone rolls a d6 (on point rolls two) and each die takes out a threat die showing exactly its number. Your analyst's doubles count as two dice, or guard a crewmate. Whatever's left hits back. Win a fight and draw items: passive agents that work for the whole crew, and one-shot consumables. Baseline an alarm and it slides under an agent, which gains the trait on its tuck band. The boss pulls the row as it weakens. Beaten alarms go on the row and roll to come back. Full rules: [prototypes/chapter-dice/README.md](prototypes/chapter-dice/README.md#the-rules-now).

**The legacy d20 game:** pick who's on point, flip a situation, and roll for the persistence row. Alarms start fights: everyone rolls a d20 (on point rolls two), assigns dice to alarms they beat, and whatever's left hits back. Win a fight and draw an AI agent for the crew, which you can keep running or burn once for a big effect. Anyone at 0 HP and the shift is lost.

Legacy d20 rules: [docs/RULES.md](docs/RULES.md) · every card: [docs/CARDS.md](docs/CARDS.md) · design and balance: [docs/DESIGN.md](docs/DESIGN.md)

## Repo map

| Path | |
| --- | --- |
| `prototypes/chapter-dice/` | **The d6 game:** rules, cards, sim, paper prototype, web version |
| `data/cards.json` | Legacy d20: every card and number (the d6 game reads alarm names, flavour, Damage and art from it) |
| `src/engine.js` | Legacy d20 rules engine |
| `ui/` | Legacy d20 playable page |
| `deck/` | Legacy d20 print deck generator |
| `sim/` | Legacy d20 balance bot and reports |
| `test/` | Tests |

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md).

## Status

**The d6 game:** rules as of 2026-11-02, HP 10. Bot sims win 52% / 58% / 59% at 1 / 2 / 4 players with an 18–20 point gap between smart and random play. No human table yet; a playtest is next. Details in [prototypes/chapter-dice/README.md](prototypes/chapter-dice/README.md#where-it-stands).

**Legacy d20 build:** rules v29: solo plays the printed two-player numbers (no −2 hits) and rolls three dice; a solo Quick Shift starts with one agent; the web cards show hits exactly as printed. (v28: every alarm's comeback range is 3 wider (more comebacks); HP 62/47/39, Quick Shift 39, First Shift 26. v27: Second wind is gone (it was a flat buff, not a comeback); HP 58/43/35, Quick Shift 36, First Shift 25; every card's text prints at 7.5 pt or more; a CMYK soft proof (`npm run proof:cmyk`) and a playtest kit (`docs/PLAYTEST.md`). v26: Pack is gone (it made players dig through the deck); HP 54/40/32, Quick Shift 32. v25: Guard (a crew die showing 14+ can block instead of hitting); Pack alarms (removed in v26); Second wind (the first time anyone drops to 10 HP or less, the crew draws a kit card, once per shift); First Shift brings the Banshee back on flip 2; First Shift HP 23; 4-player alarm hits printed + 3. v24: solo play draws one kit card per won fight (crews still draw two), with solo alarms at printed − 2 hits and solo bosses at base hits. v23: core rules (First Shift, Quick Shift) and advanced modules (Full Shift: story cards, boss row triggers); the kit deck reshuffles its discards when it runs out; a marker sheet (Came back × 6, Next alarm, Round, Once per fight) makes 72 cards on eight sheets; components are 6 crew d20s, 3 agent d20s, 1 amber row d20 and coins; analyst retune (Hunter +3, Responder +3 boss included, Fixer heals 5 after every fight); boss hits +1/+3/+4/+6; HP 60/48/38, Quick Shift 37, First Shift 29. v22: every analyst has a perk and an agent link that makes one kind of AI agent better for the whole crew (solo win rates now 48–54% in Full Shift, down from 40–73%); boss hits by crew size +1/+2/+4/+6, printed on the boss cards; alarm hits by crew size −1/0/+2/+4; HP 58/47/38, Quick Shift 40, First Shift 32; Full and Quick Shift draw a random boss, First Shift always Lockjaw; 63 cards on seven duplex sheets. v21: nine story cards whose With Recon line replaces the outcome when a Recon Agent is running; the Recon burn pulls a card from the feed for good; every boss has a trigger that rolls for the row; HP 64/52/41, Quick Shift 40, First Shift 31. v20: comebacks return at full hits (the two highest-Damage per roll still hit on arrival); two kit cards per won fight and a crew tray of five; stronger agents, with the Hunt Agent hunting comebacks; tougher bosses (+2 hits, +2 damage); alarm hits by crew size −1/0/+1/+2; HP 70/60/47, Quick Shift 37, First Shift 25, on a two-coin tens-and-ones tracker. v19: arrival-hit cap, tougher alarms, the 22:00–06:00 shift. v18: per-alarm comeback ranges, chaining Beacons. v17: keywords, First Shift, dual-mode kit.) Balance is tuned against a bot; human playtests come next. The art is placeholder vector art pending a commissioned illustrator. Not for distribution until counsel review and a trademark search are done.
