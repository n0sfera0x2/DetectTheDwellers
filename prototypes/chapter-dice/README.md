# Prototype: chapter dice (d6 symbols) against the current d20

**Status:** refactored to **standard pip d6s** on 2026-10-30 (see [Standard d6 refactor](#standard-d6-refactor-2026-10-30)). The sim, the paper prototype and the web version all play the standard-d6 rules at 23 HP. The custom symbol dice stay reachable in the sim with `DICE=custom`. Next step: a table playtest against today's Quick Shift.

## Hypothesis

An Escape the Dark Castle–style d6 symbol system makes more rounds a real decision than today's d20 system, without making skill matter less or the analysts less even. In the d20 system, a hit is d20 + bonus ≥ Defense.

In the d6 version:

- Each analyst rolls their own d6. Every face shows a response symbol: **Detect**, **Contain** or **Eradicate**.
- A mob's hits are a row of those symbols.
- A matching face removes one symbol from the row.
- A double face either removes two of that symbol or **guards** (blocks for you). You can't do both.

## How to run

```bash
node prototypes/chapter-dice/sim.js                    # d20 baseline and standard d6, 600 games per case
SYS=d6 node prototypes/chapter-dice/sim.js             # standard d6 only (~40 s)
SYS=d6 DICE=custom node prototypes/chapter-dice/sim.js # the earlier custom symbol dice, d20 row (the "tuned" column)
```

Env knobs:

| Knob | Does |
| --- | --- |
| `SYS` | `d20`, `d6` or both (default `d20,d6`) |
| `N` | games per case (default 600) |
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

## Standard d6 refactor (2026-10-30)

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

1. **Rules:** a one-page rules sheet, written for 2 players.
2. **Cards (pages 2–4):** 21 cards, 2.5 × 3.5 in, printed single-sided with dashed cut lines:
   - 6 mobs: Mailer Daemon, Password Sprayer, OAuth Consent Grifter, Living-off-the-Land Scavenger, Exfil Courier and Rootkit Implant, which use 6 different keywords;
   - the Lockjaw Syndicate as the boss;
   - a dice reference card: the key, the 6-only rule for other dice, the double-or-guard rule and the row;
   - 5 analysts, each with their doubles and perk;
   - 8 agents, two each of Triage, Enrichment, Containment and Recovery.

**Starting values:**

- **HP:** 23, the sim's tuned value at two players.
- **Comeback ranges:** the v29 d20 ranges, mapped by tier to 2d6 "back on 2–N".
- **Starting agents:** 2, or 1 solo.

**Physical extras:** standard d6s in three colours (crew, crew/agent, 2 amber) and coins.

**Test plan:** play it with 2 players using the cold-read script in `docs/PLAYTEST.md`. Then the same group plays today's Quick Shift, and you compare teach time, play time, W and R tags, and which one the table would play again.

## Web prototype

A playable web version of the paper prototype, for playtests without the physical bits.

```bash
node prototypes/chapter-dice/web/build.js              # writes web/index.html (one self-contained file)
open prototypes/chapter-dice/web/index.html            # double-click works too: file://, no server
node --test prototypes/chapter-dice/web/spec.js        # engine rules, jsdom click-through, card parity
```

Add `?seed=123` to the URL to replay a shift.

**Same cards as print.** `cards.js` holds the card markup and card CSS: mobs, the boss, analysts, agents, the dice reference, the icons, the pip faces, the d6 key and each analyst's doubles. `paper/build.js` and `web/build.js` both use it, so a card reads identically on the table and on paper. The web only adds live state around a card: coins over removed symbols, a ring on the extra symbols for 3–4 players, a glow on the symbols the selected die can take, and "Came back" and "Beaten" stamps. The parity test strips that state and checks each card on the page against the shared function's output.

**What it plays:** exactly the paper rules sheet.

- 1–4 players, each with their own analyst, all at 23 HP. Only 2 players is tuned, and the setup screen says so.
- The six paper mobs are shuffled, with the Lockjaw Syndicate underneath. 3 and 4 players get the extra symbols printed on the cards.
- The kit deck is the 8 agents. The crew starts with 2 (1 solo), and the tray holds 5 (6 with the Soarcerer). When a draw overfills the tray, you choose what to discard.
- **A flip:** pick who's on point, then flip. The row roll shows the amber pair, their sum and what came back; the side panel shows each row mob's number on a 2–12 track. The two highest-Damage comebacks hit everyone on arrival, and the Beacon chains.
- **A round:** roll the row (from round 2), then roll the dice. Each die shows its pips and its symbol (twice for a double). Tap a die, then tap a glowing symbol on a mob, or use the target buttons. A double takes two or guards. You can also turn a die with a running Enrichment Agent, undo the last move, and end the round.
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
| U or Backspace | Undo |
| E | End round |
| L | Log |
| Esc | Deselect or close |

**Files:**

- `web/engine.js`: the rules engine. DOM-free and seeded. Exports `newGame`, `setPoint`, `flip`, `roll`, `assign`, `guard`, `enrichTurn`, `unassign`, `endRound`, `burn`, `discardKit`, `keepKit`, `targets` and `incoming`.
- `web/ui.js` and `web/ui.css`: the page.
- `web/build.js`: inlines the data, sim.js's `symbolsFor`, `cards.js`, the engine, the page and the fonts.

**Rulings where the paper sheet is silent** (the sim's choice unless noted):

- Row comebacks in rounds 2+ also hit on arrival, for the two highest-Damage comebacks.
- Heals go one HP at a time onto whoever is lowest.
- Containment's burn takes the last symbol still showing on each mob.
- A wild double takes the symbol you tapped, then another one, preferring the same symbol.
- "Highest-Damage mob" for the Responder is judged at the start of the round, and a tie counts for every tied mob.
- Each running Enrichment Agent gives one turn a round. Here the sim allows only one turn in total.
