# Detect the Dwellers: rules

A co-op card game for 1–4 players about a SOC night shift in a rain-soaked megacity. The shift runs 22:00 to 06:00. Work through a feed of situations, fight the mobs that crawl out of the network, and survive the boss that comes at 05:59. Make it to dawn and you win together; otherwise the shift is lost.

**You need:** the 54-card deck, four d20s, and a handful of coins (one per HP tracker, a few to mark hits).

The full illustrated rulebook lives in Claude Docs. This file is the canonical rules text for the repo; when they disagree, fix whichever is wrong.

## Setup

1. **Each player picks one analyst** and takes an HP tracker. Put your coin on your starting HP: Recruit 59, Analyst 50, Veteran 41, Quick Shift 31. It's the same at every player count.
2. **Shuffle the 24 situation cards** (15 mobs, 9 situations) and deal 10 face down as the feed. Quick Shift: deal 6.
3. **Shuffle the bosses** and put one face down under the feed.
4. **Shuffle the kit deck.** In Quick Shift, the crew starts with two AI agents from it.
5. **Lay out the persistence row mat.** It starts empty.

For a first game, use the First Shift setup instead (below).

## A round

1. **Pick who's on point.** They roll an extra die this round and take any kit draw.
2. **Flip the top card of the feed, and roll a d20 for the persistence row** at the same time (once anything is in the row). Whoever's on point reads the card aloud, flavour line first.
3. **Resolve it.** A situation is read and resolved. A mob starts a fight, joined by anything that came back from the row. If a non-combat situation came up and something came back, resolve the situation first, then fight.
4. **Repeat** until the feed is empty. Then the boss arrives at 05:59, with one more roll for the row.

**The shift clock.** The feed is the night, 22:00 to 06:00, spread evenly over the flips: in a Full Shift, about 48 minutes apart, rounded down to 5 minutes (22:00, 22:45, 23:35…). The web game shows the time on each flip. The boss is always 05:59. The time belongs to the flip, not the card, so no card prints one.

## A fight

- **Roll.** Everyone rolls one d20; whoever's on point rolls two. Running agents roll too.
- **Assign.** Put each die on a mob it beats: d20 + bonus ≥ the mob's Defense is one hit. A natural 18–20 is a double: two hits, and that analyst blocks this round (Engineer: 16–20).
- **Hits back.** Every mob still standing hits everyone who didn't block, for its Damage. A mob you finish this round doesn't hit back.
- **Off-shift.** Before the roll, one analyst may go off-shift: no roll, no damage, heal 1 HP.
- **Won.** When the last mob falls, whoever's on point draws a kit card for the crew.

**Mob hits scale with the crew.** Each mob card prints its hits for 1, 2, 3 and 4 analysts: use the number for your crew size. (The data stores the 2-player number and adds −1, 0, +2 or +4, never going below 1.) The boss: printed hits + 1 per analyst. Track hits with coins.

## The persistence row

Every beaten mob goes on the row mat, every time. Every flip, roll a d20: any mob in the row whose range matches comes back. Each mob prints its own range, from 1–10 for the nuisances down to 1–4 for the Golden Ticket Ghost. Comebacks join the fight needing only **one hit**. The **two with the highest Damage hit everyone for their Damage on the way in**; any others just rejoin. Each roll counts on its own, so a Beacon chain can bring in two more hitters. The roll made when the boss arrives brings comebacks in without the arrival hit. Only burning a Patch Agent or the Threat Intel Drop situation removes a mob for good.

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

Beat the boss and you've made it to dawn: the shift is won. If any analyst hits 0 HP, the shift is lost for everyone.

## First Shift (your first game)

A fixed six-card game that teaches one idea per card. Stack these face down, first on top: MFA Banshee, Patch Tuesday, Macro Gremlin, Impossible Travel, DNS Beacon Drone, Coffee Run. The Lockjaw Syndicate goes underneath. Put the Recovery and Triage Agents on top of the kit deck, start at 20 HP each, and play normally.

## Quick Shift (booth mode)

Six situations and the boss, 31 HP each, and the crew starts with two agents. About ten to fifteen minutes. Swag by result: Wingman (won with 70%+ of the lowest HP left), Solid Shift, Close Call, Flatlined.

Every card's exact text is in [CARDS.md](CARDS.md).
