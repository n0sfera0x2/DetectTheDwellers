# Design notes

## What it is

An original co-op card game by Binary Defense, built to be handed out at conferences and played at the booth. It deliberately follows the structure of *Escape the Dark Castle* (one card at a time, boss underneath, simultaneous rolls assigned to enemies, doubles that block, a kit card after each fight). Every rule, card, and word of text is original. **Counsel review is required before anything ships**, because the structural resemblance is close.

**Taken from Escape the Dark Castle:** one card at a time with the boss underneath, no turn order, effects that hit whoever is on point, simultaneous rolls assigned to the enemy, doubles that hit twice and block, every survivor dealing damage, one player resting per round, a kit card after every fight, losing if anyone falls.

**Ours:** the d20 instead of symbol dice; one shuffled situation pool instead of chapters; the always-on persistence row that rolls with every flip; comebacks that strike on arrival (the two biggest per roll); dual-mode AI agents in a shared crew tray; crew-size scaling through dice and mob hits instead of HP tables; eight mob keywords; the SOC setting and art.

## Balance targets

Tuned with `sim/` against a careful bot, never yet against enough humans.

| Mode | Target win rate | Shipped |
| --- | --- | --- |
| Full Shift, Recruit | 60–70% | 64 HP |
| Full Shift, Analyst | ~50% | 52 HP |
| Full Shift, Veteran | 35–40% | 41 HP |
| Quick Shift | ~60% (booth-friendly) | 40 HP |
| First Shift | ~70% | 31 HP |

Other things worth holding: every player count within about 10 points of each other; roughly 5–6 comebacks per Full Shift; a real share of losses before the boss (the row has to matter), but no more than about 40–45%, so the boss stays the climax; winners usually ending at a quarter to a third of their HP. `npm run balance` enforces loose bands in CI.

## Decisions worth remembering

- **Story cards make the Recon Agent matter (2026-10-29).** The user asked for more story-driven cards that make Recon more impactful. Nine situations are now story cards (`story: true`), each with a `recon` effect and a `reconText` line. If the crew holds a running Recon Agent when one resolves, the Recon line replaces the whole outcome: no roll, no choice (`G.lastSit.recon`, counted in `G.stats.auto.recon`). Every Full Shift feed deals 3 story cards and Quick Shift 2 (`storyDeal`); First Shift has none, so the tutorial stays fixed. Story cards bring four new effects: `row` (roll for the row now; comebacks strike on arrival and are fought after the card), `call` (the widest-range mob in the row comes back with no arrival hit), `nextMob` (the next freshly flipped mob gets a Defense or Damage change until beaten) and `bury` (the next situation goes to the bottom of the feed). The Recon Agent's run now also gives a story card's Recon line; its burn looks at the next 3 situations and pulls one from the feed for good instead of burying it. In bot sims a Recon-favouring bot no longer loses win rate against the default bot, and its burn picks out the heavy hitters. Print: story cards carry an amber "Story" tag and frame, a shorter art panel, and a separate cyan "With Recon" box with an eye icon, so the table can see at a glance which line applies.
- **Bosses roll for the row (2026-10-29).** The user asked for boss abilities that trigger the persistence row more often. Lockjaw rolls for the row at the end of every round it's still up; the Persistent Operator rolls on every double that hits it; the Rogue AI rolls whenever an agent is burned. These are normal Row rolls (arrival strikes capped at two, plog `why` is `'boss'`), unlike the boss's own arrival roll, which brings comebacks in without the hit. With story cards and boss triggers together, losses before the boss fell to 30–43%, down from 63–70%: the boss is the climax again, not a formality after the row has already decided the shift.
- **HP for story cards and boss row triggers:** all bands pass in the bot sims of 2026-10-29; comebacks average about 5–6 per Full Shift.

| Mode | HP |
| --- | --- |
| Full Shift, Recruit | 64 |
| Full Shift, Analyst | 52 |
| Full Shift, Veteran | 41 |
| Quick Shift | 40 |
| First Shift | 31 |

