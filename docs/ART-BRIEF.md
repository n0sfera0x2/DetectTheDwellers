# Art brief: SOC noir

This brief is for anyone who paints the final art for Detect the Dwellers. It sets the world, the cast and the rules. The vector scenes in `data/art.json` and `data/art-print.json` are placeholders drawn to this brief. Match their composition and replace their finish.

## The world

It’s 2 AM in the SOC. The room is dark. Light comes from screens, status LEDs and the threat itself. Rain runs down a black window. The coffee went cold an hour ago.

The city can appear only far away, through a window. No skylines in front. No perspective grid floors. No neon glow halos around shapes or type.

## The recurring image: the desk

The analyst’s desk is the anchor of the whole game. It shows up on the intro screen (`hero`), on every situation card (one scene each, see below) and behind every analyst.

- A row of monitors with alert queues. One row is hot.
- A cold coffee mug. A desk phone or pager.
- A window with rain and a few far city lights.
- A wall clock at 2:14.

## Palette and light

Keep to the three accents on a near-black night. Neutrals are dark grey-violet steps from the background. Add no other hue.

| Token | Hex | Use |
| --- | --- | --- |
| Background | `#07060A` | The room. |
| Ink | `#F3E9E2` | Teeth, badges, paper, highlights. |
| Muted | `#B9A99E` | Rain, cables, steel. |
| Flare | `#FF5A2A` | The threat. Mobs and bosses only. |
| Amber | `#FF9B54` | Warnings, HUD marks, gold, fire, keys. |
| Cyan | `#38E1FF` | The crew and its tools. Screens, drones, rim light. |

Light rules:

- Every light has a source you can see: a screen, an LED, a lit door, a fire.
- The threat lights the floor under it. That pool is offset and soft, never a ring around the shape.
- People are dark shapes rim-lit cyan by the screen in front of them.
- Orange belongs to the threat. Cyan belongs to the crew. Never swap them.
- Amber marks the persistence row and every comeback, on web and print alike. Any art that shows the row or a mob coming back uses amber for it, never cyan.

## The four domains

Each domain is a place. Mob scenes in a domain share its backdrop, dimmed so the mob reads first.

- **Identity: the lobby after hours.** Back wall, steel elevator doors, turnstiles with badge readers. One red LED says denied.
- **Endpoint: a laptop on a desk.** The laptop glows cyan on the left. Window and rain on the right. A cold mug.
- **Cloud: a rack aisle.** One-point perspective down a cold aisle. Cabinet LEDs, a cable tray overhead, one reflection on the floor.
- **Network: fiber and patch panels.** Two patch panels across the top. Copper cables droop. Thin fiber strands catch the light.

## No faces

Threats have no faces. No eyes, no brows, no grins, no mouths, no cartoon expressions. This is noir, not Saturday morning.

Threat comes from light, shape and posture:

- An orange mass lit from above that falls into shadow at the floor.
- A hard amber rim on the back edge, as if lit from behind.
- A hard cast shadow on the floor, thrown to the right, beside the soft orange pool the threat throws under itself.
- Where a face would be, use a glowing aperture: a visor slit, a status LED, a lit seam, a void under a hood, an iris.

Crew drones keep their single cyan lens. That lens is a tool, not a face, and it is never orange.

## Mobs

Each mob is a single bold orange silhouette that reads at thumbnail size (check at 96×54). If two mobs look alike in silhouette, one of them is wrong. Nothing in the cast is a sheet ghost.

The centering rule: the whole silhouette sits inside the central 60% of the frame width (x 40 to 160 of 200), with its mass centred near x 100, and its head or top inside y 14 to 98. On a phone the web card shows the art as a tall portrait crop, sometimes only the middle 60 units of the width. A figure off to one side loses its head or half its body there. Props and accents (a vault, a bucket, a dialog, a spray of asterisks) may sit outside the band, because cropping them leaves the threat whole. Check every mob at 112×112, 84×112 and 60×112 centre crops as well as 96×54.

