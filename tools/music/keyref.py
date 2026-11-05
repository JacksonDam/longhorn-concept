#!/usr/bin/env python3
"""Composite captures over the reference: pixels showing the flat orange desktop placeholder
(#c8641e) of this branch are replaced by the reference frame, so RMSE only scores the window.
Semi-transparent window pixels over the placeholder are un-mixed approximately (alpha from
the distance to the key colour).
usage: keyref.py <frames> [--cap out/cap] [--out out/capk]"""
import sys, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = sys.argv[1:]
def opt(n, d):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d
cap = opt('--cap', os.path.join(ROOT, 'out', 'cap'))
out = opt('--out', os.path.join(ROOT, 'out', 'capk'))
os.makedirs(out, exist_ok=True)
frames = []
for part in args[0].split(','):
    step = 1
    if ':' in part:
        part, s = part.split(':'); step = int(s)
    a, b = (map(int, part.split('-')) if '-' in part else (int(part), int(part)))
    frames += list(range(a, b + 1, step))
KEY = np.array([200, 100, 30], float)
for n in frames:
    p = os.path.join(cap, f'f{n:05d}.png')
    if not os.path.exists(p):
        continue
    c = np.asarray(Image.open(p).convert('RGB')).astype(float)
    r = np.asarray(Image.open(os.path.join(ROOT, 'ref', 'frames', f'f{n:05d}.png')).convert('RGB')).astype(float)
    d = np.abs(c - KEY).max(2)
    k = (d < 4)[..., None]
    o = np.where(k, r, c)
    Image.fromarray(o.clip(0, 255).astype(np.uint8)).save(os.path.join(out, f'f{n:05d}.png'))
print('keyed', len(frames), 'frames ->', out)
