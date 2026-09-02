# Figure tools

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

    python3 compose.py "#f2ede1"

Run both from a directory containing the unzipped `.sketch` (it reads `pages/*.json`).
