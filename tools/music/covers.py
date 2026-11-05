#!/usr/bin/env python3
"""Original stand-in album covers for the my Music window (see docs/SUBSTITUTIONS.md).

The drawings below are blended over a 5x5 colour field per tile (cover_fields.json, the mean
colours of the reference tile), so each stand-in keeps the tile's overall colour layout.

Each cover is generated from simple shapes that only echo the colours and rough layout of the
tile it replaces in the reference video (no logos, faces, photos or text from the real covers).
usage: python3 tools/music/covers.py   -> public/img/music/covers/<id>.webp (128x128) + tweet-lg.webp
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'img', 'music', 'covers')
S = 512  # working size
rng = np.random.default_rng(7)


def hexc(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


class C:
    def __init__(self, bg='#000000'):
        self.im = Image.new('RGBA', (S, S), hexc(bg))

    def grad(self, c0, c1, angle=90, x0=0, y0=0, x1=1, y1=1):
        """linear gradient over the box (fractions); angle 90 = top->bottom"""
        w, h = int((x1 - x0) * S), int((y1 - y0) * S)
        a = math.radians(angle)
        yy, xx = np.mgrid[0:h, 0:w]
        k = (xx / max(w - 1, 1) - .5) * math.cos(a) + (yy / max(h - 1, 1) - .5) * math.sin(a)
        k = np.clip(k / (abs(math.cos(a)) / 2 + abs(math.sin(a)) / 2) + .5, 0, 1)[..., None]
        A, B = np.array(hexc(c0), float), np.array(hexc(c1), float)
        arr = (A * (1 - k) + B * k).astype(np.uint8)
        self.im.alpha_composite(Image.fromarray(arr), (int(x0 * S), int(y0 * S)))
        return self

    def layer(self, draw_fn, blur=0, alpha=255):
        L = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        draw_fn(ImageDraw.Draw(L))
        if blur:
            L = L.filter(ImageFilter.GaussianBlur(blur * S / 128))
        if alpha < 255:
            a = np.asarray(L).copy()
            a[..., 3] = (a[..., 3].astype(float) * alpha / 255).astype(np.uint8)
            L = Image.fromarray(a)
        self.im.alpha_composite(L)
        return self

    def rect(self, box, col, blur=0, alpha=255, r=0):
        b = [v * S for v in box]
        return self.layer(lambda d: d.rounded_rectangle(b, r * S, fill=hexc(col)) if r else d.rectangle(b, fill=hexc(col)), blur, alpha)

    def ell(self, cx, cy, rx, ry, col, blur=0, alpha=255, outline=None, width=0):
        b = [(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S]
        if outline:
            return self.layer(lambda d: d.ellipse(b, outline=hexc(outline), width=int(width * S)), blur, alpha)
        return self.layer(lambda d: d.ellipse(b, fill=hexc(col)), blur, alpha)

    def poly(self, pts, col, blur=0, alpha=255):
        p = [(x * S, y * S) for x, y in pts]
        return self.layer(lambda d: d.polygon(p, fill=hexc(col)), blur, alpha)

    def line(self, pts, col, width, blur=0, alpha=255):
        p = [(x * S, y * S) for x, y in pts]
        return self.layer(lambda d: d.line(p, fill=hexc(col), width=int(width * S), joint='curve'), blur, alpha)

    def type(self, x, y, w, col, h=0.025, alpha=200, blur=0.4):
        """a line of 'type' as a soft bar (never real lettering)"""
        return self.rect((x, y, x + w, y + h), col, blur=blur, alpha=alpha)

    def figure(self, cx, top, h, col, blur=0.6, alpha=255, w=None):
        """abstract standing figure: a soft capsule body and a round head, no features"""
        w = w or h * 0.32
        hr = w * 0.33

        def d(dr):
            dr.ellipse([(cx - hr) * S, top * S, (cx + hr) * S, (top + 2 * hr) * S], fill=hexc(col))
            dr.rounded_rectangle([(cx - w / 2) * S, (top + 2.2 * hr) * S, (cx + w / 2) * S, (top + h) * S], w * 0.35 * S, fill=hexc(col))
        return self.layer(d, blur, alpha)

    def grain(self, amt=6):
        a = np.asarray(self.im).astype(float)
        a[..., :3] += rng.normal(0, amt, a[..., :3].shape)
        self.im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        return self

    def save(self, name, size=128, soften=0.35, field=None, detail=0.85):
        im = self.im.convert('RGB')
        if field is not None:
            # keep this drawing's shapes (high frequencies) over a smooth colour field that
            # follows the tile's coarse colour layout: final = lowpass(field) + k * highpass(drawing)
            f = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in field], np.uint8).reshape(5, 5, 3)
            f = Image.fromarray(f).resize((S, S), Image.BICUBIC).filter(ImageFilter.GaussianBlur(S / 14))
            a = np.asarray(im, float)
            lo = np.asarray(im.filter(ImageFilter.GaussianBlur(S / 14)), float)
            im = Image.fromarray(np.clip(np.asarray(f, float) + detail * (a - lo), 0, 255).astype(np.uint8))
        im = im.resize((size, size), Image.LANCZOS)
        if soften:
            im = im.filter(ImageFilter.GaussianBlur(soften))
        im.save(os.path.join(OUT, name + '.webp'), quality=90, method=6)
        return im


covers = {}


def cover(fn):
    covers[fn.__name__] = fn
    return fn


@cover
def a_white():  # pale grey-white field, a dark reclining shape across the middle
    c = C('#eef0f2').grad('#f6f7f8', '#c9c7c9', 90)
    c.ell(.55, .62, .45, .22, '#dedcdc', blur=8).ell(.5, .8, .5, .2, '#9a9493', blur=14, alpha=170)
    c.poly([(.2, .62), (.55, .43), (.82, .38), (.9, .5), (.6, .55), (.3, .7)], '#5b4f52', blur=3)
    c.ell(.78, .42, .1, .09, '#3e3336', blur=2)
    c.type(.08, .08, .3, '#9c9a9c', alpha=150).type(.45, .08, .25, '#bdbbbd', alpha=120)
    return c.grain(4)


@cover
def b_suit():  # dusk blue sky with a dark suited shape, cool lights
    c = C('#5f6178').grad('#626a8c', '#7a90c0', 90, 0, 0, 1, .55).grad('#3f5180', '#101c4e', 90, 0, .5, 1, 1)
    c.rect((0, .5, 1, .56), '#9db1dd', blur=3, alpha=160)
    c.line([(.05, .95), (.45, .62)], '#5d7bc6', .02, blur=1, alpha=180).line([(.95, .95), (.6, .62)], '#5d7bc6', .02, blur=1, alpha=180)
    c.poly([(.33, 1), (.36, .52), (.45, .42), (.58, .42), (.68, .52), (.72, 1)], '#141a2a', blur=1.5)
    c.ell(.52, .32, .07, .09, '#c9c4c8', blur=2)
    c.poly([(.49, .45), (.55, .45), (.53, .7)], '#e8eaf0', blur=1)
    c.type(.1, .68, .22, '#c8d4f0', alpha=170)
    return c.grain(5)


@cover
def c_lights():  # black field, three stacked soft lamps (red, amber, green)
    c = C('#030303')
    for y, col in ((.24, '#d8342a'), (.5, '#f0a21a'), (.76, '#3fa52e')):
        c.ell(.74, y, .1, .1, col, blur=0.8)
        c.ell(.72, y - .03, .04, .03, '#ffffff', blur=2, alpha=90)
    c.type(.22, .49, .22, '#7a7a7a', alpha=160).type(.24, .82, .1, '#8a8a8a', alpha=140)
    return c.grain(3)


@cover
def d_sky():  # bright cyan sky over a dark valley
    c = C('#0a9edf').grad('#18a8e6', '#bfe6f5', 90, 0, 0, 1, .45)
    c.ell(.45, .22, .4, .12, '#e8f6fb', blur=10, alpha=220)
    c.poly([(0, .42), (.5, .78), (1, .42), (1, 1), (0, 1)], '#0d2a3e')
    c.poly([(.18, .5), (.5, .74), (.82, .5), (.5, .62)], '#1d6d96', blur=3, alpha=200)
    c.rect((.25, .06, .75, .14), '#16324a', blur=1, alpha=170)
    return c.grain(4)


@cover
def e_four():  # flat cyan backdrop, four abstract standing figures
    c = C('#13ade5')
    for x, col, sh in ((.22, '#d9d4b8', '#2c3b43'), (.42, '#1d3548', '#20323e'), (.6, '#dccdc9', '#3a4958'), (.79, '#3a4a5a', '#21455a')):
        c.figure(x, .36, .6, col, w=.16)
        c.rect((x - .06, .74, x + .06, .97), sh, blur=.6)
    c.type(.68, .07, .22, '#0a6a8f', alpha=150)
    return c.grain(3)


@cover
def f_cream():  # cream field, amber shapes on the left, round lenses motif
    c = C('#efe6d4').grad('#c5a768', '#f6efe2', 0, 0, 0, .55, 1)
    c.ell(.3, .4, .17, .13, '#000000', outline='#2a2420', width=.025, alpha=230)
    c.ell(.7, .4, .17, .13, '#000000', outline='#2a2420', width=.025, alpha=230)
    c.line([(.47, .4), (.53, .4)], '#2a2420', .025)
    c.ell(.72, .82, .12, .08, '#d9a548', blur=1).ell(.8, .78, .06, .05, '#a36e2a', blur=1)
    c.rect((.6, .07, .92, .14), '#1c1a18', alpha=200)
    return c.grain(4)


@cover
def g_quads():  # four colour blocks: purple, green, orange-red, magenta with a white band
    c = C('#7a4a80')
    c.rect((0, 0, .5, .5), '#6a3c78').rect((.5, 0, 1, .5), '#15884a').rect((0, .5, .5, 1), '#b0522c').rect((.5, .5, 1, 1), '#c04f6e')
    c.ell(.3, .32, .2, .22, '#a07f98', blur=6, alpha=200)
    c.rect((.08, .44, .92, .53), '#f4eef0', alpha=230).rect((.12, .58, .8, .66), '#f4eef0', alpha=210)
    return c.grain(4)


@cover
def h_ghost():  # near-black with a cold teal glow on the right
    c = C('#141618').grad('#22272b', '#0b0e10', 90)
    c.ell(.68, .45, .2, .38, '#4d6669', blur=10).ell(.68, .3, .09, .1, '#9fb4b2', blur=4, alpha=200)
    c.line([(.62, .45), (.55, .9)], '#7e9a9a', .03, blur=2).line([(.74, .45), (.82, .88)], '#7e9a9a', .03, blur=2)
    for i in range(7):
        c.type(.08, .22 + i * .07, .25 - (i % 3) * .05, '#6d7578', alpha=160)
    c.rect((.08, .07, .9, .12), '#c8d0d0', alpha=150)
    return c.grain(4)


@cover
def i_wheel():  # dark red field, a large blue wheel with orange spokes
    c = C('#3a0f18').grad('#4a1220', '#2a1430', 90)
    c.ell(.5, .55, .42, .42, '#3f8fb5', blur=.5)
    c.ell(.5, .55, .3, .3, '#5aa7c8', blur=.5)
    for k in range(10):
        a = k * math.pi / 5
        c.line([(.5, .55), (.5 + .4 * math.cos(a), .55 + .4 * math.sin(a))], '#e07a2a', .035)
    c.ell(.5, .55, .1, .1, '#e3a13a').ell(.5, .55, .42, .42, None, outline='#e8c35a', width=.02)
    c.rect((.05, .04, .95, .13), '#b8443a', alpha=220)
    return c.grain(5)


@cover
def j_navy():  # plain dark aubergine-navy
    return C('#1c1727').grad('#1d1929', '#201b2b', 90).grain(3)


@cover
def k_tweet():  # gold strip, smoky grey field, an abstract hummingbird in flight
    return tweet(C('#5a5858'))


def tweet(c, big=False):
    """gold foil band on the left, a high-key grey field framed by dark sweeping shapes,
    and an original hummingbird drawn across the light centre (no photo, no face)"""
    c.grad('#9a9a9a', '#7c7c7c', 110, .28, 0, 1, 1)
    c.ell(.64, .46, .2, .3, '#c9c9c7', blur=9)
    c.ell(.62, .95, .3, .14, '#b4b3b0', blur=8)
    # dark sweeping shapes (left and right of the light centre, and over the top)
    c.poly([(.3, 0), (.52, 0), (.46, .2), (.44, .5), (.47, .8), (.42, 1), (.28, 1), (.34, .6), (.3, .3)], '#2c2b2b', blur=3)
    c.poly([(.78, .05), (.9, .02), (.96, .3), (.93, .7), (.98, 1), (.84, 1), (.86, .6), (.82, .3)], '#353434', blur=3)
    c.ell(.64, .1, .2, .1, '#3a3939', blur=5)
    # gold foil band with a soft highlight and fine vertical streaks
    c.grad('#b88a2c', '#e9c25c', 0, 0, 0, .2, 1).grad('#e9c25c', '#a87c22', 0, .2, 0, .36, 1)
    c.rect((.06, 0, .16, 1), '#fff2c0', blur=6, alpha=110)
    c.ell(.12, .12, .14, .16, '#fff8dc', blur=8, alpha=150)
    for k in range(9):
        x = .02 + k * .037
        c.rect((x, 0, x + .006, 1), '#7a5a18', blur=.8, alpha=25)
    c.poly([(.33, 0), (.4, .25), (.37, .55), (.3, .75), (.33, 1), (.27, 1), (.3, .5), (.29, .2)], '#3a3027', blur=4, alpha=200)
    c.rect((.04, .05, .2, .08), '#6a4c12', alpha=170, blur=.5)
    # hummingbird: body, raised wing and long bill, mid grey on the light centre
    c.poly([(.5, .62), (.62, .5), (.72, .48), (.68, .56), (.56, .66)], '#4e4d4c', blur=.8)
    c.poly([(.6, .52), (.64, .26), (.72, .3), (.67, .5)], '#5e5d5b', blur=.8)
    c.line([(.72, .49), (.88, .43)], '#4e4d4c', .012, blur=.4)
    c.poly([(.5, .62), (.42, .72), (.47, .63)], '#5a5958', blur=.8)
    return c.grain(5 if not big else 3)


@cover
def l_tan():  # warm tan paper with a small dark figure
    c = C('#efb877').grad('#f3c283', '#e2ab6c', 120)
    c.figure(.42, .3, .45, '#1e1b16', w=.15)
    c.ell(.42, .32, .07, .04, '#f2c84a', blur=.5)
    c.type(.1, .1, .2, '#7a5530', alpha=170, h=.04)
    c.type(.5, .78, .3, '#8b6a46', alpha=150)
    c.ell(.43, .83, .08, .03, '#2a2018', blur=1)
    return c.grain(4)


@cover
def m_black():  # black field, a dim grey glow at the right edge
    c = C('#000000')
    c.ell(.95, .62, .15, .35, '#3a3a3c', blur=8).ell(.92, .55, .05, .2, '#5a5a5c', blur=4, alpha=160)
    c.type(.1, .05, .7, '#3c3c3c', alpha=140)
    return c.grain(2)


@cover
def n_graffiti():  # green and magenta spray shapes behind a warm, curly shape
    c = C('#5c6631').grad('#6b5a3a', '#3d6a28', 0)
    c.line([(.55, .05), (.65, .4), (.85, .2), (.95, .5)], '#3fbf3a', .07, blur=1)
    c.rect((.75, .7, 1, 1), '#d06a78', blur=2)
    c.ell(.38, .32, .3, .3, '#5a3a22', blur=4)
    c.ell(.42, .48, .18, .2, '#e8ad73', blur=3)
    c.ell(.4, .9, .35, .18, '#f0b27a', blur=3)
    return c.grain(5)


@cover
def o_dark():  # charcoal with a warm dim shape at top right
    c = C('#1c1816').grad('#2a2522', '#0c0a08', 90)
    c.ell(.7, .25, .2, .2, '#55402e', blur=8).ell(.6, .6, .15, .3, '#1a1512', blur=4)
    c.type(.06, .22, .4, '#9a9590', alpha=170)
    return c.grain(3)


@cover
def p_legend():  # black top with a warm amber glow, misty grey-blue lower band
    c = C('#140c06')
    c.ell(.62, .3, .2, .3, '#b4692a', blur=10).ell(.6, .35, .1, .18, '#7a3c14', blur=4)
    c.rect((0, .58, 1, 1), '#7b858e', blur=3).grad('#545a62', '#a8acaa', 90, 0, .62, 1, 1)
    c.ell(.62, .7, .2, .2, '#cfc6b6', blur=6, alpha=200)
    c.type(.06, .08, .28, '#b89a52', alpha=180).type(.06, .14, .2, '#8c7440', alpha=150)
    return c.grain(5)


@cover
def q_mono():  # grey-teal monochrome photo feel with a red label at top left
    c = C('#56605f').grad('#6e6460', '#2c3638', 90)
    c.ell(.55, .55, .3, .4, '#8e9ba0', blur=10).ell(.6, .45, .15, .2, '#3a4446', blur=6)
    c.rect((0, .5, .3, 1), '#2b3536', blur=4, alpha=200)
    c.rect((.04, .06, .44, .2), '#c22a2a')
    c.type(.08, .11, .3, '#f0e6e6', alpha=220)
    return c.grain(9)


@cover
def r_amber():  # cracked amber shapes over teal
    c = C('#336a74').grad('#2c5a60', '#3a7f8a', 45)
    for (x, y, rx, ry) in ((.25, .3, .25, .2), (.3, .75, .28, .2), (.62, .55, .14, .25), (.15, .55, .12, .1)):
        c.ell(x, y, rx, ry, '#d9a23e', blur=.5)
    for k in range(9):
        a = k * .7
        c.line([(.3 + .2 * math.cos(a), .5 + .3 * math.sin(a)), (.35 + .4 * math.cos(a * 1.3), .5 + .4 * math.sin(a * 1.7))], '#22323a', .015)
    c.rect((.7, 0, 1, .4), '#8a6a3c', blur=4, alpha=170)
    return c.grain(5)


@cover
def s_eye():  # dark top, an iris ring, olive-gold lower half
    c = C('#141412').grad('#1a1a17', '#7c5e2a', 90)
    c.ell(.5, .27, .3, .14, '#d4d7cc', blur=1.5)
    c.ell(.5, .27, .12, .12, '#2f8f86', blur=.5).ell(.5, .27, .05, .05, '#050505')
    c.ell(.5, .27, .3, .14, None, outline='#0b0b0a', width=.03, alpha=220)
    c.rect((.08, .45, .55, .55), '#c9c2a8', alpha=170, blur=.5)
    c.line([(.6, .55), (.62, .9)], '#e0d6b0', .015, blur=1, alpha=160)
    return c.grain(5)


@cover
def t_sketch():  # white paper with a heavy black ink scribble block
    c = C('#f2f2ef')
    c.rect((.12, .22, .88, .85), '#2c3030', blur=1.5)
    for k in range(40):
        x0, y0 = rng.uniform(.1, .9, 2)
        c.line([(x0, y0), (x0 + rng.uniform(-.25, .25), y0 + rng.uniform(-.25, .25))], '#f0f0ec' if k % 3 == 0 else '#111414', .012, alpha=200)
    c.rect((.14, .06, .3, .2), '#b8a283', alpha=220)
    return c.grain(6)


@cover
def u_olive():  # olive band top and bottom, three warm panels in a dark strip
    c = C('#849532')
    c.rect((0, .3, 1, .72), '#3f3820')
    for x in (.18, .5, .82):
        c.ell(x, .5, .12, .17, '#a8806a', blur=2).ell(x, .45, .05, .06, '#e0b8a0', blur=1)
    c.type(.08, .14, .3, '#2c3410', alpha=170)
    c.type(.7, .82, .2, '#2c3410', alpha=150)
    return c.grain(4)


@cover
def v_blue():  # deep blue with a lighter blue curved arm shape
    c = C('#08162f').grad('#0c214a', '#061226', 90)
    c.line([(.05, .35), (.4, .25), (.75, .45), (.85, .7)], '#14348a', .14, blur=4)
    c.line([(.1, .78), (.5, .62), (.7, .72)], '#0f2b70', .1, blur=4)
    c.ell(.75, .45, .12, .1, '#1d47a0', blur=4)
    return c.grain(4)


# reference grid order (4 rows x 8 columns) as cover ids
GRID = [
    'a_white', 'b_suit', 'c_lights', 'd_sky', 'e_four', 'f_cream', 'g_quads', 'h_ghost',
    'i_wheel', 'j_navy', 'k_tweet', 'l_tan', 'm_black', 'n_graffiti', 'o_dark', 'p_legend',
    'q_mono', 'r_amber', 's_eye', 't_sketch', 'u_olive', 'l_tan', 'v_blue', 'a_white',
    'v_blue', 'a_white', 'b_suit', 'c_lights', 'd_sky', 'e_four', 'f_cream', 'g_quads',
]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGB', (8 * 66, 4 * 66), (230, 236, 245))
    import json
    fields = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cover_fields.json')))
    made = {}
    for k, fn in covers.items():
        made[k] = fn().save(k, field=fields.get(k) if k != 'k_tweet' else None)
    tweet(C('#5a5858'), big=True).save('tweet-lg', size=512, soften=0)
    for i, k in enumerate(GRID):
        sheet.paste(made[k].resize((50, 50), Image.LANCZOS), ((i % 8) * 66 + 8, (i // 8) * 66 + 8))
    sheet.save(os.path.join(ROOT, 'out', 'covers-sheet.png'))
    print('wrote', len(made), 'covers to', OUT)
