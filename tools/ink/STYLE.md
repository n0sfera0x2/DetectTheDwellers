# Ink & Static: style guide for the batch agents

You draw every scene with `ink-kit.js` (this folder), in the same hand as the four lead scenes in `scenes.js`: `mailer`, `sit_pager`, `HUN`, and `apt` / `_boss.apt` / `boss_apt`. Read `scenes.js` before you start; it is the worked example for everything below. Open `sheet.html` to see the target.

The look: a gritty dark-fantasy keep that happens to be a SOC. Black ink on paper, one light (the monitor), organic brush contours, hatching that wraps the form, grime, and one spot colour.

## The kit

```js
const kit = require('/private/tmp/claude-502/-Users-spencerbrown/931a85c5-8a15-471f-9bbd-faff6b9ebd88/scratchpad/redesign6/lead/ink-kit.js');
const { soft, rot } = kit;
// key: the scene's art key ('spray', 'kit_hunt', '_boss.ai' → 'Bai', print → '{{SID}}'). It suffixes every id.
const k = kit.scene({ key: 'spray', w: 200, h: 112, seed: 101, spot: kit.FLARE });
```

Give every scene its own `seed`. The same seed gives the same bytes every time.

| Call | What it draws |
| --- | --- |
| `k.shape(pts, { wob, chip, tension })` | An organic closed contour through hand-placed points: Catmull-Rom curves with baked wobble. `chip` (0–1) adds chipped notches. It returns `{ d, pts, bb }`. |
| `k.oval(cx, cy, rx, ry, { n, lump, rot })` | A lumpy oval (heads, sacks, pools, feet). |
| `k.fill(shape, tone, extra)` | Fills a shape. `tone` is one of `'ink'`, `'paper'`, `'spot'`, or `'h1'`/`'h2'`/`'h3'`/`'st'` (flat patterns, as a last resort). `extra` takes raw attributes, for example `' stroke="#07060A" stroke-width=".8"'` for a keyline. |
| `k.brush(pts, { w, w0, w1, tip0, tip1, tone })` | A tapered brush stroke along a smooth curve. `w` is the maximum width; `w0`/`w1` slope it (thick in shadow, thin toward the light); `tip0`/`tip1` set how sharp each end is (0 = needle, 1 = blunt). Use it for limbs, claws, horns, hems and rims. |
| `k.brushes([[pts, opts], …], tone)` | Many strokes in one element. Prefer it: it saves bytes. |
| `k.rim(shape, { from, to, w })` | A paper rim of light along part of a shape's contour (0–1 of the way round). |
| `k.hatch(shape, { a, gap, bend, w: [from, to], tone, broken, cover })` | Curved hatching clipped to a shape. `bend` bows each stroke round the form, `w` grows the weight across it, `broken` breaks strokes up, and `cover: [0, .3]` hatches only part of the shape (the shadow side). |
| `k.glow({ x, y, r: [r0, r1], a: [a0, a1], sy, step, w, clip })` | **The torch.** A paper pool of light with broken ink rings that thicken with distance: falloff as engraving, never a gradient. `sy` squashes the pool for floors and desks; `clip: {x, y, w, h}` keeps it on the wall or the floor. |
| `k.stipple(cx, cy, rx, ry, n, { tone, size, bias })` | Grit dots. Use paper on ink and ink on paper. |
| `k.drips(x0, x1, y, n, { len, w, tone })` | Tapered drips or rags hanging from a ledge or hem. |
| `k.tendril(a, b, { sag, curl, w, tip, thorns, segs })` / `k.tendrils([[a, b, opts], …])` | Cables, vines, roots or tentacles. Use them to tie a figure to its setting. |
| `k.rain(box, n, { slant, len, tone })` | Rain streaks, through windows only. |
| `k.smoke(x, y, h, { n, sway, w, tone })` | Rising wisps: smoke, ectoplasm, static. |
| `k.staticNoise(box, n, { sw, tone })` | Broken scanlines on screens. |
| `k.buzz(x, y, halfWidth, { rings })` | Vibration arcs. |
| `k.shadow(x0, x1, floorY, lightX, lightY, { len, spread, sy })` | A cast shadow from a footprint, thrown away from the light. |
| `soft(x, y, w, h, corner)` / `rot(pts, cx, cy, deg)` | Device outlines (screens, pagers, badges, rack units) with rounded corners, and rotation. Pass the result to `k.shape(…, { tension: .9 })`. |
| `k.add(...elements)` then `k.svg()` | Assembles the scene: ink ground, your layers in order, then paper grain. `k.svg({ view: { w: 200, h: 112 } })` renders a 400×170 boss as its 200×112 centre crop (that is how `apt` is made). |
| `k.R()` / `k.r(a)` | The scene's seeded random numbers (0–1, and ±a). Never use `Math.random`. |

