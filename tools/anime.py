#!/usr/bin/env python3
"""Draw the twenty lenticular background frames into assets/anime/.

    python tools/anime.py

One character, five section moves, FOUR frames each (a b c d). A motion
lenticular plays a short animation as you tilt it, so the four frames are one
continuous move rather than four unrelated poses: POSES holds the start and end
of each move and the in-betweens are interpolated, colour included — bone at the
start, crimson with acid highlights at the end.

These are portrait busts, not full figures: anime reads through the head — the
hair silhouette above all — and a head-and-shoulders crop survives being dropped
to 22% opacity behind body copy, where a small full figure would just be a smudge.

The character is a boy: the silhouette is a crown of angular spikes rather than a
long fall, the jaw is wider and blunter, the eyes are narrow and angular under
heavy brows, and the shoulders are square. Speed lines build across each move so
the walk lands as an action beat rather than a slow dissolve.

Everything is drawn from one face construction so the five poses stay the same
person. Features are filled with INK: the plate composites at low opacity over an
ink ground, so an ink fill reads as a cut-out hole in the bone shape. That is what
gives a flat two-tone portrait out of a single fill colour.

Edit POSES to re-pose; edit the part builders to change the character.
"""
import math
import os

W, H = 520, 640
BONE = '#f2ede1'
CRIMSON = '#d92020'
ACID = '#f0c000'
INK = '#0b0b0d'

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'anime')

CX = 260          # face centre
CHIN = 432        # chin point — blunter than a girl's taper
EYE_Y = 322       # eye line — low on the skull, the way anime sits it


def p(*n):
    return ' '.join('%.1f' % v for v in n)


# ------------------------------------------------------------------- parts --
def face(t):
    """Skull tapering to a soft chin point. `t` is the head turn, -1..1.

    Stroked in ink so the jaw stays legible against the hair: over the ink
    ground an ink stroke is a gap, which is what separates the two masses.
    """
    o = t * 22
    return ('<path stroke="%s" stroke-width="9" d="M%s C%s %s %s C%s %s %s '
            'C%s %s %s C%s %s %s C%s %s %s C%s %s %s Z"/>') % (
        INK,
        p(146 + o, 250),
        p(146 + o, 150), p(190 + o, 104), p(CX + o, 104),
        p(330 + o, 104), p(374 + o, 150), p(374 + o, 250),
        p(374 + o, 306), p(364 + o, 350), p(346 + o, 384),
        p(326 + o, 414), p(298 + o, 430), p(CX + o, CHIN),
        p(222 + o, 430), p(194 + o, 414), p(174 + o, 384),
        p(156 + o, 350), p(146 + o, 306), p(146 + o, 250))


def neck(t):
    o = t * 16
    return '<path stroke="%s" stroke-width="9" d="M%s L%s L%s L%s Z"/>' % (
        INK, p(214 + o, 392), p(306 + o, 392), p(318 + o, 508), p(202 + o, 508))


def shoulders(t):
    """The bust crop — a wedge that runs off the bottom of the frame."""
    o = t * 8
    return ('<path stroke="%s" stroke-width="9" d="M%s C%s %s %s L%s '
            'C%s %s %s Z"/>') % (
        INK,
        p(12, 640),
        p(24, 536), p(118, 480), p(204 + o, 466),
        p(316 + o, 466),
        p(402, 480), p(496, 536), p(508, 640))


def collar(t):
    """An ink V cut into the shoulders — reads as an open collar."""
    o = t * 8
    return '<path fill="%s" d="M%s L%s L%s L%s L%s Z"/>' % (
        INK,
        p(204 + o, 470), p(CX + o, 560), p(316 + o, 470),
        p(298 + o, 640), p(222 + o, 640))


