# Detect the Dwellers: rules

A co-op card game for 1–4 players about a SOC night shift in a rain-soaked megacity. The shift runs 22:00 to 06:00. Work through a feed of situations, fight the mobs that crawl out of the network, and survive the boss that comes at 05:59. Make it to dawn and you win together; otherwise the shift is lost.

**You need:** the 63-card deck, four d20s, and a handful of coins (two per HP tracker, a few to mark hits).

The full illustrated rulebook lives in Claude Docs. This file is the canonical rules text for the repo; when they disagree, fix whichever is wrong.

## Setup

1. **Each player picks one analyst** and takes an HP tracker. Set it to your starting HP: Recruit 64, Analyst 52, Veteran 41, Quick Shift 40 (First Shift 31). It's the same at every player count.

   **Reading the tracker.** It has two tracks and takes two coins: one on the tens track (0–90), one on the ones track (0–9). Your HP is the two added together: 47 HP is one coin on 40 and one on 7. When damage takes you below the tens coin, drop it a step and move the ones coin up: at 42, taking 5 leaves 37 (tens on 30, ones on 7). Healing never takes you above your starting HP.
2. **Build the feed.** Shuffle the 9 story cards and deal 3. Shuffle the other 24 (15 mobs, 9 situations) and deal 7. Shuffle those 10 together face down: that's the feed. Quick Shift: 2 story cards and 4 others, 6 in all.
3. **Shuffle the bosses** and put one face down under the feed.
4. **Shuffle the kit deck.** In Quick Shift, the crew starts with two AI agents from it.
5. **Lay out the persistence row mat.** It starts empty.

For a first game, use the First Shift setup instead (below).

## A round

1. **Pick who's on point.** They roll an extra die this round and take the kit draw.
2. **Flip the top card of the feed, and roll a d20 for the persistence row** at the same time (once anything is in the row). Whoever's on point reads the card aloud, flavour line first.
3. **Resolve it.** A situation is read and resolved. A mob starts a fight, joined by anything that came back from the row. If a non-combat situation came up and something came back, resolve the situation first, then fight.
4. **Repeat** until the feed is empty. Then the boss arrives at 05:59, with one more roll for the row.

**The shift clock.** The feed is the night, 22:00 to 06:00, spread evenly over the flips: in a Full Shift, about 48 minutes apart, rounded down to 5 minutes (22:00, 22:45, 23:35…). The web game shows the time on each flip. The boss is always 05:59. The time belongs to the flip, not the card, so no card prints one.

## Story cards

Nine of the situations are **story cards**, marked *Story* on an amber tag. They read and resolve like any situation, with one extra: a cyan **With Recon** box at the bottom.

**If a Recon Agent is running in the crew tray when the card resolves, use the With Recon line instead of the card's rule.** It replaces the whole outcome: no roll, no choice. You don't need to have peeked at it. A burned Recon Agent doesn't count.

Story cards use a few effects you won't see elsewhere:

- **Roll for the row now.** Make a Row roll on the spot. Anything that comes back strikes on arrival as usual (the two highest-Damage hit everyone), then the crew fights it after the card.
- **A mob comes back now.** The mob in the row with the widest range comes back at full hits, with no arrival hit. Fight it after the card.
- **The next mob is marked.** The next mob flipped from the feed gets the change (for example +3 Defense or +2 Damage) until it's beaten. Comebacks don't count.
- **Bury.** The next situation goes to the bottom of the feed.

## A fight

- **Roll.** Everyone rolls one d20; whoever's on point rolls two. Running agents roll too.
- **Assign.** Put each die on a mob it beats: d20 + bonus ≥ the mob's Defense is one hit. A natural 18–20 is a double: two hits, and that analyst blocks this round (Engineer: 16–20).
- **Hits back.** Every mob still standing hits everyone who didn't block, for its Damage. A mob you finish this round doesn't hit back.
- **Off-shift.** Before the roll, one analyst may go off-shift: no roll, no damage, heal 1 HP.
- **Won.** When the last mob falls, whoever's on point draws two kit cards for the crew.

**Mob hits scale with the crew.** Each mob card prints its hits for 1, 2, 3 and 4 analysts: use the number for your crew size. (The data stores the 2-player number and adds the `mobAdd` table, never going below 1.)

| Analysts | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Mob hits | printed − 1 | printed | printed + 2 | printed + 4 |

 The boss: printed hits + 1 per analyst. Track hits with coins.

## The persistence row

