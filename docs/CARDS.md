# Card list

Generated from `data/cards.json` by `npm run cards`. Don't edit by hand.

**54 cards:** 15 mobs and 9 situations (the shuffled situation pool), 3 bosses, 5 analysts, 16 kit cards, 4 HP trackers, 2 double-sided reference cards.

## Starting HP (each analyst, any player count)

| Recruit | Analyst | Veteran | Quick Shift | First Shift |
| --- | --- | --- | --- | --- |
| 64 | 52 | 41 | 40 | 31 |

## Keywords

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

## Mobs

Printed hits are for two players. In play: printed + analysts − 2, never below 1. Each mob comes back from the persistence row when the row die lands in its Back range.

| Mob | Domain | Def | Hits | Dmg | Back | Keyword |
| --- | --- | --- | --- | --- | --- | --- |
| Mailer Daemon | Identity | 12 | 3 | 1 | 1–10 | Beacon |
| Macro Gremlin | Endpoint | 13 | 3 | 1 | 1–9 | Targeted |
| Password Sprayer | Identity | 12 | 3 | 1 | 1–10 | Piercing |
| MFA Banshee | Identity | 12 | 3 | 1 | 1–10 | Stalker |
| Vibe Coded App | Cloud | 13 | 3 | 1 | 1–9 | Escalating |
| PowerShell Wraith | Endpoint | 14 | 4 | 3 | 1–7 | Fileless |
| Living-off-the-Land Scavenger | Endpoint | 13 | 4 | 3 | 1–8 | Evasive |
| DNS Beacon Drone | Network | 13 | 4 | 3 | 1–8 | Beacon |
| OAuth Consent Grifter | Cloud | 14 | 3 | 3 | 1–6 | Targeted |
| Rootkit Implant | Endpoint | 14 | 5 | 4 | 1–5 | Regen |
| Kerberoast Enforcer | Identity | 16 | 5 | 4 | 1–5 | Piercing |
| LSASS Siphon | Endpoint | 15 | 4 | 4 | 1–6 | Regen |
| PsExec Swarm | Endpoint | 14 | 5 | 4 | 1–6 | Beacon |
| Golden Ticket Ghost | Identity | 15 | 5 | 4 | 1–4 | Evasive |
| Exfil Courier | Network | 15 | 4 | 4 | 1–5 | Escalating |

## Situations

| Situation | Type | Rule |
| --- | --- | --- |
| Impossible Travel | challenge | On point: roll 10+ in one attempt. Pass: draw a kit card. Fail: you lose 2 HP. |
| Coffee Run | event | Everyone heals 3 HP. |
| Marketing Blast | choice | Choose one. Everyone triages: everyone loses 1 HP / On point takes it alone: they lose 3 HP |
| Patch Tuesday | choice | Choose one. Take a breather: everyone heals 2 HP / Raid the supply locker: draw a kit card |
| CISO Wants a Briefing | challenge | On point: roll 12+ in one attempt. Fail: you lose 4 HP. |
| Threat Intel Drop | event | Discard one mob from the persistence row. |
| Pentest Day | challenge | Everyone rolls once. Anyone under 8 loses 2 HP. |
| Pager Storm | event | Everyone loses 2 HP. On point loses 2 more. |
| Budget Approved | event | Draw two kit cards. |
| The Badge That Wasn’t | challenge | On point: roll 12+ in one attempt. Fail: you lose 4 HP and roll for the row. |
| Lateral Whispers | event | Roll for the row now. Anything that comes back, you fight after this. |
| The CEO’s Inbox | choice | Choose one. Quarantine everything: everyone loses 2 HP / Let it ride: the next mob you flip gets +2 Damage |
| Ghost in the Change Window | event | The next mob you flip has +3 Defense. |
| Dark Web Chatter | event | Draw a kit card. |
| The Janitor’s USB | challenge | Everyone rolls once. Anyone under 10 loses 3 HP. |
| Old Case, New IOC | event | The mob in the row with the widest range comes back now, with no arrival hit. Fight it after this. |
| Honeytoken Tripped | event | Everyone heals 2 HP. |
| Vendor Breach Notice | event | Everyone loses 2 HP. Then roll for the row. |

## Bosses

Hits = printed + 1 per analyst. Agents can't hit the boss.

| Boss | Domain | Def | Hits | Dmg | Ability |
| --- | --- | --- | --- | --- | --- |
| The Lockjaw Syndicate | Endpoint | 16 | 7 + n | 9 | Double extortion: +2 damage until it has taken two hits. At the end of every round it’s still up, roll for the row. |
| The Persistent Operator | Identity | 15 | 7 + n | 9 | Living off your network: The first time you beat it, it comes back with 2 hits left. Every double that hits it rolls for the row. |
| The Rogue AI | Cloud | 17 | 6 + n | 9 | Hostile takeover: Agents can’t roll while it’s in play. Burning one rolls for the row. |

## Analysts

| Analyst | Trait | Perk |
| --- | --- | --- |
| Hunter | Threat hunter | +5 against mobs that came back from the row. |
| Responder | First responder | +5 against the highest-damage mob in play. |
| Engineer | Detection as code | Your doubles are 16–20, not 18–20. |
| Soarcerer | Orchestrator | +1 slot in the crew kit tray. |
| Fixer | Medic | Off-shift, heal 3 HP split across the crew instead of 1 for yourself. |

## Kit (2 of each, shared crew tray of 5, 6 with the Soarcerer)

| Agent | Run it | Or burn it |
| --- | --- | --- |
| Triage Agent | Rolls every round at +4 against any mob. | Roll three extra dice this round, with your bonus. |
| Hunt Agent | Rolls every round at +7, but only against a mob that came back from the row. | A mob that came back from the row (not the boss) is beaten. |
| Containment Agent | Each round, the highest-damage mob deals 2 less damage, never below 1. | Every mob in play takes 1 hit. |
| Enrichment Agent | Every analyst gets +3 against every mob. | This round, every analyst die gets +5. |
| Patch Agent | When you roll for the persistence row, roll an extra die and keep the highest. | Discard one mob from the persistence row for good. |
| Recovery Agent | After every fight, heal 4 HP split across the crew. | Heal 6 HP split across the crew. |
| Decoy Agent | Once per fight, after the roll: the analyst on point takes no damage this round. | After the roll: everyone blocks this round. |
| Recon Agent | Peek at the next situation before picking who’s on point. A mob you peeked: everyone gets +5 against it. A story card: you get its Recon line. | Look at the next 3 situations and pull one from the feed for good. |

## First Shift (tutorial)

Situations in order: MFA Banshee → Patch Tuesday → Macro Gremlin → Impossible Travel → DNS Beacon Drone → Coffee Run. Boss: The Lockjaw Syndicate. Kit on top: Recovery Agent, Triage Agent.
