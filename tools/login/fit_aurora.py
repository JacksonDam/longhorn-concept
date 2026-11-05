#!/usr/bin/env python3
"""Fit the aurora background (coarse colour field + keyframed ribbons) to the reference.

usage: fit_aurora.py <outdir> [--rounds 2] [--keys 1-441]
Writes <outdir>/coarse.npy (keys x NY x NX x 3) and <outdir>/ribbons.npz (P, A, S per key x slot).
Model (mirrors the shader): bg = coarse(x,y) + sum_i A_i(x) * exp(-d^2 / 2 s_i^2),
d = perpendicular distance to the centreline y = Y_i(x); Y_i and the per-channel amplitude
A_i(x) are cubic B-splines over x (aurora_common.KX control points)."""
import sys, os, time, numpy as np, scipy.sparse.linalg as spl, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aurora_common import XS, YS, KX, BXH, DXH, mask_half, load_half
from bspline import basis, laplacian, NX, NY

args = sys.argv[1:]
outdir = args[0]
os.makedirs(outdir, exist_ok=True)
ROUNDS = int(args[args.index('--rounds') + 1]) if '--rounds' in args else 2
STEP = 4
KEYS = list(range(1, 442, STEP))
if '--keys' in args:
    a, b = map(int, args[args.index('--keys') + 1].split('-'))
    KEYS = [k for k in KEYS if a <= k <= b]
NS = 44          # ribbon slots
SMIN, SMAX = 1.6, 14.0

half = load_half()

# ---------------------------------------------------------------- coarse field
xs4 = (np.arange(240) + 0.5) * 4
ys4 = (np.arange(180) + 0.5) * 4
B4 = basis(xs4, ys4)
B2 = basis(XS, YS)
LAP = laplacian()
LT = (LAP.T @ LAP)


def fit_coarse(img, m):
    """img: (360,480,3) float, m: (360,480) bool -> grid (NY,NX,3)"""
    q = img.reshape(180, 2, 240, 2, 3).mean((1, 3)).reshape(-1, 3)
    mq = m.reshape(180, 2, 240, 2).all((1, 3)).ravel()
    Bm = B4[mq]
    solve = spl.factorized((Bm.T @ Bm + 0.02 * LT).tocsc())
    return np.stack([solve(Bm.T @ q[mq, c]) for c in range(3)], -1).reshape(NY, NX, 3)


def eval_coarse(grid):
    return (B2 @ grid.reshape(-1, 3)).reshape(360, 480, 3)


# ---------------------------------------------------------------- ribbons
def curve(P):
    Y = BXH @ P
    Yp = DXH @ P
    return Y, 1 / np.sqrt(1 + Yp * Yp)


def render_one(P, A, s, out=None, sign=1.0):
    Y, nrm = curve(P)
    amp = BXH @ A.T                  # (480,3)
    lo = max(0, int((Y.min() - 5 * s) / 2) - 1)
    hi = min(360, int((Y.max() + 5 * s) / 2) + 2)
    if hi <= lo:
        return out
    d = (YS[lo:hi, None] - Y[None, :]) * nrm[None, :]
    g = np.exp(-0.5 * d * d / (s * s))
    if out is None:
        out = np.zeros((360, 480, 3), np.float32)
    out[lo:hi] += sign * g[..., None] * amp[None, :, :]
    return out


def render_all(R):
    out = np.zeros((360, 480, 3), np.float32)
    for P, A, s, on in R:
        if on:
            render_one(P, A, s, out)
    return out


D2 = np.diff(np.eye(KX), 2, axis=0)  # second differences (KX-2, KX)
DD = D2.T @ D2