Every beaten mob goes on the row mat, every time. Every flip, roll a d20: any mob in the row whose range matches comes back. Each mob prints its own range, from 1–10 for the nuisances down to 1–4 for the Golden Ticket Ghost. Comebacks return at **full hits**, as strong as the first time. The **two with the highest Damage hit everyone for their Damage on the way in**; any others just rejoin. Each roll counts on its own, so a Beacon chain can bring in two more hitters. The roll made when the boss arrives brings comebacks in without the arrival hit. Only burning a Patch Agent, the Threat Intel Drop situation, or a story card's Recon line removes a mob for good. The Hunt Agent and the Hunter are built to clean up comebacks once they're back in play.

## Kit

All kit is AI agents: eight types, two copies each, in one shared crew tray of five cards (six with the Soarcerer). Every won fight draws two. If the tray is full, discard one to make room. Every card has two modes:

- **Run it:** it works every round or every fight.
- **Burn it:** a one-shot effect, then discard it.

Rolling agents can't hit the boss. The Rogue AI boss shuts off every running agent; you can still burn them, but each burn rolls for the row.

| Agent | Run it | Burn it |
| --- | --- | --- |
| Triage | Rolls every round at +4 against any mob. | Roll three extra dice this round, with your bonus. |
| Hunt | Rolls every round at +7, but only against a mob that came back from the row. | A mob that came back from the row (not the boss) is beaten. |
| Containment | Each round, the highest-damage mob deals 2 less damage, never below 1. | Every mob in play takes 1 hit. |
| Enrichment | Every analyst gets +3 against every mob. | This round, every analyst die gets +5. |
| Patch | When you roll for the persistence row, roll an extra die and keep the highest. | Discard one mob from the persistence row for good. |
| Recovery | After every fight, heal 4 HP split across the crew. | Heal 6 HP split across the crew. |
| Decoy | Once per fight, after the roll: the analyst on point takes no damage this round. | After the roll: everyone blocks this round. |
| Recon | Peek at the next situation before picking who's on point. A mob you peeked: everyone gets +5 against it all fight. A story card: you get its With Recon line (you get that even without peeking). | Look at the next 3 situations and pull one from the feed for good. It's discarded, not buried. |

A mob "came back from the row" once the Row roll has returned it, for the rest of the shift.

## Bosses

Boss hits are printed + 1 per analyst. The boss arrives with one more Row roll, and nothing hits on the way in.

**Bosses roll for the row.** Each boss has a trigger that makes another Row roll during the fight, printed on its card. These rolls are normal Row rolls: comebacks strike on arrival (the two highest-Damage hit everyone) and join the fight. A boss fight can pull half the row back in, so the boss is the climax of the shift.

| Boss | Defense | Hits (printed) | Damage | Ability |
| --- | --- | --- | --- | --- |
| The Lockjaw Syndicate | 16 | 7 | 9 | +2 damage until it has taken two hits. At the end of every round it's still up, roll for the row. |
| The Persistent Operator | 15 | 7 | 9 | The first time you beat it, it comes back with 2 hits left. Every double that hits it rolls for the row. |
| The Rogue AI | 17 | 6 | 9 | Agents can't roll while it's in play. Burning one rolls for the row. |

## Mob keywords

| Keyword | Rule |
| --- | --- |
| Piercing | Blocks don't stop it. |
| Targeted | Only the analyst on point takes its damage, doubled. |
| Stalker | It only hits the analyst with the lowest HP. |
| Evasive | Only a natural 12 or higher can hit it. |
| Regen | Heals 1 hit at the end of each round. |
| Beacon | When it enters play or comes back, roll for the persistence row. Anything that roll brings back rolls for the row too. |
| Fileless | Agents can't hit it. |
| Escalating | +1 damage every round it stays up. |

## Winning and losing

Beat the boss and you've made it to dawn: the shift is won. If any analyst hits 0 HP, the shift is lost for everyone.

## First Shift (your first game)

A fixed six-card game that teaches one idea per card. Stack these face down, first on top: MFA Banshee, Patch Tuesday, Macro Gremlin, Impossible Travel, DNS Beacon Drone, Coffee Run. The Lockjaw Syndicate goes underneath. Put the Recovery and Triage Agents on top of the kit deck, start at 31 HP each, and play normally. First Shift has no story cards.

## Quick Shift (booth mode)

Six situations (two of them story cards) and the boss, 40 HP each, and the crew starts with two agents. About ten to fifteen minutes. Swag by result: Wingman (won with 70%+ of the lowest HP left), Solid Shift, Close Call, Flatlined.

Every card's exact text is in [CARDS.md](CARDS.md).
