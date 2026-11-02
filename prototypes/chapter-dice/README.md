# Detect the Dwellers: chapter dice (d6)

**Status:** this is the game. Chapter dice replaced the d20 system as the design direction on 2026-10-31. The d20 build (`src/`, `data/`, `ui/`, `deck/`, `sim/`) is legacy: it still builds and tests, but new design work happens here. The rules below are current as of [review 2](#review-2-eight-traits-six-analysts-real-choices-2026-11-02) (2026-11-02): eight agent traits, six analysts, choices on situations, on top of the full pool (one situation deck, Quick and Full Shift, three bosses). The sim (`SYS=n6`), the paper prototype and the web version all play them.

This folder is still prototype code. Under the repo's prototype rules it gets rewritten to production standards before it replaces the d20 build; it isn't extended into production in place. **Next step:** a table playtest (`docs/PLAYTEST.md`).

## The rules now

1–4 players, each an analyst. Survive the feed and beat the boss. Anyone at 0 HP and the shift is lost.

**Setup.** Three decks, as in production: the **situation deck** (15 alarms and 18 situations, 9 of them story cards), the **item deck** (16 items) and the **bosses** (3).

| Mode | Feed | HP | Solo starts with | Boss |
| --- | --- | --- | --- | --- |
| **Quick Shift** | deal 8 from the 24 core cards (alarms and core situations) | 9 | 1 item | its core ability only |
| **Full Shift** | deal 11 core cards and 3 story cards, shuffled together (14) | 10 | 2 items | its core ability and its **Full Shift** row trigger |

One boss, drawn at random, goes face down under the feed. A crew draws 2 items. The number of alarms in a feed varies: about 4.3 in Quick, 6 in Full.

**A flip.** Pick who's on point; they stay on point through any situations until the next fight ends. Flip the top card of the feed. A situation: play it, then flip again. An alarm: set its threat dice just below the card, turned to the numbers printed on its bottom edge (3 or 4 players add the card's + die, a 6, per player past 2). On point may **baseline** it. If anything is on the row, roll the row. Two or more alarms in play is a multi-alarm fight. When the feed is empty, the boss arrives with one last row roll and no arrival hits.

**A fight round.**

1. **Row.** From the second round on, roll the row first.
2. **Roll.** Everyone rolls one crew die; on point rolls two. Solo rolls two of their own plus the crew die. Each Triage Agent's holder rolls one more of their own dice. Once a round, each player may reroll one of their own dice.
3. **Match.** A die takes out one threat die showing exactly its number.
4. **Hits back.** Every alarm with dice left hits everyone who isn't blocking, for its Damage. An alarm with no dice left is beaten.

**Doubles.** Each analyst has two double numbers: their own plus the 6. The solo crew die doubles only on a 6. **Pairs:** two of your own dice showing the same number make a double. A double counts as two dice showing its number (under one alarm or two), **or** it guards: you or any crewmate blocks this round. Never both.

**The row.** Beaten alarms always go back on the row, unless they were baselined. Roll the two amber dice: a row alarm comes back if the sum is at most its number. Comebacks return with their printed dice, and the two with the highest Damage hit everyone on arrival. A coin marks an alarm the first time it comes back.