def hair_back(t, spread, length):
    """Short spiked hair: uneven clumps swept around the skull.

    A boy's silhouette in this style IS the spike ring, so `length` drives how
    far the spikes reach rather than how far the hair hangs. Evenly spaced
    spikes of equal length read as a crown, so the lengths are deliberately
    irregular and every tip leans the same way, the way gelled hair actually
    falls. The whole crown leans further with the head turn, which is most of
    what sells the turn at a glance.
    """
    o = t * 12
    cx, cy = CX + o, 216
    inner = 114 + spread * 0.5
    reach = 50 + (length - 226) * 0.72
    sweep = 0.15 + t * 0.12
    VAR = (0.52, 1.08, 0.68, 1.24, 0.58, 1.02, 0.46)
    n = len(VAR)

    pts = []
    for i in range(n):
        a0 = math.pi * (1 - i / float(n))
        pts.append((cx + inner * math.cos(a0), cy - inner * math.sin(a0)))
        am = math.pi * (1 - (i + 0.5) / float(n)) - sweep
        r = inner + reach * VAR[i]
        pts.append((cx + r * math.cos(am), cy - r * math.sin(am) * 1.06))
    pts.append((cx + inner, cy))

    d = ['M%s' % p(*pts[0])]
    for q in pts[1:]:
        d.append('L%s' % p(*q))
    # close down behind the jaw — hidden under the face, it only has to fill
    d.append('L%s' % p(cx + inner * 0.92, cy + 104))
    d.append('L%s' % p(cx - inner * 0.92, cy + 104))
    d.append('Z')
    return '<path stroke="%s" stroke-width="7" stroke-linejoin="round" d="%s"/>' % (
        INK, ' '.join(d))


def burst(t, u, fill):
    """Manga speed lines behind the head.

    They build across the move, so the far end of the walk lands as an action
    beat instead of a slow dissolve. Drawn first, so everything else covers them.
    """
    if u < 0.2:
        return ''
    k = (u - 0.2) / 0.8
    o = t * 8
    cx, cy = CX + o, 236
    out = ['<g fill="%s" fill-opacity="%.2f">' % (ACID, 0.20 + 0.42 * k)]
    for i in range(13):
        a = math.pi * (0.05 + 0.90 * (i / 12.0))
        r0 = 178 + (i % 3) * 16
        r1 = r0 + 54 + k * 130 + (i % 4) * 20
        hw = 0.010 + 0.008 * (i % 2)
        ax, ay = math.cos(a), math.sin(a)
        nx, ny = -ay, ax
        out.append('<path d="M%s L%s L%s Z"/>' % (
            p(cx + r0 * ax, cy - r0 * ay),
            p(cx + r1 * ax + nx * r1 * hw, cy - r1 * ay - ny * r1 * hw),
            p(cx + r1 * ax - nx * r1 * hw, cy - r1 * ay + ny * r1 * hw)))
    out.append('</g>')
    return ''.join(out)


def bangs(t, part, locks):
    """The fringe: chunky uneven clumps hanging over the brow.

    Slicing the hairline into equal wedges gave a symmetric arch that read as a
    headband. Real fringe falls in a few clumps of different widths and depths,
    all leaning the same way, so that is what these are. `part` picks the side
    they sweep towards.
    """
    o = t * 14
    x0 = 126 + o
    span = 268
    CLUMPS = ((0.00, 0.32, 0.92), (0.24, 0.60, 1.24),
              (0.55, 0.82, 0.78), (0.74, 1.00, 1.08))
    lean = 54 if part > .5 else -54
    out = []
    for (ca, cb, depth) in CLUMPS[:max(3, min(4, locks))]:
        a = x0 + span * ca
        b = x0 + span * cb
        mid = (a + b) / 2
        out.append('<path stroke="%s" stroke-width="7" stroke-linejoin="round" '
                   'd="M%s C%s %s %s L%s Z"/>' % (
                       INK,
                       p(a, 150 + depth * 22),
                       p(a + span * .05, 112), p(b - span * .05, 112),
                       p(b, 150 + depth * 22),
                       p(mid + lean, 196 + depth * 62)))
    return ''.join(out)


def eye(cx, cy, w, h, lid):
    """Narrow angular eye. `lid` 1 = wide open, 0 = closed to a line.

    The upper lid breaks to a hard corner rather than curving over: that sharp
    rise is most of the difference between a boy's eye and a girl's here.
    """
    h = h * lid
    return ('<path fill="%s" d="M%s L%s C%s %s %s C%s %s %s Z"/>') % (
        INK,
        p(cx - w, cy),
        p(cx - w * .48, cy - h * 1.18),
        p(cx + w * .18, cy - h * 1.34), p(cx + w * .70, cy - h * .92), p(cx + w, cy - h * .16),
        p(cx + w * .52, cy + h * .78), p(cx - w * .52, cy + h * .88), p(cx - w, cy))


