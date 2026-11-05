#!/usr/bin/env python3
"""Sheet of half-size frames with the current cursor estimate marked (red cross).
usage: cursor_overlay.py track.txt start end step out.png"""
import sys
from PIL import Image, ImageDraw
D = '/Users/jackson/workplace/longhorn-concept/ref/frames'
tr = {int(r[0]): (float(r[1]), float(r[2])) for r in (l.split() for l in open(sys.argv[1])) if r[1] != 'hidden'}
a, b, st = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
tiles = []
for i in range(a, b + 1, st):
    im = Image.open(f'{D}/f{i:05d}.png').convert('RGB').resize((480, 360), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    if i in tr:
        x, y = tr[i][0] / 2, tr[i][1] / 2
        d.line((x - 8, y, x + 8, y), fill=(255, 0, 0), width=1); d.line((x, y - 8, x, y + 8), fill=(255, 0, 0), width=1)
    d.rectangle((0, 0, 40, 12), fill=(0, 0, 0)); d.text((2, 0), str(i), fill=(255, 255, 0))
    tiles.append(im)
cols = 4
S = Image.new('RGB', (480 * cols, 360 * ((len(tiles) + cols - 1) // cols)))
for j, t in enumerate(tiles): S.paste(t, ((j % cols) * 480, (j // cols) * 360))
S.save(sys.argv[5]); print(sys.argv[5])
