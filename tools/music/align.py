#!/usr/bin/env python3
"""Element alignment check: ink bounding boxes of named regions in the reference vs the capture.

usage: align.py <frame> [--cap out/cap] [--only name,name] [--spec tools/music/align_spec.txt]
spec lines: name x,y,w,h [thr]   (stage px; ink = pixels differing from the box's median colour)
Prints per element: ref bbox, app bbox, and deltas (left, right, top, bottom, width).
"""
import sys, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = sys.argv[1:]


def opt(name, default=None):
    if name not in args:
        return default
    i = args.index(name)
    v = args[i + 1]
    del args[i:i + 2]
    return v


cap = opt('--cap', os.path.join(ROOT, 'out', 'cap'))
only = opt('--only')
spec = opt('--spec', os.path.join(ROOT, 'tools', 'music', 'align_spec.txt'))
n = int(args[0])
ref = np.asarray(Image.open(os.path.join(ROOT, 'ref', 'frames', f'f{n:05d}.png')).convert('RGB')).astype(float)
app = np.asarray(Image.open(os.path.join(cap, f'f{n:05d}.png')).convert('RGB')).astype(float)


def bbox(im, x, y, w, h, thr):
    a = im[y:y + h, x:x + w]
    bg = np.median(a.reshape(-1, 3), 0)
    d = np.abs(a - bg).max(2)
    ys, xs = np.where(d > thr)
    if not len(xs):
        return None
    return (x + xs.min(), x + xs.max(), y + ys.min(), y + ys.max())


for line in open(spec):
    line = line.split('#')[0].strip()
    if not line:
        continue
    parts = line.split()
    name, box = parts[0], parts[1]
    if only and name not in only.split(','):
        continue
    thr = float(parts[2]) if len(parts) > 2 else 40
    x, y, w, h = map(int, box.split(','))
    r, a = bbox(ref, x, y, w, h, thr), bbox(app, x, y, w, h, thr)
    if not r or not a:
        print(f'{name:14s} ref {r} app {a}')
        continue
    d = [a[i] - r[i] for i in range(4)]
    wr, wa = r[1] - r[0] + 1, a[1] - a[0] + 1
    flag = '' if max(map(abs, d)) <= 1 else '  <--'
    print(f'{name:14s} ref x {r[0]}..{r[1]} y {r[2]}..{r[3]} | app x {a[0]}..{a[1]} y {a[2]}..{a[3]} | dL {d[0]:+d} dR {d[1]:+d} dT {d[2]:+d} dB {d[3]:+d} w {wa}/{wr} ({wa / wr:.3f}){flag}')