**Baseline it.** A newly flipped alarm with a tuck band, or a comeback with one (one more die), can be baselined; never the boss. Set the band's 3 dice too, all showing its main number's opposite side. Beat it with all of them and slide it under an agent someone holds, so only its blue **tuck band** shows below the agent card. That agent gains the band's **trait**; most traits work for the agent's **holder**, so which agent (and whose) matters. An agent holds **two** at most, and with two it is **upgraded** (its card says how: Triage rolls one more, Enrichment one more turn, Containment cuts 1 more, Recovery heals 2 more). Once every agent is full, a baselined alarm goes on the row with no trait. Tucked, the alarm is **off the row** (a card can't be in two places). Discard that agent and the alarm goes back on the row. No agents: set it aside until the next one is drawn.

**After a fight.** Draw 2 items (solo 1) and decide who takes each.

- **Agents** are passive and work for the whole crew. Each player holds 2 (the Soarcerer 3; solo 4, a solo Soarcerer 5). Full? Discard one to take another.
- **Consumables** don't take a slot. Keep them in hand and use each once.

### Alarms (15)

Every alarm's dice come from `sim.js` `numbersFor`: a main number, repeated, with its neighbours. Eight alarms carry a tuck band, one trait each: the agent learns the alarm's own trick, turned around. Fileless is a d6 rule: there are no agent dice to stop, so Containment skips it (it cuts the highest-Damage alarm that isn't Fileless).

| Card | Dice (1–2p) | Damage | Keyword | Back on | Tuck band (Baseline: 3 dice) |
| --- | --- | --- | --- | --- | --- |
| Mailer Daemon | 2 | 1 | Beacon: roll the row when it arrives or comes back | 2–5 | — |
| Macro Gremlin | 5 | 1 | Targeted: only on point takes its damage, doubled | 2–5 | — |
| Password Sprayer | 4 | 1 | Piercing: blocks don’t stop it | 2–5 | — |
| MFA Banshee | 1 | 1 | Stalker: it only hits whoever has the lowest HP | 2–5 | — |
| Vibe Coded App | 6 | 1 | Escalating: +1 Damage every round it stays up | 2–5 | — |
| PowerShell Wraith | 2 2 | 3 | Fileless: containment Agents don’t cut its Damage | 2–4 | 3 × 5 · **Twin:** its agent counts as two of itself |
| Living-off-the-Land Scavenger | 3 3 | 3 | Evasive: only a double can hit it. A double of another number takes out one die | 2–4 | 3 × 4 · **Slip:** once a fight, one alarm’s hit misses its holder |
| DNS Beacon Drone | 4 4 | 3 | Beacon: roll the row when it arrives or comes back | 2–4 | 3 × 3 · **Callback:** when you roll the row, you may reroll one amber die |
| OAuth Consent Grifter | 1 | 3 | Targeted: only on point takes its damage, doubled | 2–3 | 3 × 6 · **Spotlight:** once a round, one of its holder’s dice counts as a double |
| Rootkit Implant | 5 6 6 | 4 | Regen: at the end of each round, put back one die it lost | 2–3 | 3 × 1 · **Persist:** once, anyone about to drop to 0 HP stays at 1. Then remove this card |
| Kerberoast Enforcer | 2 3 3 | 4 | Piercing: blocks don’t stop it | 2–3 | — |
| LSASS Siphon | 1 1 | 4 | Regen: at the end of each round, put back one die it lost | 2–3 | 3 × 6 · **Siphon:** each alarm the crew beats heals its holder 1 |
| PsExec Swarm | 3 4 4 | 4 | Beacon: roll the row when it arrives or comes back | 2–3 | — |
| Golden Ticket Ghost | 4 5 5 | 4 | Evasive: only a double can hit it. A double of another number takes out one die | 2–2 | 3 × 2 · **Golden ticket:** once a fight, turn one of its holder’s dice to any number |
| Exfil Courier | 5 5 | 4 | Escalating: +1 Damage every round it stays up | 2–3 | 3 × 2 · **Momentum:** from round 2 of a fight, its holder rolls one more die |

### Bosses (3, one drawn at random)

The Full Shift trigger rolls the row at round end (the Operator's when it comes back; the AI's when a consumable is used); comebacks hit on arrival and join the fight. Quick Shift plays only the core ability.

| Boss | Dice (1–3p) | Damage | Ability | Full Shift: roll the row |
| --- | --- | --- | --- | --- |
| The Lockjaw Syndicate | 2 2 3 3 3 3 3 4 | 9 | **Double extortion.** +2 Damage until it has lost two dice. | Down to 6, 4 and 2 dice: roll the row. |
| The Persistent Operator | 1 1 2 2 2 2 2 3 | 9 | **Living off your network.** The first time you beat it, it comes back with 2 dice. | When it comes back, and down to 4 dice: roll the row. |
| The Rogue AI | 4 5 5 5 5 5 6 | 9 | **Hostile takeover.** Agents and their traits do nothing while it’s in play. | Each consumable you use: roll the row (not Change Freeze). |

### Analysts (6)

Forensics and the Shift Lead are new in review 2 (portraits borrowed until they get their own: the magnifier scene and the retired PAT analyst's). Several abilities work while the analyst is in the crew.

| Analyst | Doubles | Ability |
| --- | --- | --- |
| Hunter | 4, 6 | Your 1s match any number on a comeback. Once a fight, a comeback the crew beats leaves the game. |
| Responder | 3, 6 | Once a fight, after you roll, pick an alarm: it deals no damage this round. Arrivals deal your crewmates 1 less. |
| Engineer | 1, 6 | Once a round, turn one of your dice to its opposite side (1↔6, 2↔5, 3↔4). It counts as one die. |
| Soarcerer | 2, 6 | Baselining costs 2 dice, not 3. Each tuck draws an item. Once a fight, move a tucked alarm to another agent. |
| Forensics | 5, 6 | Before each flip, look at the top card. An alarm sets one fewer threat die; anything else you may put on the bottom. |
| Shift Lead | 2, 6 | Once a round, give one of your dice to a crewmate: it uses their doubles. Solo: one more reroll a round. |

### Items (16)

| Item | Kind | Copies | Does |
| --- | --- | --- | --- |
| Triage Agent | Agent | 2 | Every round, roll one more of your own dice. |
| Containment Agent | Agent | 2 | The highest-Damage alarm deals 2 less to everyone, never below 1. |
| Enrichment Agent | Agent | 1 | Once a round, turn any crew die to any number. |
| Recovery Agent | Agent | 1 | After every won fight, heal 4 HP split across the crew. |
| Surge Playbook | Consumable | 2 | After the roll: roll 3 more dice. |
| Threat Intel Feed | Consumable | 2 | After the roll: every die matches anything this round. |
| Isolation Script | Consumable | 2 | Remove one die from every alarm (the boss keeps at least one). |
| Shift Coffee | Consumable | 2 | Heal 6 HP split across the crew. |
| Change Freeze | Consumable | 2 | Skip the next row roll. |

### Situations (18) and conditions

The production deck's 18 situations with rules rewritten for the dice. Core cards play in both modes; story cards only in Full Shift (production's Recon lines aren't used). Ties (Threat Intel Drop, Old Case) are the crew's pick.

| Situation | Deck | Kind | Rule |
| --- | --- | --- | --- |
| Impossible Travel | Core | Grab | **Chase it:** On point rolls 2 dice. Total 7 or more: draw an item. Less: lose 2 HP. **Let it go:** Nothing happens. |
| Coffee Run | Core | Choice | **Pass it round:** Everyone heals 2 HP. **Double shot:** Whoever has the lowest HP heals 5. |
| Marketing Blast | Core | Choice | **Everyone triages:** Everyone loses 1 HP. **Take it alone:** On point loses 3 HP and draws an item. |
| Patch Tuesday | Core | Choice | **Take a breather:** Everyone heals 3 HP. **Raid the supply closet:** Draw an item. On point loses 1 HP. |
| CISO Wants a Briefing | Core | Challenge | On point rolls 2 dice. Total under 6: lose 3 HP. |
| Threat Intel Drop | Core | Event | The alarm on the row with the highest Damage leaves the game. |
| Pentest Day | Core | Choice | **Run it:** Everyone rolls a die. A 1 or 2: you lose 2 HP. **Reschedule:** Discard an item. |
| Pager Storm | Core | Stay or run | **Ride it out:** Everyone loses 2 HP. Draw an item. **Mute it:** The next alarm sets one more threat die: a 6. |
| Budget Approved | Core | Choice | **Tools:** Draw 2 items. **Training:** Draw an item. Everyone heals 2 HP. |
| The Badge That Wasn't | Story (Full) | Stay or run | **Hold the room:** On point takes Exposed. Win the next fight: draw an item. **Fall back:** Draw 2 items. The next alarm that flips goes straight on the row, unfought. Not the boss. |
| Lateral Whispers | Story (Full) | Event | Roll the row now. Anything that comes back hits on arrival and joins the next fight. |
| The CEO's Inbox | Story (Full) | Choice | **Quarantine everything:** Everyone loses 2 HP. **Let it ride:** The next alarm you flip gets +2 Damage this fight. |
| Ghost in the Change Window | Story (Full) | Event | The next alarm you flip sets one more threat die: a copy of the first die on its card. |
| Dark Web Chatter | Story (Full) | Grab | **Dig in:** On point picks 1–4 dice and rolls them. Any 6: draw 2 items. None: lose 1 HP per die. **Let it go:** Nothing happens. |
| The Janitor's USB | Story (Full) | Grab | **Grab it:** On point rolls 3 dice. Any pair: draw 2 items and take Focused. No pair: take Rattled. **Leave it:** Draw an item. |
| Old Case, New IOC | Story (Full) | Event | The row alarm that comes back on the highest number comes back now, with no arrival hit. It joins the next fight. |
| Honeytoken Tripped | Story (Full) | Event | Everyone heals 2 HP. |
| Vendor Breach Notice | Story (Full) | Stay or run | **Rotate everything:** Everyone loses 2 HP, then roll the row. Comebacks join the next fight. **Cut them off:** On point loses 3 HP. No row roll. |

Conditions are cards kept in front of a player, one of each at most. **Rattled:** your next roll has no doubles. **Exposed:** next fight, each round anything hits you, take 1 more. **Focused:** once, after you roll, turn one of your dice to any number.

**The shift tracker.** A reference card with coin boxes for everything the table would otherwise have to remember: each player's reroll, the Engineer's turn and the Enrichment turns (this round); the Responder's stand and Hold the room's bonus draw (this fight); a pending Change Freeze, Pager Storm's Mute die and a Badge fall-back (waiting). It also says how to track Escalating and Regen. The web version tracks all of this itself.

### Components

63 cards: 15 alarms, 3 bosses, 1 dice reference, 1 shift tracker, 6 analysts, 16 items, 18 situations, 3 conditions. Standard d6s in four colours, nothing custom: crew dice (3 per player: on point rolls two, a Triage Agent adds one), 1 in a second colour for the solo crew die, 2 amber for the row, and about 16 threat dice. Coins for HP, to mark alarms that came back, and for the shift tracker.

## Where it stands

Bot sims, `SYS=n6 N=600`, 2026-11-02 (review 2). Every game deals its own feed and draws its own boss; crews are every combination of the six analysts.

| Mode, crew | Win | Skill gap (smart − random) | Rounds with a real dice choice | Rounds | Comebacks | Losses before the boss |
| --- | --- | --- | --- | --- | --- | --- |
| Quick, 1p | 53% | 20 pts | 38% | 14.7 | 3.4 | 56% |
| Quick, 2p | 56% | 14 pts | 42% | 10.6 | 2.3 | 42% |
| Quick, 4p | 56% | 27 pts | 50% | 9.9 | 1.7 | 33% |
| Full, 1p | 57% | 22 pts | 37% | 16.9 | 5.3 | 50% |
| Full, 2p | 61% | 17 pts | 39% | 12.6 | 3.8 | 44% |
| Full, 4p | 63% | 29 pts | 41% | 12.5 | 3.0 | 48% |

Solo by analyst: Quick Hunter 47%, Responder 55%, Engineer 52%, Soarcerer 52%, Forensics 49%, Shift Lead 55%; Full 59 / 56 / 54 / 58 / 50 / 54%. Pairs: Quick 49% (Hunter + Engineer) to 64% (Responder + Soarcerer); Full 53% (Engineer + Shift Lead) to 72% (Responder + Soarcerer).

### Targets

What the sim should hold after any rule change, and what to turn when it misses. Every target is a starting value (posture B): set on 2026-11-01 from the current numbers and the d20 game's targets, and checked against bot sims only. Move them when a table disagrees. Each mode is checked on its own. Now: Quick / Full, 1p / 2p / 4p, 600 games.

| Measure | Target | Quick | Full | If it misses |
| --- | --- | --- | --- | --- |
| Win rate, every crew size | 50–60% | 53 / 56 / 56% | 57 / 61 / 63% (2p, 4p a little over) | the mode's HP, one point at a time (Full at HP 9: 46% solo) |
| Spread across crew sizes | 10 points or less | 3 | 6 | solo: starting items; 3–4p: the + die (now per player past 2) |
| Solo spread across analysts | 10 points or less | 8 | 9 | the analyst's ability, not their doubles |
| Pairs, lowest to highest | within 15 points | 49–64% (15) | 53–72% (19, misses) | the strongest pair's abilities (Responder + Soarcerer) |
| Skill gap (smart − random) | 20 points or more | 20 / 14 / 27 (2p misses) | 22 / 17 / 29 (2p misses) | more decisions per roll |
| Rounds with a real dice choice | 40% or more | 38 / 42 / 50% (solo misses) | 37 / 39 / 41% (solo, 2p miss) | solo: more of your own dice to place |
| Losses before the boss | 60% or less | 56 / 42 / 33% | 50 / 44 / 48% | the boss's dice and Damage; HP |
| Comebacks per shift | 3–6 | 3.4 / 2.3 / 1.7 (crews miss) | 5.3 / 3.8 / 3.0 | the row numbers; the feed size |
| Baselining worth doing | always beats never | +26 / +2 / +20 | +32 / +13 / +35 | the Baseline dice and the traits |
| Every situation choice is real | forced options within 4 points | within 3 (review 2 run, before the analyst tuning) | within 3 | the losing option's payoff |
| The boss is a climax (Full) | beating it once there: 75% or less | — | not rerun this pass | its row marks (`BOSSSTEPS`) |

**Open:**

- **Responder + Soarcerer is the strongest pair** (64% Quick, 72% Full): crewmates' arrivals soften and every tuck draws an item. Full Shift 2p and 4p sit 1–3 points over the band.
- **Quick Shift crews still see few comebacks** (2.3 / 1.7): crews beat alarms in fewer rounds, and the Hunter and Forensics now trim the row and the feed.
- **Skill gap at 2p** is 14 (Quick) and 17 (Full). Spotlight, Slip, Golden ticket and Forensics' bury are player decisions the bot plays simply, so the sim likely undervalues them.
- **The new portraits are placeholders** (Forensics: the magnifier scene; the Shift Lead: the retired PAT analyst's portrait).
- Paper tuck: up to two tucked alarms per agent, band under band. Untested at a table.
- No human has played these rules yet. Teach time, play time and whether matching feels better than adding all need a table.

## Hypothesis

Matching exact numbers on d6s makes more rounds a real decision than the d20's add-and-compare (d20 + bonus ≥ Defense), without making skill matter less or the analysts less even. Standard d6s are also easier to source for a physical release than d20s or custom dice.

Against the d20 baseline (600 games per case, 2026-10-30): the d20 had a real dice choice in 46 / 49 / 57% of rounds at 1p / 2p / 4p and a skill gap of 16–28 points. Chapter dice today: 38 / 42 / 52% and 18–26 points. Analysts are more even than in the d20. Choice and skill are now level with the d20 or a little under, since the crew-wide agents pass made items stronger. The choice half of the hypothesis isn't proven yet.

## How to run

```bash
SYS=n6 HP=9 node prototypes/chapter-dice/sim.js                # Quick Shift (the default MODE) at its HP, 600 games per case (a few minutes)
MODE=full SYS=n6 HP=10 node prototypes/chapter-dice/sim.js      # Full Shift at its HP
SYS=n6 node prototypes/chapter-dice/sim.js             # the current rules, HP tuned to ~50% at 2p
node prototypes/chapter-dice/sim.js                    # the legacy d20 baseline and chapter dice side by side
SYS=d6 node prototypes/chapter-dice/sim.js             # the earlier symbol d6 system (1–2 Detect, 3–4 Contain, 5–6 Eradicate)
node prototypes/chapter-dice/web/build.js              # web/index.html, one self-contained file
node prototypes/chapter-dice/paper/build.js            # paper/chapter-dice-paper.pdf
node --test prototypes/chapter-dice/web/spec.js        # engine rules, jsdom click-through, card parity
npm run serve                                          # build and serve the web version on localhost:8080
```

The main env knobs are below. Each history section lists the knobs its pass added.

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
| `MODE` | `quick` (default): deal 8 core cards. `full`: 3 story + 11 core. `classic`: the six printed alarms and six situations of the passes before the full pool |
| `DEALQ`, `DEALF`, `STORYF` | the deal sizes (8, 14, 3) |
| `FEED` | `mixed` (default, 2026-11-02): situations shuffled into the feed. `split` (classic only): a situation before every flip after the first |
| `TRAITS=0` | the 2026-11-01 crew-wide Baseline lines instead of agent traits |
| `TRAITSET=agent` | the rejected agent-only traits (Twin, Stealth, Relay, Repair) |
| `BADGEHP` | on point's HP at or below which the bot falls back from The Badge That Wasn't (default 5) |
| `SITV` | `2` (default): the review's situation options. `1`: the earlier ones |
| `BADGEDRAW`, `USBLEAVE`, `PATCHHEAL`, `PATCHCOST` | the situation payoffs: Fall back's draw (2), Leave it (`item`), the breather's heal (3), the raid's HP cost (1) |
| `BOSSROW` | `steps` (default): the boss pulls the row at `BOSSSTEPS` (6,4,2) dice left. `round`: every round it lost a die. `none` |
| `TUCKOUT=0` | a baselined alarm also stays on the row (the rules before the tuck) |
| `SOLORES=1` | solo, the stood-down alarm also loses a die (tested, +1 pt, not adopted) |

Nothing in `src/`, `data/` or `ui/` reads this folder. This folder reads the alarm names, flavour, Damage, keywords and comeback ranges from `data/cards.json`, and the art from `data/art.json` and `data/art-print.json`.

## Paper prototype

`node prototypes/chapter-dice/paper/build.js` writes `paper/chapter-dice-paper.pdf` (and the HTML it prints from). Letter pages, printed at 100%:

1. **Rules:** the one-page rules sheet, both modes.
2. **Cards:** the 61 cards above, 2.5 × 3.5 in, printed single-sided with dashed cut lines.

**Test plan:** play it with 2 players using the cold-read script in `docs/PLAYTEST.md`. Record teach time, play time, W and R tags, every rule played wrong, and whether the table would play again. A side-by-side against the legacy d20 Quick Shift is optional now that d6 is the direction.

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

**What it plays:** exactly the paper rules sheet ([The rules now](#the-rules-now)).

- 1–4 players, each with their own analyst (Hunter, Responder, Engineer, Soarcerer), all at 10 HP.
- Pick **Quick** or **Full Shift** on the setup screen. The page deals the feed from the whole situation deck and draws one of three bosses. The shift bar counts feed cards; the page never says what the top one is. 4 players get the card's + die (a 6).
- **Items:** the deck is the 16 items. The crew starts with 2 (solo 2) and draws 2 after each won fight (solo 1). A **deal** step shows each drawn card with a **Give to …** button per player; an agent for a full player asks which of their agents to discard, or **Keep it out**. Solo deals itself. The mat shows one group per player: their agent cards (a Triage Agent's extra die sits under its card), empty slots, and their consumables with a **Use** button that lights only when its timing allows (Surge Playbook and Threat Intel Feed after the roll; Isolation Script before or after; Shift Coffee outside an open roll; Change Freeze before a row roll).
- **A flip:** pick who's on point, then **Flip the top card**. The row roll shows the amber pair, their sum and what came back; the side panel shows each row mob's number on a 2–12 track. The two highest-Damage comebacks hit everyone on arrival, and the Beacon chains.
- **A round:** roll the row (from round 2), then roll the dice. Each die shows its pips; doubles are ringed and labelled. Tap a die, then a glowing threat die under a mob showing the same number (a Hunter's 1 glows on every die under every alarm except an Evasive one; with a Threat Intel Feed every die glows). A double is labelled "Double ×2": it stays selected after its first take ("1 left") so you can tap a second die showing its number, under the same mob or another. Or press Guard instead, before it takes anything, and pick who it covers. Two of your own unused dice on one number show a **Pair** button (P) that makes them one double; pairing is optional. You can also turn a die to any number with a running Enrichment Agent, undo the last move, and end the round.
- **Situations:** a situation flipped from the feed sits on the mat with one button per option (keys 1–9). The Badge That Wasn’t's Fall back is greyed out with the reason when no alarm is left in the feed. Dark Web Chatter has a 1–4 dice picker. The result (dice, Won or Lost, what happened) shows before "Flip the next card". On point locks once a situation is resolved, until the next fight ends.
- **Conditions** sit as small cards beside their holder in the crew strip. With a die selected: **Focused: turn to…** (any number), for the Engineer **Opposite side** (key O). The Responder gets a **Stand it down** button under each mob once a fight; the mob then shows "Stood down" and deals nothing at round end. A Rattled die keeps no doubles for that whole round, even if it is rerolled or turned.
- **Baselining:** before the first roll, the alarm just flipped has a **Baseline it** button (key B). Its extra dice are set under it, marked +, with a Baselining stamp. Beat it and the mat asks which agent it tucks under (**Tuck it here**); the alarm card then sits under that agent with only its tuck band showing, as at the table (hover it to read the whole card), and a Twin Triage Agent's spot says it rolls 2 dice. The end screen counts what each trait did. The fight header says **multi-alarm** when two or more are up.
- **The crew strip** shows each analyst's incoming damage live as you place dice, Exposed included.
- **End screen:** rounds, comebacks, time, guards and lowest HP; **What your items did**, one line per item type that did something (dice the Triage and Surge dice took or guarded with, damage Containment stopped, HP healed, turned dice put to work, wild takes, threat dice removed, row rolls skipped); and a "Copy result" line for playtest notes.

**Keyboard:**

| Key | Does |
| --- | --- |
| F | Flip |
| R | Roll |
| 1–9 | Pick a die |
| G | Guard |
| P | Pair two of your own dice |
| J | A double takes just its match |
| U or Backspace | Undo |
| E | End round |
| L | Log |
| Esc | Back out of a double's second pick, deselect, or close |

**Files:**

- `web/engine.js`: the rules engine. DOM-free and seeded. The main exports: `newGame`, `setPoint`, `flip`, `resolveSit`, `baseline`, `tuck`, `roll`, `assign`, `pair`, `guard`, `enrichTurn`, `focus`, `engTurn`, `stand`, `unassign`, `endRound`, `targets` and `incoming`.
- `web/ui.js` and `web/ui.css`: the page.
- `web/build.js`: inlines the data, sim.js's `numbersFor`, `cards.js`, the engine, the page and the fonts.

**Rulings where the paper sheet is silent** (the sim's choice unless noted):

- Row comebacks in rounds 2+ also hit on arrival, for the two highest-Damage comebacks.
- Heals go one HP at a time onto whoever is lowest.
- The Isolation Script takes a repeated number first, else the highest.
- A double counts as two dice showing its number, on one mob or two; its second take is optional.
- Regen puts back the die lost most recently.
- A Containment Agent's "biggest hitter" is whichever single alarm would deal its holder the most that round.
- Each Enrichment Agent gives its holder one turn a round.

## History

Every pass since the first d6 test, newest first. Each records what changed, what the sim measured, and the knobs it added. Numbers in a section are true for the rules of that date only.

### Review 2: eight traits, six analysts, real choices (2026-11-02)

From a second full review. Measured first (600 games a row, 1p / 2p / 4p): only one trait mattered, and the one that changed the agent did nothing. Each trait alone, against never baselining, in Full: Scramble +11 / +11 / +12, Ghost +7 / +3 / +4, Repair +2 / +3 / −1, **Twin −1 / +3 / +5**. The Soarcerer's extra slot was worth 0 / −2 / 0. Ten of 18 situations had no decision. Only 2–12% of wins were close (someone at 2 HP or less).

| Change | Rule now |
| --- | --- |
| **Eight traits** (A) | Each tuck band teaches the agent the alarm's own trick, turned around: Spotlight (Grifter), Slip (Scavenger), Golden ticket (Golden Ticket Ghost), Momentum (Courier), Persist (Rootkit), Siphon (LSASS Siphon), Callback (DNS Beacon Drone), Twin (Wraith). Ghost, Scramble and Repair are gone. |
| **Richer baselining** (B) | A comeback can be baselined (one more die). An agent holds two tucked alarms at most, and with two it's **upgraded** (printed on each agent card). The Soarcerer: baselining costs 2, each tuck draws an item, and once a fight it moves a tucked alarm. |
| **Analysts** (C) | The Hunter's 1s are wild on comebacks, and once a fight a beaten comeback leaves the game. The Responder's crewmates take 1 less from arrivals. **Forensics** (new): before each flip, look at the top card; an alarm sets one fewer die, anything else may go to the bottom. **Shift Lead** (new): once a round, hand a die to a crewmate (their doubles); solo, one more reroll a round. |
| **Situation choices** (D) | Impossible Travel (chase it or let it go), Coffee Run (everyone 2 or the lowest 5), Pentest Day (run it or discard an item), Budget Approved (2 items, or 1 and everyone heals 2), Vendor Breach Notice (rotate everything or cut them off). |
| **Crew size** | The + die is per player past **2** (was 3): with six analysts, a crew of four stacks four crew-wide abilities. |

#### What was tried

Each new trait alone against never baselining, Full Shift (before the analyst tuning): Callback +8 / +5 / +7, Persist +6 / +2 / +2, Siphon +6 / −1 / +1, Twin +4 / +3 / +3, Spotlight +3 / −1 / −2, Momentum +2 / +1 / −1, Slip +1 / −2 / −2, Golden ticket −1 / −3 / −3. Spotlight, Slip and Golden ticket are player choices the bot makes simply. The upgrade at two traits is worth +2 / +3 / 0; baselining comebacks +1 / +1 / 0. The five new choices land within 3 points in both modes.

Analyst tuning (solo win by analyst, Full, HP 10):

| Variant | Hunter | Responder | Engineer | Soarcerer | Forensics | Shift Lead | Spread | 4p |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First draft (end every comeback; arrivals −1 for all; bury; solo extra die; 2-die baseline) | 70 | 70 | 54 | 46 | 49 | 63 | 24 | 69% |
| + Soarcerer draws on a tuck, Forensics cuts a die, solo Lead rerolls | 63 | 70 | 54 | 58 | 50 | 54 | 20 | 78% |
| Responder: crewmates only; Hunter: once a fight | 65 | 56 | 54 | 58 | 50 | 54 | 15 | 76% |
| + Hunter 1s wild on comebacks only | 59 | 56 | 54 | 58 | 50 | 54 | 9 | 74% |
| **+ the + die per player past 2 (kept)** | **59** | **56** | **54** | **58** | **50** | **54** | **9** | **63%** |

Quick Shift with the same rules: Hunter 47, Responder 55, Engineer 52, Soarcerer 52, Forensics 49, Shift Lead 55 (spread 8). HP: Full at 9 drops solo to 46%, so 10 stays; Quick stays at 9.

Baselining, always vs never: Quick +26 / +2 / +20 (2p now pays, was −2), Full +32 / +13 / +35.

Knobs: `TRAITSET` (`v3` default, `hybrid` the previous set), `CAP`, `UPGRADE`, `BASEBACK`, `SOAPERK` (`auto`), `SOATUCK`, `HUNEND` (`once`), `HUNANY`, `RESARR` (`crew`), `FORPEEK`, `FORCUT`, `LEADSOLO` (`reroll`), `XFROM` (2), `ANALYSTS`.

### The full pool, two modes, three bosses (2026-11-02)

The owner's ask: the shift was a static six fights; it should be a random assortment from one **situation deck** (alarms, situations, everything else), an **item deck** and a selection of **bosses**, as in production.

| Change | Detail |
| --- | --- |
| The deck | All 15 alarms and 18 situations from `data/cards.json`, with the production art. 9 new alarms got d6 dice from `numbersFor` (a main number each, spread so every face is the main of 2–3 alarms). 12 new situations got d6 rules (challenges roll 1–2 dice; choices were tuned to land within 4 points). |
| Modes | **Quick Shift:** deal 6 of the 24 core cards (production's Quick), HP 9, solo starts with 1 item. **Full Shift:** 3 story + 11 core (14, longer than production's 10, which in the d6 averaged 5 fights against today's 6), HP 10, boss row triggers on. |
| Bosses | The Lockjaw Syndicate, the Persistent Operator and the Rogue AI, one at random. Their row triggers are Full Shift only, as in production. |
| Tuck bands | Eight alarms, two per trait. Stacked traits add up. |
| New keywords | Stalker (only the lowest HP). Fileless, in the d6: Containment skips it. |
| Web | A Quick / Full picker on the setup screen; the shift bar counts feed cards (the page never says what the top card is). |

Found on the way: **the printed game was easier than the reported numbers.** The sim had always dealt 6 random alarms of 15 and any boss, while paper and web used the same 6 alarms and the Lockjaw. With the printed 6 (`MODE=classic`), the shift won 72 / 66 / 75%, against the 52 / 58 / 59% reported for it. One deck for sim, web and paper ends the split.

#### What was tried (`SYS=n6`, 600 games a row, 1p / 2p / 4p)

| Variant | Win | Fights | Comebacks |
| --- | --- | --- | --- |
| Quick, HP 10 | 71 / 61 / 68% | 4.5 | 1.3–2.6 |
| Quick, HP 9 | 66 / 54 / 59% | 4.4 | 1.3–2.5 |
| Quick, HP 8 | 60 / 47 / 55% | 4.3 | 1.2–2.2 |
| **Quick, HP 9, solo starts with 1 (kept)** | **56 / 54 / 59%** | 4.4 | 1.3–2.6 |
| Quick with the Full Shift boss triggers | 53 / 49 / 55% | 4.4 | 1.6–2.8 |
| Full, deal 10 (production), HP 10 | 64 / 57 / 61% | 5.0 | 2.3–3.8 |
| Full, deal 12, HP 9 | 51 / 50 / 51% | 5.9 | 3.1–4.5 |
| Full, deal 12, HP 10 | 60 / 58 / 63% | 6.1 | 3.0–4.7 |
| **Full, deal 14, HP 10 (kept)** | **57 / 57 / 61%** | 7.1 | 4.1–6.1 |
| Full, deal 14, HP 11 | 62 / 62 / 63% | 7.2 | 4.2–6.4 |

Baselining, always vs never: Quick +15 / −3 / +2 (2 Baseline dice in Quick: +18 / −1 / +4, not adopted: the band prints 3), Full +30 / +16 / +23. The Full Shift boss triggers cost 6 / 7 / 8 points.

Knobs: `MODE`, `DEALQ`, `DEALF`, `STORYF`, `BLASTDRAW`; `BOSSROW` now defaults to `none` in Quick.

**Then: Quick Shift deals 8.** Six cards left crews about 1.5 comebacks a shift. At HP 9: 7 cards 56 / 57 / 64% (comebacks 1.7–3.2); **8 cards 52 / 54 / 60%** (2.1–3.6, about 5.3 fights; kept). Eight also brought the Quick solo analyst spread from 11 to 7 points and baselining at 2p from −3 to −2.

### Review: real situation choices, the boss pulls the row, the tuck (2026-11-02)

From a full review the same day (HP 10, 600 games a row, 1p / 2p / 4p). The owner's brief: every change has to marry the physical release.

| Finding | Measured before | Change | After |
| --- | --- | --- | --- |
| Situation choices had a right answer | Badge: Fall back −11 / −6 / −11; Pager: Ride −3 / −3 / −1; USB: Leave −2 / −7 / −8; Patch: heal −3 / −2 / 0 | Raise the losing option's payoff. **Fall back:** draw 2 items; the next alarm goes straight on the row, unfought. **Ride it out:** also draw an item. **Leave it:** draw an item. **Take a breather:** heal 3. **Raid:** costs on point 1 HP | every pair within 4 points |
| The boss wasn't the climax | crews at the boss beat it 80 / 84 / 80% (no trigger) | **The boss pulls the row:** at round end, down to 6, 4 and 2 dice, roll the row. Printed on the card | 66 / 72 / 71%; about one comeback per boss fight |
| Baselining barely paid at 2p, and the card was in two places | always vs never +6 / +1 / +4 | **The tuck:** the baselined card slides under its agent with only its blue **tuck band** showing, so it is off the row. Discard the agent and it slides out onto the row | +15 / +9 / +12 |
| Traits did things nobody saw | — | End-screen lines for Twin, Ghost, Scramble and Repair; Ghost and Scramble log when they act; the stale "Exfil Courier baseline" log line fixed | — |
| Table burden | — | A second Enrichment box (Twin) on the tracker; a **Hits back** line on the dice reference | — |

Tried along the way: Badge Fall back that only skips the fight (−8 to −13), or skips and draws 1 (−3 to −7); USB Leave heals 2 (−4 to −8) or 4; Patch heal 4 or 5 (still −3 to −6 at 2p, since most of the crew sits near full HP); the boss rolling the row every round it lost a die (conversion 71–77%, weaker than the marks). The tuck alone is worth +7 / +3 / +3 (the alarm staying on the row: 45 / 55 / 56%). The solo Responder buff (a stood-down alarm also loses a die) moved the solo Responder from 53% to 54%: not adopted. The review's other changes had already closed the solo spread to 4 points.

HP: 9 gives 43 / 51 / 52% (solo 47% with 3 starting items, and a skill gap of only 8 solo); **10 gives 52 / 58 / 59% (kept)**. Situations as a whole are worth +5 / +8 / +10; the boss marks cost 8 / 8 / 6.

Card fit: alarm art 62 px (was 74) to make room for the fixed 44 px tuck band; the dice reference dropped "4 players: add the alarm's + die" (every alarm card prints it) for the Hits back line; the rules sheet dropped one sentence of threat-dice colour.

Knobs: `SITV`, `BADGEDRAW`, `USBLEAVE`, `PATCHHEAL`, `PATCHCOST`, `PAGERHP`, `BOSSROW`, `BOSSSTEPS`, `TUCKOUT`, `SOLORES`.

### Shuffled feed, agent traits, The Badge That Wasn't (2026-11-02)

Three changes from the owner:

| Problem | Change |
| --- | --- |
| The Badge That Wasn't turned the top alarm face up. In the production game the feed mixes situations and alarms, so the top card may not be an alarm. | **Hold the room:** on point takes Exposed; win the **next** fight, draw an item. **Fall back:** the **next alarm** hits everyone once when it flips, then is fought as usual. Never the boss: with no alarm left, Fall back is off. A box for it on the shift tracker. |
| Situations had their own deck, one before every flip after the first. | **One feed:** the 6 alarms and 6 situations shuffled together, the boss underneath. On point, once a situation lands on them, stays on point through the next fight. |
| A baselined alarm's line worked for the crew whatever agent it sat under ("On point rolls one more die" under a Triage Agent). The owner wants the agent itself to change, for a roguelike build. | **Traits:** the alarm gives the agent it tucks under a trait, lost if that agent is discarded. Grifter: **Twin** (the agent counts as two). Scavenger: **Ghost** (comebacks don't hit on arrival). Courier: **Scramble** (+1 to every row roll). Rootkit: **Repair** (after every won fight, the agent heals its holder 2). |

#### What was tried (`SYS=n6`, HP 10, 600 games a row unless noted)

The Badge change alone (split feed, old lines): 56 / 61 / 59%, up 3–5 points from 53 / 56 / 55%; falling back no longer skips a fight, and the bot holds the room more. The mixed feed alone (old lines): 58 / 62 / 60%.

Baselining under each kind of trait. Never baselining: 48 / 61 / 55%.

| Traits | Always baseline | vs never |
| --- | --- | --- |
| Old crew-wide lines (on point +1 die, Ghost, Scramble, heal 5 split) | 59 / 65 / 61% | +11 / +4 / +6 |
| Agent only: Twin, Stealth (no slot), Relay (pass it once a fight), Repair (heal its holder 2) | 40 / 50 / 47% | −8 / −11 / −8 |
| Agent only, 2 Baseline dice | 43 / 53 / 51% | −5 / −8 / −4 |
| Agent only, 1 Baseline die | 51 / 60 / 54% | +3 / −1 / −1 |
| Agent only, every tucked alarm also +1 to its agent | 44 / 55 / 52% | −4 / −6 / −3 |
| Agent only, the alarm leaves the game for good | 54 / 57 / 60% | +6 / −4 / +5 |
| **Hybrid: Twin, Ghost, Scramble, Repair (kept)** | **54 / 62 / 59%** | **+6 / +1 / +4** |

One trait at a time, always baselined (400 games for the traits, 600 for the old lines): Twin −2 / 0 / −2 tucked under Triage first (−3 / +1 / +1 under Containment first), Stealth −2 / −5 / −3, Relay 0 / −3 / −3, Repair −5 / −2 / −2. The old lines alone: Grifter +3 / −1 / −1, Scavenger +5 / +1 / +1, Courier +6 / +2 / +3, Rootkit −1 / −2 / −2. What carried the old lines was protecting the row; an agent-only trait can't, so Ghost and Scramble stay, now carried by the agent card.

HP with everything: 9 gives 44 / 56 / 51% (solo out of band); **10 gives 53 / 60 / 59% (kept)**.

Agents-only vs consumables-only decks: 37 / 23 / 36% vs 23 / 30 / 39%. Rerun under the 2026-11-01 rules at 600 games: 44 / 25 / 35% vs 21 / 30 / 32%, so 2p already missed before this pass.

Renamed: the Rootkit's trait is **Repair**, not Regen, because Regen is the Rootkit's own keyword. Card fit: the trait lines lost "while its agent is held" (the rules sheet says it once) and the tracker's boxes got shorter.

Knobs: `FEED`, `TRAITS`, `TRAITSET`, `BADGEHP`, `LEVEL=1`, `TWINTO=contain`.

### Crew-wide agents, worthwhile baselining, shift tracker (2026-11-01)

From a full review of the d6 game. Four problems, measured at HP 15 (400 games a row per crew size, 2026-11-01):

- **Agents barely mattered in crews; consumables carried the game.** Compared as 16-card decks: agents only won 40 / 13 / 19% at 1p / 2p / 4p, consumables only 27 / 38 / 45%. An agent worked only for whoever held it, and the Triage Agent's die was nearly useless: blanking both Triage cards moved crews by −2 to +2 points. That cut against the theme (automation is how a SOC survives the night) and the goal that agents decide wins.
- **Baselining was a trap for crews.** Never / the bot / always: 58 / 56 / 51% at 2p, 47 / 48 / 44% at 4p, and it made a 2p shift 2.4 rounds longer. Alarm by alarm (forced on), the Mailer Daemon and Password Sprayer lost win rate: one-die alarms with weak lines, made five times the work.
- **The table had about nine things to remember with no marker** (each reroll, the Engineer, Enrichment, the Responder, Change Freeze, Mute, the Badge's draw, Escalating, Regen).
- **Players couldn't see what their agents did.** The end screen showed fights, rounds, comebacks, guards and lowest HP only.

#### What changed

| Problem | Fix |
| --- | --- |
| Personal agents | **Agents work for the whole crew.** Containment: the highest-Damage alarm deals 2 less to everyone. Recovery: heal 4 split across the crew. Enrichment: turn any crew die. |
| A weak Triage die | **Triage: its holder rolls one more of their own dice.** It pairs, guards, rerolls and hits the boss like any of theirs. There are no agent dice any more. |
| Baselining didn't pay | **3 Baseline dice (was 4), and only the four heavier alarms have a line.** The Mailer Daemon and Password Sprayer lose theirs. The alarm still goes on the row. The user chose this over "4 dice, and it leaves the row for good" (stronger, +16 / +8 / +11 over never, but 25% fewer comebacks) and "3 dice, all six" (+7 / +1 / +2). |
| Nothing to track things with | **The shift tracker card** (38 cards). |
| Invisible agents | **What your items did** on the web end screen and in Copy result (`G.stats.items`). |
| Stronger items | **HP 10** (was 15), and **solo starts with 2 items** (was 1). |

#### What was tried (`SYS=n6`, 400 games a row unless noted)

Crew-wide agents and the Triage die, at HP 13 unless noted:

| Variant | 1p | 2p | 4p | Agents-only deck (16) | Consumables-only deck (16) |
| --- | --- | --- | --- | --- | --- |
| Personal agents (was), HP 15 | 52% | 56% | 48% | 40 / 13 / 19% | 27 / 38 / 45% |
| Crew-wide agents | 42% | 57% | 53% | 33 / 14 / 30% | 25 / 35 / 41% |
| Crew-wide + 3 slots each | 42% | 61% | 53% | 33 / 23 / 39% | 25 / 35 / 41% |
| **Crew-wide + Triage as a crew die**, HP 11 | 46% | 57% | 55% | **41 / 29 / 41%** | 14 / 24 / 33% |

Each item's worth, crew-wide agents at HP 13, by blanking its copies (win-rate points lost at 1p / 2p / 4p): Triage 5 / 2 / −2 (worthless in crews), Containment 5 / 10 / 14, Enrichment 6 / 7 / 2, Recovery 4 / 4 / 3, Surge 2 / 9 / 2, Threat Intel 5 / 18 / 10, Isolation 6 / 7 / 3, Shift Coffee 10 / 12 / 5, Change Freeze 0 / 4 / 5. With Triage as a crew die, at HP 11: blanking it costs 14 / 13 / 6.

Baselining, crew-wide agents and the Triage die, HP 11. Never baselining: 43 / 59 / 55%.

| Variant | Always | The bot (when healthy) | Comebacks 2p (never 4.1) |
| --- | --- | --- | --- |
| 4 dice, all six (was) | 47 / 57 / 54% | 46 / 57 / 55% | 4.2 |
| 3 dice, all six | 50 / 60 / 57% | 47 / 59 / 57% | |
| 2 dice, all six | 58 / 64 / 60% | 56 / 61 / 58% | |
| 4 dice, leaves the row, all six | 59 / 67 / 66% | 56 / 64 / 66% | 2.9 |
| 4 dice, leaves the row, heavier four | 59 / 67 / 66% | 56 / 65 / 61% | 3.5 |
| **3 dice, heavier four (kept)** | **56 / 64 / 60%** | **53 / 62 / 59%** | **3.7** |

Alarm by alarm (forced on, 3 dice, stays on the row): Mailer Daemon −3 / −5 / −1, Password Sprayer −2 / −2 / −2, Grifter +4 / +3 / −1, Scavenger +3 / +2 / +2, Courier +3 / +5 / +4, Rootkit +3 / 0 / +1.

HP, with everything (600 games a row):

| HP, solo start | 1p | 2p | 4p | Solo spread | Pairs |
| --- | --- | --- | --- | --- | --- |
| 9, 1 item | 36% | 48% | 47% | 8 | 44–54% |
| 10, 1 item | 43% | 56% | 55% | 11 | 51–61% |
| 11, 1 item | 51% | 60% | 59% | 11 | 56–67% |
| 9, 2 items | 47% | 48% | 47% | 6 | 44–54% |
| **10, 2 items (kept)** | **53%** | **56%** | **55%** | **4** | **51–61%** |

At HP 10, 400 games a row: never baselining 43 / 54 / 52%, always 55 / 59 / 56%. Agents-only deck 46 / 26 / 36%, consumables-only 17 / 24 / 35%. The old personal agents and agent die at HP 10: 44 / 35 / 35%.

**Cost:** HP 10 is low, and stronger items let a random bot win more, so the 2p skill gap fell from 27 to 18 points and real-choice rounds from 49% to 42%. Losses before the boss rose from 44–55% to 54–61%. Shifts are shorter: 10.6 rounds at 2p (was 13.5).

Sim knobs: `PERSONAL=1` (the old personal agents), `TRIAGE=agent` (the old agent die), `CREWSLOTS` (agent slots per player in a crew, default 2), `BASEDICE` (default 3), `BASES` (default `imp,druid,wyrmling,mimic`), `QSOLO` (default 2).

### Guard anyone, pairs, solo Soarcerer (2026-10-31)

This pass fixes the three issues left open by the items pass.

#### What changed

| Problem | Fix |
| --- | --- |
| The solo Soarcerer won 42%. Extra slots do little for a lone player. | Solo only: when you use a consumable, roll a die. On a 2 or 6 (its doubles), keep it. |
| Skill fell with signature doubles: fewer doubles meant fewer choices. Smart over random placement was 16 points at 2p and 13 at 4p. | **A guard covers anyone.** A double that guards blocks you or any crewmate. **Pairs:** two of your own dice showing the same number make a double. |
| Pairs made solo much stronger (+14 points). | Solo starts with 1 item, not 2. |
| 4 players fell behind once pairs and guards landed. | Baselining sets 4 dice at every crew size (no +1 per player past 3). The alarm's own + die stays. |
| Consumables reused kit art. | Five new Ink & Static scenes in `art/` (`art/scenes.js` writes `art/art.json`). |

#### What was tried (`SYS=n6`, 600 games a row per crew size)

| Variant (HP 19 unless noted) | 1p | 2p | 4p | Skill gap 1p / 2p / 4p | Solo spread |
| --- | --- | --- | --- | --- | --- |
| Items pass as shipped | 49% | 51% | 48% | 19 / 16 / 13 | 18 (Soarcerer 42) |
| Solo Soarcerer draws 1 more item per fight | 55% | 51% | 48% | 16 / 16 / 13 | 21 (Soarcerer 70) |
| Solo Soarcerer keeps its first consumable each fight | 56% | 51% | 48% | 20 / 16 / 13 | 15 (Soarcerer 64) |
| **Solo Soarcerer rolls to keep (2 or 6)** | 51% | 51% | 48% | 18 / 16 / 13 | 10 (Soarcerer 52) |
| Guard anyone | 49% | 60% | 55% | 19 / 25 / 28 | 18 |
| Pairs | 63% | 51% | 48% | 27 / 18 / 13 | 13 |
| Both + Soarcerer roll + no 4p baseline die, HP 17 | 63% | 57% | 52% | 24 / 23 / 28 | 7 |
| No + die at 4p at all, HP 16 | 61% | 57% | 76% | 25 / 25 / 25 | 6 |
| **All of it + solo starts with 1 item, HP 15** | **52%** | **55%** | **48%** | **27 / 27 / 28** | **2** |

#### Sim at HP 15 (600 games a row)

- **Win rates:** 1p 52%, 2p 55%, 4p 48%.
- **Solo by analyst:** Hunter 51%, Responder 50%, Engineer 50%, Soarcerer 52% (spread 2 points).
- **Pairs:** 47% (Hunter + Engineer) to 56% (Hunter + Responder).
- **Skill gap:** 27 / 27 / 28 points at 1p / 2p / 4p, up from 19 / 16 / 13.
- **Rounds with a real dice choice:** 40% / 49% / 56%, up from 35% / 38% / 47%.
- **Losses before the boss:** 55% / 44% / 51%.

**Still open:**
- 2p sits 7 points above 4p.
- The bot always pairs when it can. A player can choose not to: two loose dice can't guard, but a pair can.

Sim knobs:
- `GUARDANY=0`, `PAIRADD=0`: turn either rule off.
- `SOASOLOKEEP=1|roll|0`: the solo Soarcerer keeps its first consumable each fight, rolls to keep, or neither.
- `SOASOLODRAW`: extra draws per won fight for the solo Soarcerer.
- `QSOLO`: items a solo player starts with.
- `BASEPLUS=1`: baselining adds 1 die per player past 3.

### Items, four analysts, signature doubles (2026-10-31)

Feedback: "draw an agent" is wrong; the deck is items, either passive (agents) or consumable, with 2 slots per analyst except solo. Cut to four analysts (Soarcerer, Engineer, Responder, Hunter). Three double numbers per analyst felt swingy.

#### Doubles: what was tried (four analysts, HP tuned so 2p ≈ 50%, 1,500 games a row)

| Rule | HP | 1p | 2p | 4p | Solo spread | Skill gap 2p |
| --- | --- | --- | --- | --- | --- | --- |
| Three numbers each (was) | 10 | 39 | 48 | 48 | 13 | 21 |
| **One signature number + 6 (kept, user's pick)** | 15 | 42 | 50 | 55 | 18 | 17 |
| Pairs only, everyone rolls 2 (solo 4) | 18 | 46 | 53 | 58 | 14 | 12 |
| Pairs or any 6, everyone rolls 2 | 10 | 53 | 54 | 56 | 13 | 15 |

Half of every analyst's faces were doubles, and a double is a free extra die plus a guard. One number of your own plus the 6 makes a die a double a third of the time. Which number goes where barely matters (a search of all 120 assignments moved solo results a few points); the gaps come from the abilities. Kept: Hunter 4, Responder 3, Engineer 1, Soarcerer 2.

#### Items

- 16 cards. **Agents** (passive, work for their holder): Triage ×2 (an agent die for you every round), Containment ×2 (your biggest hitter deals you 2 less), Enrichment (once a round, turn one of your dice to any number), Recovery (heal 4 after every won fight). **Consumables** ×2 each, used once: Surge Playbook (roll 3 more dice), Threat Intel Feed (every die matches anything this round), Isolation Script (one die off every alarm), Shift Coffee (heal 6 split), Change Freeze (skip the next row roll).
- **Slots:** each player holds 2 agents (Soarcerer 3); solo 4 (Soarcerer 5). Consumables don't take a slot. The crew starts with 2 items (solo 2) and draws 2 after each won fight (solo 1), deciding who takes each.
- Card art for consumables reuses the main game's other kit scenes (Hunt, Recon, Patch, Decoy) until they get their own.

**Why consumables are outside the slots.** Every old agent card did two jobs: a passive in the shared tray of 5 and a burn. Split into one-job cards, 2 slots each hold half the power and full hands throw draws away. With everything in slots, 2 players needed HP 50 (and still came out far weaker than 1 or 4 players, who reached 70% and 86%). With only agents in slots: HP 14–21 and the counts sit together. Asked and confirmed.

#### Analysts

- **Hunter:** 1s match any number on **any** alarm (was: only came-back alarms; +11 pts solo, it was the weakest).
- **Engineer:** the opposite-side turn is **once a round** (was once a fight; the turned die counts as one, so no guard loop).
- **Responder:** unchanged (stand an alarm down once a fight).
- **Soarcerer:** one more agent slot. The kept first burn each fight made every pair with the Soarcerer win 60–70% (pairs without it 34–47%); a drawn extra item was worse. Slot only: pairs 47–58%.
- **Fixer:** gone.

#### Sim at HP 19 (1,500 games a row)

1p 50% · 2p 52% · 4p 50%. Solo: Hunter 57, Responder 50, Engineer 52, Soarcerer 41 (spread 17). Pairs 46% (Hunter + Engineer) to 54% (Hunter + Responder, Responder + Engineer). At HP 21, before Containment also cut a Targeted alarm's doubled hit (the card's wording): pairs 48% (Hunter + Engineer) to 59% (Hunter + Responder). Losses before the boss at 2p: 37% (was 74%). Skill gap at 2p 16 points. Alarms print two fewer dice than their d20 hits (was one fewer). Solo starts with 2 items.

**Still open:** the solo Soarcerer (41%) needs something of its own: 5 slots don't help much alone. Skill gap is lower than with three doubles (16 vs 21): fewer doubles means fewer allocation choices. Change Freeze and the dealing decisions are bot heuristics (the bot gives an item to whoever holds fewest, spends consumables freely, freezes when anything waits on the row).

Sim knobs: `ITEMS=old` (two-sided agents, shared tray), `CONSFREE=0` (consumables take slots), `PERSONAL=0` (agents help the whole crew), `KITJSON` (the deck), `SOLOSLOTS`, `QSOLO`, `SOASLOT=0`, `SOASOLO=0`, `SOAPERK=keep`, `HUNANY=0`, `ENGFLIP=fight`, `DBLMODE=pair` (`PAIR6=1`), `DRAWS=solo,crew` (`DRAWPER=1`), `LOOSE=0`, `FREEZEMIN`, `SURGEMIN`, `INTELMIN`.

### Alarms and baselining (2026-10-31)

NightBeacon CMD theming: the enemies are **alarms** (player-facing text across the prototype and the main game; code still says mob), and a fight with two or more in play is a **multi-alarm** fight (the web fight header says so). The story for the new choice: the agents are learning the environment.

#### The rules now

- **Baseline it.** When an alarm is flipped from the feed (never a comeback, never the boss), on point may set the 4 dice on its Baseline line too (+1 per player past 3), all showing its main number's opposite side. Beat it with them all and tuck it under an agent in the tray: that agent gains the alarm's line until it is burned or discarded (a Soarcerer's kept burn keeps it). Empty tray: it waits for the next agent drawn. The alarm still goes on the row, and comes back with its printed dice only.
- **The six lines:**

| Alarm | Baseline dice | Baselined |
| --- | --- | --- |
| Mailer Daemon | 5 5 5 5 | The highest-Damage alarm deals 1 less. |
| Password Sprayer | 3 3 3 3 | Once a round, reroll one more die. |
| OAuth Consent Grifter | 6 6 6 6 | On point rolls one more die. |
| Living-off-the-Land Scavenger | 4 4 4 4 | Comebacks don’t hit on arrival. |
| Exfil Courier | 2 2 2 2 | Add 1 to every row roll. |
| Rootkit Implant | 1 1 1 1 | After every won fight, heal 5 split across the crew. |

- **HP 12.**
- The alarm card makes room with shorter art and the + die beside the threat dice; the Baseline line sits under the strip. The paper sheet asks for about 18 threat dice.

#### Sim (2026-10-31, `SYS=n6`, 1,500 games a row)

| Variant | 1p | 2p | 4p | Why |
| --- | --- | --- | --- | --- |
| Three alarms, 2 dice, baselined alarm leaves the row for good (HP 14) | 59 | 65 | 65 | Always baselining beat never by 12 pts at 2p: no choice. Leaving the row is most of the value. |
| Three alarms, 3 dice, it still goes on the row (HP 14) | 47 | 54 | 57 | vs never 49 / 53 / 52: a real choice at 1–2p |
| Six alarms, 3 dice (HP 14), always / never | 54 / 49 | 60 / 53 | 60 / 52 | The lines stack: +7 at 2p |
| Six alarms, 4 dice (HP 13), always / never / when healthy | 48 / 46 / 50 | 53 / 50 / 55 | 52 / 49 / 56 | Judgment beats both: kept |
| **HP 12 (kept): never / always / when healthy** | **43 / 45 / 46** | **49 / 51 / 53** | **48 / 48 / 52** | |

Each line alone (forced on, at HP 14 with 3 dice): Courier +3 at 2p, Grifter +2, Scavenger +1, Sprayer and Mailer ±0, Rootkit with heal 3 −4 (seven dice for a small heal); heal 5 brought it to −3. The bot baselines when the lowest HP is at least 80% of the start. At HP 13 the skill gap at 2p was 25 points.

**Still open:**
- The Soarcerer is weakest again solo (39%, spread 15 points): its doubles 1 and 6 match only the Grifter's and Rootkit's Baseline dice.
- The Rootkit's line is still a slight loss for a seven-die fight. Something stronger, or fewer dice for it alone, if playtests agree.
- At 4 players baselining is worth the most; the +1 die per player past 3 trims it, watch it at the table.

Sim knobs: `BASE=0` (off), `BASEPICK=always|never|bot`, `BASEDICE` (default 4), `BASEPLUS=0` (no + die past 3 players), `BASEROW=out` (a baselined alarm leaves for good), `BASES=spray,druid,...`, `BASEHP` (the bot's health line, default 0.8), `BASEHEAL` (Rootkit, default 5).

### A call for every analyst, and Evasive fixed (2026-10-31)

Three issues left open by the situations pass: the Soarcerer and Fixer were weakest solo, the Responder's card had no decision, and about 1–2% of solo games stalled.

#### What the stalls were

Not an endless guard. Every stalled game was a solo player against the **Druid** (Evasive, dice 3 3 2). Evasive said only a double hits it, and a double only takes dice showing its own number, so an analyst with no double of 2 or 3 could never hit it. The Soarcerer (doubles 1 and 6) could never hit it at all. The player guarded on doubles and bled 1 HP every few rounds until the 200-round cap. The same rule made the Soarcerer the weakest analyst: forcing a fix moved it from 41% to 63% solo before any retune.

#### The rules now

- **Evasive:** only a double can hit it. A double of another number takes out one die and is spent; a double of its number still takes two.
- **Responder:** once a fight, after you roll, pick a mob: it deals no damage this round. Replaces "your doubles sit in the middle" (the doubles 3, 4 and 6 are still on the card).
- **Fixer:** once a fight, after you roll, turn one of your dice one up or one down. Replaces the heal after every fight and the Recovery bonus.
- **Soarcerer:** the tray still holds 6. The first agent you burn each fight stays in the tray. Replaces the extra draw after every won fight.
- **Engineer:** the die turned to its opposite side counts as one die (never a double), so it can't guard either.
- **HP 14.**

#### Sim (2026-10-31, `SYS=n6`, 1,500 games a row)

Each change on its own, at HP 21 (before the retune):

| Change | Solo HUN / RES / ENG / SOA / FIX | 1p | 2p | 4p | Stalls |
| --- | --- | --- | --- | --- | --- |
| Committed rules | 47 / 49 / 51 / 41 / 42 | 46 | 53 | 50 | 34 |
| Any double hits Evasive (rejected: +19 solo) | 65 / 64 / 71 / 63 / 60 | 65 | 62 | 57 | 0 |
| A double of another number takes one (kept) | 63 / 62 / 69 / 59 / 56 | 62 | 61 | 55 | 0 |

At HP 18 with the Evasive fix, testing each analyst:

| Variant | Solo for that analyst | Verdict |
| --- | --- | --- |
| Responder stands a mob down | 55 → 61 | Kept |
| Soarcerer keeps a burn, with the extra draw | 59 → 70 (at HP 21) | Too strong |
| Soarcerer keeps a burn, no extra draw | 54 → 56 | Kept |
| Soarcerer third double (5) | 54 → 69 | Rejected |
| Fixer: heal 5 or draw an agent, after each fight | 50 → 50 | No gain: healing between fights barely matters |
| Fixer third double (5) | 50 → 68 | Rejected |
| Fixer turns a die one up or down | 50 → 55 | Kept |
| Engineer's turned die counts as one | 64 → 59 | Kept |

**At HP 14, all of it (1,200–1,500 games):** 1p 50% · 2p 50–53% · 4p 52%. Solo: Hunter 48, Responder 54, Engineer 50, Soarcerer 47, Fixer 47 (spread 7 points, was 12). Pairs 44% (Hunter + Engineer) to 62% (Responder + Soarcerer). Skill gap at 2p 21 points (was 18). Games are shorter, 11 rounds at 2p (was 15), since Evasive no longer drags on. No stalls in 7,500 solo games. Losses before the boss 69% at 2p (was 75%).

**Still open:** the Responder's stand is the strongest call (pairs with it top the table); if playtests agree, limit it to on point's damage. HP 14 is low enough that one unlucky row roll matters more; watch for that at the table.

Sim knobs: `EVASIVE=exact|one|wild`, `RESPERK=old|stand`, `SOAPERK=old|keep` (`SOADRAW`), `PATPERK=old|choose|nudge` (`PATHEAL`, `PATDRAW`), `ENGDBL=1` (the turned die keeps its double), `RESMIN` (how much the stand must save before the bot uses it, default 6).

### Situations, conditions and two analyst abilities (2026-10-30)

Asked for: more strategic decisions. Story situations that make you choose (stay and fight, or run; make a grab and roll for it), cards that adjust rolls, another look at the analyst abilities, and whether to add wild numbers.

#### The rules now

- **Situations.** Six cards, shuffled. Before every flip after the first (the boss's too), once point is picked, flip one and play it. They are the real game's situations (names, scenes, story lines) with rules rewritten for the dice:

| Situation | Kind | Options |
| --- | --- | --- |
| The Badge That Wasn’t | Stay or run | Turn the top mob face up. **Hold the room:** on point takes Exposed; win the fight, draw an extra agent. **Fall back:** it hits everyone once and goes on the row unfought (not the boss). |
| Pager Storm | Stay or run | **Ride it out:** everyone loses 2 HP. **Mute it:** the next mob sets one more threat die, a 6. |
| The Janitor’s USB | Grab | **Grab it:** on point rolls 3 dice; any pair (44%): draw 2 agents and take Focused; no pair: take Rattled. **Leave it.** |
| Dark Web Chatter | Grab | **Dig in:** on point picks 1–4 dice; any 6 (31 / 42 / 52 / 59%): draw 2 agents; none: lose 1 HP per die. **Let it go.** |
| Lateral Whispers | Event | Roll the row now; comebacks hit on arrival and join the next fight. |
| Patch Tuesday | Choice | **Take a breather:** everyone heals 2 HP. **Raid the supply closet:** draw an agent. |

- **Conditions** are cards you keep in front of you, one of each, never two of the same. **Rattled:** your next roll has no doubles. **Exposed:** next fight, each round anything hits you, take 1 more. **Focused:** once, after you roll, turn one of your dice to any number.
- **Hunter:** your 1s match any number on a mob that has come back from the row (a coin marks it the first time; it stays). Replaces "your doubles run low".
- **Engineer:** once a fight, turn one of your dice to its opposite side (1↔6, 2↔5, 3↔4). That die can't guard. Replaces "every even number is a double" (still true, and still on the card).
- **HP 21.**

#### No wild faces

No die gets a wild face. A wild face makes every die twice as likely to match a given number (2 in 6 instead of 1 in 6). That undoes the exact-number puzzle and makes the Enrichment Agent, whose whole job is "any number", pointless. Wilds come instead from things you earn and choose when to spend: Focused (from a won grab), the Hunter's 1s against comebacks, and Enrichment.

#### Sim (2026-10-30, `SYS=n6`)

**Is each choice real?** Win rate with every option forced, 2 players and solo, HP 24, 1,200–1,500 games each (about ±1.4 points of noise). An option that wins clearly more is a choice in name only.

| Option | First draft | Fixed to | 2p | 1p |
| --- | --- | --- | --- | --- |
| Badge: stay / run | stay cost 2 HP + Exposed: run won by 4–6 pts | stay: Exposed + an agent; run: the mob hits once | 54 / 55% | 46 / 48% |
| USB: grab / leave | no pair cost 2 HP + Rattled for a fight: leave won by 2–3 pts | win draws 2; Rattled lasts one roll | 56 / 57% | 51 / 48% |
| Pager: ride / mute | — | — | 55 / 54% | 49 / 48% |
| Chatter: 0 / 1 / 2 / 3 / 4 dice | — | — | 55 / 54 / 53 / 55 / 54% | 49 / 48 / 48 / 49 / 47% |
| Patch: heal / agent | — | — | 56 / 54% | 46 / 49% |

Every option now sits within about 3 points of the others, so which one is right depends on the moment rather than on the card. That's the goal. Each card flips once a game, so no single choice swings the win rate much.

**Abilities, solo at HP 24, 800 games each:**

| Analyst | Doubles only | New ability |
| --- | --- | --- |
| Hunter | 45% | 51% (1s wild on comebacks) |
| Engineer | 44% | 58% once a round: rejected · **51% once a fight** |
| Responder / Soarcerer / Fixer | 49 / 43 / 44% | unchanged |

The Engineer's turn once a round first let it make a double, and so a guard, every round. Solo games against an Evasive mob it couldn't hit stalled forever. Hence "that die can't guard" and once a fight.

**At HP 21, 400 games a row (3p 900):** 1p 43% · 2p 48% · 3p 59% · 4p 48%. Skill gap at 2p 18 points (was 12): there are more decisions for good play to win. Solo spread 12 points: Engineer 48, Hunter 46, Responder 45, Fixer 38, Soarcerer 36. Pairs 43% (Soarcerer + Fixer) to 59% (Engineer + Soarcerer). The old rules at HP 21 win 50% at 2p, so situations and abilities together roughly cancel out on balance. Each game the bot runs from about 0.25 mobs and uses Focused about 0.3 times.

**Still open:**
- Losses before the boss are 75% at 2p. Situations don't change that; the row still does the killing.
- The Soarcerer and Fixer are now the weakest solo; the Responder is the one analyst left with no decision on the card.
- About 1% of solo games stall, with or without the new abilities: a player who can't hit an Evasive mob can guard every round. The sim calls 200 rounds a loss. At the table, this needs a rule.

Sim knobs: `SIT=0` (no situations), `SITPICK=insider:run,usb:leave,chatter:2,...` (force options), `PERKS=old`, `ENGFLIP=round`, `RATTLED=fight`, `USBDRAW`, `RUNHIT=0`, `FOCUSGAIN` (default 8: how much better a Focused turn must make the round before the bot spends it).

### Always-persist row, no one-off matches, rerolls (2026-10-30)

Asked for: the Hunter can't remove row mobs for good; the row retuned for the d6 game; no matching one higher or lower, so the test shows what the printed numbers and each class's doubles do on their own; and some way to reroll.

#### The rules now

- **Every beaten mob goes back on the row, every time.** Before, a mob that had come back once was gone for good when beaten (for anyone), and the Hunter's "gone for good" line did nothing extra. Now nothing removes a mob, as in the real game minus the Hunter.
- **Row numbers three lower:** the d20 tiers map to 2–5 (top 12+), 2–4 (10–11), 2–3 (8–9), 2 (7 or less). Mailer Daemon and Password Sprayer 2–5 (28%), Living-off-the-Land Scavenger 2–4 (17%), the rest 2–3 (8%).
- **No one-higher-or-lower matches.** The Hunter and Responder perks are gone; their cards now just point at their doubles (low: 1, 2; middle: 3, 4). The Soarcerer's and Fixer's kit and heal perks stay.
- **Rerolls: once a round, each player may reroll one of their own dice** (solo: one die; the solo crew die and Triage burn dice count as yours), before it's used or turned by Enrichment. It can't be undone. Agent dice can't be rerolled. Web: **Reroll it** (X) under a selected die.
- **HP 24.**

#### Sim (2026-10-30, `SYS=n6`, 300–400 games per row)

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

### Clustered dice and two-of-a-number doubles (2026-10-30)

Playtest feedback on exact numbers: the dice felt right, the doubles didn't. "If my role doubles on 2s, it should count as two 2s, not a 2 and whatever other number." And mobs should carry repeats, like 1 2 2 2 3, so a double matters.

#### The rules now

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

#### Why each change (sim, 2026-10-30, `SYS=n6`, 300–400 games per row)

1. **Two-of-a-number alone is weaker** than "match plus any one more": at the old dice the tune-to-50% HP rose from 28 to 46 and a two-player game went from 19 to 30 rounds. The double now needs a second die with its number.
2. **Clustering on its own barely moved pace** (28.5 vs 27.9 mob rounds a game at equal HP); it moves who's good against what.
3. **One fewer die per mob** (boss two fewer) brought pace back: 19.4 rounds at two players, the same as before.
4. **"+1 per player past two" broke big crews** under the new doubles: 3 players 36%, 4 players 19%. Each extra player added a die to every mob in play while adding one die to the roll. Past three, with a 6: 3 players 52%, 4 players 39–46%.
5. **The repeats-first pattern** (main, main, below, above) beat main, below, above: with one fewer die the three-hit mobs print two dice, and "1 2" has no repeat for a double to eat.

#### Results at 25 HP

| Crew | Win | Random placement | Skill gap | Rounds with a real dice choice | Rounds |
| --- | --- | --- | --- | --- | --- |
| 1 | 41% | 25% | 16 pts | 19% | 32.4 |
| 2 | 53% | 31% | 22 pts | 43% | 19.4 |
| 3 | 52% | | | | 16.1 |
| 4 | 39% | 26% | 12 pts | 43% | 15.6 |

Solo analysts 39–45% (spread 6). Pairs 42% (Hunter + Engineer) to 61% (Hunter + Fixer). The two-player skill gap is the biggest yet (22 points, was 15). **Open:** solo and 4 players sit 12–14 points under two players; a table test decides whether that needs a lever (solo's crew die, or 4 players' + die).

#### Tested and rejected

- **Everyone rolls two dice** (on point three): the bot can't enumerate that many dice at four players, and a two-player game tuned to 20 HP.
- **The + die as the mob's main number**, past two: 4 players 19%. As a 6, past two: 4 players 21%.
- **Solo rolls four dice**: 60% solo with the fewest real choices (14%).

#### Sim knobs

`MOBLESS` (dice fewer than the d20 hits, default 1), `BOSSLESS` (default 2), `XFROM` (players before the + die, default 3), `ENUM` (allocations the bot enumerates before it goes greedy, default 200000).

### Exact numbers (2026-10-30, history)

The user, after the symbol refactor: *"in a physical game we would actually place the dice under the card, especially when we scale up the dice needed to defeat a mob based on player count size (I don't want the '3 players add.. 4 players add...' printed on the card) it should be number, number, number + number to roll ... a bit more like how Escape the Dark Castle handles it, but I also want the numbers to be more direct as well, not 1-2 detect, 3-4 contain."*

So the symbols are gone. Every die is a plain pip d6 and reads as its number.

#### The design

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

#### Results

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

#### Tested and rejected

- **Two dice per analyst** (`N6DICE=2`): faster, 13.6 rounds at 2 players, but four-player rounds blow past the bot's exhaustive search (it falls back to greedy placement), so its numbers can't be trusted, and it's more dice to read every round.
- **Solo with four dice** (`N6SOLO=4`): 43 rounds a shift and 18% choice.

#### Components

Standard d6s in four colours. Nothing custom.

| Dice | Count | For |
| --- | --- | --- |
| Crew colour | 2 per player (8) | your roll; on point rolls two |
| Second colour | 3 | the solo crew die and Triage agent dice |
| Amber | 2 | the persistence row |
| Threat dice | about 16 | set under the mob cards |

Coins are only for HP now: the threat dice track hits.

**Why 16 threat dice.** The biggest card is the boss: 10 dice at 2 players, 12 at 4. The boss arrives with one last row roll, and a mob coming back with it adds 3–5 dice at 2 players. So 15 covers the boss plus the biggest comeback at 2 players, and 16 leaves one spare. A normal fight is a 3–5 die mob plus a comeback or two: 6–14 dice. At 4 players, or when several mobs come back at once, 20 covers it (boss 12 plus a 7-die Rootkit Implant would be 19).

#### Rulings made in the refactor

- **Printed order.** The card prints its dice low to high, so they're quick to set out. Order has no rule meaning.
- **Enrichment's turn** keeps what the die was: a double stays a double, a single stays single (the sim's rule; otherwise every turn would be "turn it to a 6").
- **A double's "one more"** is optional: you may take just the match. (Superseded: a double now counts as two dice showing its number.)
- **Regen** puts back the die it lost most recently.
- **Containment's burn** takes a repeated number first (it leaves the most different numbers to match), else the highest.
- **The sim's Triage burn** rolled the old symbol faces in the n6 system, so those three dice could never hit. Fixed: they roll numbers with the on-point analyst's doubles. This moves the 2p tuned HP from 30 to 28 but changes little else (the brackets in the table).

#### What changed in the files

- `sim.js`: `n6` is the default d6-family system (`SYS=d20,n6`); `SYS=d6` keeps the symbol system. New `HP` knob; `N6DICE` and `N6SOLO` documented. Triage burn fixed for n6.
- `cards.js`: no symbols, no key, no "players add". Mob and boss cards carry the bottom dice strip (`diceFor`, `slotsFor`); analyst cards show "Your doubles" as pip faces and the perk; the dice reference card shows the exact-match rule, doubles, the 6-only rule, "+1 die per player past 2" and the row.
- `paper/build.js`: the rules sheet rewritten for exact numbers; You need lists the four dice colours and the threat dice; HP 30. Still 4 pages, no overflow.
- `web/`: exact numbers throughout (see the web section).

### Standard d6 refactor (2026-10-30, history)

Superseded by [Exact numbers](#exact-numbers-2026-10-30). Kept as the record of the symbol system.

Custom symbol dice mean seven sticker sets or a custom die run. **"d6s will be easier to source, especially in a physical release."** So every die is now a normal pip d6.

#### The design

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

#### Results

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

#### Tested and rejected

- **Solo rolls three of their own dice:** 30% choice, 22-point spread, 30 rounds a shift.
- **A solo once-a-round reroll** (`SOLO_REROLL=1`): choice went from 37% to 38%. It's an extra rule for no real gain.
- **The nearest-odds 2d6 row** (`ROWMAP=near`): it collapsed every mob to 2–6 or 2–7, so nuisances and heavy hitters came back equally often. The tiered mapping keeps four tiers with the same comeback counts.

#### What changed in the files

- `sim.js`: pip d6s with per-analyst doubles are the default for `SYS=d6`, with the 2d6 tiered row. The custom dice sit behind `DICE=custom`.
- `cards.js`: the key, the doubles, `rowTop`, and pip faces drawn as real die faces. Mob and boss cards carry the key strip and "back on 2–N". Analyst cards show "Your doubles". The dice reference card shows the key, the 6-only rule, the double-or-guard rule and the row.
- `paper/build.js`: the sticker page is gone. The rules sheet covers the d6s, the key, doubles, the crew die, the 2d6 row and HP 23. The PDF is 4 pages.
- `web/`: pip dice with the symbol, per-analyst doubles, the amber pair with its sum checked against each row mob's number (a 2–12 track per row mob), and HP 23.

### Findings (custom symbol dice, history)

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

### Caveats (custom symbol dice, history)

- **These are bot results.** Whether matching symbols feels better than adding numbers is a question only a table can answer.
- **Crew-size scaling isn't tuned for d6.** Four players win only 27%, and solo beats two players. The prototype reuses the d20 extra-hits tables. With d6 those tables become "add N symbols for each analyst," which is a separate tuning job.
- **The Engineer's identity blurs.** Three doubles was the Engineer's whole thing, and the tuned Hunter and Responder dice now have three too. A d6 Engineer needs a new hook, for example agent dice that can roll doubles.
- **Situations aren't modelled.** The challenge cards ("roll 10+") would need d6 versions.
- **Components.** It needs 5 custom analyst dice, a balanced crew die and an agent die, plus symbol rows on every mob card. Blank d6s with stickers will do for a prototype.

### Recommendation (custom symbol dice, history)

Go to a paper prototype:

- **Dice:** sticker sheets for 5 analyst dice, 1 crew die and 1 agent die, using the tuned faces above.
- **Cards:** 6 mob cards and 1 boss with symbol rows.
- **Rules:** a one-page rules sheet.
- **Test:** run it with the cold-read script in `docs/PLAYTEST.md` against the same group playing today's d20 Quick Shift.

Convert the real game only if the table prefers it.

### Original test setup (2026-10-30)

The first d6 test played a cut-down shift in both systems. Superseded: situations are in, the Fixer and Recon are gone, and the kit is an item deck.

#### What both systems played

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
