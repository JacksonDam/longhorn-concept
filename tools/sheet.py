#!/usr/bin/env python3
"""Labelled contact sheet of reference frames.
usage: sheet.py out.png start end step [cols] [scale] [crop x,y,w,h]"""
import sys, os
from PIL import Image, ImageDraw
out, a, b, step = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 3
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
crop = tuple(map(int, sys.argv[7].split(','))) if len(sys.argv) > 7 else None
D = '/Users/jackson/workplace/longhorn-concept/ref/frames'
ims = []
for i in range(a, b + 1, step):
    im = Image.open(f'{D}/f{i:05d}.png').convert('RGB')
    if crop: im = im.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 44, 14), fill=(0, 0, 0)); d.text((2, 1), str(i), fill=(255, 255, 0))
    ims.append(im)
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), (40, 40, 40))
for k, im in enumerate(ims): S.paste(im, ((k % cols) * w, (k // cols) * h))
S.save(out); print(out, S.size)
