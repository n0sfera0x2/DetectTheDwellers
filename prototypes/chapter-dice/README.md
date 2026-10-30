# Prototype: chapter dice (d6s) against the current d20

**Status:** since the [row and reroll pass](#always-persist-row-no-one-off-matches-rerolls-2026-10-30) (2026-10-30), beaten mobs always go back to the row (row numbers retuned to 2–5 / 2–4 / 2–3), there are no one-higher-or-lower matches, and once a round each player may reroll one of their own dice. HP 24. Before that: exact numbers with **clustered dice and two-of-a-number doubles** (see [Clustered dice](#clustered-dice-and-two-of-a-number-doubles-2026-10-30)). Mob cards print the dice to set under them, bunched round a main number (1 2 2 3); a rolled die takes out a die showing exactly its number, and a double counts as two dice showing its number. The sim (`SYS=n6`, the default d6 family), the paper prototype and the web version all play these rules at 25 HP. The earlier symbol system stays reachable in the sim with `SYS=d6`. Next step: a table playtest against today's Quick Shift.

## Hypothesis

An Escape the Dark Castle–style d6 symbol system makes more rounds a real decision than today's d20 system, without making skill matter less or the analysts less even. In the d20 system, a hit is d20 + bonus ≥ Defense.

In the d6 version:

- Each analyst rolls their own d6. Every face shows a response symbol: **Detect**, **Contain** or **Eradicate**.
- A mob's hits are a row of those symbols.
- A matching face removes one symbol from the row.
- A double face either removes two of that symbol or **guards** (blocks for you). You can't do both.

## How to run

```bash
node prototypes/chapter-dice/sim.js                    # d20 baseline and exact numbers (n6), 600 games per case
SYS=n6 N=500 HP=30 node prototypes/chapter-dice/sim.js # exact numbers at the shipped HP (~15 s)
SYS=n6 N=500 node prototypes/chapter-dice/sim.js       # exact numbers, HP tuned to ~50% at 2p
SYS=d6 node prototypes/chapter-dice/sim.js             # the earlier symbol d6 system (1–2 Detect, 3–4 Contain, 5–6 Eradicate)
SYS=d6 DICE=custom node prototypes/chapter-dice/sim.js # the custom symbol dice before that, d20 row
```

Env knobs:

| Knob | Does |
| --- | --- |
| `SYS` | `d20`, `n6`, `d6`, comma-separated (default `d20,n6`) |
| `N` | games per case (default 600) |
| `HP` | starting HP; skips the tune-to-50% search |
| `N6DICE` | n6: dice per analyst each round (default 1; on point +1) |
| `N6SOLO` | n6: dice a solo player rolls (default 3: two own plus the crew die) |
| `DICE=custom` | the custom symbol dice instead of pip d6s; also switches the d6 row back to the d20 |
| `DOUBLES_JSON` | override the double numbers, e.g. `{"HUN":[1,2,6],"CREW":[6],"AGENT":[6]}` (pip dice only) |
| `DICE_JSON` | override whole dice as `[symbol, count]` faces, e.g. `{"HUN":[["D",2],…]}` |
| `SOLO` | `mixed` (default): solo rolls two own dice plus the crew die. `own`: three own dice |
| `ROW` | `2d6` (default for d6) or `d20`. The d20 system always rolls the d20 |
| `ROWMAP` | `tier` (default) or `near`, the rejected nearest-odds mapping |
| `SOLO_REROLL=1` | solo rerolls one dead die a round (tested, rejected) |

Removed: `PIPS=1` (pip dice are now the default) and the old `SOLO=mixed` opt-in (now the default).

Nothing in `src/`, `data/` or `ui/` reads this folder.

## What both systems play

Both play the same cut-down shift.

**Shared with the real game:**

- The game's real mobs, bosses, keywords, damage and persistence row ranges (v29). The d20 system rolls the d20 row die; the standard-d6 system rolls 2d6 with the tiered mapping.
- The same crew-size scaling, kit economy and tray.
- Four agent types: Triage, Enrichment, Containment and Recovery.

**Left out:** situations, off-shift and Recon.

**The bot:** in both systems it scores every legal dice allocation with the same function: kills weighted by Damage, then progress, then damage taken, with lethal damage as a disaster.

**HP:** tuned per system so that two-player crews win about 50%. Analyst spreads are only comparable at equal odds.

**The d6 translation:**

| d20 rule | d6 version |
| --- | --- |
| Mob symbol row | Set by domain: Identity leads with Detect, Endpoint with Eradicate, Network with Contain, Cloud with Detect and Eradicate |
| Hunter: +3 against comebacks | Any face is wild against a comeback |
| Responder: +3 against the biggest hitter | Contain faces are wild against the biggest hitter |
| Enrichment run | Once a round, turn one die into any symbol |
| Enrichment burn | Every die is wild this round |
| Evasive ("natural 12+") | Only a double face hits it |
| Triage Agent's die | A plain six-face die: one each of D, C, E, D, C, E |

## Always-persist row, no one-off matches, rerolls (2026-10-30)

Asked for: the Hunter can't remove row mobs for good; the row retuned for the d6 game; no matching one higher or lower, so the test shows what the printed numbers and each class's doubles do on their own; and some way to reroll.

### The rules now

- **Every beaten mob goes back on the row, every time.** Before, a mob that had come back once was gone for good when beaten (for anyone), and the Hunter's "gone for good" line did nothing extra. Now nothing removes a mob, as in the real game minus the Hunter.
- **Row numbers three lower:** the d20 tiers map to 2–5 (top 12+), 2–4 (10–11), 2–3 (8–9), 2 (7 or less). Mailer Daemon and Password Sprayer 2–5 (28%), Living-off-the-Land Scavenger 2–4 (17%), the rest 2–3 (8%).
- **No one-higher-or-lower matches.** The Hunter and Responder perks are gone; their cards now just point at their doubles (low: 1, 2; middle: 3, 4). The Soarcerer's and Fixer's kit and heal perks stay.
- **Rerolls: once a round, each player may reroll one of their own dice** (solo: one die; the solo crew die and Triage burn dice count as yours), before it's used or turned by Enrichment. It can't be undone. Agent dice can't be rerolled. Web: **Reroll it** (X) under a selected die.
- **HP 24.**

### Sim (2026-10-30, `SYS=n6`, 300–400 games per row)

| Row tiers | HP for ~50% at 2p | Comebacks / game (2p) | Rounds (2p) |
| --- | --- | --- | --- |
| Old, once-then-gone (before) | 25 | 4.5 | 19.7 |
| Always persist, as printed (8/7/6/5) | — | 8.2 (1% wins at HP 25) | 13.8 |
| Always persist, 2 lower | 97 | 13.9 | 30.7 |
| **Always persist, 3 lower** | 32 (perk rerolls) / **24 (everyone rerolls)** | **6.1** | **17.7** |

| Rerolls (3 lower) | HP | 1p / 2p / 4p | Solo spread |
| --- | --- | --- | --- |
| None | 44 | 41 / 50 / 51% | 7 pts |
| Hunter (own) and Responder (any crew die) as perks | 32 | 38 / 50 / 56% | 25 pts (Responder 56%, Fixer 31%): rejected |
| **Everyone, one own die a round** | **24** | **42 / 50 / 47%** (3p 55%) | **11 pts** |

Rerolls are strong: they move HP 44 → 24 and fights 21.6 → 17.6 rounds. The bot rerolls about one die a round at two players. Skill gap at 2p 12 points (random placement 38%). **Open:** losses before the boss run 75–80% at 2p; the boss is the easy part of the d6 game, so the row is doing the killing. Worth a look at the table.

Sim knobs: `ROWSHIFT` (default 3), `PERSIST` (`always`, or `once`), `NEAR=1` (one-off matches back), `REROLL` (`all`, `perks`, `0`).

## Clustered dice and two-of-a-number doubles (2026-10-30)

Playtest feedback on exact numbers: the dice felt right, the doubles didn't. "If my role doubles on 2s, it should count as two 2s, not a 2 and whatever other number." And mobs should carry repeats, like 1 2 2 2 3, so a double matters.

### The rules now

- **A double counts as two dice showing its number.** A Hunter's double 2 takes two 2s: both under one mob, or one under each of two mobs. **Or** it guards. Never both, and a double that has taken one die can't guard. Hunter and Responder's one-off matches and the Enrichment burn work on each take.
- **Mob dice bunch round a main number** (`sim.js` `numbersFor`): main, main, the one below, the one above, main. Two dice 2 2, three 1 2 2, four 1 2 2 3, five 1 2 2 2 3. At the edges both neighbours are the inside number (main 1: 1 1 2 2 1).

  | Card | Main | Dice (1–3 players) | + per player past 3 |
  | --- | --- | --- | --- |
  | Mailer Daemon | 2 | 2 2 | 6 |
  | Password Sprayer | 4 | 4 4 | 6 |
  | OAuth Consent Grifter | 1 | 1 1 | 6 |
  | Living-off-the-Land Scavenger | 3 | 2 3 3 | 6 |
  | Exfil Courier | 5 | 4 5 5 | 6 |
  | Rootkit Implant | 6 | 5 5 6 6 | 6 |
  | The Lockjaw Syndicate | 3 | 2 2 3 3 3 3 3 4 | 6 |

  The mains spread the six mobs across the faces, so each analyst has mobs their doubles eat: Hunter the 1s and 2s, Responder the 3s and 4s, Engineer the 2s and 4s. The 5s (Exfil Courier) are nobody's double, so it's the slog.
- **One fewer threat die per mob** than its d20 hits; the boss two fewer than its two-player hits (8).
- **Bigger crews: a 6 per player past three.** Every card prints "+ ⚅ per player past 3". Solo to 3 players set the printed dice; 4 players add one 6 under every mob. Everyone's dice double on 6, so the big crew's extra die is the easiest one on the card.
- **HP 25.**

### Why each change (sim, 2026-10-30, `SYS=n6`, 300–400 games per row)

1. **Two-of-a-number alone is weaker** than "match plus any one more": at the old dice the tune-to-50% HP rose from 28 to 46 and a two-player game went from 19 to 30 rounds. The double now needs a second die with its number.
2. **Clustering on its own barely moved pace** (28.5 vs 27.9 mob rounds a game at equal HP); it moves who's good against what.
3. **One fewer die per mob** (boss two fewer) brought pace back: 19.4 rounds at two players, the same as before.
4. **"+1 per player past two" broke big crews** under the new doubles: 3 players 36%, 4 players 19%. Each extra player added a die to every mob in play while adding one die to the roll. Past three, with a 6: 3 players 52%, 4 players 39–46%.
5. **The repeats-first pattern** (main, main, below, above) beat main, below, above: with one fewer die the three-hit mobs print two dice, and "1 2" has no repeat for a double to eat.

### Results at 25 HP

| Crew | Win | Random placement | Skill gap | Rounds with a real dice choice | Rounds |
| --- | --- | --- | --- | --- | --- |
| 1 | 41% | 25% | 16 pts | 19% | 32.4 |
| 2 | 53% | 31% | 22 pts | 43% | 19.4 |
| 3 | 52% | | | | 16.1 |
| 4 | 39% | 26% | 12 pts | 43% | 15.6 |

Solo analysts 39–45% (spread 6). Pairs 42% (Hunter + Engineer) to 61% (Hunter + Fixer). The two-player skill gap is the biggest yet (22 points, was 15). **Open:** solo and 4 players sit 12–14 points under two players; a table test decides whether that needs a lever (solo's crew die, or 4 players' + die).

### Tested and rejected

- **Everyone rolls two dice** (on point three): the bot can't enumerate that many dice at four players, and a two-player game tuned to 20 HP.
- **The + die as the mob's main number**, past two: 4 players 19%. As a 6, past two: 4 players 21%.
- **Solo rolls four dice**: 60% solo with the fewest real choices (14%).

### Sim knobs

`MOBLESS` (dice fewer than the d20 hits, default 1), `BOSSLESS` (default 2), `XFROM` (players before the + die, default 3), `ENUM` (allocations the bot enumerates before it goes greedy, default 200000).

## Exact numbers (2026-10-30, history)

The user, after the symbol refactor: *"in a physical game we would actually place the dice under the card, especially when we scale up the dice needed to defeat a mob based on player count size (I don't want the '3 players add.. 4 players add...' printed on the card) it should be number, number, number + number to roll ... a bit more like how Escape the Dark Castle handles it, but I also want the numbers to be more direct as well, not 1-2 detect, 3-4 contain."*

So the symbols are gone. Every die is a plain pip d6 and reads as its number.

### The design

- **Mob and boss cards** print, along the bottom edge, the dice to set under the card as pip faces, then **"+ ⚂ per player past 2"**: one extra number. On the table the threat dice sit just below that strip. The numbers come from `sim.js` `numbersFor(id, base)`, printed low to high: base is the mob's printed hits, or the boss's `hitsBase + bossAdd[2]`; the extra number is `numbersFor(id + '+', 1)[0]`. Solo sets the two-player dice; 3 players add the extra die once, 4 players twice. The card keeps name, domain, "back on 2–N", Damage, keyword and flavour.

  | Card | Dice | + per player past 2 |
  | --- | --- | --- |
  | Mailer Daemon | 1 2 3 | 5 |
  | Password Sprayer | 2 4 5 | 3 |
  | OAuth Consent Grifter | 1 2 4 | 5 |
  | Living-off-the-Land Scavenger | 1 3 5 5 | 3 |
  | Exfil Courier | 1 3 3 4 | 2 |
  | Rootkit Implant | 1 2 3 5 5 | 4 |
  | The Lockjaw Syndicate (boss) | 1 1 2 2 3 3 4 4 6 6 | 3 |

- **Hitting:** a rolled die takes out one threat die showing **exactly** its number. Turn the taken die aside.
- **Doubles** (unchanged numbers): Hunter 1, 2, 6; Responder 3, 4, 6; Engineer 2, 4, 6; Soarcerer 1, 6; Fixer 3, 6. Every other die (the solo crew die, the Triage agent die) doubles only on a 6. A double **either** takes its exact match **and any one more die from the same mob**, **or** guards. Never both. Agent dice can't guard or hit the boss.
- **Perks:** Hunter: against a comeback, your dice also match one higher or one lower; comebacks you finish are gone for good. Responder: the same against the highest-Damage mob, boss included. Engineer: every even number is a double. Soarcerer and Fixer unchanged.
- **Rolling:** one die each, two on point. Solo: two own dice plus the crew die. Each running Triage Agent rolls an agent die.
- **Agents:** Triage run rolls an agent die; burn: on point rolls 3 more crew dice. Enrichment run: once a round, turn one crew die to any number; burn: every die matches anything this round. Containment run: the highest-Damage mob deals 2 less (min 1); burn: one die off every mob (the boss keeps at least one). Recovery unchanged.
- **Keywords:** Evasive: only a double can hit it. Regen: at the end of each round, put back one die it lost. Lockjaw: +2 Damage until it has lost two dice; agent dice can't hit it. Escalating, Piercing, Targeted and Beacon unchanged.
- **Row:** the 2d6 amber pair, unchanged tiers.
- **HP 30** each.

### Results

Bot sims, C posture, 500 games per case, 2026-10-30. `SYS=n6 N=500 HP=30 node sim.js` reproduces the exact-numbers column below; the coordinator's first run (before the Triage-burn fix, see the next section) is in brackets where it differs.

| Measure | d20 (today) | Symbol d6 (previous) | **Exact numbers** |
| --- | --- | --- | --- |
| Rounds with a real dice choice (1p / 2p / 4p) | 46 / 49 / 57% | 37 / 65 / 73% | **29 / 54 / 61%** (28 / 52 / 60) |
| Skill gap, smart minus random (1p / 2p / 4p) | 16–28 pts | 25 / 27 / 18 pts | **23 / 30 / 27 pts** (24 / 36 / 29) |
| Rounds per shift (1p / 2p / 4p) | 25 / 22 / 22 | 24 / 15 / 14 | **31 / 19 / 17** (32 / 20 / 18) |
| Win at the system's HP (1p / 2p / 4p) | | 51 / 53 / 26% | **49 / 55 / 47%** (47 / 55 / 49) |
| Solo win-rate spread across analysts | 14 pts | 14 pts | **4 pts** (6) |
| Analyst pairs, lowest to highest | 33–63% | 42–65% | **42–63%** (41–61) |
| Comebacks per shift (1p / 2p / 4p) | | 4.4 / 5.2 / 5.0 | **4.2 / 5.1 / 4.9** |

What it means, honestly:

1. **Slower than symbols.** 19 rounds a shift at 2 players against 15, about today's d20 pace. An exact number is a narrower target than a symbol that covers two faces.
2. **Fewer real choices than symbols, more than the d20 at 2–4 players** (54 vs 49% at 2p, 61 vs 57% at 4p).
3. **Skill matters more.** Smart play beats random by 23–30 points.
4. **The most even of the three.** Crew sizes now win within 8 points of each other at one HP: "+1 die per player past two" works where the old symbol tables left 4 players at 26%. Solo analysts spread 4–6 points.
5. **Solo is still the weak spot:** 29% choice, 31 rounds a shift.
6. **HP:** at 30 HP two players win 55%. The tune-to-50% search lands on 28 HP (51%). 30 is the decided value; drop it to 28 if the table finds it soft.

### Tested and rejected

- **Two dice per analyst** (`N6DICE=2`): faster, 13.6 rounds at 2 players, but four-player rounds blow past the bot's exhaustive search (it falls back to greedy placement), so its numbers can't be trusted, and it's more dice to read every round.
- **Solo with four dice** (`N6SOLO=4`): 43 rounds a shift and 18% choice.

### Components

Standard d6s in four colours. Nothing custom.

| Dice | Count | For |
| --- | --- | --- |
| Crew colour | 2 per player (8) | your roll; on point rolls two |
| Second colour | 3 | the solo crew die and Triage agent dice |
| Amber | 2 | the persistence row |
| Threat dice | about 16 | set under the mob cards |

Coins are only for HP now: the threat dice track hits.

**Why 16 threat dice.** The biggest card is the boss: 10 dice at 2 players, 12 at 4. The boss arrives with one last row roll, and a mob coming back with it adds 3–5 dice at 2 players. So 15 covers the boss plus the biggest comeback at 2 players, and 16 leaves one spare. A normal fight is a 3–5 die mob plus a comeback or two: 6–14 dice. At 4 players, or when several mobs come back at once, 20 covers it (boss 12 plus a 7-die Rootkit Implant would be 19).

### Rulings made in the refactor

- **Printed order.** The card prints its dice low to high, so they're quick to set out. Order has no rule meaning.
- **Enrichment's turn** keeps what the die was: a double stays a double, a single stays single (the sim's rule; otherwise every turn would be "turn it to a 6").
- **A double's "one more"** is optional: you may take just the match. (Superseded: a double now counts as two dice showing its number.)
- **Regen** puts back the die it lost most recently.
- **Containment's burn** takes a repeated number first (it leaves the most different numbers to match), else the highest.
- **The sim's Triage burn** rolled the old symbol faces in the n6 system, so those three dice could never hit. Fixed: they roll numbers with the on-point analyst's doubles. This moves the 2p tuned HP from 30 to 28 but changes little else (the brackets in the table).

