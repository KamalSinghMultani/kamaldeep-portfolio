"""Compose Open Peeps figures (body + head + face) as flat silhouettes."""
import sketch2svg as S

# geometry lifted from the file's own "a person/standing" master
CANVAS = (1179, 3291)
BODY_AT = (-121, 634)
HEAD_AT = (404, 180)
FACE_AT = (404 + 159, 180 + 186)

FIGURES = [
    ('status',  'pose/standing/crossed_arms-1', 'head/Short 3',   'face/Calm'),
    ('targets', 'pose/standing/pointing_finger-1', 'head/Pomp',   'face/Driven'),
    ('records', 'pose/standing/shirt-2',       'head/Short 1',    'face/Serious'),
    ('arsenal', 'pose/standing/blazer-2',      'head/Flat Top', 'face/Explaining'),
    ('contact', 'pose/standing/easing-1',      'head/Medium 1',   'face/Smile'),
]

def build(pose, head, face, flat=None):
    S.init()
    parts = []
    for name, (ox, oy) in ((pose, BODY_AT), (head, HEAD_AT), (face, FACE_AT)):
        m = S.MASTERS.get(name)
        if not m:
            print('  !! missing', name)
            continue
        S.render(m, ox, oy, None, parts)
    body = []
    for d, c, a, rule in parts:
        fill = flat or c
        op = '' if a >= 0.999 else ' fill-opacity="%.3f"' % a
        fr = '' if rule == 'nonzero' else ' fill-rule="evenodd"'
        body.append('<path d="%s" fill="%s"%s%s/>' % (d, fill, op, fr))
    w, h = CANVAS
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">%s</svg>'
            % (w, h, w, h, ''.join(body)))

if __name__ == '__main__':
    import sys
    flat = sys.argv[1] if len(sys.argv) > 1 else None
    for key, pose, head, face in FIGURES:
        svg = build(pose, head, face, flat)
        out = 'fig-%s.svg' % key
        open(out, 'w').write(svg)
        print('wrote', out, len(svg), 'bytes  <-', pose, '+', head, '+', face)
