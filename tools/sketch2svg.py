"""Minimal Sketch -> SVG renderer, enough for Open Peeps symbol masters."""
import json, glob, os, re, sys

def load_symbols():
    big = sorted(glob.glob('pages/*.json'), key=lambda p: -os.path.getsize(p))[0]
    d = json.load(open(big))
    return {l['name']: l for l in d['layers'] if l.get('_class') == 'symbolMaster'}

def pt(s):
    m = re.findall(r'-?\d+\.?\d*(?:e-?\d+)?', s)
    return float(m[0]), float(m[1])

def col(c):
    if not c:
        return None
    r, g, b = [max(0, min(255, int(round(c[k] * 255)))) for k in ('red', 'green', 'blue')]
    return '#%02x%02x%02x' % (r, g, b), c.get('alpha', 1)

def fill_of(node):
    st = node.get('style') or {}
    for f in st.get('fills') or []:
        if f.get('isEnabled', True) and f.get('color'):
            return col(f['color'])
    return None

def path_d(sp, ox, oy):
    f = sp['frame']
    w, h, x, y = f['width'], f['height'], f['x'] + ox, f['y'] + oy
    pts = sp.get('points') or []
    if not pts:
        return ''
    fh = sp.get('isFlippedHorizontal'); fv = sp.get('isFlippedVertical')

    def abs_(s):
        px, py = pt(s)
        if fh: px = 1 - px
        if fv: py = 1 - py
        return x + px * w, y + py * h

    d = []
    p0 = abs_(pts[0]['point'])
    d.append('M%.2f,%.2f' % p0)
    n = len(pts)
    closed = sp.get('isClosed', True)
    last = n if closed else n - 1
    for i in range(last):
        a, b = pts[i], pts[(i + 1) % n]
        pb = abs_(b['point'])
        if a.get('hasCurveFrom') or b.get('hasCurveTo'):
            c1 = abs_(a['curveFrom']) if a.get('hasCurveFrom') else abs_(a['point'])
            c2 = abs_(b['curveTo']) if b.get('hasCurveTo') else pb
            d.append('C%.2f,%.2f %.2f,%.2f %.2f,%.2f' % (c1[0], c1[1], c2[0], c2[1], pb[0], pb[1]))
        else:
            d.append('L%.2f,%.2f' % pb)
    if closed:
        d.append('Z')
    return ' '.join(d)

MASTERS = {}
BYID = {}

def render(node, ox=0.0, oy=0.0, inherited=None, out=None):
    if out is None:
        out = []
    if node.get('isVisible') is False:
        return out
    cls = node.get('_class')

    if cls == 'symbolInstance':
        name = BYID.get(node.get('symbolID'))
        m = MASTERS.get(name) if name else None
        if not m or (name or '').endswith(('*no-mask', '* None')):
            return out
        fr = node.get('frame') or {}
        render(m, ox + fr.get('x', 0), oy + fr.get('y', 0), inherited, out)
        return out

    if cls == 'shapeGroup':
        # subpaths of one group combine with boolean ops - evenodd approximates it
        fr = node.get('frame') or {}
        nx, ny = ox + fr.get('x', 0), oy + fr.get('y', 0)
        f = fill_of(node) or inherited or ('#000000', 1)
        ds = []
        for c in node.get('layers') or []:
            if c.get('isVisible') is False:
                continue
            if c.get('_class') == 'shapePath':
                d = path_d(c, nx, ny)
                if d:
                    ds.append(d)
            else:
                render(c, nx, ny, f, out)
        if ds:
            out.append((' '.join(ds), f[0], f[1], 'evenodd'))
        return out

    if cls == 'shapePath':
        f = fill_of(node) or inherited
        d = path_d(node, ox, oy)
        if d:
            c, a = f if f else ('#000000', 1)
            out.append((d, c, a, 'nonzero'))
        return out

    if cls in ('oval', 'rectangle'):
        fr = node['frame']
        x, y, w, h = fr['x'] + ox, fr['y'] + oy, fr['width'], fr['height']
        f = fill_of(node) or inherited
        c, a = f if f else ('#000000', 1)
        if cls == 'oval':
            rx, ry = w / 2.0, h / 2.0
            d = ('M%.2f,%.2f a%.2f,%.2f 0 1,0 %.2f,0 a%.2f,%.2f 0 1,0 %.2f,0Z'
                 % (x, y + ry, rx, ry, w, rx, ry, -w))
        else:
            d = 'M%.2f,%.2f H%.2f V%.2f H%.2f Z' % (x, y, x + w, y + h, x)
        out.append((d, c, a, 'nonzero'))
        return out

    # containers
    fr = node.get('frame') or {}
    nx = ox + (fr.get('x', 0) if cls != 'symbolMaster' else 0)
    ny = oy + (fr.get('y', 0) if cls != 'symbolMaster' else 0)
    inh = fill_of(node) or inherited
    for c in node.get('layers') or []:
        render(c, nx, ny, inh, out)
    return out

def to_svg(master, flat=None):
    fr = master['frame']
    w, h = fr['width'], fr['height']
    parts = render(master)
    body = []
    for d, c, a, rule in parts:
        fill = flat or c
        op = '' if a >= 0.999 else ' fill-opacity="%.3f"' % a
        fr = '' if rule == 'nonzero' else ' fill-rule="evenodd"'
        body.append('<path d="%s" fill="%s"%s%s/>' % (d, fill, op, fr))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" '
            'width="%.0f" height="%.0f">%s</svg>' % (w, h, w, h, ''.join(body)))

def init():
    global MASTERS, BYID
    import glob as _g, os as _o, json as _j
    big = sorted(_g.glob('pages/*.json'), key=lambda p: -_o.path.getsize(p))[0]
    d = _j.load(open(big))
    MASTERS = {l['name']: l for l in d['layers'] if l.get('_class') == 'symbolMaster'}
    BYID = {l['symbolID']: l['name'] for l in d['layers'] if l.get('_class') == 'symbolMaster'}
    return MASTERS

if __name__ == '__main__':
    masters = init()
    for name in sys.argv[1:]:
        if name not in masters:
            print('missing', name); continue
        svg = to_svg(masters[name])
        out = name.replace('/', '_') + '.svg'
        open(out, 'w').write(svg)
        print('wrote', out, len(svg), 'bytes')
