"""Shared helpers for the aurora fit: reference cache, per-frame background masks, the ribbon
model (numpy mirror of the shader in src/scenes/login/aurora.js)."""
import re, os, numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
REF = os.path.join(ROOT, 'ref', 'frames')
HALF = '/private/tmp/claude-501/-Users-jackson-workplace/d86b7c74-4e10-4638-a51b-152960fbb7f5/scratchpad/login/half.npy'

# half-res pixel centres in stage px
XS = (np.arange(480) + 0.5) * 2
YS = (np.arange(360) + 0.5) * 2


def cursor_keys():
    s = open(os.path.join(ROOT, 'src', 'demo', 'cursor.js')).read()
    k = re.findall(r'\[(\d+),\s*([-\d.]+|null),\s*([-\d.]+|null)\]', s)
    return [(int(f), None if x == 'null' else float(x), None if y == 'null' else float(y)) for f, x, y in k]


_ck = None


def cursor_at(n):
    global _ck
    if _ck is None:
        _ck = cursor_keys()
    k = _ck
    if n <= k[0][0]:
        return None if k[0][1] is None else (k[0][1], k[0][2])
    for i in range(1, len(k)):
        if n <= k[i][0]:
            f0, x0, y0 = k[i - 1]
            f1, x1, y1 = k[i]
            if x0 is None or x1 is None:
                return None
            a = (n - f0) / (f1 - f0)
            return (x0 + (x1 - x0) * a, y0 + (y1 - y0) * a)
    return None


_logo = None


def logo_mask_full():
    """tight logo mask (stage px, 960x720 bool) from f00001, dilated 3 px"""
    global _logo
    if _logo is None:
        im = np.asarray(Image.open(os.path.join(REF, 'f00001.png')).convert('RGB')).astype(np.float32)
        L = im.mean(2)
        m = np.zeros((720, 960), np.uint8)
        reg = L[45:192, 700:852]
        # pastel flag: high red; words: bright
        sat = im[45:192, 700:852, 0]
        m[45:192, 700:852] = ((reg > 140) | (sat > 120)).astype(np.uint8)
        _logo = cv2.dilate(m, np.ones((7, 7), np.uint8)) > 0
    return _logo


def mask_full(n, bar_top=571):
    """True = background visible in reference frame n (stage px)"""
    m = np.ones((720, 960), bool)
    m[bar_top:, :] = False
    if n <= 512:
        m &= ~logo_mask_full()
    if 172 <= n <= 515:
        m[220:462, 262:728] = False
    if 168 <= n <= 202:
        m[200:600, 240:560] = False
    c = cursor_at(n)
    if c is not None:
        x, y = int(c[0]), int(c[1])
        m[max(0, y - 14):y + 34, max(0, x - 14):x + 36] = False  # include blur trail roughly
    return m


def mask_half(n):
    m = mask_full(n)
    return m.reshape(360, 2, 480, 2).all((1, 3))


def load_half():
    return np.load(HALF, mmap_mode='r')


# ---------------------------------------------------------------- B-spline along x
# Ribbon curves: uniform cubic B-splines over x with KX control points spaced SX px,
# control k at x = X0 + (k - 1) * SX.
KX = 8
X0 = -60.0
SX = (1020.0 - X0) / (KX - 3)


def bx_basis(xs):
    u = (xs - X0) / SX + 1
    i = np.floor(u).astype(int)
    f = u - i
    w = np.stack([(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6], -1)
    dw = np.stack([-(1 - f) ** 2 / 2, (9 * f ** 2 - 12 * f) / 6, (-9 * f ** 2 + 6 * f + 3) / 6, f ** 2 / 2], -1) / SX
    B = np.zeros((len(xs), KX))
    D = np.zeros((len(xs), KX))
    for a in range(4):
        idx = np.clip(i - 1 + a, 0, KX - 1)
        np.add.at(B, (np.arange(len(xs)), idx), w[:, a])
        np.add.at(D, (np.arange(len(xs)), idx), dw[:, a])
    return B, D


BXH, DXH = bx_basis(XS)  # half-res columns
