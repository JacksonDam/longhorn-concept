#!/usr/bin/env python3
"""Per-element RMSE (blur 1) of captured frames vs the reference for the login scene.
usage: regions.py <frames> [--cap out/cap] [--only name,name]"""
import sys, os, numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REGIONS = {
    'logo': (700, 40, 150, 152),
    'flag': (740, 42, 110, 72),
    'words': (700, 102, 148, 46),
    'vaio': (758, 164, 88, 28),
    'shutdown': (40, 618, 52, 48),
    'sd_label': (25, 668, 85, 20),
    'tiles': (320, 598, 480, 72),
    'labels': (320, 668, 480, 22),
    'clock': (820, 626, 112, 38),
    'bar': (0, 572, 960, 148),
    'bg': (0, 0, 960, 570),
    'slab': (280, 240, 200, 200),
    'panel': (505, 290, 210, 105),
}
args = sys.argv[1:]
cap = os.path.join(ROOT, 'out', 'cap')
if '--cap' in args:
    i = args.index('--cap'); cap = args[i + 1]; del args[i:i + 2]
only = None
if '--only' in args:
    i = args.index('--only'); only = args[i + 1].split(','); del args[i:i + 2]
frames = []
for part in args[0].split(','):
    a, _, b = part.partition('-')
    frames += list(range(int(a), int(b or a) + 1))
names = only or list(REGIONS)
print('frame ' + ' '.join(f'{n:>8}' for n in names))
acc = {n: [] for n in names}
for f in frames:
    r = Image.open(os.path.join(ROOT, 'ref', 'frames', f'f{f:05d}.png')).convert('RGB').filter(ImageFilter.GaussianBlur(1))
    p = os.path.join(cap, f'f{f:05d}.png')
    if not os.path.exists(p):
        continue
    c = Image.open(p).convert('RGB').filter(ImageFilter.GaussianBlur(1))
    R, C = np.asarray(r, np.float32), np.asarray(c, np.float32)
    row = []
    for n in names:
        x, y, w, h = REGIONS[n]
        e = float(np.sqrt(((R[y:y + h, x:x + w] - C[y:y + h, x:x + w]) ** 2).mean()))
        acc[n].append(e); row.append(e)
    print(f'{f:5d} ' + ' '.join(f'{v:8.2f}' for v in row))
if len(frames) > 1:
    print('mean  ' + ' '.join(f'{np.mean(acc[n]):8.2f}' for n in names))
