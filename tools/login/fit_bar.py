#!/usr/bin/env python3
"""Fit the bottom bar as a translucent overlay over the aurora: ref = (1 - a) * aurora + a * C.
usage: fit_bar.py <nobar capture dir> <out.png>
The capture dir holds the app's frames with ?capture&nobar (aurora + UI, no bar band).
Per 4x1 px cell, a per-channel least-squares fit over the frames where nothing covers the cell
gives the slope (1 - a) and intercept a*C; cells never uncovered are filled from neighbours.
Writes an RGBA PNG (240 x 148) = premultiplied-free colour C and alpha a for y 572..719."""
import sys, os, numpy as np, cv2
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
cap, out = sys.argv[1], sys.argv[2]
Y0, Y1 = 572, 720
SLOTS5 = [363.2, 463.2, 563.2, 663.2, 763.2]
SLOTS4 = [341.5, 438.3, 535, 631.7]


def mask(n):
    m = np.ones((Y1 - Y0, 960), bool)
    def box(x0, y0, x1, y1):
        m[max(0, y0 - Y0):max(0, y1 - Y0), max(0, x0):x1] = False
    box(30, 615, 102, 692)          # shut down
    box(815, 624, 935, 666)         # clock
    slots = SLOTS5 if n < 168 else SLOTS4 if n > 200 else SLOTS5 + SLOTS4
    for cx in slots:
        box(int(cx - 34), 598, int(cx + 34), 670)
        box(int(cx - 38), 668, int(cx + 38), 692)
    if 160 <= n <= 202:
        box(300, 560, 600, 720)     # press glow + launch
    return m


def load(n):
    r = np.asarray(Image.open(f'{ROOT}/ref/frames/f{n:05d}.png').convert('RGB'), np.float32)[Y0:Y1]
    a = np.asarray(Image.open(f'{cap}/f{n:05d}.png').convert('RGB'), np.float32)[Y0:Y1]
    # 4x1 cells
    r = r.reshape(Y1 - Y0, 240, 4, 3).mean(2)
    a = a.reshape(Y1 - Y0, 240, 4, 3).mean(2)
    m = mask(n).reshape(Y1 - Y0, 240, 4).all(2)
    return r, a, m


if __name__ == '__main__':
    frames = sorted(int(f[1:6]) for f in os.listdir(cap) if f.endswith('.png') and int(f[1:6]) <= 509)
    with ProcessPoolExecutor(10) as ex:
        data = list(ex.map(load, frames))
    R = np.stack([d[0] for d in data]); A = np.stack([d[1] for d in data]); M = np.stack([d[2] for d in data]).astype(np.float32)
    n = M.sum(0)
    print('frames', len(frames), 'cells never seen', int((n < 8).sum()), 'of', n.size)
    # weighted per-channel regression R = s*A + b, shared s across channels
    w = M[..., None]
    sw = n[..., None] + 1e-6
    mA = (w * A).sum(0) / sw; mR = (w * R).sum(0) / sw
    cov = (w * (A - mA) * (R - mR)).sum(0).sum(-1); var = (w * (A - mA) ** 2).sum(0).sum(-1)
    s = np.clip(cov / (var + 1e-6 * n + 50.0), 0, 1)   # ridge towards an opaque bar where A barely varies
    alpha = 1 - s
    b = mR - s[..., None] * mA
    C = b / np.maximum(alpha[..., None], 0.05)
    # smooth, weighted by how often each cell was seen (normalised convolution): the bar is a
    # soft translucent band; only its thin top/bottom lines keep 1 px vertical detail
    wgt = np.minimum(n, 60).astype(np.float32)
    D = alpha[..., None] * C
    def smooth(x, sx, sy):
        num = cv2.GaussianBlur(x * wgt, (0, 0), sx, sigmaY=max(sy, 0.01))
        den = cv2.GaussianBlur(wgt, (0, 0), sx, sigmaY=max(sy, 0.01))
        return num / np.maximum(den, 1e-3)
    body = slice(6, 140)     # y 578..711
    al_s = np.empty_like(alpha); D_s = np.empty_like(D)
    al_s[:] = smooth(alpha, 10, 0)
    for c in range(3): D_s[..., c] = smooth(D[..., c], 10, 0)
    al_s[body] = smooth(alpha, 10, 10)[body]
    for c in range(3): D_s[body, :, c] = smooth(D[..., c], 10, 10)[body]
    alpha = np.clip(al_s, 0, 1)
    C = D_s / np.maximum(alpha[..., None], 0.05)
    pred = (1 - alpha[..., None]) * A + alpha[..., None] * C
    e_fit = np.sqrt(((pred - R) ** 2 * w).sum() / (w.sum() * 3))
    e_none = np.sqrt(((A - R) ** 2 * w).sum() / (w.sum() * 3))
    print('masked rmse: no bar %.2f, fitted bar %.2f' % (e_none, e_fit))
    rgba = np.concatenate([np.clip(C, 0, 255), np.clip(alpha, 0, 1)[..., None] * 255], -1)
    Image.fromarray(rgba.round().astype(np.uint8)).save(out)
    print('wrote', out, rgba.shape, 'alpha range %.2f-%.2f' % (alpha.min(), alpha.max()))