| Card | Domain | Silhouette | Accent |
| --- | --- | --- | --- |
| Mailer Daemon | Identity | An envelope torn open along a serrated flap. Light pours out of the slit. | A stream of returned envelopes behind it. A bounce-back arrow. |
| Password Sprayer | Identity | A hunched hooded figure with one spray can. The hood is a void. | A cone of asterisks fanning across the doors. |
| MFA Banshee | Identity | A tilted handset, shaking, screen lit with an Approve prompt. | Push prompts with orange Approve buttons radiating out. Buzz marks. A badge count. |
| Kerberoast Enforcer | Identity | A broad, horned brute. One amber visor slit. | A service ticket on a spit over an RC4 fire. |
| Golden Ticket Ghost | Identity | A forged ticket on a lanyard nobody wears, hovering at the turnstile. | A counterfeit seal, cracked. Faint offset copies of the ticket. The reader LED turns amber. |
| Macro Gremlin | Endpoint | A .docm page with a lit gear cut through it. | Claws at the bottom edge gripping the amber Enable Content bar. |
| PowerShell Wraith | Endpoint | Orange smoke curling up out of a terminal window. | A `>_` prompt. A grey disk drive the smoke never touches. |
| Living-off-the-Land Scavenger | Endpoint | A hooded cloak, the hood a void. A sack of borrowed tools. | A staff that sprouts leaves. |
| Rootkit Implant | Endpoint | A process window on the floor, lid prised open, light spilling up. | Dark hooks hanging over the lip. Window dots and fake svchost text on the lid. |
| LSASS Siphon | Endpoint | A segmented leech rearing up from the floor in the middle of the frame. | Latched onto a grey credential vault. Keys drain along its back. |
| PsExec Swarm | Endpoint | One trunk, five necks, each head a service box with one status LED. | A cut neck that grows two new heads. |
| Vibe Coded App | Cloud | A leaning stack of blocks with one crack running down it. | An amber deploy LED on top. Keys dangling on strings. |
| OAuth Consent Grifter | Cloud | A lanky horned figure in silhouette, lit only by the dialog it holds up. | A giant consent dialog with a big Accept button. |
| DNS Beacon Drone | Network | A flat quad drone, rotors spinning, a row of LEDs on its rim. | Sonar arcs on both sides, pinging subdomain tags. |
| Exfil Courier | Network | A young serpent, head a plain wedge. | A 40 GB parcel on its back. A cloud bucket ahead. |

## Bosses

Bosses fill the frame. No skyline, no backdrop showing around them. They are drawn at 400×170 and cropped for smaller frames, so keep the subject in the middle.

- **The Lockjaw Syndicate (Endpoint).** Ransomware, not a monster. The SOC wall has gone dark orange, screen by screen, each one a hex dump with a small amber padlock on it. The main monitor in the middle shows the ransom note: an orange header bar, lines of demand text, a big seven-segment countdown (47:59:58) and a wallet field with an amber Pay button. On the left monitor a file tree is locked file by file; on the right one, encryption sits at 100 percent over a grid of orange files. Two empty chairs face the desk, rim-lit by the screens, and the note throws an orange pool on the desk. The padlock appears only as a small emblem. No faces, no teeth.
- **The Persistent Operator (Identity).** A figure in the lit lobby doorway. Its shadow runs down the floor to your feet. A fan of cloned badges in one hand.
- **The Rogue AI (Cloud).** A camera iris at the end of the rack aisle, six blades closing on a lit core. Not an eyeball. Every LED has turned orange. Cables run from the iris into the racks.

## Win variants

When the crew holds the line, the win end screen shows the same place as the boss scene, a few minutes later. Keys: `win_wyrm`, `win_apt`, `win_ai` (200×112) and `_win.wyrm`, `_win.apt`, `_win.ai` (400×170, the same shape as `_boss`). The web falls back to the boss art if a key is missing.

The rules for every win scene:

- Same room, same camera, same furniture. The player has to recognise the place in one look.
- The orange threat light is gone. At most one small ember stays: a dim padlock, a stray orange LED, a dropped badge.
- Screens and status lights go cyan. Cyan is the crew; the room is theirs again.
- Dawn shows in any window the room has.
- No faces, no people celebrating. The win is in the state of the room.
- It must read as a victory at 96×54, next to the boss scene.

| Key | What changed |
| --- | --- |
| `win_wyrm` | The Lockjaw wall is back to cyan, each screen with a small check. The main monitor has a cyan header, a big cyan check and the countdown stopped at 00:00:00 over a full restore bar. The file tree and file grid are cyan again. The chairs are rim-lit cyan. A fresh coffee steams on the desk. One dim padlock remains on the far-left screen. |
| `win_apt` | The lobby door is shut: two dark steel leaves, a cyan lock bar and a cyan check panel. The badge reader beside it shows a cyan LED and check. Dawn comes up in two high windows either side of the door. The cloned badges lie on the floor where the operator dropped them. Turnstile LEDs are cyan. |
| `win_ai` | The iris is shut, six blades meeting in the middle with no core. Its cables are dead grey. The ring and ticks are dim cyan, three cyan status lights sit under it, and the racks are back to cyan with a few orange embers. |

