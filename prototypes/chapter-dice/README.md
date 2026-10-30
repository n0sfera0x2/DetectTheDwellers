# Prototype: chapter dice (d6 symbols) against the current d20

**Status:** the sim stage concluded on 2026-10-30. The paper prototype is built and ready to play.

## Hypothesis

An Escape the Dark Castle–style d6 symbol system makes more rounds a real decision than today's d20 system, without making skill matter less or the analysts less even. In the d20 system, a hit is d20 + bonus ≥ Defense.

In the d6 version:

- Each analyst rolls their own d6. Every face shows a response symbol: **Detect**, **Contain** or **Eradicate**.
- A mob's hits are a row of those symbols.
- A matching face removes one symbol from the row.
- A double face either removes two of that symbol or **guards** (blocks for you). You can't do both.

## How to run

```bash
node prototypes/chapter-dice/sim.js                    # both systems, 600 games per case
SYS=d6 SOLO=mixed N=400 node prototypes/chapter-dice/sim.js
DICE_JSON='{"HUN":[["D",2],…]}' node prototypes/chapter-dice/sim.js   # override analyst dice faces
```

- `SOLO=mixed`: a solo analyst's third die is the balanced crew die (D, C, E, D², C², E²) instead of another copy of their own die.

Nothing in `src/`, `data/` or `ui/` reads this folder.

## What both systems play

Both play the same cut-down shift.

**Shared with the real game:**

- The game's real mobs, bosses, keywords, damage and persistence row, using the d20 row die and the v29 ranges.
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

## Findings

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

`node prototypes/chapter-dice/paper/build.js` writes `paper/chapter-dice-paper.pdf`: five Letter pages, printed at 100%.

1. **Rules:** a one-page rules sheet, written for 2 players.
2. **Dice stickers:** 12 mm squares for blank 16 mm d6s. There's one row each for the 5 analyst dice, the crew die and the agent die, plus a spare set of analyst dice so on point can roll two dice.
3. **Cards (pages 3–5):** 21 cards, 2.5 × 3.5 in, printed single-sided with dashed cut lines:
   - 6 mobs: Mailer Daemon, Password Sprayer, OAuth Consent Grifter, Living-off-the-Land Scavenger, Exfil Courier and Rootkit Implant, which use 6 different keywords;
   - the Lockjaw Syndicate as the boss;
   - a dice reference card;
   - 5 analysts, each with their die faces and perk;
   - 8 agents, two each of Triage, Enrichment, Containment and Recovery.

**Starting values:**

- **HP:** 29, the sim's tuned value at two players.
- **Comeback ranges:** the v29 ranges.
- **Starting agents:** 2, or 1 solo.

**Physical extras:** the amber d20 and coins come from the main game.

**Test plan:** play it with 2 players using the cold-read script in `docs/PLAYTEST.md`. Then the same group plays today's Quick Shift, and you compare teach time, play time, W and R tags, and which one the table would play again.
