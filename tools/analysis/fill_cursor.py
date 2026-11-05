#!/usr/bin/env python3
"""Fill gaps in ref/cursor_merged.txt by searching near the interpolated path with the colour
template, then write ref/cursor_filled.txt and a verification sheet of crops per gap frame."""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw
D = '/Users/jackson/workplace/longhorn-concept/ref/frames'
merged = {int(r[0]): (int(r[1]), int(r[2])) for r in (l.split() for l in open('/Users/jackson/workplace/longhorn-concept/ref/cursor_merged.txt'))}
PAD, TW = 3, 26
def make(frame, x, y):
    im = cv2.imread(f'{D}/f{frame:05d}.png').astype(np.float32)
    return im[y - PAD:y - PAD + TW, x - PAD:x - PAD + TW]
mask = np.zeros((TW, TW), np.uint8)
cv2.fillPoly(mask, [np.array([[PAD, PAD], [PAD + 20, PAD + 5], [PAD + 10, PAD + 8], [PAD + 9, PAD + 19]], np.int32)], 255)
mask = cv2.erode(mask, np.ones((3, 3), np.uint8))
m3 = cv2.merge([mask] * 3).astype(np.float32) / 255
cnt = (mask > 0).sum()
T = [make(81, 290, 632), make(1380, 796, 33), make(234, 729, 444)]
def search(i, cx, cy, r):
    im = cv2.imread(f'{D}/f{i:05d}.png').astype(np.float32)
    x0, y0 = max(0, cx - r - PAD), max(0, cy - r - PAD)
    x1, y1 = min(960, cx + r + TW), min(720, cy + r + TW)
    best = None
    for tp in T:
        res = cv2.matchTemplate(im[y0:y1, x0:x1], tp, cv2.TM_SQDIFF, mask=m3)
        mn, _, loc, _ = cv2.minMaxLoc(res)
        s = mn / cnt / 3
        if best is None or s < best[2]:
            best = (loc[0] + x0 + PAD, loc[1] + y0 + PAD, s)
    return best
ks = sorted(merged)
filled = dict((k, (*merged[k], 0)) for k in ks)
for a, b in zip(ks, ks[1:]):
    if b - a <= 1:
        continue
    (xa, ya), (xb, yb) = merged[a], merged[b]
    for i in range(a + 1, b):
        k = (i - a) / (b - a)
        cx, cy = int(xa + (xb - xa) * k), int(ya + (yb - ya) * k)
        r = int(min(140, 30 + 0.5 * max(abs(xb - xa), abs(yb - ya))))
        x, y, s = search(i, cx, cy, r)
        if s > 700:
            x, y = cx, cy  # not found: interpolate
        filled[i] = (x, y, s)
with open('/Users/jackson/workplace/longhorn-concept/ref/cursor_filled.txt', 'w') as f:
    for k in sorted(filled):
        f.write(f'{k} {filled[k][0]} {filled[k][1]} {filled[k][2]:.0f}\n')
# verification sheet for requested frame range
if len(sys.argv) > 2:
    a, b = int(sys.argv[1]), int(sys.argv[2])
    tiles = []
    for i in range(a, b + 1):
        if i not in filled: continue
        x, y, s = filled[i]
        im = Image.open(f'{D}/f{i:05d}.png').convert('RGB')
        c = im.crop((x - 30, y - 30, x + 50, y + 50)).resize((160, 160), Image.NEAREST)
        d = ImageDraw.Draw(c); d.text((2, 2), f'{i} {s:.0f}', fill=(255, 255, 0)); d.line((58, 60, 62, 60), fill=(255, 0, 0)); d.line((60, 58, 60, 62), fill=(255, 0, 0))
        tiles.append(c)
    cols = 12
    S = Image.new('RGB', (160 * cols, 160 * ((len(tiles) + cols - 1) // cols)))
    for j, t in enumerate(tiles): S.paste(t, ((j % cols) * 160, (j // cols) * 160))
    S.save(sys.argv[3]); print(sys.argv[3])
