#!/usr/bin/env python3
"""Pack a fit (fit_aurora.py output dir) into the app's data files (lossless WebP, decoded
exactly through a canvas in aurora.js):
  public/img/login/aurora-coarse.webp   coarse B-spline grid keys every COARSE_STEP video frames,
                                        RGB uint8; row (j * nkeys + k) holds grid row j of key k
                                        (temporal neighbours adjacent for the predictor)
  public/img/login/aurora-ribbons.webp  ribbon keys (every 4 frames) as int16 (R = high byte,
                                        G = low byte), one image row per key, delta-coded against
                                        the previous key. Per slot: KX centreline values (1/4 px),
                                        3*KX amplitudes (1/4 level), width sigma (1/20 px).
usage: export_aurora.py <fitdir> [<publicdir>]"""
import sys, os, json, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aurora_common import KX, X0, SX
from bspline import NX, NY

fitdir = sys.argv[1]
pub = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'img', 'login')
d = np.load(os.path.join(fitdir, 'ribbons.npz'))
coarse = np.load(os.path.join(fitdir, 'coarse.npy'))  # (K, NY, NX, 3)
K = coarse.shape[0]
COARSE_STEP = 2  # in fit keys (= 8 video frames)
coarse = coarse[::COARSE_STEP]
K = coarse.shape[0]
atlas = np.clip(coarse, 0, 255).round().astype(np.uint8).transpose(1, 0, 2, 3).reshape(NY * K, NX, 3)
Image.fromarray(atlas).save(os.path.join(pub, 'aurora-coarse.webp'), lossless=True, quality=100, method=6)

P, A, S = d['P'], d['A'], d['S']    # (K,NS,KX), (K,NS,3,KX), (K,NS)
K = P.shape[0]
NS = P.shape[1]
active = np.abs(A).reshape(K, NS, -1).max(2) > 0
# keep inactive slots' centrelines/widths parked at the nearest active key (no sweeping)
for i in range(NS):
    idx = np.where(active[:, i])[0]
    if len(idx) == 0:
        P[:, i] = 360; S[:, i] = 3
        continue
    for k in range(K):
        if not active[k, i]:
            j = idx[np.argmin(np.abs(idx - k))]
            P[k, i] = P[j, i]; S[k, i] = S[j, i]
q = np.concatenate([
    np.round(P * 4).reshape(K, NS, KX),
    np.round(A * 4).reshape(K, NS, 3 * KX),
    np.round(S * 20).reshape(K, NS, 1)], 2).astype(np.int64)
assert np.abs(q).max() < 32767, np.abs(q).max()
per = q.shape[2]
q = q.reshape(K, NS * per)
dq = np.diff(q, axis=0, prepend=np.zeros((1, q.shape[1]), np.int64)) % 65536
img = np.zeros((K, NS * per, 3), np.uint8)
img[..., 0] = dq >> 8
img[..., 1] = dq & 255
Image.fromarray(img).save(os.path.join(pub, 'aurora-ribbons.webp'), lossless=True, quality=100, method=6)
meta = {'keys': [int(k) for k in d['keys']], 'ns': NS, 'kx': KX, 'x0': X0, 'sx': SX, 'per': per}
print(json.dumps(meta)[:200])
for f in ('aurora-coarse.webp', 'aurora-ribbons.webp'):
    print(f, os.path.getsize(os.path.join(pub, f)))