def glint(cx, cy, w, h, fill):
    """The highlight that makes an anime eye an anime eye."""
    return ('<circle cx="%s" cy="%s" r="%s" fill="%s"/>'
            '<circle cx="%s" cy="%s" r="%s" fill="%s"/>') % (
        p(cx - w * .34), p(cy - h * .42), p(w * .27), fill,
        p(cx + w * .40), p(cy + h * .34), p(w * .15), fill)


def brow(cx, cy, w, tilt):
    return '<path fill="%s" d="M%s L%s L%s L%s Z"/>' % (
        INK,
        p(cx - w, cy + tilt), p(cx + w, cy - tilt),
        p(cx + w, cy - tilt + 15), p(cx - w, cy + tilt + 18))


def mouth(cx, cy, kind):
    if kind == 'grin':
        return ('<path fill="%s" d="M%s C%s %s %s C%s %s %s Z"/>' % (
            INK, p(cx - 26, cy - 4), p(cx - 12, cy + 22), p(cx + 12, cy + 22),
            p(cx + 26, cy - 4), p(cx + 12, cy + 8), p(cx - 12, cy + 8), p(cx - 26, cy - 4)))
    if kind == 'shout':
        return '<ellipse cx="%s" cy="%s" rx="20" ry="26" fill="%s"/>' % (
            p(cx), p(cy + 6), INK)
    return '<path fill="%s" d="M%s L%s L%s L%s Z"/>' % (
        INK, p(cx - 18, cy), p(cx + 18, cy - 3), p(cx + 18, cy + 6), p(cx - 18, cy + 9))


def nose(cx, cy):
    return '<path fill="%s" d="M%s L%s L%s Z"/>' % (
        INK, p(cx - 1, cy - 9), p(cx + 8, cy + 4), p(cx - 5, cy + 4))


# -------------------------------------------------------------- accessories --
def acc_headset(t, fill):
    o = t * 16
    return ('<g stroke="' + INK + '" stroke-width="8">'
            '<path fill="%s" d="M%s C%s %s %s L%s C%s %s %s Z"/>'
            '<rect x="%s" y="%s" width="34" height="72" rx="14" fill="%s"/>'
            '<rect x="%s" y="%s" width="34" height="72" rx="14" fill="%s"/></g>') % (
        fill,
        p(122 + o, 246), p(122 + o, 126), p(196 + o, 84), p(CX + o, 84),
        p(CX + o, 106), p(206 + o, 106), p(144 + o, 142), p(144 + o, 246),
        p(108 + o), p(238), fill, p(364 + o), p(238), fill)


def acc_visor(t, fill):
    """Targets: a sighting visor across the eyes."""
    o = t * 16
    return ('<g stroke="' + INK + '" stroke-width="8">'
            '<path fill="%s" fill-opacity=".55" d="M%s L%s L%s L%s Z"/>'
            '<rect x="%s" y="%s" width="240" height="10" fill="%s"/></g>') % (
        fill,
        p(148 + o, 288), p(374 + o, 276), p(370 + o, 348), p(152 + o, 352),
        p(146 + o), p(272), fill)


def acc_glasses(t, fill):
    o = t * 16
    return ('<path fill="none" stroke="%s" stroke-width="20" stroke-linejoin="round" '
            'd="M%s h76 v60 h-76 Z M%s h76 v60 h-76 Z M%s h26 M%s h26 M%s h26"/>'
            '<path fill="none" stroke="%s" stroke-width="9" stroke-linejoin="round" '
            'd="M%s h76 v60 h-76 Z M%s h76 v60 h-76 Z M%s h26 M%s h26 M%s h26"/>') % (
        INK,
        p(176 + o, 294), p(292 + o, 290), p(252 + o, 318),
        p(146 + o, 298), p(368 + o, 294),
        fill,
        p(176 + o, 294), p(292 + o, 290), p(252 + o, 318),
        p(146 + o, 298), p(368 + o, 294))