## Situations

Every situation card has its own scene, keyed `sit_<id>`. Each is the 2 AM desk, or a spot next to it, in a different state. The web game and the print deck both use `sit_<id>` and fall back to the type scene (`fp`, `event`, `gear`, `esc`).

| Key | Card | What the desk shows |
| --- | --- | --- |
| `sit_travel` | Impossible Travel | A world map on the monitor. A cyan home pin and an orange Lisbon pin, joined by a dashed arc, eight minutes apart. |
| `sit_coffee` | Coffee Run | A carrier tray of four cold brews with straws on the desk. The queue on screen is calm. |
| `sit_blast` | Marketing Blast | The mail queue on screen is all orange envelopes. More pour off the bottom of the screen and pile on the desk. |
| `sit_patch` | Patch Tuesday | Four progress bars crawling, one done. A big quiet window of rain. A coffee still steaming. |
| `sit_ciso` | CISO Wants a Briefing | A slide on the big screen with one orange bar and the laser dot on it. Five slide thumbnails below. An analyst watching. |
| `sit_intel` | Threat Intel Drop | A feed arriving: a download bar and indicator rows. One row is struck through with a cyan check. A printout curls out of the printer. |
| `sit_pentest` | Pentest Day | A stranger in a cold-lit doorway. An orange red-team badge left on the desk. The queue on screen shows nothing. |
| `sit_pager` | Pager Storm | Every row on the monitor is orange. Seven pagers and phones light up across the desk, buzzing. |
| `sit_budget` | Budget Approved | The one small win. An approval dialog with a cyan check and button, a stamped purchase order, an open crate with two new agents. Cyan, never green. |

## Analysts

People at consoles, seen from behind or in profile, rim-lit cyan. Each one has a pose and a screen that says the job.

The web intro shows analysts at about 96×58 and the end-screen roster crops them square. So each scene is one big silhouette (head about a ninth of the frame height) and one screen, both inside the middle 112 px, on a plain wall with a desk line. No window, no clutter. The screen lights the wall behind it and the desk under it. Check every analyst at 96×58 and 96×96.

- **Hunter.** Leans into the screen. A graph with one spike under a crosshair.
- **Responder.** Standing, phone to ear, pointing at the alert. A go-bag at the feet.
- **Engineer.** Detection as code. Brackets and rules on the screen. An open rack behind.
- **Soarcerer.** Hands up, conducting a playbook that floats above the desk as a flow of nodes.
- **Fixer.** The medic. Brings a med case and two coffees to the crew.

## Kit: AI agents

Kit cards are AI agents. Draw them as small cyan drones or console daemons with one lens for an eye. Each one does its job in the frame.

- **Triage:** sorts tickets into three stacks.
- **Hunt:** a searchlight finds a trail of orange footprints.
- **Containment:** lowers a cage over an orange blob.
- **Enrichment:** links out to tag cards (IP, hash, geo, whois).
- **Patch:** lays a patch over a crack.
- **Recovery:** a heartbeat line and a health bar filling up.
- **Decoy:** a honeypot jar. An orange bug heads for it.
- **Recon:** a radar sweep with blips.

## Card back

One back for every card: the 2 AM desk itself. A monitor with the alert queue (one row hot) lights the wall and the desk. A dark window with rain and a far city sits to the left, the wall clock reads 2:14 on the right, an amber sticky note clings to the bezel, and a cold mug waits by the keyboard. A shaded d20 rests on the desk beside the keyboard, lit cyan on the side that faces the screen, its facing triangle orange with a 20 on it.

The title text and the footer lines are set by the deck template, not the art. Leave the top third quiet for the title and the bottom 80 px as plain desk for the footer. Keep everything that matters at least 24 px from every edge of the 240×336 card: the template fades the outer 22 px to the night ground for bleed and duplex drift.

## Frames and crops

- Scenes are 200×112. Web panels crop them tall and narrow (on a phone, as narrow as the middle 60 units of the width). Print shows them at 210×86. Keep the subject inside the central 60% of the width (see the centering rule under Mobs). The web may also set a per-scene focal crop; the centering rule means the default centre crop already works.
- Bosses are 400×170 for the banner and print. The 200×112 version is a center crop. Win variants follow the same pair (`_win.<id>` and `win_<id>`).
- Print bosses and the back mark ids with `{{SID}}`.
- Every gradient id in `data/art.json` carries its scene key as a suffix, so scenes can share a page.

## What the placeholders are

