# Detect the Dwellers: rules

A co-op card game for 1–4 players about a SOC night shift in a rain-soaked megacity. The shift runs 22:00 to 06:00. Work through a feed of situations, fight the mobs that crawl out of the network, and survive the boss that comes at 05:59. Make it to dawn and you win together; otherwise the shift is lost.

**Card text beats the rulebook.** If a card and these rules disagree, do what the card says.

## What you need

- **72 cards:** 15 mobs, 18 situations (9 of them story cards), 3 bosses, 5 analysts, 16 kit (8 agents × 2), 4 HP trackers, 2 double-sided reference cards, and 9 markers (6 Came back, 1 Next mob, 1 Round, 1 Once per fight).
- **6 crew d20s** in one colour: one each, plus on point’s second die and room for Triage burns.
- **3 agent d20s** in a second colour, for running agents. Agent dice can’t hit the boss, and the Engineer gives them +3, so keep them apart.
- **1 row d20** in amber, for every row roll.
- **Coins:** 2 per HP tracker, plus about 20 to mark hits and markers.

A four-player round with a Triage burn can need 9–10 dice, plus the row die. The markers are print-only aids: the web game tracks all of this itself.

The rules come in two parts. **Learn the core rules first:** they play First Shift and Quick Shift. **Full Shift adds the advanced modules** once the core feels easy. The full illustrated rulebook lives in Claude Docs; this file is the canonical rules text for the repo. When they disagree, fix whichever is wrong.

## Core rules: learn these first

### Setup

1. **Pick an analyst each** and take an HP tracker. Set it to your starting HP (Reference). Two coins: one on the tens, one on the ones. 47 HP is a coin on 40 and a coin on 7.
2. **Build the feed.** Set the 9 story cards aside; core games don’t use them. Shuffle the other 33 situations and mobs, and deal 6 face down.
3. **Boss underneath.** Shuffle the three bosses and put one face down under the feed, unseen.
4. **Shuffle the kit deck.** The crew starts with two agents from it.
5. **Lay out the persistence row mat** and the markers. The row starts empty.

Your first game? Use the First Shift setup instead (Reference).

### The table

```
   ┌──────────┐  ┌──────────┐      ┌─────────────────────────────┐
   │   FEED   │  │  KIT     │      │  PERSISTENCE ROW            │
   │ face down│  │  DECK    │      │  beaten mobs wait here      │
   │ boss at  │  │          │      │  ┌────┐ ┌────┐ ┌────┐       │
   │ bottom   │  │ discard ►│      │  │mob │ │mob │ │ …  │       │
   └──────────┘  └──────────┘      └──┴────┴─┴────┴─┴────┴───────┘

         ┌────────┐ ┌────────┐       ← the fight: mobs in play,
         │  mob   │ │  mob   │         coins on them for hits
         └────────┘ └────────┘

   CREW TRAY (5 agents)  ┌───┐┌───┐┌───┐┌───┐┌───┐   markers:
                         └───┘└───┘└───┘└───┘└───┘   Next mob · Round
                                                      Once per fight
   each analyst: analyst card + HP tracker (2 coins) + crew dice
```

### Reading a mob card

```
 ┌─────────────────────────────────┐
 │  [ art ]                        │
 │ IDENTITY          BACK 1–13  ◄──┼── its row range: comes back on 1–13
 │ MAILER DAEMON                   │
 │ ┌ DEFENSE 12 ┐ ┌ DAMAGE 1 ┐ ◄───┼── beat 12 to hit; it hits for 1
 │ HITS 1P 1  2P 3  3P 5  4P 6 ◄───┼── hits to beat it, by crew size
 │ ┌ BEACON. When it enters … ┐ ◄──┼── its one keyword
 │ flavour line, read aloud    ◄───┼── no rules here
 └─────────────────────────────────┘
```

Situation cards say what they do and whether it's a choice, an event or one attempt (a challenge). Story cards add a **With Recon** line (Full Shift only).

### A round

1. **Pick who’s on point.** They roll an extra die this round and take the kit draw.
2. **Flip the top card of the feed and roll the row die** together (once anything is in the row). On point reads the card aloud, flavour line first.
3. **Resolve it.** A situation does what it says. A mob starts a fight, joined by anything that came back from the row. Resolve a situation before any fight.
4. **Repeat** until the feed is empty. Then the boss arrives at 05:59, with one last row roll.

### A fight

- **Off-shift.** Before the roll, one analyst may sit out: no roll, no damage, heal 1 HP.
- **Roll.** Everyone rolls a crew die; on point rolls two. Running agents roll agent dice.
- **Assign.** Put each die on a mob it beats: d20 + bonus ≥ the mob’s Defense is one hit.
- **Doubles.** A natural 18–20 is two hits, and you block this round.
- **Guard.** A crew die showing 14+ can guard instead of hitting: you block this round, like a double. Agent dice can’t guard.
- **Hits back.** Every mob still standing hits everyone who didn’t block, for its Damage. A mob you finish this round doesn’t hit back.
- **Won.** When the last mob falls, on point draws two kit cards for the crew. Playing solo, you draw one.

