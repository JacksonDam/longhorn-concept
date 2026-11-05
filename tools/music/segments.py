#!/usr/bin/env python3
"""Per-segment mean/max of an rmse.py output file (my Music frame ranges)."""
import sys
L = [l.split() for l in open(sys.argv[1]) if 'rmse' in l and not l.startswith('mean')]
d = {int(a[0]): float(a[2]) for a in L}
segs = [(694, 699, 'beam'), (700, 716, 'open'), (717, 760, 'intro'), (761, 944, 'device idle'), (945, 967, 'select'),
        (968, 990, 'album flip'), (991, 1352, 'album idle'), (1353, 1364, 'minimise'), (1365, 1402, 'hidden'),
        (1403, 1413, 'restore'), (1414, 1529, 'album idle 2')]
for a, b, n in segs:
    v = [d[k] for k in range(a, b + 1) if k in d]
    if v:
        print(f'{n:14s} {a}-{b}: mean {sum(v) / len(v):6.2f}  max {max(v):6.2f} ({len(v)} frames)')
