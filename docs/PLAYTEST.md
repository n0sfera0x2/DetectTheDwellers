# Detect the Dwellers: playtest kit

Every balance number so far comes from a bot. This kit is for the first real tables. It tests three things the bot can't measure:

- can people learn the game from the cards and rules alone;
- how long a real shift takes;
- where people get stuck.

## What to bring

- The printed deck, from `npm run export:pdf` or a print-shop proof: 72 cards plus the marker sheet.
- 6 crew d20s in one colour, 3 agent d20s in a second colour, 1 amber row d20, and about 30 coins.
- One printed copy of the **Core rules** section of `docs/RULES.md`. Only the core rules: no Advanced modules and no Reference.
- A phone, or a laptop running the web game's **Copy result**, to time the shift.
- One observer sheet per table (below) and a pen.

## Session types

| Session | Players | Mode | What it answers |
| --- | --- | --- | --- |
| **Cold read** | 2–3 who have never seen the game | First Shift | Can the rules teach it with no help? |
| **Booth** | 2, with a host who teaches it out loud | Quick Shift | Does a booth game fit in 10–15 minutes, teaching included? |
| **Full table** | 4, who have played once before | Full Shift, Analyst | Do the advanced modules land, and does a 4-player Full Shift drag? |
| **Solo** | 1 | Quick Shift | Is solo fun, or just math? |

Aim for at least 3 sessions of each type before changing any rule. One table is an anecdote.

## Cold-read script

The host reads this out and then says nothing about the rules:

> "This is a co-op card game. Everything you need is in the deck and on this rules sheet. I'll watch and take notes, but I can't answer rules questions. If you get stuck, decide among yourselves and keep going. Tell me when you're ready to start, and tell me when you're done."

- Start the clock when they open the rules, and stop it when the shift ends.
- If they are stuck for 2 minutes or more, answer one question, and mark it on the sheet as **H** (help).
- Don't correct mistakes. Write them down. A rule the table plays wrong is a finding, not a failure.

## Observer sheet

Copy one per table.

```
Date ______  Session type __________  Mode __________  Players __  Analysts ______________
Rules opened ____  First flip ____  Shift ended ____   Result: WON / LOST at situation __ / boss

Minute | What happened                  | Tag
-------+--------------------------------+------
       |                                |
       |                                |
       |                                |
       |                                |
       |                                |

Tags:  H  needed help   R  went back to the rules   W  played a rule wrong
       P  long pause (30 s or more) before a decision
       F  fun moment (laughs, cheers, groans)
       B  bored or checked a phone
```

## Questions to ask after the shift

Ask each of these to the whole table and write down what they say, in their words.

1. What was the game about? *(The hook: listen for the persistence row, "things come back".)*
2. When did you feel smart? When did you feel the dice decided for you?
3. Did you ever guard? Why, or why not?
4. Which agent did you burn, and was it worth it?
5. Was anything fiddly on the table: coins, markers, the row, the tray?
6. Would you play again right now? Would you buy it?

## What to record

Paste the web game's **Copy result** line for the matching mode and crew, if you also played a digital round, and these numbers from the sheet:

- **Teach time:** rules opened to first flip.
- **Play time:** first flip to shift ended.
- **Count of each tag:** H, R, W, P, F, B.
- **Every W:** which rule, and how it was played.

## Targets and what to change if a table misses

| Measure | Target | If it misses |
| --- | --- | --- |
| Cold read: teach time | 5 minutes or less | Cut core rules text, or move a rule onto the reference card |
| Quick Shift: play time | 10–15 minutes | Fewer situations in Quick Shift (`deal.quick`) |
| Full Shift, 4 players: play time | 30 minutes or less | Fewer situations in Full Shift (`deal.full`) |
| W tags per session | 2 or fewer, and none repeating across tables | Rewrite that rule or its card text |
| R tags per session | 4 or fewer | Put that rule on a reference card |
| "Would you play again?" | Most of the table says yes | Read the F and B tags for where the fun drops |
| Win rate across real tables | Within about 15 points of the bot's rate for that mode | Retune HP. People play better or worse than the bot, and the bot is the stand-in, not the target. |

The targets are starting values from the design brief (10–15 minutes at the booth) and the audit plan (teach in 5 minutes). Real tables can and should move them. Record the date and number of tables next to any target you change, in `docs/DESIGN.md`.
