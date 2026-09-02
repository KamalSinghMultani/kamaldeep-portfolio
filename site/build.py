#!/usr/bin/env python3
"""Build site/index.html from index.src.html + the figure SVGs.

    python3 build.py

Inlines each figure as an <svg> on the deepest parallax plane, positioned per
section. Edit index.src.html (or the figures) and re-run.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.join(HERE, '..', 'assets', 'figures')

# where each section's figure sits, sized to that section's empty space
POSITIONS = {
    'status':  'style="height:min(430px,34vw);left:12%;bottom:6%"',
    'targets': 'style="height:min(400px,32vw);left:6%;bottom:6%"',
    'records': 'style="height:min(300px,24vw);right:8%;bottom:5%"',
    'arsenal': 'style="height:min(560px,44vw);right:14%;bottom:6%"',
    'contact': 'style="height:min(210px,18vw);right:12%;top:8%"',
}


def main():
    src = open(os.path.join(HERE, 'index.src.html'), encoding='utf-8').read()

    for key, pos in POSITIONS.items():
        path = os.path.join(FIGS, 'fig-%s.svg' % key)
        svg = open(path, encoding='utf-8').read()
        svg = svg.replace('<svg ', '<svg class="bgfig lyr z0" aria-hidden="true" %s ' % pos, 1)
        svg = re.sub(r'\swidth="\d+"\s+height="\d+"', '', svg, count=1)
        marker = '<!--FIG:%s-->' % key
        if marker not in src:
            raise SystemExit('missing marker %s in index.src.html' % marker)
        src = src.replace(marker, svg)

    if '<!--FIG' in src:
        raise SystemExit('unfilled figure markers remain')

    out = os.path.join(HERE, 'index.html')
    open(out, 'w', encoding='utf-8').write(src)
    print('wrote %s (%.0f KB)' % (out, os.path.getsize(out) / 1024))


if __name__ == '__main__':
    main()