def fit_block(P, A, s, T, W, prior=None, iters=3):
    """refine one ribbon against target T (360,480,3) with weights W (360,480)"""
    lam_t = 0.02
    for it in range(iters):
        Y, nrm = curve(P)
        lo = max(0, int((Y.min() - 5 * s) / 2) - 1)
        hi = min(360, int((Y.max() + 5 * s) / 2) + 2)
        if hi - lo < 3:
            return P, A, s, False
        ys = YS[lo:hi, None]
        d = (ys - Y[None, :]) * nrm[None, :]
        g = np.exp(-0.5 * d * d / (s * s))
        Wb = W[lo:hi]
        Tb = T[lo:hi]
        # --- linear amplitudes (per channel), G = g * B
        gw = g * Wb
        # normal matrix: sum over pixels of (g B)^T (g B) W = B^T diag(sum_y g^2 W) B
        colw = (g * gw).sum(0)                       # (480,)
        obs = BXH.T @ colw                            # how much each control is observed
        unobs = np.clip(1 - obs / (obs.max() + 1e-9) * 3, 0, 1)
        M = BXH.T @ (BXH * colw[:, None]) + 0.5 * DD + np.diag(1e-3 + 0.3 * colw.mean() * 8 * unobs)
        rhs = BXH.T @ (gw[..., None] * Tb).sum(0)    # (KX,3)
        if prior is not None:
            M = M + lam_t * colw.sum() / KX * np.eye(KX)
            rhs = rhs + lam_t * colw.sum() / KX * prior[1].T
        A = np.linalg.solve(M, rhs).T                # (3,KX)
        # --- Gauss-Newton on centreline P and width s
        amp = BXH @ A.T                               # (480,3)
        e = Tb - g[..., None] * amp[None]             # (h,480,3)
        # d/dP_k value_c = amp_c g d/s^2 nrm B_k ; d/ds = amp_c g d^2/s^3
        base = g * d / (s * s) * nrm[None, :]         # (h,480)
        # project over channels: J_c = amp_c * base * B ; accumulate J^T J and J^T e
        a2 = (amp * amp).sum(1)                        # (480,)
        ae = (e * amp[None]).sum(2)                    # (h,480)
        wb2 = (base * base * Wb).sum(0) * a2           # (480,)
        JtJ_P = BXH.T @ (BXH * wb2[:, None])
        Jte_P = BXH.T @ (base * ae * Wb).sum(0)
        bs = g * d * d / (s ** 3)
        JtJ_s = ((bs * bs * Wb).sum(0) * a2).sum()
        Jte_s = (bs * ae * Wb).sum()
        JtJ_Ps = BXH.T @ ((base * bs * Wb).sum(0) * a2)
        H = np.zeros((KX + 1, KX + 1))
        H[:KX, :KX] = JtJ_P + 2.0 * DD
        H[:KX, KX] = H[KX, :KX] = JtJ_Ps
        H[KX, KX] = JtJ_s
        gvec = np.concatenate([Jte_P - 2.0 * DD @ P, [Jte_s]])
        if prior is not None:
            pw = 0.3 * max(H[:KX, :KX].diagonal().mean(), 1e-6)
            H[:KX, :KX] += pw * np.eye(KX)
            gvec[:KX] += pw * (prior[0] - P)
        lm = 1e-2 * max(H.diagonal().mean(), 1e-6)
        step = np.linalg.solve(H + lm * np.eye(KX + 1), gvec)
        step[:KX] = np.clip(step[:KX], -12, 12)
        step[KX] = np.clip(step[KX], -1.5, 1.5)
        P = P + step[:KX]
        s = float(np.clip(s + step[KX], SMIN, SMAX))
    strength = np.abs(A).max()
    return P, A, s, strength > 2.0


def ridge_map(r, W):
    """bright-line response on residual luminance r (360,480) at half res"""
    rs = cv2.GaussianBlur(np.ascontiguousarray(r, np.float32), (0, 0), 1.2)
    ryy = cv2.Sobel(rs, cv2.CV_32F, 0, 2, ksize=5) / 48
    rxx = cv2.Sobel(rs, cv2.CV_32F, 2, 0, ksize=5) / 48
    rxy = cv2.Sobel(rs, cv2.CV_32F, 1, 1, ksize=5) / 48
    tr = rxx + ryy
    det = np.sqrt(((rxx - ryy) / 2) ** 2 + rxy ** 2)
    lmin = tr / 2 - det
    resp = np.maximum(-lmin, 0) * (rs > 0)
    # orientation: eigenvector of lmin; keep near-horizontal lines (|angle| < 50 deg)
    ang = 0.5 * np.arctan2(2 * rxy, rxx - ryy)    # orientation of the max-curvature axis
    horiz = np.abs(np.cos(ang)) < np.cos(np.radians(40))  # curvature axis mostly vertical
    resp = resp * horiz * cv2.erode(W.astype(np.uint8), np.ones((5, 5), np.uint8))
    return resp, rs


def trace(resp, rs, y0, x0):
    """follow a ridge from (row y0, col x0) left and right; returns arrays of (col, row)"""
    pts = [(x0, y0)]
    thr = resp[y0, x0] * 0.12
    for direction in (1, -1):
        x, y, slope = x0, float(y0), 0.0
        prev = []
        miss = 0
        while True:
            x += 3 * direction
            if x < 0 or x >= 480:
                break
            yp = y + slope * 3 * direction
            lo, hi = int(max(0, yp - 3)), int(min(359, yp + 3))
            if hi <= lo:
                break
            seg = resp[lo:hi + 1, x]
            j = int(np.argmax(seg))
            if seg[j] < thr:
                miss += 1
                if miss > 4:
                    break
                y = yp
                continue
            miss = 0
            yn = lo + j
            slope = 0.7 * slope + 0.3 * (yn - y) / (3 * direction)
            y = yn
            prev.append((x, y))
        pts += prev
    pts.sort()
    return np.array(pts, float)


