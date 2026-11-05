#!/usr/bin/env python3
"""Track the arrow cursor through the reference frames with masked template matching.
Two templates (cursor on blue, cursor on orange), inner-core mask so background colour
matters little. Writes ref/cursor_track.txt: frame x y score (x, y = arrow tip)."""
import os
import numpy as np, cv2
D = '/Users/jackson/workplace/longhorn-concept/ref/frames'
OUT = '/Users/jackson/workplace/longhorn-concept/ref/cursor_track.txt'
TW = TH = 26
PAD = 3
def make(frame, tipx, tipy):
    im = cv2.imread(f'{D}/f{frame:05d}.png')
    x0, y0 = int(round(tipx)) - PAD, int(round(tipy)) - PAD
    return im[y0:y0 + TH, x0:x0 + TW].astype(np.float32)
mask = np.zeros((TH, TW), np.uint8)
poly = np.array([[PAD, PAD], [PAD + 20, PAD + 5], [PAD + 10, PAD + 8], [PAD + 9, PAD + 19]], np.int32)
cv2.fillPoly(mask, [poly], 255)
mask = cv2.erode(mask, np.ones((3, 3), np.uint8))
m3 = cv2.merge([mask, mask, mask]).astype(np.float32) / 255
templates = [make(81, 290, 632), make(1380, 796, 33), make(234, 729, 444)]
cnt = (mask > 0).sum()
n = len([f for f in os.listdir(D) if f.endswith('.png')])
prev = None
rows = []
def search(im, region):
    x0, y0, x1, y1 = region
    best = None
    for tp in templates:
        res = cv2.matchTemplate(im[y0:y1, x0:x1], tp, cv2.TM_SQDIFF, mask=m3)
        mn, _, loc, _ = cv2.minMaxLoc(res)
        s = mn / cnt / 3
        if best is None or s < best[2]:
            best = (loc[0] + x0 + PAD, loc[1] + y0 + PAD, s)
    return best
for i in range(1, n + 1):
    im = cv2.imread(f'{D}/f{i:05d}.png').astype(np.float32)
    best = None
    if prev is not None:
        x, y = prev
        best = search(im, (max(0, x - 90), max(0, y - 90), min(960, x + 90 + TW), min(720, y + 90 + TH)))
    if best is None or best[2] > 500:
        g = search(im, (0, 0, 960, 720))
        if best is None or g[2] < best[2]:
            best = g
    rows.append((i, *best))
    prev = best[:2] if best[2] < 500 else prev
with open(OUT, 'w') as f:
    for r in rows:
        f.write(f'{r[0]} {r[1]} {r[2]} {r[3]:.0f}\n')
print('wrote', OUT)
