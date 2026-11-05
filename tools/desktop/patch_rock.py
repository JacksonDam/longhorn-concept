#!/usr/bin/env python3
"""The video's wallpaper has a boulder above the taskbar (stage ~x 225-345, y 645-700) that no
available copy of the photo has. Patch it into public/img/desktop/wallpaper.webp from the median
of clean desktop frames (no window, flyout or cursor nearby), feathered into the photo."""
import numpy as np
from PIL import Image, ImageFilter
ROOT = '/Users/jackson/workplace/longhorn-concept'
frames = list(range(585, 596)) + list(range(1366, 1401, 2))
X0, Y0, X1, Y1 = 205, 630, 365, 700          # stage region (taskbar covers y >= 699)
stack = np.stack([np.asarray(Image.open(f'{ROOT}/ref/frames/f{n:05d}.png').convert('RGB'))[Y0:Y1, X0:X1].astype(np.float32) for n in frames])
patch = np.median(stack, 0)
S = 1365 / 959.8                               # wallpaper px per stage px
OX, OY = 0.16, 0.58
src = Image.open(f'{ROOT}/public/img/desktop/wallpaper.webp').convert('RGB')
pw, ph = round((X1 - X0) * S), round((Y1 - Y0) * S)
pimg = Image.fromarray(patch.astype(np.uint8)).resize((pw, ph), Image.LANCZOS)
# feathered mask: soft on left/right/top, solid at the bottom (hidden under the taskbar)
m = np.zeros((ph, pw), np.float32)
f = round(14 * S)
m[f:, f:pw - f] = 1
mask = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(f / 2.2))
mm = np.asarray(mask).astype(np.float32) / 255
mm[-f:, :] = np.maximum(mm[-f:, :], mm[-f - 1:-f, :])  # keep the bottom solid
mask = Image.fromarray((mm * 255).astype(np.uint8))
px, py = round((X0 - OX) * S), round((Y0 - OY) * S)
out = src.copy()
out.paste(pimg, (px, py), mask)
out.save(f'{ROOT}/public/img/desktop/wallpaper.webp', quality=88, method=6)
print('patched at', px, py, pw, ph)
