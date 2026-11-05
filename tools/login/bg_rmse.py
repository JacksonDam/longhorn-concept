#!/usr/bin/env python3
"""Background-only RMSE (UI, logo, bar, slab/panel and cursor masked) of captured app frames.
usage: bg_rmse.py <frames spec> --cap dir [--blur 1] [--sheet out.png]"""
import sys, os, numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aurora_common import mask_full, REF

args = sys.argv[1:]
def opt(n, d=None):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d
cap = opt('--cap'); blur = float(opt('--blur', 1)); sheet = opt('--sheet')
frames = []
for part in args[0].split(','):
    step = 1
    if ':' in part:
        part, st = part.split(':'); step = int(st)
    a, b = (map(int, part.split('-')) if '-' in part else (int(part), int(part)))
    frames += list(range(a, b + 1, step))
ranges = [(1, 140), (141, 300), (301, 435), (436, 510), (511, 9999)]
acc = {r: [] for r in ranges}
rows = []
for n in frames:
    cp = os.path.join(cap, f'f{n:05d}.png')
    if not os.path.exists(cp):
        continue
    r = np.asarray(Image.open(os.path.join(REF, f'f{n:05d}.png')).convert('RGB'), np.float32)
    c = np.asarray(Image.open(cp).convert('RGB'), np.float32)
    if blur:
        r = cv2.GaussianBlur(r, (0, 0), blur); c = cv2.GaussianBlur(c, (0, 0), blur)
    m = mask_full(n)
    e = float(np.sqrt((((r - c) ** 2).mean(2) * m).sum() / m.sum()))
    for rg in ranges:
        if rg[0] <= n <= rg[1]:
            acc[rg].append(e)
    print(f'{n:5d} bg rmse {e:6.2f}')
    if sheet:
        d = np.clip(128 + (c - r).mean(2, keepdims=True) * 3, 0, 255).repeat(3, 2) * m[..., None]
        rows.append(np.concatenate([r, c, d], 1)[::2, ::2])
for rg, v in acc.items():
    if v:
        print(f'range {rg[0]}-{rg[1]}: mean {np.mean(v):.2f} over {len(v)}')
allv = [x for v in acc.values() for x in v]
print(f'all: mean {np.mean(allv):.2f} over {len(allv)}')
if sheet and rows:
    Image.fromarray(np.concatenate(rows, 0).astype(np.uint8)).save(sheet)
