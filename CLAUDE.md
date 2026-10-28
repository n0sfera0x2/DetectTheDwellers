# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

Detect the Dwellers: a co-op d20 card game (1–4 players) set on a cyberpunk SOC night shift. One rules engine drives three outputs:

1. **The playable web version**, a single self-contained HTML file (`dist/index.html`).
2. **The print deck**, 54 poker-size cards on six duplex Letter sheets (`dist/deck/`).
3. **The balance sims**, a bot that plays thousands of games to tune HP and check spread.

## Layout

| Path | What it is |
| --- | --- |
| `data/cards.json` | **All card data and tunables.** HP, mobs, keywords, kit, situations, bosses, analysts, First Shift setup, dice and scaling knobs. Most changes start here. |
| `src/engine.js` | The rules engine, `DTD12(D)`. Pure, no DOM. Also inlined into the page. |
| `ui/ui.js` | The page script, a template with `__DATA__`, `__ART__`, `__ENGINE__` slots. `ui/head.html` holds the CSS, `ui/tail.html` closes the page. |
| `data/art.json` | SVG scenes (200×112) for cards and the UI, keyed by card id, domain, or analyst. |
| `data/art-print.json` | Print-only art: the three boss scenes and the card back. `{{SID}}` marks ids made unique per card. |
| `deck/cards.js` | Card templates for print. `deck/build.js` lays them out on sheets with mirrored backs. |
| `sim/bot.js` | The bot, seeded RNG, representative crews. `sweep.js`, `stats.js`, `check.js` run it. |
| `test/` | `node:test` suites: engine invariants, deck snapshot, headless UI play-throughs (jsdom). |
| `docs/` | `RULES.md` (rules text), `CARDS.md` (generated), `DESIGN.md` (decisions and targets). |

## Commands

```bash
npm install            # once; jsdom for the UI tests
npm run build          # dist/index.html + dist/deck/
npm test               # unit + deck snapshot + headless UI + balance gate
npm run sim -- full 40,46,52   # win rate by player count at those HP values
npm run stats          # full report at shipped HP (losses before boss, comebacks, rounds, burns)
npm run cards          # regenerate docs/CARDS.md
npm run golden         # re-snapshot print cards after an intentional card change
npm run serve          # serve dist/ on localhost:8080
```

## Making a change

A rule or card change usually touches several places. Work through them in order:

1. **Data first.** Change `data/cards.json` if the change is a number or card text.
2. **Engine** (`src/engine.js`) if the rule itself changes. Keep it DOM-free.
3. **Bot** (`sim/bot.js`) if a new decision exists that the bot must make (for example, when to burn a new kit type). A rule the bot ignores produces bogus balance numbers.
4. **Retune.** Run `npm run sim` across HP values, pick the HP that hits the targets in `docs/DESIGN.md`, update `data/cards.json`, then `npm run stats` to sanity-check everything else.
5. **UI** (`ui/ui.js`) for anything the player sees or clicks. The intro text, kit tray, persist log, round report, and First Shift tips all live there.
6. **Print** (`deck/cards.js`) for any card text or reference card that isn't pulled straight from data. Then `npm run golden` and eyeball the diff in `test/golden-cards.json`.
7. **Docs.** `npm run cards`, and update `docs/RULES.md` (and `docs/DESIGN.md` if it's a design decision).
8. **`npm test`** must pass. The balance gate fails if any mode drifts out of its band.

## Invariants

- **54 cards exactly:** 15 mobs, 9 situations, 3 bosses, 5 analysts, 16 kit (8 types × 2), 4 HP trackers, 2 double-sided references. Changing the count changes the sheet layout.
- **One starting HP per difficulty, at every player count.** Fix crew-size spread through scaling, not HP tables.
- **Every mob has exactly one keyword** from the eight in `data/cards.json`.
- **The engine stays deterministic given `opt.rnd`.** Tests and sims rely on seeded games.
- **Persisted UI state is versioned** (`dwellers-board-v17` / `dwellers-v17` in `ui/ui.js`). Bump both when the score shape or rules change enough to make old scores meaningless.

## Writing style

Card and rules text is punchy and plain: short sentences, second person, no corporate voice. Rules use the same words everywhere ("on point", "off-shift", "persistence row", "comes back", "burn it"). Use typographic apostrophes and en dashes in ranges (1–8).

## Hosting

The page is one file with no server. On GitHub Pages the leaderboard falls back to the browser's local storage. Inside a Claude artifact it uses the shared artifact database (`window.claude.use('db')`).