def acc_blade(t, fill):
    """Arsenal: a blade angled over the shoulder, behind the head."""
    return ('<g stroke="' + INK + '" stroke-width="8" stroke-linejoin="round">'
            '<path fill="%s" d="M%s L%s L%s L%s L%s Z"/>'
            '<path fill="%s" d="M%s L%s L%s L%s Z"/></g>') % (
        fill,
        p(404, 470), p(452, 86), p(492, 92), p(470, 476), p(436, 486),
        fill,
        p(400, 480), p(474, 490), p(466, 556), p(392, 546))


def acc_hand(t, fill):
    """Contact: a raised hand at the edge of the crop."""
    return ('<g stroke="' + INK + '" stroke-width="8" stroke-linejoin="round">'
            '<path fill="%s" d="M%s L%s C%s %s %s L%s C%s %s %s Z"/>'
            '<path fill="none" d="M%s v58 M%s v66 M%s v58"/></g>') % (
        fill,
        p(396, 640), p(396, 476),
        p(396, 430), p(432, 414), p(444, 452),
        p(496, 470),
        p(520, 486), p(524, 540), p(516, 640),
        p(428, 470), p(462, 462), p(494, 474))


ACC = {'headset': acc_headset, 'visor': acc_visor, 'glasses': acc_glasses,
       'blade': acc_blade, 'hand': acc_hand}


# ------------------------------------------------------------ interpolation --
def mix(a, b, u):
    return a + (b - a) * u


def mix_hex(c1, c2, u):
    """Blend two #rrggbb colours."""
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(int(round(mix(a[i], b[i], u))) for i in range(3))


def ramp(u):
    """The frame's fill, walking bone -> acid -> crimson.

    Blending bone straight to crimson runs the in-between frames through pink,
    which is nowhere in the palette. Routing through acid keeps every frame on
    a brand colour and reads as the plate heating up across the move.
    """
    return mix_hex(BONE, ACID, u * 2) if u < .5 else mix_hex(ACID, CRIMSON, u * 2 - 1)


def tween(a, b, u):
    """One frame of the move, u running 0 (start) -> 1 (end).

    Numbers interpolate. `locks` is held at the start value so the hair does not
    pop mid-move, and the categorical fields (mouth, accessory) switch at the
    halfway point — which is what makes 'puts the visor on' read as a beat.
    """
    q = a if u < .5 else b
    out = {
        'turn': mix(a['turn'], b['turn'], u),
        'spread': mix(a['spread'], b['spread'], u),
        'length': mix(a['length'], b['length'], u),
        'part': mix(a['part'], b['part'], u),
        'brow': mix(a['brow'], b['brow'], u),
        'lid': tuple(mix(a['lid'][i], b['lid'][i], u) for i in (0, 1)),
        'locks': a['locks'],
        'mouth': q['mouth'],
        'acc': q.get('acc'),
    }
    return out


# --------------------------------------------------------------- assembling --
def frame(pose, fill, hi, streak):
    t = pose['turn']
    o = t * 22          # must match face(): features ride with the skull
    parts = []

    parts.append(burst(t, streak, fill))

    if pose.get('acc') == 'blade':
        parts.append(ACC['blade'](t, fill))

    parts.append('<g fill="%s">' % fill)
    parts.append(hair_back(t * .6, pose['spread'], pose['length']))
    parts.append(shoulders(t))
    parts.append(neck(t))
    parts.append(face(t))
    parts.append('</g>')
    parts.append(collar(t))

    # features
    lid = pose['lid']
    ew, eh = 40, 25
    for s, l in ((-1, lid[0]), (1, lid[1])):
        ex = CX + o + s * 63
        parts.append(eye(ex, EYE_Y, ew, eh, l))
        if l > .35:
            parts.append(glint(ex, EYE_Y, ew, eh * l, hi))
    for s in (-1, 1):
        parts.append(brow(CX + o + s * 63, EYE_Y - 56, 38, pose['brow'] * s))
    parts.append(nose(CX + o + 8, 372))
    parts.append(mouth(CX + o + 4, 402, pose['mouth']))

    # hair over the brow, then the accessory on top
    parts.append('<g fill="%s">%s</g>' % (fill, bangs(t, pose['part'], pose['locks'])))
    if pose.get('acc') and pose['acc'] != 'blade':
        parts.append(ACC[pose['acc']](t, fill))

    if streak > .01:
        # a streak of light through the hair, fading up across the move
        parts.append('<path fill="%s" fill-opacity="%.2f" d="M%s C%s %s %s '
                     'C%s %s %s Z"/>' % (
                         ACID, streak * .9,
                         p(166 + o, 172), p(168 + o, 120), p(208 + o, 84), p(CX + o, 84),
                         p(228 + o, 106), p(194 + o, 134), p(192 + o, 176)))
    return ''.join(parts)


