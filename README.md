# Detect the Dwellers

**A co-op card game about surviving a SOC night shift.** One to four analysts work through a feed of situations in a rain-soaked megacity, fight the mobs crawling out of the network, and face a boss at the end of the shift. Beaten mobs never really die: they wait in the persistence row and come back swinging.

An original game by Binary Defense.

- **54 cards, four d20s, a few coins.** 1–4 players, 25–35 minutes (Quick Shift: 10–15).
- **Three ways in:** First Shift (a guided first game), Full Shift, and Quick Shift for the booth.

## Quick start

```bash
npm install
npm run build      # playable page + print deck into dist/
npm test           # engine, print deck, headless UI, balance gate
npm run serve      # play at http://localhost:8080
npm run export:cards   # 300 dpi singles with bleed + manifest + zip, in exports/
npm run export:pdf     # print-and-play PDF, in exports/
```

- **Play:** open `dist/index.html` in a browser. It's a single file and works offline.
- **Print:** open `dist/deck/index.html`. Print each sheet's fronts, then its backs on the reverse: 100% scale, duplex, flip on the long edge.
- **Print preview:** open `dist/deck/preview.html` to check every card against its bleed, trim and safe-zone guides, one at a time, as a grid, or on its sheet.
- **Print shop:** `npm run export:cards` writes one 825 × 1125 PNG per distinct card (2.75 × 3.75 in at 300 dpi, 1/8 in bleed) to `exports/cards_singles/`, a shared `card_back.png`, `exports/manifest.csv` with copy counts (kit cards print 2 each, the HP tracker 4), and a zip of the lot for MakePlayingCards or The Game Crafter.
- **Print-and-play PDF:** `npm run export:pdf` writes `exports/detect-the-dwellers-pnp.pdf`, 12 Letter pages, each fronts page followed by its backs. Print duplex at 100%, flip on the long edge.

## How it plays

Pick who's on point, flip a situation, and roll for the persistence row. Mobs start fights: everyone rolls a d20 (on point rolls two), assigns dice to mobs they beat, and whatever's left hits back. Win a fight and draw an AI agent for the crew, which you can keep running or burn once for a big effect. Anyone at 0 HP and the shift is lost.

Full rules: [docs/RULES.md](docs/RULES.md) · every card: [docs/CARDS.md](docs/CARDS.md) · design and balance: [docs/DESIGN.md](docs/DESIGN.md)

## Repo map

| Path | |
| --- | --- |
| `data/cards.json` | Every card and number in the game |
| `src/engine.js` | Rules engine |
| `ui/` | Playable page (template, styles) |
| `deck/` | Print deck generator |
| `sim/` | Balance bot and reports |
| `test/` | Tests |

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md).

## Status

Rules v20: comebacks return at full hits (the two highest-Damage per roll still hit on arrival); two kit cards per won fight and a crew tray of five; stronger agents, with the Hunt Agent hunting comebacks; tougher bosses (+2 hits, +2 damage); mob hits by crew size −1/0/+1/+2; HP 70/60/47, Quick Shift 37, First Shift 25, on a two-coin tens-and-ones tracker. The game is balanced to show what automation is worth: the bot wins 1–2% without agents and about 50% with them. (v19: arrival-hit cap, tougher mobs, the 22:00–06:00 shift. v18: per-mob comeback ranges, chaining Beacons. v17: keywords, First Shift, dual-mode kit.) Balance is tuned against a bot; human playtests come next. The art is placeholder vector art pending a commissioned illustrator. Not for distribution until counsel review and a trademark search are done.
