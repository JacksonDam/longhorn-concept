#!/usr/bin/env python3
"""Fit the header slab's 3D pose per reference frame from its silhouette.

The slab is a box (w x h x d, centred) posed like gl/slab.js: Euler 'YXZ' of (-rx, ry, -rz),
translated to canvas (x, y), seen by a perspective camera at distance P over the canvas
origin (ox, oy). Its silhouette (convex hull of the 8 projected corners, corners rounded by
`radius`) is matched to a mask segmented from the reference frame (IoU, Powell).

usage: fitslab.py device|album <from> <to> [step] [--glob]  -> JSON lines on stdout
Canvas coords are window-local (stage - (45, 23)), with the canvas box SC of Header.jsx.
"""
import sys, json
import numpy as np, cv2
from PIL import Image
from scipy.optimize import minimize
from scipy import ndimage

REF = '/Users/jackson/workplace/longhorn-concept/ref/frames/f%05d.png'
SC = dict(x=175, y=118, w=230, h=240)  # window-local canvas box (Header.jsx)
WX, WY = 45, 23
P = 900.0
OX, OY = SC['w'] / 2, SC['h'] / 2


def segment(n, kind):
    im = np.asarray(Image.open(REF % n).convert('RGB')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    if kind == 'device':
        m = (b - r > 45) & (lum < 215)
    else:  # album slab: anything clearly not the white/pale page
        sat = im.max(2) - im.min(2)
        m = (lum < 200) | ((sat > 60) & (lum < 235))
    x0, y0 = SC['x'] + WX, SC['y'] + WY
    m = m[y0:y0 + SC['h'], x0:x0 + SC['w']].copy()
    m[:, (402 if kind == 'device' else 470) - x0:] = False  # title text / track list
    m[:146 - y0 + 1] = False  # window top
    lab, k = ndimage.label(m)
    if k == 0:
        return m
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    m = lab == (1 + int(np.argmax(sizes)))
    # the slab silhouette is convex: fill specular highlights the colour test misses
    ys, xs = np.nonzero(m)
    hull = cv2.convexHull(np.c_[xs, ys].astype(np.int32))
    out = np.zeros(m.shape, np.uint8)
    cv2.fillConvexPoly(out, hull, 1)
    return out.astype(bool)


def rot(rx, ry, rz):
    # three.js Euler 'YXZ' with angles (-rx, ry, -rz): R = Ry(ry) Rx(-rx) Rz(-rz)
    a, b, c = -rx, ry, -rz
    Rx = np.array([[1, 0, 0], [0, np.cos(a), -np.sin(a)], [0, np.sin(a), np.cos(a)]])
    Ry = np.array([[np.cos(b), 0, np.sin(b)], [0, 1, 0], [-np.sin(b), 0, np.cos(b)]])
    Rz = np.array([[np.cos(c), -np.sin(c), 0], [np.sin(c), np.cos(c), 0], [0, 0, 1]])
    return Ry @ Rx @ Rz


def project(pose, w, h, d, radius=0, n_round=4):
    x, y, rx, ry, rz = pose[:5]
    z = pose[5] if len(pose) > 5 else 0.0
    pts = []
    # rounded corners: sample a few points around each corner in the x/y plane, both faces
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                if radius > 0:
                    for k in range(n_round):
                        t = (k / (n_round - 1)) * np.pi / 2
                        px = sx * (w / 2 - radius + radius * np.cos(t))
                        py = sy * (h / 2 - radius + radius * np.sin(t))
                        pts.append((px, py, sz * d / 2))
                else:
                    pts.append((sx * w / 2, sy * h / 2, sz * d / 2))
    p = np.array(pts) @ rot(rx, ry, rz).T
    X, Y, Z = p[:, 0] + x, p[:, 1] - y, p[:, 2] + z
    k = P / (P - Z)
    u = OX + (X - OX) * k
    v = OY - (Y + OY) * k
    return np.stack([u, v], 1)


def raster(pose, w, h, d, radius):
    uv = project(pose, w, h, d, radius)
    hull = cv2.convexHull((uv * 8).astype(np.int32))
    m = np.zeros((SC['h'], SC['w']), np.uint8)
    cv2.fillConvexPoly(m, hull, 1, lineType=cv2.LINE_8, shift=3)
    return m.astype(bool)


def loss(pose, mask, w, h, d, radius):
    m = raster(pose, w, h, d, radius)
    inter = (m & mask).sum()
    union = (m | mask).sum()
    return 1 - inter / max(union, 1)


def fit(mask, init, w, h, d, radius):
    best = None
    for dry in (0, 0.25, -0.25):
        x0 = np.array(init, float)
        x0[3] += dry
        r = minimize(loss, x0, args=(mask, w, h, d, radius), method='Powell',
                     options={'xtol': 1e-3, 'ftol': 1e-5, 'maxiter': 4000})
        if best is None or r.fun < best.fun:
            best = r
    return best


if __name__ == '__main__':
    kind, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    step = int(sys.argv[4]) if len(sys.argv) > 4 and not sys.argv[4].startswith('-') else 1
    dims = dict(device=(142, 142, 16, 7), album=(142, 142, 16, 6))[kind]
    w, h, d, radius = dims
    init = [101, 93, 0.05, -0.3, -0.1]
    for n in range(a, b + 1, step):
        mask = segment(n, kind)
        r = fit(mask, init, w, h, d, radius)
        init = list(r.x)
        print(json.dumps({'frame': n, 'pose': [round(v, 4) for v in r.x], 'iou': round(1 - r.fun, 4)}), flush=True)
