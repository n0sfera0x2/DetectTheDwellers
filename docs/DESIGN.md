# Design notes

## What it is

An original co-op card game by Binary Defense, built to be handed out at conferences and played at the booth. It deliberately follows the structure of *Escape the Dark Castle* (one card at a time, boss underneath, simultaneous rolls assigned to enemies, doubles that block, a kit card after each fight). Every rule, card, and word of text is original. **Counsel review is required before anything ships**, because the structural resemblance is close.

**Taken from Escape the Dark Castle:** one card at a time with the boss underneath, no turn order, effects that hit whoever is on point, simultaneous rolls assigned to the enemy, doubles that hit twice and block, every survivor dealing damage, one player resting per round, a kit card after every fight, losing if anyone falls.

**Ours:** the d20 instead of symbol dice; one shuffled situation pool instead of chapters; the always-on persistence row that rolls with every flip; comebacks that strike on arrival (the two biggest per roll); dual-mode AI agents in a shared crew tray; crew-size scaling through dice and mob hits instead of HP tables; eight mob keywords; the SOC setting and art.

## Balance targets

Tuned with `sim/` against a careful bot, never yet against enough humans.

| Mode | Target win rate | Shipped |
| --- | --- | --- |
| Full Shift, Recruit | 60–70% | 59 HP |
| Full Shift, Analyst | ~50% | 50 HP |
| Full Shift, Veteran | 35–40% | 41 HP |
| Quick Shift | ~60% (booth-friendly) | 31 HP |
| First Shift | ~70% | 20 HP |

Other things worth holding: every player count within about 10 points of each other; roughly 8–9 comebacks per Full Shift; a real share of losses before the boss (the row has to matter); winners usually ending at a quarter to a third of their HP. `npm run balance` enforces loose bands in CI.

## Decisions worth remembering

- **One HP number per difficulty.** Crew size is absorbed by the dice rule (one die each, two for on point) and mob hits (the `mobAdd` table). Don't reintroduce per-count HP tables; fix spread with scaling instead.
- **Comebacks return at one hit but strike on arrival.** One hit alone killed the mid-shift threat; the arrival hit brought it back.
- **Only the two highest-Damage comebacks of a roll strike.** Every range starts at 1, so a roll of 1–4 empties the row. Uncapped, 6.7% of Row rolls hit one analyst for 10+ before any choice (1,500 two-player Analyst games, 2026-10-29); capped at two, 0.6%. Comebacks per shift stayed at about 8, and Full Shift HP dropped from 50/42/34 to 44/38/31 to hold the targets. `strikeCap` in `data/cards.json`.
- **The row rolls with the flip,** so comebacks join the fight in front of you rather than becoming a separate fight.
- **Tougher mobs: Defense floor of 12, more hits.** Mobs at 8 felt free, and at 11 they still fell too fast. In 2,000 two-player Analyst games on 2026-10-29, heavy hitters fell in their first round 8–12% of the time, down from 23–31%, and nuisances 40–49%, down from about 70%. Full Shift HP rose to 59/50/41 (Quick Shift 31, First Shift 20) to hold the targets. Quick Shift fights grew from about 10.5 to 12.9 combat rounds, so the booth length has to be re-timed with real players.
- **Mob hits come from a per-count table, not +1 per analyst.** `mobAdd` in `data/cards.json` is {1: −1, 2: 0, 3: +2, 4: +4} on the printed 2-player hits, never below 1. The steeper mobs widened the spread between player counts under the old printed + analysts − 2 rule, so big crews get more hits per extra analyst. Each mob card prints all four numbers, and has no hit boxes: one row of boxes can only be right for one crew size. Boss scaling is still printed + 1 per analyst.
- **The shift runs 22:00 to 06:00: survive until dawn.** Flip i of N shows 22:00 + (i − 1) × 480 / N minutes, rounded down to 5; the boss is always 05:59. Times are positional because the feed is shuffled, so they live on the row mat and in the web game, never on a card.
- **Read-aloud cards.** Whoever's on point reads the flipped card aloud. Flavour lines are short second-person scenes (1–2 sentences, 140 characters at most), so the table hears the night instead of reading it.
- **Containment can't reduce damage below 1; Decoy protects only whoever's on point.** Both were erasing whole rounds.
- **Kit is all dual-mode agents (run or burn) in one shared tray.** Per-player slots let bigger crews snowball.
- **Each mob has its own comeback range.** Nuisances come back often (1–10), heavy hitters rarely (1–4 to 1–6). Every range starts at 1, so the Patch Agent's keep-the-highest die still helps against all of them. The Threat Intel Drop removes the widest one.
- **Beacon comebacks chain.** Anything a Beacon's roll brings back rolls the row again, until a roll comes up quiet. About one chain roll per Full Shift; it's the swing that makes Beacons feel like C2.
- **Keywords over bespoke abilities.** Eight words to learn once. The PsExec Swarm's spread folded into Beacon, the Rootkit's wide range into Regen, the Vibe Coded App's hallucinations into Escalating.

## Open items

- Human playtests: First Shift with someone new, then Full Shift at two and four players.
- Re-time Quick Shift at the booth: fights now run about 12.9 combat rounds, up from 10.5.
- See the printed cards by eye (longest name: Living-off-the-Land Scavenger).
- Commission real art. The vector silhouettes are placeholders, and AI-made art can't be copyrighted.
- Counsel review and a USPTO search on the name.
- Confirm booth swag stock with marketing.
- Ideas parked for after playtests: the row as a clock (boss arrives early at 5 mobs in the row), a drafted kit draw (draw 2, keep 1).
