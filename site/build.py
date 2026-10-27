#!/usr/bin/env python3
"""Build the static portfolio from its source, authored movie, styles and data.

    python site/build.py

The active Red Dot version inlines the movie engine and résumé UI. Earlier
lenticular asset helpers remain for the retained historical source. Existing
project demos in site/media/ are linked only when the corresponding file exists.
"""
import json
import os
import re
import subprocess
import sys
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.join(HERE, '..', 'assets', 'anime')
VENDOR = os.path.join(HERE, 'vendor')
DIAGRAMS = os.path.join(HERE, '..', 'assets', 'diagrams')
MEDIA = os.path.join(HERE, 'media')

# mission ids, matching canvas/Main.dc.html
DEMO_IDS = ('ad', 'hive', 'flex')

# Where each section's plate sits. Offsets are measured from the section box
# itself, so they mean what they say; each figure sits opposite that section's
# background numeral so the two never stack up. --ph is the plate height: it is
# a variable rather than a height so the phone breakpoint can scale it up.
POSITIONS = {
    'status':  '--ph:min(520px,40vw);left:3%;bottom:0',
    'targets': '--ph:min(480px,38vw);left:4%;bottom:0',
    'records': '--ph:min(440px,34vw);right:5%;bottom:0',
    'arsenal': '--ph:min(560px,42vw);right:6%;bottom:0',
    # contact sits on the crimson ground, so it needs more weight to read
    'contact': '--ph:min(360px,28vw);--po:.2;right:8%;top:4%',
}


FRAMES = ('a', 'b', 'c', 'd')


def frame(key, tag, cls):
    """One .dc-sized SVG, stripped of its intrinsic size and classed."""
    path = os.path.join(FIGS, 'anime-%s-%s.svg' % (key, tag))
    svg = open(path, encoding='utf-8').read().strip()
    svg = svg.replace('<svg ', '<svg class="%s" aria-hidden="true" ' % cls, 1)
    return re.sub(r'\swidth="\d+"\s+height="\d+"', '', svg, count=1)


def demo_block():
    """Whatever demo clips actually exist in site/media/.

    The clips are NOT inlined — they stay as separate files beside index.html.
    A 20-second screen capture is a few megabytes, and base64 in the page would
    add a third again on top of that and block first paint. So this only tells
    the page which ids have a file; a mission without one renders no slot at all
    rather than a broken box.
    """
    found = {}
    if os.path.isdir(MEDIA):
        for mid in DEMO_IDS:
            clip = 'demo-%s.mp4' % mid
            if not os.path.isfile(os.path.join(MEDIA, clip)):
                continue
            entry = {'src': 'media/' + clip}
            for ext in ('jpg', 'jpeg', 'png', 'webp'):
                poster = 'demo-%s.%s' % (mid, ext)
                if os.path.isfile(os.path.join(MEDIA, poster)):
                    entry['poster'] = 'media/' + poster
                    break
            found[mid] = entry
    if found:
        print('  demos: ' + ', '.join(sorted(found)))
    else:
        print('  demos: none in site/media/ yet - TARGETS renders without clips')
    return '<script>window.DEMOS = %s;</script>' % json.dumps(found)


def diagram_block():
    """The skill diagrams, each parked in its own <template>.

    They are cloned on open rather than rendered in place, so every SVG's own
    entrance animation replays each time a skill is opened instead of having
    already run at page load. The intrinsic size is stripped so CSS can scale
    them; the viewBox carries the geometry.
    """
    if not os.path.isdir(DIAGRAMS):
        return ''
    out = []
    for name in sorted(os.listdir(DIAGRAMS)):
        if not name.startswith('diagram-') or not name.endswith('.svg'):
            continue
        key = name[len('diagram-'):-len('.svg')]
        svg = open(os.path.join(DIAGRAMS, name), encoding='utf-8').read().strip()
        svg = re.sub(r'\swidth="\d+"\s+height="\d+"', '', svg, count=1)
        out.append('<template id="dg-%s">%s</template>' % (key, svg))
    return chr(10).join(out)


def three_block():
    """three.js, parked in a text/plain block.

    It is an ES module, so the page turns this into a blob URL and imports it —
    which keeps the whole site one self-contained file. The UMD build would be
    simpler but r160 deprecated it and logs a console warning on every load.
    """
    path = os.path.join(VENDOR, 'three.module.min.js')
    js = open(path, encoding='utf-8').read()
    if '</script' in js:
        raise SystemExit('vendored three.js would close its own script tag')
    return '<script id="three-src" type="text/plain">%s</script>' % js


