# Game audio

The sounds and music for Detect the Dwellers, made with ElevenLabs (sound effects with `eleven_text_to_sound_v3`, music with `eleven_music_v2_5`), one take each. The first full set was generated on 2026-11-25. The page plays them (`Sound` in `game/web/ui.js`), with the synthesised sounds as the fallback for any clip that’s missing.

| Path | What it is |
| --- | --- |
| `prompts.json` | Every clip: its prompt, length and the moment in the game it plays. The source of truth, like `game/art/sprites/prompts.json`. |
| `sfx/<id>.mp3` | Sound effects, one file per `sfx` entry |
| `music/<id>.mp3` | Music, one file per `music` entry. A looping track may record `loop_start` and `loop_end` (seconds) in its `prompts.json` entry once it’s trimmed. |
| `status.js` | `node game/audio/status.js`: what has been made, what’s left, the ElevenLabs credits it will cost, and a check that every card has its sounds |

## What’s in the list

**79 sound effects:**
- Dice (7): roll, land, exact match, double, reroll, miss, and the row roll.
- The table (16): card flip, situation, damage, knockout, heal, guard, fight won, Baseline it, tuck, an alarm going on the row, an alarm coming back off the row, item draw, the boss reveal, shift won, shift lost and a button click.
- Keywords (2): Regen and Escalating.
- Analysts (4): one ability sound each.
- Agents (5) and consumables (6): one sound each, played when it acts or is used.
- Alarms (30): an arrival sound and a hit sound for each of the 15.
- Bosses (9): arrival, hit and beaten for each of the 3.

**12 music tracks:** the title (login and splash) screen, the deal, the feed between cards, situations, Full Shift story cards, a fight with one alarm, a multi-alarm fight, one theme per boss, and the shift won and shift lost endings. Every track loops except the two endings.

Each prompt starts with the shared style in `style.sfx` or `style.music`, so the set sounds like one game.

## Making it

The full set costs about 12,100 ElevenLabs credits at one take each: about 340 for the sound effects (about 3.4 a second charged, though the estimate says 10) and 11,775 for the music (15 a second charged, though the estimate says 25; 785 seconds in all). The Starter plan gives 40,000 a month. The steps are in `prompts.json` under `_how`. To redo one clip, delete its file, generate it again from its entry, then rerun `status.js`. ElevenLabs has no loop tool, so a looping track loops whole until someone trims it.

`status.js` reads the cards from `game/art/sprites/prompts.json`. When a card is added there without its sound entries, the script exits 1 and names the missing clips.

## In the page (2026-11-25)

- **Sound effects are inlined.** `game/web/build.js` puts every `sfx/<id>.mp3` in the page as a data URL (`window.CD_SFX`), so the page grew from about 2.2 MB to 6.1 MB and still plays offline.
- **Music loads from files.** The page asks for `audio/music/<id>.mp3` next to itself, then `../audio/music/<id>.mp3` (the repo layout). `pages.yml` copies the music to `audio/music/` on the site. `npm run serve` now serves `game/` and opens `/web/`, so the repo path works locally.
- **What plays when.** Music follows the screen: the title, the deal, the feed between cards, a situation or story card, a fight (multi-alarm with two or more alarms), the boss’s theme, and the shift won or lost. Every sound effect has a cue in `game/web/ui.js`: most come from the state before and after an action (`diff` and `effects`), the agents from `G.acts` and the engine’s log lines, and the item, reroll, tuck and ability clips from the button pressed (`ACT_CUE`, `itemCue`). Menu and setup clicks tick (`UI_CLICK`).
- **Two switches.** Settings has Sound effects and Music, each remembered on its own.