Paint order: light pools, then floor and furniture, connectors, the shadow, the figure's back layers (sacks, tails, cloaks), the figure, rims, and the spot colour last. Raw `<circle>` or `<ellipse>` is fine for eyes and LEDs.

```js
// Mob skeleton (see mailer() in scenes.js)
k.add(k.glow({ x: 30, y: 64, r: [24, 130], a: [-82, 26], clip: { x: 0, y: 0, w: 200, h: 89 }, step: 4.8 })); // wall
k.add(k.glow({ x: 34, y: 86, r: [8, 140], a: [-8, 40], sy: .32, step: 5.5, clip: { x: 0, y: 89, w: 200, h: 23 } })); // floor
k.add(k.brush([[0, 89], [100, 88.6], [200, 89]], { w: 1.6 }));                    // floor line, a brush, not a rule
k.add(k.tendrils([[[30, 78], [98, 95], { sag: 7, thorns: 1 }]]));                 // cable roots from the altar to the feet
k.add(k.shadow(96, 136, 92, 30, 64, { len: 54 }));
const body = k.shape([[98, 44], [112, 34], [127, 39], [135, 54], [137, 72], [133, 87], [110, 87], [94, 74]]);
k.add(k.fill(body), k.drips(97, 134, 86, 6, { w: 2.4 }));
const arm = [[101, 50], [94, 60], [86, 79]];
k.add(k.brush(arm, { w: 6.6, tone: 'paper' }), k.brush(arm, { w: 4.4 }));        // paper gap, then the ink limb
k.add(`<ellipse cx="84.6" cy="40.4" rx="2" ry="1" fill="${kit.FLARE}"/>`);       // the threat's eyes
return k.svg();
```

## Rules