### What changed in the files

- `sim.js`: `n6` is the default d6-family system (`SYS=d20,n6`); `SYS=d6` keeps the symbol system. New `HP` knob; `N6DICE` and `N6SOLO` documented. Triage burn fixed for n6.
- `cards.js`: no symbols, no key, no "players add". Mob and boss cards carry the bottom dice strip (`diceFor`, `slotsFor`); analyst cards show "Your doubles" as pip faces and the perk; the dice reference card shows the exact-match rule, doubles, the 6-only rule, "+1 die per player past 2" and the row.
- `paper/build.js`: the rules sheet rewritten for exact numbers; You need lists the four dice colours and the threat dice; HP 30. Still 4 pages, no overflow.
- `web/`: exact numbers throughout (see the web section).

## Standard d6 refactor (2026-10-30, history)

Superseded by [Exact numbers](#exact-numbers-2026-10-30). Kept as the record of the symbol system.

Custom symbol dice mean seven sticker sets or a custom die run. **"d6s will be easier to source, especially in a physical release."** So every die is now a normal pip d6.

### The design

- **One key for every die:** 1–2 Detect, 3–4 Contain, 5–6 Eradicate. It's printed on every mob card and on the dice reference card.
- **Doubles by analyst.** A double removes two of that symbol from one mob, **or** guards. Never both.

  | Analyst | Doubles | Perk (unchanged unless noted) |
  | --- | --- | --- |
  | Hunter | 1, 2, 6 | Any number is wild against comebacks; comebacks they finish are gone for good |
  | Responder | 3, 4, 6 | Contain numbers (3–4) are wild against the highest-Damage mob, boss included |
  | Engineer | 2, 4, 6 | New identity: every even number is a double |
  | Soarcerer | 1, 6 | Tray +1, +1 card per won fight |
  | Fixer | 3, 6 | Heals |

- **Every other die** (the solo crew die, the Triage agent die): only a 6 is a double. Agent dice still can't guard or hit the boss.
- **Rolling:** each analyst rolls one die, on point rolls two. Solo: two of your own dice plus the crew die. Each running Triage Agent rolls an agent die. Enrichment run turns one crew die to any symbol once a round (a double stays a double); the burn makes every die wild.
- **The row on 2d6.** Roll the amber pair. A row mob comes back if the sum is at most its number. The data's d20 ranges map by tier: d20 top 12+ → back on 2–8, 10–11 → 2–7, 8–9 → 2–6, 7 or less → 2–5. The two highest-Damage comebacks still hit on arrival, and the Beacon still rolls the row.
- **HP 23** each, tuned to about 50% at 2 players.
- **Components:** standard d6s in three colours. Crew dice in one colour (2 per player covers on point), 3 dice in a second colour for the crew and agent dice, and 2 amber dice for the row. Plus coins. No stickers, no d20.

### Results

Bot sims, C posture, 600 games per case, 2026-10-30. `SYS=d6 node sim.js` reproduces the standard-d6 column exactly.

| Measure | d20 (today) | Custom symbol dice, tuned | **Standard d6** |
| --- | --- | --- | --- |
| Rounds with a real dice choice (1p / 2p / 4p) | 46 / 49 / 57% | 55 / 66 / 72% | **37 / 65 / 73%** |
| Skill gap, smart minus random (1p / 2p / 4p) | 16–28 pts | 20–30 pts | **25 / 27 / 18 pts** |
| Rounds per shift (1p / 2p / 4p) | 25 / 22 / 22 | 19 / 15 / 14 | **24 / 15 / 14** |
| Solo win-rate spread across analysts | 14 pts | 8 pts | **14 pts** (HUN 47, RES 45, ENG 59, SOA 57, PAT 51) |
| Analyst pairs, lowest to highest | 33–63% | 39–55% | **42–65%** |
| Comebacks per shift (1p / 2p / 4p) | | | 4.4 / 5.2 / 5.0 |
| Starting HP for 50% at two players | 45 | 29 | **23** |

What it means:

1. **At 2 and 4 players it plays like the custom dice.** Choice, skill gap and pace are within a point or two.
2. **Solo is the weak spot.** Choice drops to 37% (55% with custom dice) and shifts take 24 rounds. Two own dice plus a crew die with a single double face often leaves nothing to decide.
3. **Analyst spread is back to the d20's 14 points.** Engineer and Soarcerer lead solo. The double sets are now the balance knob, and `DOUBLES_JSON` tunes them without touching code.
4. **The cost is components, not rules.** Nothing on the table needs a sticker.
5. **Crew-size scaling is still untuned.** At 23 HP, 1p wins 51%, 2p 53% and 4p only 26%, the same caveat as the custom dice.

### Tested and rejected

- **Solo rolls three of their own dice:** 30% choice, 22-point spread, 30 rounds a shift.
- **A solo once-a-round reroll** (`SOLO_REROLL=1`): choice went from 37% to 38%. It's an extra rule for no real gain.
- **The nearest-odds 2d6 row** (`ROWMAP=near`): it collapsed every mob to 2–6 or 2–7, so nuisances and heavy hitters came back equally often. The tiered mapping keeps four tiers with the same comeback counts.

### What changed in the files

- `sim.js`: pip d6s with per-analyst doubles are the default for `SYS=d6`, with the 2d6 tiered row. The custom dice sit behind `DICE=custom`.
- `cards.js`: the key, the doubles, `rowTop`, and pip faces drawn as real die faces. Mob and boss cards carry the key strip and "back on 2–N". Analyst cards show "Your doubles". The dice reference card shows the key, the 6-only rule, the double-or-guard rule and the row.
- `paper/build.js`: the sticker page is gone. The rules sheet covers the d6s, the key, doubles, the crew die, the 2d6 row and HP 23. The PDF is 4 pages.
- `web/`: pip dice with the symbol, per-analyst doubles, the amber pair with its sum checked against each row mob's number (a 2–12 track per row mob), and HP 23.

## Findings (custom symbol dice, history)

Bot sims on 2026-10-30. The d20 baseline is 600 games per case. The tuned d6 run is 400 games per case: solo uses the mixed die, and the Hunter and Responder dice each have a third double face.

| Measure | d20 (today) | d6, first pass | d6, tuned |
| --- | --- | --- | --- |
| Rounds with a real dice choice (1p / 2p / 4p) | 46 / 49 / 57% | 29 / 63 / 71% | **55 / 66 / 72%** |
| Skill gap: smart minus random placement (1p / 2p / 4p) | 28 / 22 / 16 pts | 20 / 24 / 19 pts | **29 / 30 / 20 pts** |
| Rounds per shift (1p / 2p / 4p) | 25 / 22 / 22 | 31 / 17 / 15 | **19 / 15 / 14** |
| Solo win-rate spread across analysts | 14 pts | 27 pts | **8 pts** |
| Analyst pairs, lowest to highest | 33–63% | 38–66% | **39–55%** |
| Starting HP for 50% at two players | 45 | 29 | 29 |

What the numbers say:

1. **More decisions.** Even against a single mob, you choose which face goes where, and whether a double hits twice or guards. Tuned d6 beats d20 on choice at every crew size, by 9–17 points.
2. **Skill matters at least as much.** Smart play beats random placement by 20–30 points with d6, against 16–28 with d20.
3. **Faster.** Tuned d6 shifts take 25–35% fewer rounds, and all the arithmetic is gone. That suits the booth promise of 10–15 minutes and the audit's single-digit-maths rule.
4. **More even analysts, but only once the dice are tuned.** The first-pass dice were badly uneven: the Hunter and Responder perks rarely fired. One extra double face each brought solo spread to 8 points and pairs to 39–55%. So the dice faces are the balance knob, and they're sensitive.
5. **Solo needs its own die rule.** Three copies of one skewed die often miss a single mob's symbols entirely: 29% choice, 31 rounds a shift. A balanced third die fixes it. That's a rule printed in the rules, so cards still match between web and print.

## Caveats

- **These are bot results.** Whether matching symbols feels better than adding numbers is a question only a table can answer.
- **Crew-size scaling isn't tuned for d6.** Four players win only 27%, and solo beats two players. The prototype reuses the d20 extra-hits tables. With d6 those tables become "add N symbols for each analyst," which is a separate tuning job.
- **The Engineer's identity blurs.** Three doubles was the Engineer's whole thing, and the tuned Hunter and Responder dice now have three too. A d6 Engineer needs a new hook, for example agent dice that can roll doubles.
- **Situations aren't modelled.** The challenge cards ("roll 10+") would need d6 versions.
- **Components.** It needs 5 custom analyst dice, a balanced crew die and an agent die, plus symbol rows on every mob card. Blank d6s with stickers will do for a prototype.

## Recommendation

Go to a paper prototype:

- **Dice:** sticker sheets for 5 analyst dice, 1 crew die and 1 agent die, using the tuned faces above.
- **Cards:** 6 mob cards and 1 boss with symbol rows.
- **Rules:** a one-page rules sheet.
- **Test:** run it with the cold-read script in `docs/PLAYTEST.md` against the same group playing today's d20 Quick Shift.

Convert the real game only if the table prefers it.

## Paper prototype

`node prototypes/chapter-dice/paper/build.js` writes `paper/chapter-dice-paper.pdf`: four Letter pages, printed at 100%. (Before the standard-d6 refactor it had a fifth page of dice stickers.)

1. **Rules:** a one-page rules sheet, written for 2 players (exact numbers since 2026-10-30).
2. **Cards (pages 2–4):** 21 cards, 2.5 × 3.5 in, printed single-sided with dashed cut lines:
   - 6 mobs: Mailer Daemon, Password Sprayer, OAuth Consent Grifter, Living-off-the-Land Scavenger, Exfil Courier and Rootkit Implant, which use 6 different keywords;
   - the Lockjaw Syndicate as the boss;
   - a dice reference card: exact matching, the double rule (two dice showing its number, or guard), the 6-only rule for other dice, the 4-player + die and the row;
   - 5 analysts, each with their doubles as pip faces and their perk;
   - 8 agents, two each of Triage, Enrichment, Containment and Recovery.

**Starting values:**

- **HP:** 30 (about 55% at two players in the sim).
- **Mob dice:** printed along each card's bottom edge, from `sim.js` `numbersFor`.
- **Comeback ranges:** the v29 d20 ranges, mapped by tier to 2d6 "back on 2–N".
- **Starting agents:** 2, or 1 solo.

**Physical extras:** standard d6s in four colours (crew, crew/agent, 2 amber, about 16 threat dice) and coins for HP.

**Test plan:** play it with 2 players using the cold-read script in `docs/PLAYTEST.md`. Then the same group plays today's Quick Shift, and you compare teach time, play time, W and R tags, and which one the table would play again.

## Web prototype

A playable web version of the paper prototype, for playtests without the physical bits.

```bash
node prototypes/chapter-dice/web/build.js              # writes web/index.html (one self-contained file)
open prototypes/chapter-dice/web/index.html            # double-click works too: file://, no server
node --test prototypes/chapter-dice/web/spec.js        # engine rules, jsdom click-through, card parity
```

Add `?seed=123` to the URL to replay a shift.

**Same cards as print.** `cards.js` holds the card markup and card CSS: mobs, the boss (with the bottom dice strip), analysts, agents, the dice reference, the pip faces and each analyst's doubles. `paper/build.js` and `web/build.js` both use it, so a card reads identically on the table and on paper. The web only adds live state around a card: the threat dice set just below it (taken ones turned aside, the crew's extra dice marked +), highlights on the dice the selected die can take, and "Came back" and "Beaten" stamps. Nothing is drawn on a card face; the parity test checks each card on the page against the shared function's output.

