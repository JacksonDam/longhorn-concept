#!/usr/bin/env python3
"""Grid-search motion-blur settings for one login animation against the reference.
usage: fit_blur.py <name> <frames> <crop x,y,w,h> <samples list> <shutter-frames list> [phase list]
e.g.   fit_blur.py slide 187-192 300,595,500,90 4,6,8,12 0.3,0.5,0.75,1
Captures each candidate with ?capture&mb={"name":[s,f,p]} (10 in parallel; needs the dev server on
5201) and prints the crop RMSE (blur 1), best first."""
import sys, os, json, subprocess, urllib.parse, itertools, numpy as np
from PIL import Image, ImageFilter
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
name, frames, crop = sys.argv[1], sys.argv[2], tuple(map(int, sys.argv[3].split(',')))
S = [int(v) for v in sys.argv[4].split(',')]
F = [float(v) for v in sys.argv[5].split(',')]
P = [float(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else [-0.5]
cands = list(itertools.product(S, F, P))
OUT = os.path.join(ROOT, 'out', 'blurfit')


def run(i):
    s, f, p = cands[i]
    d = os.path.join(OUT, name, str(i))
    os.makedirs(d, exist_ok=True)
    url = 'http://localhost:5201/longhorn-concept/?capture&mb=' + urllib.parse.quote(json.dumps({name: [s, f, p]}))
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'capture.mjs'), frames, '--out', d, '--url', url], capture_output=True)
    x, y, w, h = crop
    es = []
    for fn in sorted(os.listdir(d)):
        r = np.asarray(Image.open(os.path.join(ROOT, 'ref', 'frames', fn)).convert('RGB').filter(ImageFilter.GaussianBlur(1)), np.float32)[y:y + h, x:x + w]
        a = np.asarray(Image.open(os.path.join(d, fn)).convert('RGB').filter(ImageFilter.GaussianBlur(1)), np.float32)[y:y + h, x:x + w]
        es.append(float(np.sqrt(((r - a) ** 2).mean())))
    return cands[i], float(np.mean(es)), es


with ThreadPoolExecutor(10) as ex:
    res = sorted(ex.map(run, range(len(cands))), key=lambda r: r[1])
for c, e, es in res[:10]:
    print('%6.2f  samples %2d shutter %.2f phase %+.2f   %s' % (e, c[0], c[1], c[2], ' '.join('%.1f' % v for v in es)))