**Do**
- Build every figure from curves: `shape` for masses, `brush` for limbs, hems, horns and claws. Taper every stroke.
- Make the monitor the only light. It must appear in, or clearly just off, the frame. Draw it with `glow`, wall and floor separately, each clipped at the floor line.
- Separate overlapping masses with value: a paper gap (a wider paper brush under the ink limb), a paper rim, or a hatched mid-tone (`hatch` on a paper fill) against solid ink.
- Ground every figure. Give it a cast shadow, overlap it with furniture, and run at least one cable, root, smoke or rag from it into the setting.
- Add grime: `drips` on ledges and hems, `stipple` on floors, `chip` on stone and steel, broken hatching.
- Keep one readable tech prop: a monitor, rack, cable, phone, badge or keyboard.
- Carry the spot colour on an ink keyline or on ink, so it reads in greyscale. For cyan on paper, draw an ink stroke about 2× wider underneath (see the Hunter's crosshair).
- Aim for 0.60–0.72 ink coverage. Measure it as `lead/preview.js` does.

**Don't**
- No rectangles or straight-edged polygons as figures, bodies, sacks or furniture silhouettes. `soft()` is for devices only, and still goes through `shape`.
- No flat diagonal pattern fill (`h1`/`h2`/`h3`) over a whole wall or floor; that is the old prototype look. Use `glow` rings for light and `hatch` for form.
- No gradients, `opacity` fades, blur, filters, or soft glows or halos round shapes.
- No `href` between defs (`deck/cards.js` doesn't rename it), no `<style>`, no `<use>`.
- No second light source. Screens on devices (pagers, badges) are small and don't light the room.
- No cartoon faces: eyes only (two small spot dots in a void), no mouths or brows.
- No ruler-straight lines anywhere except screen content; draw floor lines and frames with `brush`.
- No spot colour on a hatched band, where it would vanish in greyscale.

**Shapes to avoid** (all seen in the pass-5 prototype): the box-shaped sack, the trapezoid coat, the stick-line arm, a rectangle monitor with a rectangle stand on a rectangle desk, square screen grids, flat 45° hatch bands, and a hard straight floor line.

## Motif bible

The night-shift tower is a haunted keep. Translate tech into dark fantasy, and keep the tech recognisable.

| Tech | Becomes | How to draw it |
| --- | --- | --- |
| Server racks | Crypt walls, ossuary niches, gothic arches | Racks as tall pointed-arch niches, with LED rows like votive candles in the niches. The rack aisle is a nave. |
| Cable bundles | Vines, roots, tentacles | `tendrils` with `thorns` creep over floors, climb pillars, hang from ceilings and root into figures. |
| Monitor | Altar, scrying glass, the torch | Set on a desk drawn as an altar slab (drips on its edge). The screen is the brightest paper in the frame, with static and wisps rising from it. |
| Screen wall / CCTV | Stained-glass reliquary | One lit arch divided by bent ink mullions (the `apt` boss). |
| Badge reader, LEDs | Wards and sigils | Small spot-colour marks only. |
| Lobby, doors | Keep gate, portcullis | Pointed arches and pillars that lean in from a low camera. |
| Floor | Flagstones in torchlight | `glow` with a low `sy` and wide rings, `stipple` grit, and drips. |

**Building a mob from its tech.** Start from the thing it abuses and make it a body:
- Mailer Daemon: hunched, made of mail, with horns through a mail cap, a sack of attachments and a cable tail.
- PowerShell Wraith: a hooded wraith whose robe is `smoke` rising out of a terminal.
- PsExec Swarm (hydra): heads that are service boxes on long `tendril` necks rooted in a rack.
- LSASS Siphon: a segmented leech of cable, latched onto a vault, with keys draining down its back.
- Kerberoast Enforcer: a horned brute in plate made of rack panels, roasting a ticket on a spit.
- Rootkit Implant: hooks and tendrils reaching up out of a cracked open box.

Keep the ART-BRIEF silhouette for each mob, but drawn organically.

## Composition by category

- **Mobs (200×112, flare).**
  - One creature, its mass centred near x 100, and its head or eyes inside x 70–130 so it survives the 60×112 crop.
  - The domain's place behind it, dim and in ink.
  - Light comes from a monitor at one side; the creature's silhouette sits against the lit wall.
  - Flare goes on the eyes and one sigil or seal at most.
- **Bosses (400×170, flare, plus the 200×112 crop via `svg({ view })`).**
  - The camera is on the floor, looking up. The light source is behind or above the boss, so it reads as a silhouette with paper rims.
  - Pillars or racks lean in; the long shadow comes toward the viewer.
  - Check the 200×112 crop and the 210×84 print panel.
- **Situations (200×112).** The desk-altar in a different state. The monitor is the torch, and the desk is lit with a squashed `glow`. Threat situations use flare; calm ones use amber, sparingly.
- **Analysts (200×112, cyan).**
  - One big hooded or cloaked figure in profile or from behind, rim-lit by its own screen, with its head inside x 70–130.
  - The screen shows the job in ink, with cyan on an ink keyline.
  - Plain wall lit by the screen's `glow`, a desk line, and cables rooting into the desk. No window.
  - Check at 96×58 and 96×96.
- **Kit agents (200×112, cyan).**
  - A small drone or familiar with one lens. The lens is a cyan dot on an ink ring.
  - It is doing its job, lit by a screen.
  - Make it a creature, such as a lantern-bearing imp or a mechanical owl, not a box with a lens.
- **Win scenes (`win_*`, `_win.*`).**
  - The boss scene's room and camera after the crew held: the threat is gone and screens show cyan marks.
  - Dawn comes through a window as paper with `rain` easing off. Paper and cyan only.
- **Card back.** The desk-altar at 2 AM with flare on the d20 face. Keep the top third quiet and the bottom 80 px plain.

## Budget and checks

- **Measured size:** the lead scenes are 7.9–14 KB at 200×112 and about 21 KB at 400×170. The brief's 9 KB / 12 KB starting budget can't hold this style at this level of detail. The lead's proposal to the coordinator is a target of about 10 KB (at most 14 KB) per 200×112 scene and at most 22 KB per 400×170 scene. That puts `data/art.json` at about 650–720 KB, against 520 KB.
- **To stay lean:**
  - Use `brushes`/`tendrils` lists rather than single calls.
  - Use a `glow` `step` of 4.5–5.5.
  - Keep `stipple` counts under 20 and use `thorns` sparingly.
  - Don't hatch the same shape twice.
- **Before you hand in:**
  - The SVG parses as XML.
  - Ids carry the key suffix and print uses `{{SID}}`.
  - Ink coverage is 0.60–0.72.
  - It reads in greyscale, and at 96×54 and 60×112.
