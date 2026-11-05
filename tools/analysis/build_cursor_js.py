#!/usr/bin/env python3
"""Build src/demo/cursor.js from the filled track + manual anchors and hidden ranges."""
import numpy as np
fill = {int(r[0]): (float(r[1]), float(r[2])) for r in (l.split() for l in open('/Users/jackson/workplace/longhorn-concept/ref/cursor_filled.txt'))}
N = 1529
manual = {
    # enters from the right edge along the login bar (read off frames 39-72)
    37: (990, 632), 39: (950, 635), 42: (925, 620), 45: (870, 627), 48: (815, 635), 51: (760, 640),
    54: (695, 635), 57: (620, 637), 60: (555, 635), 63: (495, 643), 66: (440, 638), 69: (395, 640), 72: (355, 640),
    # leaves to the right edge after clicking into the password field
    372: (736, 370), 374: (770, 356), 376: (816, 346), 378: (856, 336), 380: (904, 324), 382: (950, 320), 383: (975, 316),
    # comes back after login from the bottom left as a streak
    553: (20, 467), 555: (71, 401), 557: (116, 336), 559: (159, 274), 561: (199, 215), 563: (228, 179), 565: (239, 173),
    567: (234, 182), 569: (229, 203), 571: (223, 243), 573: (237, 297), 575: (290, 345),
    # minimise -> taskbar restore click -> rest on the taskbar button
    1395: (796, 33), 1401: (446, 694), 1405: (439, 697), 1529: (439, 697),
}
hidden = [(1, 36), (384, 552)]
pts = {}
for i in range(1, N + 1):
    if any(a <= i <= b for a, b in hidden):
        continue
    if i in manual:
        pts[i] = manual[i]
for i, p in fill.items():
    if any(a <= i <= b for a, b in hidden) or i in pts:
        continue
    if 73 <= i <= 371 or 576 <= i <= 1394:
        pts[i] = p
# light smoothing on tracked runs (3-tap median then keep), then thin out collinear points
ks = sorted(pts)
xs = np.array([pts[k][0] for k in ks]); ys = np.array([pts[k][1] for k in ks])
sx, sy = xs.copy(), ys.copy()
for j in range(1, len(ks) - 1):
    if ks[j + 1] - ks[j - 1] == 2 and ks[j] not in manual:
        sx[j] = np.median(xs[j - 1:j + 2]); sy[j] = np.median(ys[j - 1:j + 2])
keys = [(k, float(sx[j]), float(sy[j])) for j, k in enumerate(ks)]
# drop points that linear interpolation reproduces within 0.75 px
out = [keys[0]]
for j in range(1, len(keys) - 1):
    a, b, c = out[-1], keys[j], keys[j + 1]
    if c[0] - a[0] > 30:
        out.append(b); continue
    k = (b[0] - a[0]) / (c[0] - a[0])
    ix, iy = a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k
    if abs(ix - b[1]) > 0.75 or abs(iy - b[2]) > 0.75:
        out.append(b)
out.append(keys[-1])
lines = []
for a, b in hidden:
    lines.append((a, None, None)); lines.append((b, None, None))
allk = sorted(out + lines, key=lambda r: r[0])
body = ',\n'.join(f'  [{k}, {"null" if x is None else round(x, 1)}, {"null" if y is None else round(y, 1)}]' for k, x, y in allk)
js = ('// Cursor hotspot path tracked from the reference video (tools/analysis/*cursor*.py):\n'
      '// [[frame, x, y], ...]; null x = hidden (consecutive nulls bracket a hidden range).\n'
      f'export const cursorKeys = [\n{body},\n]\n')
open('/Users/jackson/workplace/longhorn-concept/src/demo/cursor.js', 'w').write(js)
print(len(allk), 'keys')
