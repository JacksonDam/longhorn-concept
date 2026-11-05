#!/usr/bin/env python3
"""Coordinate search of the header swoosh ring ellipse against f800/f960 (uses tune.mjs)."""
import json, subprocess, os, numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CROP = (400, 146, 822, 360)
def ref(n):
    return np.asarray(Image.open(f'{ROOT}/ref/frames/f{n:05d}.png').convert('RGB').crop(CROP).filter(ImageFilter.GaussianBlur(1)), float)
R = {n: ref(n) for n in (800,)}
def snippet(p):
    cx, cy, rx, ry, rot = p
    return ("(() => { const e = [...document.querySelectorAll('ellipse')].find(e => (e.getAttribute('fill')||'').includes('mw-ring'));"
            f" e.setAttribute('cx', {cx}); e.setAttribute('cy', {cy}); e.setAttribute('rx', {rx}); e.setAttribute('ry', {ry});"
            f" e.setAttribute('transform', 'rotate({rot} {cx} {cy})'); return 1 }})()")
def run(cands, frame=800):
    json.dump([snippet(c) for c in cands], open(f'{ROOT}/out/tune/s.json', 'w'))
    subprocess.run(['node', f'{ROOT}/tools/music/tune.mjs', str(frame), f'{ROOT}/out/tune/s.json'], cwd=ROOT, check=True)
    errs = []
    for i in range(len(cands)):
        a = np.asarray(Image.open(f'{ROOT}/out/tune/{i}.png').convert('RGB').crop(CROP).filter(ImageFilter.GaussianBlur(1)), float)
        errs.append(float(np.sqrt(((a - R[frame]) ** 2).mean())))
    return errs
p = [535, 101, 136, 82, -8]
steps = [12, 8, 12, 8, 4]
best = run([p])[0]
print('start', p, best)
for rnd in range(3):
    for k in range(5):
        cands = []
        for d in (-2, -1, 1, 2):
            q = list(p); q[k] += d * steps[k]; cands.append(q)
        errs = run(cands)
        i = int(np.argmin(errs))
        if errs[i] < best:
            best, p = errs[i], cands[i]
        print(rnd, k, p, round(best, 3), flush=True)
    steps = [s / 2 for s in steps]
print('best', p, best)
