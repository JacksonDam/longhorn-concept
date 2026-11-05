#!/usr/bin/env python3
"""Per-frame RMSE between consecutive reference frames, plus the bounding box of change.
usage: framediff.py frames_dir [thresh]"""
import sys, os, numpy as np
from PIL import Image
d = sys.argv[1]; th = float(sys.argv[2]) if len(sys.argv) > 2 else 12
files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
prev = None
for i, f in enumerate(files, 1):
    a = np.asarray(Image.open(os.path.join(d, f)).convert('RGB'), dtype=np.float32)
    if prev is not None:
        diff = np.abs(a - prev).max(axis=2)
        rmse = float(np.sqrt(((a - prev) ** 2).mean()))
        m = diff > th
        if m.any():
            ys, xs = np.where(m)
            bb = f"{xs.min()},{ys.min()}-{xs.max()},{ys.max()} n={m.sum()}"
        else:
            bb = '-'
        print(f"{i:5d} t={(i-1)/29.97:6.2f} rmse={rmse:6.2f} {bb}")
    prev = a
