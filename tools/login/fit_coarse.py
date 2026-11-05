#!/usr/bin/env python3
"""Fit the aurora's coarse colour field (B-spline grid, see bspline.py) to the reference frames.

usage: fit_coarse.py <half.npy (frames 1.. at 480x360)> <out.png> [--sub resid.npy]
Writes an RGB atlas: keyframe m (video frame 1 + 4m) occupies rows m*NY .. m*NY+NY-1,
NX columns, values = control points (0-255). With --sub, a per-frame fine-detail model
(same shape as half.npy, float16) is subtracted before fitting.
UI regions (logo, bar, selected slab + password panel) are masked out; the Laplacian
regulariser fills them in."""
import sys, numpy as np, scipy.sparse as sp, scipy.sparse.linalg as spl
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from bspline import basis, laplacian, NX, NY

half = np.load(sys.argv[1], mmap_mode='r')
out = sys.argv[2]
sub = None
if '--sub' in sys.argv:
    sub = np.load(sys.argv[sys.argv.index('--sub') + 1], mmap_mode='r')
STEP = 4
keys = list(range(1, 442, STEP))
# quarter-res sample grid (240x180), pixel centres in stage px
xs = (np.arange(240) + 0.5) * 4
ys = (np.arange(180) + 0.5) * 4
B = basis(xs, ys)
L = laplacian()
lam = 0.02


def mask_for(n):
    m = np.ones((180, 240), bool)
    m[int(568 / 4):, :] = False                    # bottom bar
    m[int(35 / 4):int(195 / 4), int(690 / 4):int(865 / 4)] = False   # logo
    if 172 <= n <= 515:
        m[int(220 / 4):int(460 / 4), int(270 / 4):int(725 / 4)] = False  # slab + panel
    if 172 <= n <= 202:
        m[int(220 / 4):int(600 / 4), int(250 / 4):int(560 / 4)] = False  # slab flight
    return m.ravel()


atlas = np.zeros((len(keys) * NY, NX, 3), np.float32)
for k, n in enumerate(keys):
    f = np.asarray(half[n - 1], np.float32)
    if sub is not None:
        f = f - np.asarray(sub[n - 1], np.float32)
    q = f.reshape(180, 2, 240, 2, 3).mean((1, 3)).reshape(-1, 3)
    m = mask_for(n)
    Bm = B[m]
    A = (Bm.T @ Bm + lam * (L.T @ L)).tocsc()
    solve = spl.factorized(A)
    for c in range(3):
        atlas[k * NY:(k + 1) * NY, :, c] = solve(Bm.T @ q[m, c]).reshape(NY, NX)
    if k % 20 == 0:
        pred = (B @ atlas[k * NY:(k + 1) * NY].reshape(-1, 3))
        e = np.sqrt(((pred[m] - q[m]) ** 2).mean())
        print(f'frame {n}: fit rmse {e:.2f}', flush=True)
Image.fromarray(np.clip(atlas, 0, 255).round().astype(np.uint8)).save(out)
print('wrote', out, atlas.shape)
