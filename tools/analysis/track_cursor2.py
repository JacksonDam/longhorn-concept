#!/usr/bin/env python3
"""Cursor tracking, pass 2: motion-based. For each frame, background = median of frames
i-8, i-4, i+4, i+8; residual R = frame - background highlights the moving cursor. Match the
cursor's residual template (from frame 81) with normalised correlation; when the residual is
flat (cursor at rest) keep the previous position and fall back to the colour template score.
Writes ref/cursor_track2.txt: frame x y ncc moving(0/1)."""
import os
import numpy as np, cv2
D = '/Users/jackson/workplace/longhorn-concept/ref/frames'
OUT = '/Users/jackson/workplace/longhorn-concept/ref/cursor_track2.txt'
N = len([f for f in os.listdir(D) if f.endswith('.png')])
cache = {}
def F(i):
    i = min(max(i, 1), N)
    if i not in cache:
        if len(cache) > 40:
            cache.pop(next(iter(cache)))
        cache[i] = cv2.imread(f'{D}/f{i:05d}.png').astype(np.float32)
    return cache[i]
def resid(i):
    bg = np.median(np.stack([F(i - 8), F(i - 4), F(i + 4), F(i + 8)]), 0)
    return (F(i) - bg).mean(2)
PAD = 4
TS = 30
r81 = resid(81)
tmpl = r81[632 - PAD:632 - PAD + TS, 290 - PAD:290 - PAD + TS].copy()
rows = []
prev = None
for i in range(1, N + 1):
    R = resid(i)
    res = cv2.matchTemplate(R, tmpl, cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(res)
    energy = np.abs(R).max()
    x, y = loc[0] + PAD, loc[1] + PAD
    moving = 1 if mx > 0.55 else 0
    if not moving and prev is not None:
        x, y = prev
    if moving:
        prev = (x, y)
    rows.append((i, x, y, mx, moving))
with open(OUT, 'w') as f:
    for r in rows:
        f.write(f'{r[0]} {r[1]} {r[2]} {r[3]:.2f} {r[4]}\n')
print('wrote', OUT)