**Look and feel (2026-10-30 restyle).** The page wears the d20 game's Ink & Static look: its tokens, fonts, chamfered buttons and panels, and the paper card frames. The cards carry the game's scenes, added in `cards.js` so print and web match: a mob by its id, the boss by its print scene (`art-print.json` `boss_wyrm`), an analyst by class id, an agent by `kit_<type>`, in an art panel of fixed height per card type. `web/build.js` inlines only those scenes plus the hero, the boss's win room and the card back. The motion and sound follow `ui/ui.js`:

- crew pick with analyst portraits; the feed face down between fights, with who's on point as portrait cards;
- a shift clock from 22:00 by flip index (05:59 for the boss), a feed bar, crew HP readouts that flash on damage;
- a new mob flips in, a comeback lands a Back stamp, a beaten mob goes down with a Down stamp, a taken threat die bursts and turns aside;
- the flipped mob's flavour is read aloud line by line; a lone mob sits beside the round in plain words;
- dice tumble and land (doubles land with a glow), the amber row pair tumbles in its banner, the boss scans in with a reveal;
- short Web Audio stings (roll, hit, double, guard, down, comeback, boss, win, loss) behind a Sound toggle; no ambience bed;
- an end screen with the win room or the killer's scene, a Contained or Flatlined stamp, the crew's portraits and Copy result.

