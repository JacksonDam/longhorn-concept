"""Cut the sidebar glass's extension band out of its fitted tint.

On a stage taller than the video's frame (core/Stage.jsx: dh > 0) the sidebar's panel glass runs
down to the clock foot dh further: Sidebar.jsx keeps the tint's rows 0..SPLIT (the tiles) at the
top and its rows SPLIT..700 (the panel's bottom edge) just above the foot, and fills the dh rows
between them with this band: the plain glass of the video between the thumbnails and the foot
(the per-column mean of glass-tint.webp rows BAND_ROWS), one row, stretched.

usage: python3 -I tools/desktop/glass_band.py   (after fit_glass.py rewrites glass-tint.webp)
writes public/img/desktop/glass-band.webp (102x1, lossless)
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TINT = os.path.join(ROOT, 'public', 'img', 'desktop', 'glass-tint.webp')
OUT = os.path.join(ROOT, 'public', 'img', 'desktop', 'glass-band.webp')
SPLIT = 692  # keep in step with Sidebar.jsx BAND_SPLIT
BAND_ROWS = (688, 692)  # the four rows above SPLIT: below the thumbnails, above the bottom edge

tint = np.asarray(Image.open(TINT).convert('RGB')).astype(np.float64)
band = tint[BAND_ROWS[0]:BAND_ROWS[1]].mean(axis=0, keepdims=True)
Image.fromarray(np.clip(np.round(band), 0, 255).astype(np.uint8)).save(OUT, lossless=True, quality=100, method=6)
print('wrote', OUT, os.path.getsize(OUT), 'bytes; band', band.shape, 'cols 0/50/101:', band[0, 0], band[0, 50], band[0, 101])
