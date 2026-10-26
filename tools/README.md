# Figure tools

`anime.py` — draws the twenty lenticular background frames into `assets/anime/`. One
face construction (skull, spiked crown, fringe, eyes, brows, accessories), five
section moves, four frames each. The character is a boy: irregular swept spikes
rather than a long fall, a wider blunter jaw, narrow angular eyes under heavy brows,
and square shoulders. `burst()` adds manga speed lines that fade up across the move.

`POSES` holds only the start and end of each move; frames b and c are interpolated,
colour included. The ramp runs bone → acid → crimson, because blending bone straight
to crimson takes the middle frames through pink, which is not in the palette. The
lock count is held across a move so the hair does not pop, and mouth and accessory
switch at the halfway point so "puts the visor on" reads as a beat.

Features are filled with the ink colour, which reads as a cut-out because the plate
composites at low opacity over an ink ground — that is what makes a flat two-tone
portrait out of one fill. Edit `POSES` to re-pose, or the part builders to change the
character.

    python tools/anime.py        # run from the repo root

The two tools below built the ORIGINAL Open Peeps silhouettes in `assets/figures/`.
Those are no longer on the page; the files are kept in case you want them back.

`sketch2svg.py` — a minimal Sketch renderer. Walks a `.sketch` page's layer tree and
turns `shapePath` curve points into SVG path data. Handles nested `symbolInstance`
resolution, and merges the subpaths of a `shapeGroup` into one `fill-rule="evenodd"`
path so boolean subtractions (holes, cut-outs) come out right.

`compose.py` — stacks a body + head + face into one figure using the offsets Open
Peeps' own "a person/standing" master uses:

    canvas   1179 x 3291
    body  at (-121, 634)
    head  at ( 404, 180)
    face  at ( 563, 366)

Pass a hex colour to flatten everything to a single fill:

    python compose.py "#f2ede1"

Run both from a directory containing the unzipped `.sketch` (it reads `pages/*.json`).