The scenes in this repo are flat vector placeholders from a generator script. They fix composition, silhouette, palette and light for each card. A commissioned artist should keep those four and replace the drawing.

## Ink & Static (proposed)

A proposed art direction, prototyped on three cards for a go or no-go call: Mailer Daemon (`mailer`), The Persistent Operator (`_boss.apt` and `boss_apt`) and Pager Storm (`sit_pager`). Nothing in `data/art.json` or `data/art-print.json` has changed yet. If it is approved, it replaces the finish of every scene. The composition rules above (the centering band, the crops, the boss frame, the `{{SID}}` ids) stay.

It takes its cue from the black-and-white ink tradition of old-school tabletop RPG books and zines: heavy blacks, one light, hatched mid-tones and a hand-inked line. Work from those traits. Don't copy any one book, artist or illustration.

### The seven traits

1. **One light per scene: the monitor glow.** It is the torch. Every lit surface faces it, every shadow runs away from it, and nothing else in the room gives light. In the lobby it is the reception terminal or the CCTV wall; at the desk it is the screen. The screen itself is the brightest paper in the frame.
2. **Heavy blacks.** About two thirds of the art box is solid ink. Shapes read as silhouettes against the lit area, never as lit objects against a dark one. If you fill in a shape and it still reads, it was the right shape.
3. **Hatching and stipple for mid-tones.** No gradients, no soft glows, no transparency fades. Light falls off in bands: bare paper, then light hatch, then dense hatch, then crosshatch, then ink. Stipple is for dim floors and rough surfaces.
4. **A rough, hand-inked line.** Contours wobble slightly and band edges are ragged, as if brushed. Paper grain shows faintly through the blacks. No ruler-straight edges except where the object is a machine (bezels, screens), and even those wobble a little.
5. **Mobs are monster-manual creatures.** Each threat is drawn as a creature you could stat up: the Mailer Daemon is a hunched postman daemon, horns through its mail cap, a bulging sack of attachments on its back, claws past its knees and a barbed tail. Keep the one-silhouette-per-mob rule; the creature has to read when filled solid black at 96×54.
6. **Bosses from a low camera.** Put the camera on the floor, looking up. Columns lean in toward the top, the figure towers and its head is small, and its shadow runs down the floor to the viewer.
7. **Spot colour: flare only.** Black ink on paper. Flare `#FF5A2A` appears only on the threat: its eyes, a seal on its mail, a countdown, a badge chip, a reader LED, the alert rows on a hot screen. No cyan, no amber, no other hue inside the art box. The card frame and labels keep their own colours.

### The pattern set

Four tones, shared by every scene, so the whole deck has one texture. In SVG they are four `<pattern>`s, all hatching at the same angle (about 38 degrees, falling left to right):

| Tone | What it is | Use |
| --- | --- | --- |
| Hatch 1, light | Thin lines, wide spacing (about 3 units apart at 200×112). | The first falloff band next to the light. Screens one step away from the brightest. |
| Hatch 2, medium | Heavier lines, closer (about 2 units). | Middle falloff. Lit floors near a wall. |
| Hatch 3, dense | Crosshatch, tight. | The last band before solid ink. |
| Stipple | Scattered paper-coloured dots on ink. | Dim floors where the light just reaches, rough textures. A smaller, rotated copy at low opacity is the paper grain over the whole frame. |

A painter working by hand should keep to the same four steps and the same hatch angle, so a commissioned card still sits beside the vector ones.

### The spot-colour rule

Flare is the threat and nothing else. If a mark is flare, it is part of the threat or something the threat is doing. At most a handful of flare marks per scene, small and hard-edged, never a wash or a glow. The light source is never flare: the torch is paper.

This changes one rule in "No faces" above: a threat may show two small flare eyes in a void (under a brim, a hood or a hat). Still no mouths, brows, teeth or expressions.

### The greyscale rule

Every scene must still read when printed in greyscale on a home printer. Flare prints as a mid grey, so it can never be the only thing that carries a shape. Put flare on ink or paper, never on a hatched band where it would vanish. The silhouette and the light have to tell the story on their own, with flare as the accent. Check every scene through a greyscale filter at print size (210×86) before handing it in.

### Prototype notes

- The three prototype scenes are 7.0–9.0 KB each, against 2.3–5.0 KB for the current placeholders. The roughness is baked into the paths. A live `feTurbulence` plus `feDisplacementMap` filter gives the same look but cost more to paint on a phone, so don't use one in shipped art.
- Scenes stay at 200×112 (mobs, situations) and 400×170 (bosses), with the subject in the central band, so they drop into the existing keys.
