#!/usr/bin/env python3
"""Covers for the fictional albums of the my Music library beyond the video's 32 tiles
(original abstract compositions, seeded; see docs/SUBSTITUTIONS.md).
usage: python3 tools/music/library_covers.py  -> public/img/music/covers/x00.webp .. x63.webp"""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from covers import C, OUT
from PIL import Image

N = 64
PALETTES = [
    ('#1d2a44', '#e8b04a', '#f4efe2'), ('#f2ece0', '#c0392b', '#2c3e50'), ('#0e3b43', '#6fd3c6', '#f6f1e7'),
    ('#3b1f3f', '#f08a5d', '#f9ed69'), ('#e9e4d4', '#4a6d8c', '#1b1b1b'), ('#14161a', '#8fb339', '#e8e8e8'),
    ('#f7d6bf', '#5b3256', '#ffffff'), ('#20304a', '#7fa7d9', '#f0f4fa'), ('#5a1e1e', '#e3c16f', '#faf3e0'),
    ('#d6e4d8', '#2f5d50', '#f2b134'), ('#111111', '#e04f5f', '#f5f5f5'), ('#2b4f81', '#f4d35e', '#ffffff'),
    ('#ede0c8', '#7a4e2d', '#3d5a40'), ('#352f44', '#b9b4c7', '#faf0e6'), ('#0b4f6c', '#01baef', '#fbfbff'),
    ('#f1e3d3', '#d64045', '#1d3354'),
]

def make(i):
    rng = np.random.default_rng(1000 + i)
    bg, fg, hi = PALETTES[i % len(PALETTES)]
    c = C(bg)
    kind = i % 8
    if kind == 0:  # concentric rings
        for k in range(5, 0, -1):
            c.ell(.5, .55, .09 * k, .09 * k, fg if k % 2 else hi, alpha=200)
    elif kind == 1:  # diagonal bands
        for k in range(6):
            x = -0.3 + k * 0.28
            c.poly([(x, 1), (x + .12, 1), (x + .62, 0), (x + .5, 0)], fg if k % 2 else hi, alpha=170)
    elif kind == 2:  # horizon and sun
        c.grad(bg, fg, 90, 0, 0, 1, .62)
        c.ell(.5 + rng.uniform(-.2, .2), .6, .16, .16, hi, blur=1)
        c.rect((0, .62, 1, 1), bg)
    elif kind == 3:  # grid of squares
        for gx in range(4):
            for gy in range(4):
                if rng.random() < .55:
                    c.rect((.1 + gx * .2, .1 + gy * .2, .26 + gx * .2, .26 + gy * .2), fg if rng.random() < .6 else hi, alpha=220)
    elif kind == 4:  # waves
        for k in range(7):
            y = .2 + k * .1
            pts = [(x / 20, y + .04 * math.sin(x / 20 * 6 + k)) for x in range(21)]
            c.line(pts, fg if k % 2 else hi, .025, alpha=210)
    elif kind == 5:  # big letterless block and dot
        c.rect((.12, .18, .7, .82), fg, alpha=230)
        c.ell(.72, .3, .12, .12, hi)
    elif kind == 6:  # soft blobs
        for k in range(4):
            c.ell(rng.uniform(.2, .8), rng.uniform(.2, .8), rng.uniform(.12, .3), rng.uniform(.12, .3), [fg, hi][k % 2], blur=8, alpha=200)
    else:  # triangles
        for k in range(5):
            x, y = rng.uniform(.1, .9, 2)
            s = rng.uniform(.1, .3)
            c.poly([(x, y - s), (x + s, y + s), (x - s, y + s)], [fg, hi][k % 2], alpha=190)
    c.type(.08, .08, .3, hi, alpha=150)  # a "title" bar, never lettering
    return c.grain(4)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for i in range(N):
        make(i).save(f'x{i:02d}')
    print('wrote', N, 'library covers')
