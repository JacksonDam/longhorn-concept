#!/usr/bin/env python3
"""Render the fitted aurora model (numpy) at half res and compare with the reference.
usage: viz_aurora.py <fitdir> <out.png> <frame,frame,...>"""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aurora_common import load_half, mask_half
import fit_aurora as FA

fitdir, out, frames = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]
d = np.load(os.path.join(fitdir, 'ribbons.npz'))
coarse = np.load(os.path.join(fitdir, 'coarse.npy'))
keys = list(d['keys'])
half = load_half()
rows = []
for n in frames:
    k = keys.index(min(keys, key=lambda v: abs(v - n)))
    R = [[d['P'][k, i], d['A'][k, i], float(d['S'][k, i]), bool(np.abs(d['A'][k, i]).max() > 0)] for i in range(d['P'].shape[1])]
    model = FA.eval_coarse(coarse[k]) + FA.render_all(R)
    ref = np.asarray(half[keys[k] - 1], np.float32)
    m = mask_half(keys[k])
    e = np.sqrt((((model - ref) ** 2).mean(2) * m).sum() / m.sum())
    print(n, keys[k], 'masked rmse %.2f' % e)
    diff = np.clip(128 + (model - ref).mean(2, keepdims=True) * 3, 0, 255).repeat(3, 2)
    rows.append(np.concatenate([ref, np.clip(model, 0, 255), diff], 1))
Image.fromarray(np.concatenate(rows, 0).astype(np.uint8)).save(out)
