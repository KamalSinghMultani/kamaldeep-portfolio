# Portfolio and quick resume animation experiment

The default page is the reversible comic portfolio. **Quick resume** opens
`quick.html`, with projects, experience, skills, education, contact links, and a
one-page PDF available without unlocking anything.

On `experiment/portfolio-minigame`, the quick view uses one interactive Three.js
systems workshop with a rigged robot, blended walk/idle/greeting clips, grounded
shadows, and a small pointer-driven camera response. **Say hello** triggers a
one-shot greeting; **Replay** restarts the sequence. The interface uses consistent
type, buttons, spacing, and surfaces. The former six polygon illustrations have
been replaced by this single scene.

`site/quick-motion.js` handles UI and motion preferences. The locally served
`site/quick-workshop.mjs` handles rendering, while `quick-workshop-core.mjs` owns
the choreography and visible-time clock. Reduced motion starts still. Pause,
offscreen suspension, and hidden-tab suspension retain the current playhead.
WebGL or model failure leaves a static workshop fallback and the complete resume.
The scene is silent and pixel density is capped at 1.5.

The character is the credited CC0 RobotExpressive by Tomas Laulhe (Quaternius),
with modifications by Don McCurdy; the workshop geometry and sequence are local
code. See [animation research and attribution](design/ANIMATION-RESEARCH.md).
This branch is a prototype for visual review; the public Pages site stays on
`main` until it is merged.

The root/index page always loads the cinematic portfolio; quick access is an explicit link, not a remembered default mode. Tutorial discovery progress remains in local storage when switching views.

## Build and preview

Requires Python 3.13 and Node.js 22. Install PDF dependencies with `python -m pip install -r requirements.txt`, then run `python site/build.py`.

The build refreshes the cinematic page, quick page, and PDF together. Project and role content for the quick view is extracted from the existing résumé definitions, rather than maintained as a second project list. Generated deployment files are in `dist/site/`.

Preview the production output with `python -m http.server 8766 --bind 127.0.0.1 --directory dist/site`. The cinematic page is `/`; the recruiter link is `/quick.html`. GitHub Actions builds, validates, and deploys passing main-branch releases to GitHub Pages.

## Validation

Install validation dependencies with `python -m pip install -r requirements-dev.txt`, build with `python site/build.py`, then run all checks with `python tools/check.py`. The release check starts and stops its own local HTTP server.

## CI/CD and contribution workflow

