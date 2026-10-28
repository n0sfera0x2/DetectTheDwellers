# Design notes

## What it is

An original co-op card game by Binary Defense, built to be handed out at conferences and played at the booth. It deliberately follows the structure of *Escape the Dark Castle* (one card at a time, boss underneath, simultaneous rolls assigned to enemies, doubles that block, a kit card after each fight). Every rule, card, and word of text is original. **Counsel review is required before anything ships**, because the structural resemblance is close.

**Taken from Escape the Dark Castle:** one card at a time with the boss underneath, no turn order, effects that hit whoever is on point, simultaneous rolls assigned to the enemy, doubles that hit twice and block, every survivor dealing damage, one player resting per round, a kit card after every fight, losing if anyone falls.

**Ours:** the d20 instead of symbol dice; one shuffled situation pool instead of chapters; the always-on persistence row that rolls with every flip; comebacks that strike on arrival; dual-mode AI agents in a shared crew tray; crew-size scaling through dice and mob hits instead of HP tables; eight mob keywords; the SOC setting and art.

## Balance targets

Tuned with `sim/` against a careful bot, never yet against enough humans.

| Mode | Target win rate | Shipped |
| --- | --- | --- |
| Full Shift, Recruit | 60–70% | 56 HP |
| Full Shift, Analyst | ~50% | 46 HP |
| Full Shift, Veteran | 35–40% | 38 HP |
| Quick Shift | ~60% (booth-friendly) | 28 HP |
| First Shift | ~70% | 18 HP |

Other things worth holding: every player count within about 10 points of each other; roughly 8–9 comebacks per Full Shift; a real share of losses before the boss (the row has to matter); winners usually ending at a quarter to a third of their HP. `npm run balance` enforces loose bands in CI.

## Decisions worth remembering

- **One HP number per difficulty.** Crew size is absorbed by the dice rule (one die each, two for on point) and mob hits (printed + analysts − 2). Don't reintroduce per-count HP tables; fix spread with scaling instead.
- **Comebacks return at one hit but strike on arrival.** One hit alone killed the mid-shift threat; the arrival hit brought it back.
- **The row rolls with the flip,** so comebacks join the fight in front of you rather than becoming a separate fight.
- **Defense floor of 11.** Mobs at 8 felt free.
- **Containment can't reduce damage below 1; Decoy protects only whoever's on point.** Both were erasing whole rounds.
- **Kit is all dual-mode agents (run or burn) in one shared tray.** Per-player slots let bigger crews snowball.
- **Keywords over bespoke abilities.** Eight words to learn once. The PsExec Swarm's spread folded into Beacon, the Rootkit's wide range into Regen, the Vibe Coded App's hallucinations into Escalating.

## Open items

- Human playtests: First Shift with someone new, then Full Shift at two and four players.
- See the printed cards by eye (longest name: Living-off-the-Land Scavenger).
- Commission real art. The vector silhouettes are placeholders, and AI-made art can't be copyrighted.
- Counsel review and a USPTO search on the name.
- Confirm booth swag stock with marketing.
- Ideas parked for after playtests: the row as a clock (boss arrives early at 5 mobs in the row), a drafted kit draw (draw 2, keep 1).