# ------------------------------------------------------------------- poses --
# The START and END of each section's move; frames b and c are interpolated.
# Keep the pair far enough apart that the walk is unmistakable at 22% opacity.
POSES = {
    'status': (
        {'turn': -.62, 'spread': 6, 'length': 232, 'part': .34, 'locks': 3,
         'lid': (1, 1), 'brow': 6, 'mouth': 'calm', 'acc': 'headset'},
        {'turn': .78, 'spread': 18, 'length': 288, 'part': .68, 'locks': 4,
         'lid': (.35, 1), 'brow': 20, 'mouth': 'grin', 'acc': 'headset'},
    ),
    'targets': (
        {'turn': .55, 'spread': 4, 'length': 228, 'part': .62, 'locks': 3,
         'lid': (.75, .75), 'brow': 14, 'mouth': 'calm', 'acc': None},
        {'turn': -.8, 'spread': 20, 'length': 290, 'part': .28, 'locks': 4,
         'lid': (.28, .28), 'brow': 24, 'mouth': 'calm', 'acc': 'visor'},
    ),
    'records': (
        {'turn': -.5, 'spread': 8, 'length': 226, 'part': .4, 'locks': 4,
         'lid': (1, 1), 'brow': 3, 'mouth': 'calm', 'acc': 'glasses'},
        {'turn': .72, 'spread': 2, 'length': 268, 'part': .72, 'locks': 3,
         'lid': (1, .08), 'brow': 16, 'mouth': 'grin', 'acc': None},
    ),
    'arsenal': (
        {'turn': .6, 'spread': 12, 'length': 240, 'part': .64, 'locks': 4,
         'lid': (.9, .9), 'brow': 15, 'mouth': 'calm', 'acc': 'blade'},
        {'turn': -.85, 'spread': 6, 'length': 292, 'part': .26, 'locks': 3,
         'lid': (1, 1), 'brow': 26, 'mouth': 'shout', 'acc': None},
    ),
    'contact': (
        {'turn': .45, 'spread': 10, 'length': 230, 'part': .6, 'locks': 3,
         'lid': (1, 1), 'brow': 5, 'mouth': 'grin', 'acc': 'hand'},
        {'turn': -.7, 'spread': 4, 'length': 282, 'part': .32, 'locks': 4,
         'lid': (1, 1), 'brow': 18, 'mouth': 'shout', 'acc': 'hand'},
    ),
}


def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
            'viewBox="0 0 %d %d">%s</svg>\n') % (W, H, W, H, body)


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    total = 0
    tags = ('a', 'b', 'c', 'd')
    for key, (start, end) in POSES.items():
        for i, tag in enumerate(tags):
            u = i / (len(tags) - 1)
            pose = tween(start, end, u)
            fill = ramp(u)
            hi = mix_hex(BONE, ACID, u)
            path = os.path.join(OUT, 'anime-%s-%s.svg' % (key, tag))
            open(path, 'w', encoding='utf-8').write(svg(frame(pose, fill, hi, u)))
            total += os.path.getsize(path)
            print('  anime-%s-%s.svg  %5.1f KB' % (key, tag, os.path.getsize(path) / 1024))
    print('wrote 20 frames, %.1f KB total' % (total / 1024))


if __name__ == '__main__':
    main()