Pull requests to `main` run the production build, all eight JavaScript checks, and the HTML/link/HTTP/PDF release checks. Passing pushes to `main` deploy `dist/site/` to [GitHub Pages](https://kamalsinghmultani.github.io/kamaldeep-portfolio/). Manual runs from the Actions tab also support deployment from `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for local commands, branch naming, Conventional Commits, deployment setup, and rollback instructions. Generated release files stay out of Git and are rebuilt by CI. Actions use pinned commit SHAs, with weekly Dependabot updates.

The cinematic page canvas drawing is capped near 30 FPS for narrow scene areas and 60 FPS for wider ones. Weather and the reversible playhead still advance independently. The canvas exposes `data-render-ms` and `data-render-fps` for local profiling. Hidden/offscreen scenes and paused motion suspend rendering and audio.

## Evidence and limits

Project implementation highlights and validation commands describe existing work; they are not fabricated screenshots or captured test output. No project-specific public repository links or demonstration recordings were supplied. GitHub and LinkedIn links point to the existing profile URLs. Social previews include text metadata; deployment-specific canonical URLs can be added when a public domain is chosen.

The checks include numeric scene rendering, reversal, interrupted transitions, tutorial persistence, PDF text and links, and manual desktop/mobile visual review. This is not a claim of universal device compatibility or measured recruiter conversion.

---

## Earlier project notes

# Kamaldeep Singh — Portfolio

## Current website — Red Dot

An original black, white and crimson interactive comic film. Eleven locations
are grouped into five résumé acts; 33 story beats drive authored silhouettes,
cars, camera wipes, the garage gunshot, broken lights, the rooftop bag tear and
the city-wide signal reveal. Ordinary rain, terminal activity, fans, wipers,
wind and ambient movement continue independently of the reversible action.

- About: bedroom signal and bank arrival.
- Skills: robbery and escape.
- Projects: driving and city chase.
- Experience: garage search and first confrontation.
- Contact: rooftop reveal, final action and the twist.

Opening skills, project chapters, implementation steps, experience disclosures
and labs advances within the current act. Previous/Next beat controls traverse
all 33 beats; desktop chapter buttons jump to any scene. Every visited route
stores `?beat=N` in its fragment, so browser Back restores the exact film
position. Résumé content remains accessible without completing the story.
Mobile keeps the film above a separately scrollable reading pane.

Motion follows the system preference until explicitly overridden. Pausing
selects the destination illustration immediately; hidden pages stop drawing.
Optional original synthesized sound starts muted. Dialogue is captioned, not
voice acted. This is an interactive 2D animation, with three held action
positions per scene and animated transitions between them.

Edit `site/movie-scene.js`, `site/movie-navigation.js`, `site/movie-menu.css`
and `site/movie-audio.js`. `site/game-menu.js` retains the factual résumé
renderer; `site/alley-menu.css` supplies its base reading styles.
Build with `python site/build.py`; serve `site/` with a static server.
The generated entry point is `site/index.html`, not the old `dist/` canvas export.
No generated portraits, external audio, or 3D runtime are loaded by this version.
The previous confrontation engine remains in `site/alley-scene.js`.

Validation:

```
node tools/check-movie.cjs
node tools/check-movie-integration.cjs
node tools/check-game-menu.cjs
```

These cover all eleven drawing functions, reversible timeline behavior,
interaction routing, URL restoration, motion control, and résumé rendering.
Browser checks cover desktop and phone composition, native disclosure state,
project-step interaction, history, sound controls and pause.
See `design/RED-DOT-STORYBOARD.md` for the beat map and architecture.

## Earlier experiments (retained, not the current website)

## Current website pass — Duality

The website now opens with a Kakashi / Obito lenticular artwork card beside the
portfolio introduction, over a dark, diagonally divided crimson background.
Move the pointer across the artwork to shift identities, or use the slider and
named buttons with touch or keyboard. The card adds perspective, fine lens bands,
foil, and reflection. Motion can be disabled, and system reduced-motion settings
are respected. Both identities remain available through a CSS fallback without WebGL.

The three-part implementation plan is in `ROADMAP.md`. Part 1 is the opening layout
and lens effect; project stories and experience stories are the next two parts.

Edit `site/duality.css` and `site/duality.js` for the new hero; its markup remains in
`site/index.src.html`. Run `python site/build.py` to rebuild the generated page.
The new atlas, `site/media/duality-atlas.png`, must ship alongside the page; it is
not inlined. `site/media/duality-artwork.md` records the exact generation prompt.
Run `node tools/check-duality.cjs` for control, reduced-motion, and fallback checks.
These checks do not validate the rendered shader appearance.

The canvas artboards and older section artwork described below remain in place.

An interactive, game-menu style portfolio built as a Claude Design canvas.
Red / ink / bone palette, pointer-driven depth, and a real lenticular plate behind
every section — FOUR frames of one anime boy interleaved under fine vertical stripes,
so the picture *walks* through a short move as you look across it, with manga speed
lines building behind him as it goes. On a
capable desktop the website adds a WebGL layer over the same frames.

Live canvas: published as a private Claude artifact (link in the chat that made it).

---

## Layout

```
site/              THE WEBSITE — start here
  media/               project demo clips — drop them in, see media/README.md
  index.src.html       the page you edit: markup, CSS, JS (~50 KB, readable)
  hologram.js          the WebGL lenticular layer (plain three.js, no framework)
  vendor/              three.js r160, MIT — vendored so the build stays offline
  build.py             inlines frames + three.js + hologram.js -> index.html
  index.html           the built, self-contained site (do not hand-edit)

canvas/            the Claude Design artboards — the design source
  Main.dc.html         desktop prototype, 1440x900, all interaction lives here
  Mobile.dc.html       390x844, same content, scroll-driven depth
  CallingCard.dc.html  1200x630 graphic for a LinkedIn banner / README header
  StyleKit.dc.html     palette, type ramp, components, motion timings
  canvas.json          artboard positions, sticky notes, launch view

assets/anime/      the twenty lenticular frames — five sections x four frames (SVG)
assets/diagrams/   the proficiency lab diagrams — one per skill (SVG)
assets/figures/    the old Open Peeps silhouettes, kept but no longer used
tools/             anime.py draws the frames; the Sketch extractor built the old ones
dist/              the seeded canvas — open it in a browser to view offline
```

## Working on the site

Open the repo folder in VS Code. Everything you edit lives in `site/index.src.html` —
one file, plain HTML + CSS + vanilla JS, no framework, no npm.

```bash
# see your changes
open site/index.html          # macOS
start site\index.html         # Windows

# after editing index.src.html, rebuild
python site/build.py         # `python3` on macOS/Linux
```

`index.html` is generated — `index.src.html` with the twenty frame SVGs, three.js and
`hologram.js` all inlined. Edit the `.src` file, run the build, refresh the browser.
That is the whole loop.

It is ~760 KB, and roughly 90% of that is three.js. That is the price of the WebGL
layer, and it buys a file that still works offline, on any static host, with no npm
and no CDN that can fail on a locked-down corporate network. If you ever want the
70 KB version back, drop the `<!--THREE-->` and `<!--HOLOGRAM-->` markers from
`index.src.html`: everything falls back to the CSS lenticular, which is a complete
effect on its own.

The content lives in JS arrays near the bottom of `index.src.html`: `STATS`,
`MISSIONS`, `CATS`, `SKILLS`. Change a project or a skill there, not in the markup.

### Publishing it

Publishing is now handled by `.github/workflows/portfolio.yml`. Use **Settings > Pages > Source > GitHub Actions**; the validated artifact is built from `dist/site/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the current release workflow.

## The design system

| Token | Value | Role |
|---|---|---|
| Ink | `#0b0b0d` | dominant ground |
| Bone | `#f2ede1` | paper, not pure white |
| Crimson | `#d92020` | primary accent (a live tweak on the canvas) |
| Acid | `#f0c000` | secondary accent |

Display face **Anton** (fallback Impact / Arial Black), UI **Barlow Condensed**,
body **Archivo**. Full ramp and component anatomy in `canvas/StyleKit.dc.html`.

## Motion

A small runtime writes `--px` / `--py` (pointer position, −1…1) onto `:root`; every
depth plane reads them from its inline `transform`.

- **The background plate is a true lenticular, in four frames.** The lens period is
  divided into four bands, one per frame, and each band's WIDTH is that frame's
  weight. The weights are a triangular kernel over the current phase, so only two are
  ever non-zero and they always sum to 1 — the bands tile the period exactly and the
  plate WALKS a → b → c → d rather than cross-fading two stills. That is a motion
  lenticular (the kind that plays a short animation as you tilt it) rather than a
  two-image flip card.
- **`--lx` and `--w0`…`--w3` drive the lens; `--px` / `--py` still drive depth.** They
  are separate registered custom properties so the lens can transition on its own and
  the depth planes behave exactly as before. The lens blends the pointer with the
  scroll position; until the mouse has moved, scroll owns the whole range, otherwise
  the ends would be unreachable on load.
- **Background planes travel against the pointer, foreground barely moves.** This is
  inverted from real lenticular physics on purpose — with the foreground moving most,
  buttons slid out from under the cursor.
- Depth ladder: figures/numerals −52/−36px → halftone −24 → slabs −17 → name +11 →
  chips +6 → buttons +3.
- The display name is three stacked copies (ink shadow, bone face, acid ghost) that
  separate as you tilt.
- Idle for 2.5s and a sine drift keeps the plate breathing.
- **Reduced motion keeps the flip.** The plate answers the visitor rather than
  animating on its own, so `prefers-reduced-motion` leaves the walk working and
  removes what actually moves by itself: the parallax, the idle drift, the ambient
  loops and the lens easing. A `lens` tweak on the canvas sets the pitch
  (FINE / COARSE) or rests the plate on frame a (OFF).
- Scroll drives the lens on every device — one full walk per one and a half screens.

## Menu audio (`site/audio.js`)

There is no audio **file** anywhere in this project. The backing loop and every UI
sound are synthesised live in WebAudio from oscillators and one shared noise buffer,
which keeps `index.html` self-contained, costs nothing to download, and is original
by construction so there is nothing to license. It will sound synthesised rather than
produced — that is the trade for having no asset and no licence.

- **~104 BPM, D minor, deliberately sparse.** A walking bass on quarters, swung
  hi-hats, chord stabs off the beat, an occasional kick. Most steps are silent on
  purpose: a loop someone leaves running for several minutes gets tiring fast.
- **A lookahead scheduler** (25 ms interval, ~120 ms ahead, queued against
  `ctx.currentTime`). Scheduling each note with `setTimeout` instead drifts audibly.
- **UI sounds** — move, hover, confirm, back, and a noise whoosh under the screen
  wipe. They hang off handlers that already existed: the `.game-nav` focus, the
  delegated click on `#game`, and the `portfolio-scene-change` event, so
  `game-menu.js` barely had to change.

Two rules the module is built around:

1. **No `AudioContext` exists until the visitor's first real gesture.** Browsers
   block autoplay anyway, and this way a visitor who never interacts pays nothing.
2. **Sound is independent of `motion-paused`.** Turning motion off is not a request
   for silence, so `#sound-toggle` and `#motion-toggle` never touch each other.
   `#sound-toggle` persists as `portfolio-sound` exactly as the motion toggle
   persists as `portfolio-motion`.

The music ducks while a project demo clip is playing so the two never fight.

To swap the generated score for a real royalty-free loop later, the same slot takes
it with no rework — only `build()` and the scheduler in `audio.js` would go.

## Menu choreography

`game-menu.css` had no `@keyframes` at all: a screen change was a 140 ms opacity fade
and a 22 px slide. It now carries the game-menu half of the feel:

- **A wipe covers the DOM swap** — a skewed crimson-to-acid slab sweeps across with
  speed lines riding it, the scene is replaced behind it, and it sweeps off. Nothing
  is ever seen to flash. `runWipe()` clears its own class afterwards so the element
  is not left holding a finished animation's end state.
- **Entrances overshoot.** `animateIn()` brings elements in along the same diagonal
  the nav is skewed on, past the resting position, then settles. The overshoot is
  what reads as a game menu rather than a web page.
- **Selection is a hit, not a hover** — the active row punches in and throws a red
  slab out behind it, and the `01 / 05` counter snaps.

All of it is gated on the existing `paused()` helper, so the motion toggle and
`prefers-reduced-motion` still govern. **With reduced motion on you will see none of
it** — flip MOTION in the footer.

## Project demo clips

Each briefing in TARGETS can carry a ~20-second silent screen demo. Drop
`demo-ad.mp4`, `demo-hive.mp4` or `demo-flex.mp4` into `site/media/` and rebuild —
`build.py` scans the folder and only wires up the ones that exist, so a project
without a clip renders no player rather than a broken box. Full spec and recording
notes in `site/media/README.md`.

These are the one thing NOT inlined into `index.html`. A 20-second capture is a few
megabytes and base64 would add a third on top of that, so they ship as separate files
beside the page and are fetched only when someone opens that briefing — never on page
load, even for the card that starts open.

**The canvas artboards do not get clips.** The artifact iframe has no network egress,
so a video would have to be base64'd into the canvas document, which republishes whole
on every save against a 2 MB per-entry cap. The canvas keeps the written briefing; the
website is where the demos live.

## The proficiency labs

Clicking any skill in PROFICIENCY opens a full-screen viewer: a diagram of the lab
that skill is built on, four labelled callouts, the tooling or commands behind it, and
a line on why the rank is what it is. All five are wired — the AD forest, the routed
GNS3 topology, the VPC, the commit-to-hosts pipeline and the MVC request loop.

Everything in the diagrams traces to a bullet already on the page; no numbers are
invented. The bottom band of each diagram is labelled honestly — VERIFIED WITH only
where the resume names the commands (Directory Services), otherwise PROVEN BY, WORKED
WITH or TOOLING.

Skills are clickable only when listed in `LABS` (site) / `labs` (canvas), so adding or
removing one is a data change.

**One diagram asset serves both surfaces.** Each is a standalone SVG in
`assets/diagrams/` with its entrance animation *inside the file*, which is what lets
it animate on open in both places:

- the website inlines them into hidden `<template>` blocks and **clones** on open, so
  the animation replays each time instead of having run at page load;
- the artboard references one as `<img src="diagram-directory.svg">` from a files
  entry, created when the overlay mounts.

Two constraints worth knowing before you add the next one:

- The canvas resolves an image `src` by **literal filename**, so it cannot be bound
  through a hole — `src="{{lab.img}}"` silently renders nothing. Each lab gets its own
  `<sc-if>` with the filename written out.
- An `<img>`-embedded SVG cannot load Google Fonts, so on the canvas the diagram
  labels fall back to Impact / Arial Black and Arial. Keep labels short so the wider
  fallback still fits its box. The website inlines the SVG, so it gets the real faces.

To add a skill: draw `assets/diagrams/diagram-<key>.svg`, add an entry to `LABS` in
`index.src.html` and to `labs` in `Main.dc.html`, add the `<sc-if>` + literal `<img>`
on the canvas, and pass the new file to the seeder with `--image`.

## The WebGL layer (`site/hologram.js`)

On a desktop with WebGL, one fixed canvas sits behind the page and renders the same
four frames as a tilting 3D plate. It is an enhancement over the CSS plates, never a
replacement: no WebGL, a viewport under 860px, or any failure loading it and the CSS
plates simply stay. It reads the CSS plates' own rects for position, so both layers
agree on where the artwork goes.

- **It models a lens, not a barrier.** A parallax barrier is the textbook mechanism
  and was the first thing built — but a barrier blocks three quarters of the light, so
  at screen scale the portrait shreds into venetian blinds. Real lenticular print uses
  lenses, which refract rather than block: each lenslet magnifies one frame to fill
  its period. So every pixel takes its colour from ONE frame at full resolution,
  chosen by where it sits in the lens period against the same weights the CSS uses.
- Only STATUS, TARGETS, RECORDS and ARSENAL have no ground of their own, so the
  hologram reads through exactly those four. The hero and contact are opaque by
  design and bookend it.
- Each plate is drawn with a scissor set to its section — a fixed canvas has none of
  the section overflow clipping that contained the CSS plates.
- Nothing hijacks scrolling. Anchors, deep links, Ctrl+F, keyboard paging and the
  rail's scroll-spy all work as they always did.
- It renders on demand rather than every frame, so the GPU is idle when nothing moves.

## Rebuilding the canvas

Needs Node and the `/design` skill's `seed-canvas.mjs` helper:

```bash
node seed-canvas.mjs \
  --template payload.template.html \
  --out kamaldeep-singh-portfolio.html \
  --title "Kamaldeep Singh — Portfolio" \
  --artboard canvas/Main.dc.html \
  --artboard canvas/Mobile.dc.html \
  --artboard canvas/CallingCard.dc.html \
  --artboard canvas/StyleKit.dc.html \
  --image assets/figures/fig-status.svg \
  --image assets/figures/fig-targets.svg \
  --image assets/figures/fig-records.svg \
  --image assets/figures/fig-arsenal.svg \
  --image assets/figures/fig-contact.svg \
  --canvas canvas/canvas.json
```

## Regenerating the artwork

```bash
python tools/anime.py            # rewrites all twenty frames, ~50 KB total
python site/build.py             # then rebuild the site
```

`tools/anime.py` draws one character from a single face construction — skull, spiked
crown, fringe, eyes, brows — and emits five section moves in four frames each. The
boy's silhouette is the spike ring, so the spike lengths are deliberately irregular
and every tip leans the same way; even spikes of equal length read as a crown, and an
evenly sliced fringe reads as a headband. `burst()` draws the speed lines, which fade
up with the move so the far end lands as an action beat. `POSES`
holds only the START and END of each move; the two in-betweens are interpolated,
colour included. Numbers tween, the lock count is held so the hair does not pop, and
the categorical fields (mouth, accessory) switch at the halfway point — which is what
makes "puts the visor on" read as a beat rather than a glitch.

The colour ramp runs bone → acid → crimson. Blending bone straight to crimson takes
the middle frames through pink, which is nowhere in the palette; routing through acid
keeps every frame on a brand colour and reads as the plate heating up.

Features are filled with the ink colour: the plate composites at low opacity over an
ink ground, so an ink fill reads as a cut-out hole. That is what gives a flat two-tone
portrait out of one fill colour. Edit `POSES` to re-pose, or the part builders to
change the character.

### Using your own character instead

A lenticular needs **the same character in several frames**, which is what most stock
art can't give you. The best free source is **[VRoid Studio](https://vroid.com/en/studio)**
(by Pixiv): build a character, pose it, export a transparent PNG, change the pose or
expression and export again — and you own what you make, commercial use included.
[Charat](https://charat.me/) is a lighter browser-based option for a bust (check the
per-generator terms). Avoid **Picrew** unless the individual creator's licence allows
commercial use and edits, and don't use a character from an existing anime or game —
that is someone else's IP.

Drop the pair in as `assets/anime/anime-<section>-a.*` and `-b.*` and rebuild;
nothing else has to change.

## Credits

Background artwork drawn for this site. The old Open Peeps silhouettes by Pablo
Stanley are still in `assets/figures/` but no longer used. Résumé content is
Kamaldeep Singh's own.

## Status

- [x] Interactive canvas — desktop, mobile, calling card, style kit
- [x] Lenticular depth and motion pass
- [x] True lenticular background plate — interlaced two-frame anime character
- [x] Background and rail alignment pass
- [ ] Standalone `index.html` for GitHub Pages (real scrolling, responsive
      breakpoints instead of two fixed artboards)
