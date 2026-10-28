# Detect the Dwellers: rules

A co-op card game for 1–4 players about a SOC night shift in a rain-soaked megacity. Work through a feed of situations, fight the mobs that crawl out of the network, and survive the boss at the end. Everyone wins together or the shift is lost.

**You need:** the 54-card deck, four d20s, and a handful of coins (one per HP tracker, a few to mark hits).

The full illustrated rulebook lives in Claude Docs. This file is the canonical rules text for the repo; when they disagree, fix whichever is wrong.

## Setup

1. **Each player picks one analyst** and takes an HP tracker. Put your coin on your starting HP: Recruit 50, Analyst 42, Veteran 34, Quick Shift 26. It's the same at every player count.
2. **Shuffle the 24 situation cards** (15 mobs, 9 situations) and deal 10 face down as the feed. Quick Shift: deal 6.
3. **Shuffle the bosses** and put one face down under the feed.
4. **Shuffle the kit deck.** In Quick Shift, the crew starts with two AI agents from it.
5. **Lay out the persistence row mat.** It starts empty.

For a first game, use the First Shift setup instead (below).

## A round

1. **Pick who's on point.** They roll an extra die this round and take any kit draw.
2. **Flip the top card of the feed, and roll a d20 for the persistence row** at the same time (once anything is in the row).
3. **Resolve it.** A situation is read and resolved. A mob starts a fight, joined by anything that came back from the row. If a non-combat situation came up and something came back, resolve the situation first, then fight.
4. **Repeat** until the feed is empty. Then the boss arrives, with one more roll for the row.

## A fight

- **Roll.** Everyone rolls one d20; whoever's on point rolls two. Running agents roll too.
- **Assign.** Put each die on a mob it beats: d20 + bonus ≥ the mob's Defense is one hit. A natural 18–20 is a double: two hits, and that analyst blocks this round (Engineer: 16–20).
- **Hits back.** Every mob still standing hits everyone who didn't block, for its Damage. A mob you finish this round doesn't hit back.
- **Off-shift.** Before the roll, one analyst may go off-shift: no roll, no damage, heal 1 HP.
- **Won.** When the last mob falls, whoever's on point draws a kit card for the crew.

**Mob hits scale with the crew:** printed hits + number of analysts − 2, never below 1. The boss: printed hits + 1 per analyst. Track hits with coins.

## The persistence row

Every beaten mob goes on the row mat, every time. Every flip, roll a d20: any mob in the row whose range matches comes back. Each mob prints its own range, from 1–10 for the nuisances down to 1–4 for the Golden Ticket Ghost. A comeback **hits everyone for its Damage on the way in**, then joins the fight needing only **one hit**. Only burning a Patch Agent or the Threat Intel Drop situation removes a mob for good.

## Kit

All kit is AI agents: eight types, two copies each, in one shared crew tray of four cards (five with the Soarcerer). Every card has two modes:

- **Run it:** it works every round or every fight.
- **Burn it:** a one-shot effect, then discard it.

Rolling agents can't hit the boss. The Rogue AI boss shuts off every running agent; you can still burn them.

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

Beat the boss and the shift is won. If any analyst hits 0 HP, the shift is lost for everyone.

## First Shift (your first game)

A fixed six-card game that teaches one idea per card. Stack these face down, first on top: MFA Banshee, Patch Tuesday, Macro Gremlin, Impossible Travel, DNS Beacon Drone, Coffee Run. The Lockjaw Syndicate goes underneath. Put the Recovery and Triage Agents on top of the kit deck, start at 18 HP each, and play normally.

## Quick Shift (booth mode)

Six situations and the boss, 26 HP each, and the crew starts with two agents. About ten minutes. Swag by result: Wingman (won with 70%+ of the lowest HP left), Solid Shift, Close Call, Flatlined.

Every card's exact text is in [CARDS.md](CARDS.md).
