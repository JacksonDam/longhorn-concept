#!/usr/bin/env python3
"""Segment-wise RMSE (blur 1) of a full login capture vs the reference, overall and per element.
usage: summary.py <capdir> [step]"""
import sys, os, numpy as np
from PIL import Image, ImageFilter
from concurrent.futures import ProcessPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from regions import REGIONS
cap = sys.argv[1]
step = int(sys.argv[2]) if len(sys.argv) > 2 else 1
SEG = [('static 1-47', 1, 47), ('hovers 48-120', 48, 120), ('idle 121-167', 121, 167), ('select 168-200', 168, 200),
       ('rest 201-394', 201, 394), ('typing 395-430', 395, 430), ('rest 431-509', 431, 509), ('exit 510-522', 510, 522)]
NAMES = ['full', 'bg', 'logo', 'bar', 'tiles', 'shutdown', 'clock', 'slab', 'panel']


def one(n):
    r = np.asarray(Image.open(f'{ROOT}/ref/frames/f{n:05d}.png').convert('RGB').filter(ImageFilter.GaussianBlur(1)), np.float32)
    c = np.asarray(Image.open(f'{cap}/f{n:05d}.png').convert('RGB').filter(ImageFilter.GaussianBlur(1)), np.float32)
    out = {'full': float(np.sqrt(((r - c) ** 2).mean()))}
    for k in NAMES[1:]:
        x, y, w, h = REGIONS[k]
        out[k] = float(np.sqrt(((r[y:y + h, x:x + w] - c[y:y + h, x:x + w]) ** 2).mean()))
    return n, out


if __name__ == '__main__':
    frames = [n for n in range(1, 523, step) if os.path.exists(f'{cap}/f{n:05d}.png')]
    with ProcessPoolExecutor(10) as ex:
        res = dict(ex.map(one, frames))
    print('%-16s' % 'segment' + ''.join('%9s' % k for k in NAMES))
    for name, a, b in SEG:
        ns = [n for n in res if a <= n <= b]
        print('%-16s' % name + ''.join('%9.2f' % np.mean([res[n][k] for n in ns]) for k in NAMES))
    print('%-16s' % 'all 1-522' + ''.join('%9.2f' % np.mean([res[n][k] for n in res]) for k in NAMES))