`prefers-reduced-motion` turns the motion off. Animations use transform, opacity and filter only.

**What it plays:** exactly the paper rules sheet.

- 1–4 players, each with their own analyst, all at 24 HP. Tuned for 2 players, and the setup screen says so.
- The six paper mobs are shuffled, with the Lockjaw Syndicate underneath. 4 players get the card's + die (a 6).
- The kit deck is the 8 agents. The crew starts with 2 (1 solo), and the tray holds 5 (6 with the Soarcerer). When a draw overfills the tray, you choose what to discard.
- **A flip:** pick who's on point, then flip. The row roll shows the amber pair, their sum and what came back; the side panel shows each row mob's number on a 2–12 track. The two highest-Damage comebacks hit everyone on arrival, and the Beacon chains.
- **A round:** roll the row (from round 2), then roll the dice. Each die shows its pips; doubles are ringed and labelled. Tap a die, then a glowing threat die under a mob showing the same number (dashed rings are the Hunter's or Responder's one-off matches; with the Enrichment burn every die glows). A double is labelled "Double ×2": it stays selected after its first take ("1 left") so you can tap a second die showing its number, under the same mob or another. Or press Guard instead, before it takes anything. You can also turn a die to any number with a running Enrichment Agent, undo the last move, and end the round.
- **The crew strip** shows each analyst's incoming damage live as you place dice.
- **Burns** can be used when the rules allow:
  - Triage and Enrichment after the roll;
  - Containment before or after the roll;
  - Recovery at any point outside a roll.
