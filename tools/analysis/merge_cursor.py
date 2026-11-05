#!/usr/bin/env python3
"""Merge the two cursor tracks into confident detections, drop outliers, report gaps."""
import numpy as np
A = {int(r[0]): (int(r[1]), int(r[2]), float(r[3])) for r in (l.split() for l in open('/Users/jackson/workplace/longhorn-concept/ref/cursor_track.txt'))}
B = {int(r[0]): (int(r[1]), int(r[2]), float(r[3])) for r in (l.split() for l in open('/Users/jackson/workplace/longhorn-concept/ref/cursor_track2.txt'))}
N = max(A)
det = {}
for i in range(1, N + 1):
    a, b = A[i], B[i]
    ca = a[2] < 450
    cb = b[2] > 0.72
    if ca and cb and abs(a[0] - b[0]) + abs(a[1] - b[1]) < 8:
        det[i] = (a[0], a[1], 'ab')
    elif ca:
        det[i] = (a[0], a[1], 'a')
    elif cb:
        det[i] = (b[0], b[1], 'b')
# outlier removal against neighbours
keys = sorted(det)
good = {}
for k in keys:
    nb = [det[j] for j in keys if j != k and abs(j - k) <= 6]
    if len(nb) < 2:
        if det[k][2] == 'ab': good[k] = det[k]
        continue
    mx = np.median([p[0] for p in nb]); my = np.median([p[1] for p in nb])
    if abs(det[k][0] - mx) + abs(det[k][1] - my) < 60:
        good[k] = det[k]
out = open('/Users/jackson/workplace/longhorn-concept/ref/cursor_merged.txt', 'w')
for k in sorted(good):
    out.write(f'{k} {good[k][0]} {good[k][1]} {good[k][2]}\n')
out.close()
# gaps
ks = sorted(good)
print('detections', len(ks))
prev = 0
for k in ks + [N + 1]:
    if k - prev > 4:
        print(f'gap {prev + 1}-{k - 1} ({k - prev - 1} frames)', 'from', good.get(prev, None), 'to', good.get(k, None))
    prev = k