Mobs and bosses print their hits for 1, 2, 3 and 4 analysts. Use the number for your crew size.

### The persistence row

Every beaten mob goes on the row mat. Every flip, roll the row die: any mob whose printed range matches comes back at **full hits**. Tuck a Came back marker under it so BACK shows above the card. It stays a comeback all shift.

**Arrival cap:** only the two comebacks with the highest Damage hit everyone on the way in. The rest just rejoin the fight. The boss’s arrival roll brings comebacks in with no arrival hit.

Only a Patch Agent burn, a few situations and the Hunter remove a mob for good.

### Kit

Every kit card is an AI agent with two modes:

- **Run it:** keep it in the crew tray, and it works every round or every fight.
- **Burn it:** a one-shot effect, then discard it.

A won fight draws two kit cards (one if you play solo). The crew tray holds five; when it’s full, discard one to make room. **Kit deck empty?** Shuffle the discard pile (burned and dropped agents) into a new kit deck and keep drawing. Agent dice can’t hit a boss. Agent table: Reference.

### Analysts

Each analyst has a **perk** (what you do) and an **agent link** (what one kind of agent does while you’re in the crew). Your card says both, and how to play it.

### Mob keywords

Every mob has one keyword.

| Keyword | Rule |
| --- | --- |
| Beacon | When it enters play or comes back, roll for the persistence row. Anything that roll brings back rolls for the row too. |
| Escalating | +1 damage every round it stays up. Track it on the Round marker. |
| Evasive | Only a natural 12 or higher can hit it. |
| Fileless | Agents can’t hit it. |
| Piercing | Blocks don’t stop it. |
| Regen | Heals 1 hit at the end of each round. |
| Stalker | It only hits the analyst with the lowest HP. |
| Targeted | Only the analyst on point takes its damage, doubled. |

### Winning and losing

Beat the boss and you’ve made it to dawn: the shift is won. If any analyst hits 0 HP, the shift is lost for everyone. Healing never takes you above your starting HP.


## Advanced modules: Full Shift

Full Shift plays the core rules with a longer feed and two modules on top. Deal 10: shuffle the 9 story cards and deal 3, then deal 7 from the other 33, and shuffle the 10 together. The crew starts with no agents.

### Story cards and Recon lines

Story cards carry an amber *Story* tag and say *Advanced · Full Shift*. They read and resolve like any situation, with one extra: a cyan **With Recon** box.

**If a Recon Agent is running in the crew tray when the card resolves, use the With Recon line instead of the card’s rule.** It replaces the whole outcome: no roll, no choice. You don’t need to have peeked. A burned Recon Agent doesn’t count.

### Story effects

- **Roll for the row now.** Make a row roll on the spot. Comebacks strike on arrival as usual, then you fight them after the card.
- **A mob comes back now.** The mob in the row with the widest range comes back at full hits, with no arrival hit. Fight it after the card.
- **The next mob is marked.** The next mob flipped from the feed gets the change (+3 Defense, +2 Damage, and so on) until it’s beaten. Comebacks don’t count. Track it on the Next mob marker.
- **Bury.** The next situation goes to the bottom of the feed.

### Boss row triggers

Each boss card prints its row trigger after a *Full Shift:* lead-in. Core games skip that sentence; the rest of the ability always applies.

- **The Lockjaw Syndicate:** at the end of every round it’s still up, roll for the row.
- **The Persistent Operator:** every double that hits it rolls for the row.
- **The Rogue AI:** burning an agent rolls for the row.

These are normal row rolls: the two highest-Damage comebacks hit on arrival, and all of them join the fight. A boss fight can pull half the row back in.

## Reference

### Starting HP

The same at every crew size.

| Mode | HP |
| --- | --- |
| Full Shift, Recruit | 62 |
| Full Shift, Analyst | 47 |
| Full Shift, Veteran | 39 |
| Quick Shift | 39 |
| First Shift | 26 |

When damage takes you below the tens coin, drop it a step and move the ones coin up: at 42, taking 5 leaves 37 (tens on 30, ones on 7).

### Crew size

Mob cards and boss cards print all four numbers. The data stores the 2-player mob hits and the boss’s base hits, and adds these tables (`mobAdd`, `bossAdd`). Mob hits never go below 1.

| Analysts | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Mob hits | printed − 2 | printed | printed + 2 | printed + 3 |
| Boss hits | base | base + 3 | base + 4 | base + 6 |

### Bosses

The boss arrives with one more row roll, and nothing hits on the way in. Agent dice can’t hit it.

| Boss | Defense | Damage | Hits 1p / 2p / 3p / 4p | Ability (core) | Full Shift trigger |
| --- | --- | --- | --- | --- | --- |
| The Lockjaw Syndicate | 16 | 9 | 7 / 10 / 11 / 13 | +2 damage until it has taken two hits. | At the end of every round it’s still up, roll for the row. |
| The Persistent Operator | 15 | 9 | 7 / 10 / 11 / 13 | The first time you beat it, it comes back with 2 hits left. | Every double that hits it rolls for the row. |
| The Rogue AI | 17 | 9 | 6 / 9 / 10 / 12 | Agents can’t roll while it’s in play. | Burning one rolls for the row. |