def hologram_block():
    """The hologram module, inlined as a plain function.

    It takes THREE as an argument rather than importing it, so the `export`
    keyword is all that has to go for it to live in an ordinary script.
    """
    js = open(os.path.join(HERE, 'hologram.js'), encoding='utf-8').read()
    js = js.replace('export function mountHologram', 'function mountHologram', 1)
    if '</script' in js:
        raise SystemExit('hologram.js would close its own script tag')
    return '<script>%s</script>' % js


def main():
    src = open(os.path.join(HERE, 'index.src.html'), encoding='utf-8').read()
    alley = 'id="alley-stage"' in src

    for key, pos in POSITIONS.items():
        if alley:
            src = src.replace('<!--LENT:%s-->' % key, '')
            continue
        frames = ''.join(frame(key, t, 'lf lf-%d' % i)
                         for i, t in enumerate(FRAMES))
        plate = ('<div class="lent-plate lyr z0" style="%s">%s'
                 '<span class="lent-lens"></span></div>') % (pos, frames)
        marker = '<!--LENT:%s-->' % key
        if marker not in src:
            raise SystemExit('missing plate marker %s in index.src.html' % marker)
        src = src.replace(marker, plate)

    if '<!--LENT' in src:
        raise SystemExit('unfilled plate markers remain')

    src = src.replace('<!--DIAGRAMS-->', diagram_block())
    src = src.replace('<!--DEMOS-->', demo_block())
    src = src.replace('<!--THREE-->', '' if alley else three_block())
    src = src.replace('<!--HOLOGRAM-->', '' if alley else hologram_block())
    # The hero's two-identity plate is kept separate from the section artwork.
    # Its atlas ships alongside the page, just like the project demo clips.
    for marker, filename, tag in (
        ('<!--DUALITY_STYLE-->', 'duality.css', 'style'),
        ('<!--DUALITY_SCRIPT-->', 'duality.js', 'script'),
        ('<!--GAME_STYLE-->', 'alley-menu.css' if alley else 'game-menu.css', 'style'),
        ('<!--ALLEY_SCRIPT-->', 'movie-scene.js', 'script'),
        ('<!--MOVIE_NAV_SCRIPT-->', 'movie-navigation.js', 'script'),
        ('<!--TUTORIAL_SCRIPT-->', 'portfolio-tutorial.js', 'script'),
        ('<!--MOVIE_STYLE-->', 'movie-menu.css', 'style'),
        ('<!--MOVIE_AUDIO_SCRIPT-->', 'movie-audio.js', 'script'),
        ('<!--GAME_SCRIPT-->', 'game-menu.js', 'script'),
        ('<!--AUDIO_SCRIPT-->', 'audio.js', 'script'),
    ):
        if alley and filename in ('duality.css', 'duality.js', 'audio.js'):
            src = src.replace(marker, '')
            continue
        content = open(os.path.join(HERE, filename), encoding='utf-8').read()
        if '</' + tag in content:
            raise SystemExit('unexpected closing tag in %s' % filename)
        if marker not in src:
            raise SystemExit('missing marker %s' % marker)
        src = src.replace(marker, '<%s>%s</%s>' % (tag, content, tag))
    for marker in ('<!--THREE-->', '<!--HOLOGRAM-->', '<!--DIAGRAMS-->', '<!--DEMOS-->'):
        if marker in src:
            raise SystemExit('unfilled marker remains: %s' % marker)

    subprocess.run([sys.executable, os.path.join(HERE, '..', 'tools', 'build-quick.py'), '--pdf'], check=True)
    out = os.path.join(HERE, 'index.html')
    open(out, 'w', encoding='utf-8').write(src)
    release = os.path.join(HERE, '..', 'dist', 'site')
    # Only replace this repository's generated release directory. Reject links
    # so a local preview cannot redirect cleanup outside the build output.
    release = os.path.abspath(release)
    if os.path.realpath(release) != release:
        raise SystemExit('release directory must not resolve through a symlink')
    if os.path.isdir(release):
        shutil.rmtree(release)
    os.makedirs(release, exist_ok=True)
    for name in ('index.html', 'quick.html', 'kamaldeep-singh-resume.pdf',
                 'quick-workshop.mjs', 'quick-workshop-core.mjs'):
        shutil.copy2(os.path.join(HERE, name), os.path.join(release, name))
    shutil.copytree(VENDOR, os.path.join(release, 'vendor'))
    media = os.path.join(HERE, 'media')
    if os.path.isdir(media):
        shutil.copytree(media, os.path.join(release, 'media'), dirs_exist_ok=True)
    print('wrote %s (%.0f KB)' % (out, os.path.getsize(out) / 1024))


if __name__ == '__main__':
    main()