- **End screen:** rounds, comebacks, time, guards and lowest HP, plus a "Copy result" line for playtest notes.

**Keyboard:**

| Key | Does |
| --- | --- |
| F | Flip |
| R | Roll |
| 1–9 | Pick a die |
| G | Guard |
| J | A double takes just its match |
| U or Backspace | Undo |
| E | End round |
| L | Log |
| Esc | Back out of a double's second pick, deselect, or close |

**Files:**

- `web/engine.js`: the rules engine. DOM-free and seeded. Exports `newGame`, `setPoint`, `flip`, `roll`, `assign(G, die, mob, slot, oneMore)`, `guard`, `enrichTurn(G, die, number)`, `unassign`, `endRound`, `burn`, `discardKit`, `keepKit`, `targets`, `moreSlots` and `incoming`.
- `web/ui.js` and `web/ui.css`: the page.
- `web/build.js`: inlines the data, sim.js's `numbersFor`, `cards.js`, the engine, the page and the fonts.

**Rulings where the paper sheet is silent** (the sim's choice unless noted):

- Row comebacks in rounds 2+ also hit on arrival, for the two highest-Damage comebacks.
- Heals go one HP at a time onto whoever is lowest.
- Containment's burn takes a repeated number first, else the highest.
- A double counts as two dice showing its number, on one mob or two; its second take is optional.
- Regen puts back the die lost most recently.
- "Highest-Damage mob" for the Responder is judged at the start of the round, and a tie counts for every tied mob.
- Each running Enrichment Agent gives one turn a round. Here the sim allows only one turn in total.
