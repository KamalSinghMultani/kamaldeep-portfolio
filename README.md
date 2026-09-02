# Kamaldeep Singh — Portfolio

An interactive, game-menu style portfolio built as a Claude Design canvas.
Red / ink / bone palette, pointer-driven lenticular depth, one Open Peeps figure
sitting behind each section.

Live canvas: published as a private Claude artifact (link in the chat that made it).

---

## Layout

```
canvas/            the source artboards — this is what you edit
  Main.dc.html         desktop prototype, 1440x900, all interaction lives here
  Mobile.dc.html       390x844, same content, scroll-driven depth
  CallingCard.dc.html  1200x630 graphic for a LinkedIn banner / README header
  StyleKit.dc.html     palette, type ramp, components, motion timings
  canvas.json          artboard positions, sticky notes, launch view

assets/figures/    the five background silhouettes (SVG)
tools/             the Sketch -> SVG extractor used to build them
dist/              the seeded canvas — open it in a browser to view offline
```

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

A small runtime in `Main.dc.html` writes `--px` / `--py` (pointer position, −1…1)
onto `:root`; every depth plane reads them from its inline `transform`.

- **Background planes travel against the pointer, foreground barely moves.** This is
  inverted from real lenticular physics on purpose — with the foreground moving most,
  buttons slid out from under the cursor.
- Depth ladder: figures/numerals −52/−36px → halftone −24 → slabs −17 → name +11 →
  chips +6 → buttons +3.
- The display name is three stacked copies (ink shadow, bone face, acid ghost) that
  separate as you tilt.
- Idle for 2.5s and a sine drift keeps the plate breathing.
- `motion: REDUCED` tweak, plus `prefers-reduced-motion` is honoured.

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

## Regenerating the figures

`tools/sketch2svg.py` parses a `.sketch` file's shape data into SVG paths;
`tools/compose.py` stacks a body + head + face at the geometry Open Peeps itself
uses for a whole person, and flattens the result to one colour.

```bash
unzip openpeeps.sketch -d peeps/ && cd peeps/
python3 compose.py "#f2ede1"     # flat bone silhouettes
```

Edit the `FIGURES` list in `compose.py` to swap poses, hair or expressions —
26 standing poses, 50 heads and 33 faces are available in the source file.

## Credits

Figures from [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley — free for
commercial use. Résumé content is Kamaldeep Singh's own.

## Status

- [x] Interactive canvas — desktop, mobile, calling card, style kit
- [x] Lenticular depth and motion pass
- [x] Background figures
- [ ] Standalone `index.html` for GitHub Pages (real scrolling, responsive
      breakpoints instead of two fixed artboards)