### Agents

Eight types, two copies each.

| Agent | Run it | Burn it |
| --- | --- | --- |
| Triage | Rolls every round at +4 against any mob. | Roll three extra dice this round, with your bonus. |
| Hunt | Rolls every round at +7, but only against a mob that came back from the row. | A mob that came back from the row (not the boss) is beaten. |
| Containment | Each round, the highest-damage mob deals 2 less damage, never below 1. | Every mob in play takes 1 hit. |
| Enrichment | Every analyst gets +3 against every mob. | This round, every analyst die gets +5. |
| Patch | When you roll for the persistence row, roll an extra die and keep the highest. | Discard one mob from the persistence row for good. |
| Recovery | After every fight, heal 4 HP split across the crew. | Heal 6 HP split across the crew. |
| Decoy | Once per fight, after the roll: the analyst on point takes no damage this round. | After the roll: everyone blocks this round. |
| Recon | Peek at the next situation before picking who’s on point. A mob you peeked: everyone gets +5 against it all fight. A story card: you get its With Recon line (you get that even without peeking). | Look at the next 3 situations and pull one from the feed for good. It’s discarded, not buried. |

A mob "came back from the row" once a row roll has returned it, for the rest of the shift: that’s what the Came back marker shows. Mark a used Decoy on the Once per fight marker.

### Analysts

The agent link works for the whole crew’s agents, so a crew builds its own agent synergies. The numbers live in `perks` in `data/cards.json`.

| Analyst | Perk | Agent link |
| --- | --- | --- |
| Hunter | +3 against mobs that came back from the row. Any comeback you finish is gone for good: it doesn’t go back to the row. | Hunt Agents hunt with you: a comeback they finish (dice or burn) is gone for good too. |
| Responder | +3 against the highest-damage mob in play, boss included. | Containment Agents cut 1 more damage. |
| Engineer | Your doubles are 17–20, not 18–20. | Agent dice (Triage and Hunt) roll +3. |
| Soarcerer | The crew tray holds one more agent (six). | Every won fight draws one more kit card (three; two solo). |
| Fixer | After every fight, heal 5 HP split across the crew. Off-shift, heal 3 split instead of 1 for yourself. | Recovery Agents heal 3 more after each fight. |

### First Shift (your first game)

Core rules, a fixed feed that teaches one idea per card. Stack these face down, first on top: MFA Banshee, Patch Tuesday, Macro Gremlin, Impossible Travel, DNS Beacon Drone, Coffee Run. The Lockjaw Syndicate goes underneath. Put the Recovery and Triage Agents on top of the kit deck. Start at 26 HP each, with no agents, and play normally, with one scripted moment: **on flip 2, don’t roll for the row. The MFA Banshee comes back**, hits everyone for 1 on the way in (it’s 1 Damage), and you fight it after Patch Tuesday. The First Shift reference card has the stack.

### Quick Shift (booth mode)

Core rules: 6 situations, no story cards, a random boss with no row trigger, 39 HP each, and the crew starts with two agents. About ten to fifteen minutes. Swag by result: Wingman (won with 70%+ of the lowest HP left), Solid Shift, Close Call, Flatlined.

### The shift clock

The feed is the night, 22:00 to 06:00, spread evenly over the flips: in a Full Shift, about 48 minutes apart, rounded down to 5 minutes (22:00, 22:45, 23:35…). The web game shows the time on each flip. The boss is always 05:59. The time belongs to the flip, not the card, so no card prints one.

## FAQ

**A card says something different from these rules.** Do what the card says.

**Does a natural 18–20 always hit?** Yes, whatever the Defense, and it's two hits. A natural 1 always misses. Evasive mobs still need a natural 12 or higher, so an 18–20 hits them too.

**Can an agent die block?** No. An agent die showing 18–20 hits twice, but only crew dice block, by a double or a guard. Agent dice can't guard.

**I rolled a double and a 15. Can the 15 guard too?** It can't add anything: you're already blocking. Put it on a mob.

**Does blocking stop everything?** No. Piercing mobs ignore blocks, and a block doesn't stop comebacks hitting on the way in.

**Who takes damage when someone's off-shift?** Not them. Mobs hit everyone still in the fight; a Stalker hits the lowest HP among them.

**The row is empty. Do I still roll the row die?** No. Roll it only when something is on the row.

**Two comebacks have the same Damage and only one more can strike.** Pick one. Either way, only two strike.

**The kit tray is full and we won a fight.** Draw anyway, then discard down to five (six with the Soarcerer). Discards go to the discard pile and come back when the kit deck reshuffles.

**A mob I finish this round: does it still hit back?** No. Only mobs still standing at the end of the round hit back.

**Can healing go above starting HP?** No.

Every card’s exact text is in [CARDS.md](CARDS.md).
