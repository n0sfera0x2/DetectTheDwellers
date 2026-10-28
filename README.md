# Detect the Dwellers

**A co-op card game about surviving a SOC night shift.** One to four analysts work through a feed of situations in a rain-soaked megacity, fight the mobs crawling out of the network, and face a boss at the end of the shift. Beaten mobs never really die: they wait in the persistence row and come back swinging.

An original game by Binary Defense.

- **54 cards, four d20s, a few coins.** 1–4 players, 25–35 minutes (Quick Shift: about 10).
- **Three ways in:** First Shift (a guided first game), Full Shift, and Quick Shift for the booth.

## Quick start

```bash
npm install
npm run build      # playable page + print deck into dist/
npm test           # engine, print deck, headless UI, balance gate
npm run serve      # play at http://localhost:8080
```

- **Play:** open `dist/index.html` in a browser. It's a single file and works offline.
- **Print:** open `dist/deck/index.html`. Print each sheet's fronts, then its backs on the reverse: 100% scale, duplex, flip on the long edge.

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

Rules v18: per-mob comeback ranges, chaining Beacons. (v17: keywords, First Shift, dual-mode kit.) Balance is tuned against a bot; human playtests come next. The art is placeholder vector art pending a commissioned illustrator. Not for distribution until counsel review and a trademark search are done.
