# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

Detect the Dwellers: a co-op dice-and-card game (1–4 players) set on a cyberpunk SOC night shift.

**The game lives in `game/`.** Its README opens with the current rules, card set, sim numbers and open items; read that first. Design reviews, sims and balance work target it (`SYS=n6 HP=11 node game/sim.js` for Quick Shift, `MODE=full SYS=n6 HP=15` for Full).

| Path | What it is |
| --- | --- |
| `game/sim.js` | The bot and balance sim. `SYS=n6` is the game; knobs in the README. |
| `game/cards.js` | The card markup and per-card rules text, shared by the print-and-play PDF and the web page (card parity). |
| `game/web/` | The playable page: `engine.js` (DOM-free, seeded), `ui.js`, `ui.css`, `build.js` (writes `index.html`, one self-contained file), `spec.js` (`node --test game/web/spec.js`). |
| `game/paper/build.js` | The rules sheet and 63 cut-out cards as a PDF. |
| `game/art/` | The consumables' Ink & Static scenes. |

A rule change touches the sim, `web/engine.js`, `cards.js` (and the paper rules sheet), then the README: update **The rules now** and **Where it stands** (check the **Targets** table), and add a dated section under History. Rebuild the page (`node game/web/build.js`) and the PDF (`node game/paper/build.js`), and run `node --test game/web/spec.js` and `npm test`.

**Shared files the game reads:** `data/cards.json` (alarms, bosses, situations, analyst names), `data/art.json` and `data/art-print.json` (scenes, made by `tools/ink/`), and `deck/render.js` and `deck/browser.js` (fonts and the PDF browser). Change them with care: the older build below reads them too.

**An older build** lives in `src/`, `ui/`, `sim/`, `test/`, `scripts/`, `dist/` and `deck/cards.js` / `deck/build.js`. Leave it alone unless asked. `npm test` still runs its suites (engine, print snapshot, a balance gate) and must stay green.

```bash
npm install            # once; jsdom and Playwright for the tests and the PDF
npm run serve          # build the game's page and serve it on localhost:8080
npm test               # the older build's suites; run with node --test game/web/spec.js
```

## Writing style

Card and rules text is punchy and plain: short sentences, second person, no corporate voice. Rules use the same words everywhere ("on point", "off-shift", "persistence row", "comes back", "burn it"). The enemies are **alarms** (a fight with two or more in play is a multi-alarm fight); player-facing text never says mob or monster. Code and data keys still say mob (`mobs`, `mobAdd`, `kind: 'mob'`): leave those. Use typographic apostrophes and en dashes in ranges (1–8).

## Hosting

The game's page is one file with no server. `.github/workflows/pages.yml` publishes it, with the print-and-play PDF, to https://n0sfera0x2.github.io/DetectTheDwellers/ whenever `game/web/index.html` or the PDF changes on `main`.

## Game Studio framework

This repo also carries [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) 1.2.0 (MIT, `.claude/LICENSE-claude-code-game-studios`): 74 skills, 49 agents, hooks and rules under `.claude/`, configured by `project.yaml`. The sections above win where they conflict with it.

- **Engine:** none. The game is plain JavaScript and HTML with Node tooling, so ignore the Godot, Unity and Unreal specialists and `docs/engine-reference/`.
- **Start here:** run `/start` once to set `modes.rigor` and `modes.automation` in `project.yaml`, or `/adopt` to audit this existing project against the studio's formats.
- Hooks, deny rules and the ask-first mode load only when Claude Code starts in this folder.

### Project structure

@.claude/docs/directory-structure.md

### Coordination rules

@.claude/docs/coordination-rules.md

### Collaboration protocol

**User-driven collaboration, not autonomous execution.** Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools (exempt: `active.md` appends, agent memory, a subagent's new file at the path its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in plain text and wait

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for the full protocol.

### Coding standards

@.claude/docs/coding-standards.md

### Context management

Read `.claude/docs/context-management.md` on demand. Two conventions are load-bearing:

- **`production/session-state/active.md` is the session checkpoint.** Read it first after any compaction, crash, or `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.**