- **63 cards, seven duplex sheets.** 15 mobs, 18 situations (9 of them story cards), 3 bosses, 5 analysts, 16 kit (8 types × 2), 4 HP trackers and 2 double-sided references: seven 9-up Letter sheets, a 14-page print-and-play PDF. The count is an invariant: `deck/build.js`, the singles export and the deck tests all check it, and changing it changes the sheet layout.
- **A steeper mob-hits table: `mobAdd` {1: −1, 2: 0, 3: +2, 4: +4}** on the printed 2-player hits, never below 1. It replaces {−1, 0, +1, +2}; with boss row triggers and story cards, the steeper table for big crews keeps every player count inside its band.
- **One HP number per difficulty.** Crew size is absorbed by the dice rule (one die each, two for on point) and mob hits (the `mobAdd` table). Don't reintroduce per-count HP tables; fix spread with scaling instead.
- **Comebacks return at full hits, and still strike on arrival.** The user's call (2026-10-29): a mob that persists should come back as strong as it left, so persistence feels like real persistence. The old one-hit comeback made the row a speed bump. The arrival hit stays capped at the two highest-Damage comebacks per roll (`strikeCap`); the `returnHits` key is gone.
- **Automation is how a SOC survives the night.** The game is balanced so the AI agents carry real weight, and the design intent is that it teaches exactly that. Bot sims on 2026-10-29 (1,200 games per player count, the balance-gate setup): without agents the bot wins 1–2% of games; with them, about 50%. In an average two-player Analyst game the agents land about 10 hits, set up 12 more crew hits (Enrichment and Recon bonuses), stop 19 damage (Containment and Decoy), heal 22 HP (Recovery), and remove or dodge about 2.5 comebacks (Hunt and Patch). The engine counts these in `G.stats.auto` so the web game can show them. To get there, a won fight draws two kit cards (`kitPerFight`), the crew tray holds five (six with the Soarcerer), and the agents got stronger: Triage +4, Enrichment +3, Containment cuts 2, Recovery heals 4, and the Hunt Agent now hunts comebacks (+7, only against a mob that came back from the row; burn beats one).
- **Tougher bosses: +2 hits and +2 damage each.** Lockjaw 7 hits / 9 damage, Persistent Operator 7 / 9, Rogue AI 6 / 9, still printed + 1 per analyst. Stronger agents would otherwise flatten the finale; with this, about 63–70% of losses still came before the boss (since brought down to 30–43% by boss row triggers, above).
- **HP retuned for full comebacks and stronger agents** (superseded by the story-card retune above): Recruit 70, Analyst 60, Veteran 47, Quick Shift 37, First Shift 25. The HP tracker became a tens track plus a ones track with two coins per analyst, since one cell per HP point no longer fits a card.
- **Only the two highest-Damage comebacks of a roll strike.** Every range starts at 1, so a roll of 1–4 empties the row. Uncapped, 6.7% of Row rolls hit one analyst for 10+ before any choice (1,500 two-player Analyst games, 2026-10-29); capped at two, 0.6%. Comebacks per shift stayed at about 8, and Full Shift HP dropped from 50/42/34 to 44/38/31 to hold the targets. `strikeCap` in `data/cards.json`.
- **The row rolls with the flip,** so comebacks join the fight in front of you rather than becoming a separate fight.
- **Tougher mobs: Defense floor of 12, more hits.** Mobs at 8 felt free, and at 11 they still fell too fast. In 2,000 two-player Analyst games on 2026-10-29, heavy hitters fell in their first round 8–12% of the time, down from 23–31%, and nuisances 40–49%, down from about 70%. Full Shift HP rose to 59/50/41 (Quick Shift 31, First Shift 20) to hold the targets. Quick Shift fights grew from about 10.5 to 12.9 combat rounds, so the booth length has to be re-timed with real players.
- **Mob hits come from a per-count table, not +1 per analyst.** `mobAdd` in `data/cards.json` is now {1: −1, 2: 0, 3: +2, 4: +4} on the printed 2-player hits, never below 1 (see the steeper-table entry above; it was {−1, 0, +1, +2} with full-hit comebacks and the bigger crew tray). Each mob card prints all four numbers, and has no hit boxes: one row of boxes can only be right for one crew size. Boss scaling is still printed + 1 per analyst.
- **The shift runs 22:00 to 06:00: survive until dawn.** Flip i of N shows 22:00 + (i − 1) × 480 / N minutes, rounded down to 5; the boss is always 05:59. Times are positional because the feed is shuffled, so they live on the row mat and in the web game, never on a card.
- **Read-aloud cards.** Whoever's on point reads the flipped card aloud. Flavour lines are short second-person scenes (1–2 sentences, 140 characters at most), so the table hears the night instead of reading it.
- **Containment can't reduce damage below 1; Decoy protects only whoever's on point.** Both were erasing whole rounds.
- **Kit is all dual-mode agents (run or burn) in one shared tray.** Per-player slots let bigger crews snowball.
- **Each mob has its own comeback range.** Nuisances come back often (1–10), heavy hitters rarely (1–4 to 1–6). Every range starts at 1, so the Patch Agent's keep-the-highest die still helps against all of them. The Threat Intel Drop removes the widest one.
- **Beacon comebacks chain.** Anything a Beacon's roll brings back rolls the row again, until a roll comes up quiet. About one chain roll per Full Shift; it's the swing that makes Beacons feel like C2.
- **Keywords over bespoke abilities.** Eight words to learn once. The PsExec Swarm's spread folded into Beacon, the Rootkit's wide range into Regen, the Vibe Coded App's hallucinations into Escalating.

## Open items

- Human playtests: First Shift with someone new, then Full Shift at two and four players.
- Re-time Quick Shift at the booth. Full-hit comebacks and two kit draws per fight change its length again; the 12.9-combat-round figure predates them.
- See the printed cards by eye (longest name: Living-off-the-Land Scavenger).
- Commission real art. The vector silhouettes are placeholders, and AI-made art can't be copyrighted.
- Counsel review and a USPTO search on the name.
- Confirm booth swag stock with marketing.
- Ideas parked for after playtests: the row as a clock (boss arrives early at 5 mobs in the row), a drafted kit draw (draw 2, keep 1).
