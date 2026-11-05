#!/usr/bin/env python3
"""RMSE between captured app frames and the reference video frames.

usage: rmse.py <frames> [--cap out/cap] [--crop x,y,w,h] [--blur r] [--sheet out.png] [--grid]
  frames: same syntax as capture.mjs ("1,180-200,700-760:4")
  --crop: compare only this region (video px)
  --blur: Gaussian-blur both images first (radius px). The reference is a soft, compressed
          960x720 upscale, so a light blur (~1) makes the score track layout/colour rather
          than sharpness.
  --sheet: write a composite per frame: reference | app | signed difference x4
           (red = app brighter, cyan = reference brighter), stacked vertically
  --grid: also print a 4x4 grid of per-cell RMSE for each frame
Prints per-frame RMSE (0-255 scale) and the mean.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]


def opt(name, default=None, flag=False):
    if name not in args:
        return default
    i = args.index(name)
    if flag:
        del args[i]
        return True
    v = args[i + 1]
    del args[i:i + 2]
    return v


cap = opt('--cap', os.path.join(ROOT, 'out', 'cap'))
crop = opt('--crop')
blur = float(opt('--blur', 0))
sheet = opt('--sheet')
grid = opt('--grid', False, flag=True)
ref_dir = os.path.join(ROOT, 'ref', 'frames')

frames = []
for part in args[0].split(','):
    step = 1
    if ':' in part:
        part, s = part.split(':')
        step = int(s)
    if '-' in part:
        a, b = map(int, part.split('-'))
    else:
        a = b = int(part)
    frames += list(range(a, b + 1, step))

box = None
if crop:
    x, y, w, h = map(int, crop.split(','))
    box = (x, y, x + w, y + h)


def load(p):
    im = Image.open(p).convert('RGB')
    if im.size != (960, 720):
        im = im.resize((960, 720), Image.LANCZOS)
    if box:
        im = im.crop(box)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return im


rows = []
scores = []
for n in frames:
    rp = os.path.join(ref_dir, f'f{n:05d}.png')
    cp = os.path.join(cap, f'f{n:05d}.png')
    if not os.path.exists(cp):
        print(f'{n:5d}  missing capture')
        continue
    r, c = load(rp), load(cp)
    a, b = np.asarray(r, np.float32), np.asarray(c, np.float32)
    e = float(np.sqrt(((a - b) ** 2).mean()))
    scores.append(e)
    line = f'{n:5d}  rmse {e:6.2f}'
    if grid:
        H, W = a.shape[:2]
        cells = []
        for gy in range(4):
            for gx in range(4):
                sa = a[gy * H // 4:(gy + 1) * H // 4, gx * W // 4:(gx + 1) * W // 4]
                sb = b[gy * H // 4:(gy + 1) * H // 4, gx * W // 4:(gx + 1) * W // 4]
                cells.append(float(np.sqrt(((sa - sb) ** 2).mean())))
        line += '  grid ' + ' '.join(f'{v:5.1f}' for v in cells)
    print(line)
    if sheet:
        la, lb = a.mean(2), b.mean(2)
        d = np.clip((lb - la) * 4, -255, 255)
        heat = np.zeros_like(a)
        heat[..., 0] = np.clip(d, 0, 255)
        heat[..., 1] = np.clip(-d, 0, 255)
        heat[..., 2] = np.clip(-d, 0, 255)
        row = np.concatenate([a, b, heat], 1).astype(np.uint8)
        rows.append(row)
if scores:
    print(f'mean rmse {np.mean(scores):.2f} over {len(scores)} frame(s)')
if sheet and rows:
    img = Image.fromarray(np.concatenate(rows, 0))
    scale = min(1.0, 2400 / img.size[0], 8000 / img.size[1])
    if scale < 1:
        img = img.resize((int(img.size[0] * scale), int(img.size[1] * scale)), Image.LANCZOS)
    img.save(sheet)
    print(sheet)