def init_from_points(pts, rtgt):
    xs = pts[:, 0] * 2 + 1
    ys = pts[:, 1] * 2 + 1
    from aurora_common import bx_basis
    B, _ = bx_basis(xs)
    M = B.T @ B + 2.0 * DD + 1e-4 * np.eye(KX)
    # anchor unobserved controls to a straight-line extrapolation
    co = np.polyfit(xs, ys, 1 if len(xs) < 20 else 2)
    from aurora_common import X0, SX
    cx = X0 + (np.arange(KX) - 1) * SX
    prior = np.polyval(co, cx)
    M2 = M + 0.05 * np.eye(KX)
    P = np.linalg.solve(M2, B.T @ ys + 0.05 * prior)
    cols = np.clip(pts[:, 0].astype(int), 0, 479)
    rows = np.clip(pts[:, 1].astype(int), 0, 359)
    v = rtgt[rows, cols]                     # (n,3)
    Ainit = np.linalg.solve(B.T @ B + 1.0 * DD + 0.05 * np.eye(KX), B.T @ v).T
    return P, Ainit


def greedy_add(R, T, W, max_new, thr):
    """add ribbons for unexplained ridges. T: residual target (incl. all current ribbons removed)"""
    added = 0
    free = [i for i, r in enumerate(R) if not r[3]]
    lum = T @ np.array([0.3, 0.4, 0.3])
    tried = np.zeros((360, 480), bool)
    while added < max_new and free:
        resp, rs = ridge_map(lum, W)
        resp[tried] = 0
        y0, x0 = np.unravel_index(np.argmax(resp), resp.shape)
        if resp[y0, x0] < thr:
            break
        pts = trace(resp, rs, y0, x0)
        tried[max(0, y0 - 3):y0 + 4, max(0, x0 - 3):x0 + 4] = True
        if len(pts) < 12:
            continue
        P, A = init_from_points(pts, T)
        s = 3.0
        for _ in range(2):
            P, A, s, ok = fit_block(P, A, s, T, W, iters=3)
        if not ok:
            continue
        i = free.pop(0)
        R[i] = [P, A, s, True]
        contrib = render_one(P, A, s)
        T -= contrib
        lum = T @ np.array([0.3, 0.4, 0.3])
        added += 1
        for (cx, cy) in pts.astype(int):
            tried[max(0, cy - 4):cy + 5, max(0, cx - 2):cx + 3] = True
    return added


def fit_key(n, R, coarse_grid, prior_R):
    f = np.asarray(half[n - 1], np.float32)
    W = mask_half(n).astype(np.float32)
    base = eval_coarse(coarse_grid)
    T = f - base
    T_all = T - render_all(R)
    # block sweeps
    for sweep in range(3):
        for i, r in enumerate(R):
            if not r[3]:
                continue
            P, A, s, _ = r
            Ti = T_all + render_one(P, A, s)
            pr = None
            if prior_R is not None and prior_R[i][3]:
                pr = (prior_R[i][0], prior_R[i][1])
            P2, A2, s2, ok = fit_block(P, A, s, Ti, W, prior=pr, iters=2)
            R[i] = [P2, A2, s2, True]
            T_all = Ti - render_one(P2, A2, s2)
    # new ribbons
    added = greedy_add(R, T_all, W, max_new=6 if prior_R is not None else NS, thr=1.2 if prior_R is not None else 0.9)
    # drop dead / duplicate ribbons
    for i, r in enumerate(R):
        if r[3] and np.abs(BXH @ r[1].T).max() < 3.0:
            R[i] = [r[0], r[1] * 0, r[2], False]
    e = np.sqrt(((T_all ** 2) * W[..., None]).sum() / (W.sum() * 3))
    return R, added, e


def main():
    t0 = time.time()
    # round 0 coarse: plain fit
    coarse = {}
    for n in KEYS:
        coarse[n] = fit_coarse(np.asarray(half[n - 1], np.float32), mask_half(n))
    print('coarse0 done %.1fs' % (time.time() - t0), flush=True)
    for rnd in range(ROUNDS):
        R = [[np.zeros(KX), np.zeros((3, KX)), 3.0, False] for _ in range(NS)]
        hist = {}
        prior = None
        for n in KEYS:
            R, added, e = fit_key(n, R, coarse[n], prior)
            hist[n] = [[r[0].copy(), r[1].copy(), r[2], r[3]] for r in R]
            prior = hist[n]
            if n % 40 == 1:
                print(f'round {rnd} key {n}: active {sum(r[3] for r in R)} added {added} resid {e:.2f}  {time.time()-t0:.0f}s', flush=True)
        # refit coarse with ribbons removed
        for n in KEYS:
            f = np.asarray(half[n - 1], np.float32)
            coarse[n] = fit_coarse(f - render_all(hist[n]), mask_half(n))
        print(f'round {rnd} coarse refit {time.time()-t0:.0f}s', flush=True)
    keys = KEYS
    P = np.array([[r[0] for r in hist[n]] for n in keys])
    A = np.array([[r[1] * (1 if r[3] else 0) for r in hist[n]] for n in keys])
    S = np.array([[r[2] for r in hist[n]] for n in keys])
    np.savez(os.path.join(outdir, 'ribbons.npz'), keys=np.array(keys), P=P, A=A, S=S)
    np.save(os.path.join(outdir, 'coarse.npy'), np.array([coarse[n] for n in keys]))
    print('done', time.time() - t0)


if __name__ == '__main__':
    main()
