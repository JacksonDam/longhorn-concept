"""Uniform cubic B-spline grid helpers shared by the aurora fitting scripts.
Control point (i, j) sits at stage px ((i - 1) * S, (j - 1) * S); value at a point is the
usual 4x4 weighted sum (same as the shader's bsplineGrid())."""
import numpy as np
import scipy.sparse as sp

S = 30.0               # control spacing in stage px
NX = int(960 / S) + 3  # 35
NY = int(720 / S) + 3  # 27


def weights(u):
    f = u - np.floor(u)
    w0 = (1 - f) ** 3 / 6
    w1 = (3 * f ** 3 - 6 * f ** 2 + 4) / 6
    w2 = (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6
    w3 = f ** 3 / 6
    return np.floor(u).astype(int), np.stack([w0, w1, w2, w3], -1)


def basis(xs, ys):
    """sparse (len(xs)*len(ys)) x (NX*NY) basis for the pixel grid xs (cols) x ys (rows), px centres"""
    ix, wx = weights(xs / S + 1)
    iy, wy = weights(ys / S + 1)
    rows, cols, vals = [], [], []
    W = len(xs)
    for r, (j0, wyr) in enumerate(zip(iy, wy)):
        for c, (i0, wxc) in enumerate(zip(ix, wx)):
            p = r * W + c
            for a in range(4):
                for b in range(4):
                    i, j = i0 - 1 + b, j0 - 1 + a
                    rows.append(p); cols.append(j * NX + i); vals.append(wyr[a] * wxc[b])
    return sp.csr_matrix((vals, (rows, cols)), shape=(len(xs) * len(ys), NX * NY))


def laplacian():
    n = NX * NY
    rows, cols, vals = [], [], []
    k = 0
    for j in range(NY):
        for i in range(NX):
            for (di, dj) in ((1, 0), (0, 1)):
                i2, j2 = i + di, j + dj
                if i2 < NX and j2 < NY:
                    rows += [k, k]; cols += [j * NX + i, j2 * NX + i2]; vals += [1, -1]; k += 1
    return sp.csr_matrix((vals, (rows, cols)), shape=(k, n))
