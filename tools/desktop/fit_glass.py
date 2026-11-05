#!/usr/bin/env python3
"""Fit the sidebar glass; writes public/img/desktop/glass-tint.webp and src/scenes/desktop/glassFit.js.

The sidebar glass (src/scenes/desktop/Sidebar.jsx) is live:
    out_c(x, y) = k(x) * blur(backdrop)_c(x, y) + t_c(x) + g_c(y)
blur: CSS backdrop-filter blur(GLASS_BLUR) of whatever is behind the panel. k(x): per-column
transmission shared by the channels (a black layer with alpha 1 - k(x) on the blurring element,
a CSS gradient through the stops in glassFit.js). t + g: an additive tint (glass-tint.webp, drawn
with mix-blend-mode: plus-lighter), t per column, g per row (tile bands, separators). A plain
alpha overlay can't hold it: on the right the glass passes ~70 % of the backdrop and still adds
more blue than the remaining 30 % alpha allows.

Targets: the empty panel (x 858-960, rows 0-699) of video frames 521-523 (header picture masked;
the Seattle rows use 521-522 only, it is half in at 523), and the clock foot (rows 700-719) from
the median of frames 580-1528 (clock text and chevron masked; the foot shares the panel's k(x),
its own t(x) is interpolated across the masked columns).

The backdrop is Chrome's own blur of the wallpaper: capture frame 522 with the glass layers
emptied (dev server running):
  node tools/capture.mjs 522 --out out/glassbg --url 'http://127.0.0.1:<port>/longhorn-concept/?capture' \\
    --eval "document.head.appendChild(Object.assign(document.createElement('style'), \\
      { textContent: '[data-glass]{background:none!important}' })) && true"
then: python3 tools/desktop/fit_glass.py out/glassbg/f00522.png [--blur 2.4]
(--blur is the GLASS_BLUR the capture was made with; it is written to glassFit.js).

The blur radius itself: python3 tools/desktop/fit_glass.py --sweep [sigmas...] fits the panel on a
simulated backdrop (the wallpaper as the app places it, Gaussian-blurred with the edges mirrored at
the panel's box, as Chrome's backdrop-filter does: within ~1 grey level of Chrome's own) and prints
the RMSE per sigma. The minimum is broad, 2.2-2.6 (2.83), at 2.4; 0 (no blur) gives 3.47. That
includes the video's own softness (~0.85 px on uncovered wallpaper), which the app does not add
elsewhere, so 2.4 is what makes the glass match the video.
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, 'ref', 'frames', 'f%05d.png')
OUT_IMG = os.path.join(ROOT, 'public', 'img', 'desktop', 'glass-tint.webp')
OUT_JS = os.path.join(ROOT, 'src', 'scenes', 'desktop', 'glassFit.js')
X0, PW, PH = 858, 102, 700
# k(x) gradient stops (columns): each border column, then every 5 px
STOPS = [0, 1, 2, 3, 4, 5] + list(range(10, 100, 5)) + [100, 101]


def ref(n):
    return np.asarray(Image.open(REF % n).convert('RGB'), np.float32)[:, X0:]


def targets():
    f521, f522, f523 = ref(521), ref(522), ref(523)
    panel = (f521 + f522 + f523) / 3
    panel[24:63] = ((f521 + f522) / 2)[24:63]
    late = np.median(np.stack([ref(n)[PH:] for n in range(580, 1529, 3)]), 0)
    T = np.concatenate([panel[:PH], late], 0)
    M = np.ones((720, PW), bool)
    M[2:25, 4:28] = False  # header picture (fading in)
    foot_cols = np.r_[0:27, 77:83, 100:102]  # clear of "11:31 am" (x 885-934) and the chevron disc
    M[PH:] = False
    M[PH:, foot_cols] = True
    return T, M, foot_cols


def fit_columns(T, M, B, g, k_fixed=None):
    """k(x), t_c(x) by least squares per column, given the row tints g (and optionally k)."""
    k = np.zeros(PW) if k_fixed is None else k_fixed.copy()
    t = np.zeros((PW, 3))
    for x in range(PW):
        m = M[:, x]
        r = T[m, x] - g[m]
        if k_fixed is not None:
            t[x] = (r - k[x] * B[m, x]).mean(0)
            continue
        n = int(m.sum())
        A = np.zeros((3 * n, 4))
        A[:, 0] = B[m, x].T.reshape(-1)
        for c in range(3):
            A[c * n:(c + 1) * n, 1 + c] = 1
        s = np.linalg.lstsq(A, r.T.reshape(-1), rcond=None)[0]
        k[x], t[x] = s[0], s[1:]
    return k, t


def fit_panel(P, Mp, Bp, k_fixed=None, iters=40):
    g = np.zeros((PH, 3))
    for _ in range(iters):
        k, t = fit_columns(P, Mp, Bp, g, k_fixed)
        res = P - k[None, :, None] * Bp - t[None]
        w = Mp[..., None]
        g = (res * w).sum(1) / np.maximum(w.sum(1), 1)
        g -= g.mean(0)
    return k, t, g


def simulated_backdrop(sigma):
    from scipy.ndimage import gaussian_filter
    im = Image.open(os.path.join(ROOT, 'public', 'img', 'desktop', 'wallpaper.webp')).convert('RGB')
    sx, sy = im.width / 959.8, im.height / 720.04  # DesktopScene's Photo: at (0.16, 0.58), 959.8 x 720.04
    W = np.asarray(im.transform((960, 720), Image.AFFINE, (sx, 0, -0.16 * sx, 0, sy, -0.58 * sy), resample=Image.BICUBIC), np.float32)
    return gaussian_filter(W[:PH, X0:], (sigma, sigma, 0), mode='reflect') if sigma else W[:PH, X0:]


def sweep(sigmas):
    T, M, _ = targets()
    for sigma in sigmas:
        Bp = simulated_backdrop(sigma)
        k, t, g = fit_panel(T[:PH], M[:PH], Bp, iters=25)
        pred = k[None, :, None] * Bp + t[None] + g[:, None]
        print(f'blur {sigma:4.2f}: panel rmse {np.sqrt(((pred - T[:PH])[M[:PH]] ** 2).mean()):.3f}', flush=True)


def main():
    if sys.argv[1] == '--sweep':
        return sweep([float(v) for v in sys.argv[2:]] or [0, 1, 1.6, 2, 2.2, 2.4, 2.6, 2.8, 3.2, 4])
    blur = float(sys.argv[sys.argv.index('--blur') + 1]) if '--blur' in sys.argv else 2.4
    B = np.asarray(Image.open(sys.argv[1]).convert('RGB'), np.float32)[:, X0:]
    T, M, foot_cols = targets()
    P, Mp, Bp = T[:PH], M[:PH], B[:PH]
    k_free, _, _ = fit_panel(P, Mp, Bp)
    # k as the CSS gradient draws it: linear between the stops (at column centres)
    stops = [(c, round(float(k_free[c]), 3)) for c in STOPS]
    k = np.interp(np.arange(PW), [c for c, _ in stops], [v for _, v in stops])
    _, t, g = fit_panel(P, Mp, Bp, k_fixed=k)
    pred = k[None, :, None] * Bp + t[None] + g[:, None]
    panel_rmse = float(np.sqrt(((pred - P)[Mp] ** 2).mean()))
    # foot: the panel's k(x); its own t_f(x) (visible columns) and g_f(y)
    F, Bf = T[PH:], B[PH:]
    gf = np.zeros((720 - PH, 3))
    tf = np.zeros((PW, 3))
    for _ in range(40):
        r = F - k[None, :, None] * Bf - gf[:, None]
        tf[foot_cols] = r[:, foot_cols].mean(0)
        r = F - k[None, :, None] * Bf - tf[None]
        gf = r[:, foot_cols].mean(1)
        gf -= gf.mean(0)
    for c in range(3):  # across the clock text and the chevron
        tf[:, c] = np.interp(np.arange(PW), foot_cols, tf[foot_cols, c])
    predf = k[None, :, None] * Bf + tf[None] + gf[:, None]
    foot_rmse = float(np.sqrt(((predf - F)[:, foot_cols] ** 2).mean()))
    tint = np.concatenate([t[None] + g[:, None], tf[None] + gf[:, None]], 0)
    clipped = float(((tint < -0.5) | (tint > 255.5)).mean())
    Image.fromarray(np.clip(np.round(tint), 0, 255).astype(np.uint8)).save(OUT_IMG, lossless=True, quality=100, method=6)
    with open(OUT_JS, 'w') as f:
        f.write('// Generated by tools/desktop/fit_glass.py (see Sidebar.jsx).\n')
        f.write('// The backdrop blur of the sidebar glass, the clock foot and the taskbar (CSS px, stage space)\n')
        f.write(f'export const GLASS_BLUR = {blur:g}\n')
        f.write('// The glass transmission k(x) as [column (0 = stage x 858), k] gradient stops, linear in between\n')
        f.write('export const GLASS_K = [\n')
        for i in range(0, len(stops), 6):
            f.write('  ' + ' '.join(f'[{c}, {v}],' for c, v in stops[i:i + 6]) + '\n')
        f.write(']\n')
    np.set_printoptions(precision=3, suppress=True, linewidth=160)
    print(f'panel rmse {panel_rmse:.2f}, foot rmse {foot_rmse:.2f} (visible columns), tint clipped {clipped * 100:.2f} %')
    print('k stops:', stops)
    print('t(x) at columns 0, 1, 5, 50, 100:', t[[0, 1, 5, 50, 100]].round(1).tolist())
    print('foot t(x) at columns 0, 26, 80:', tf[[0, 26, 80]].round(1).tolist())
    print('wrote', OUT_IMG, os.path.getsize(OUT_IMG), 'bytes, and', OUT_JS)


if __name__ == '__main__':
    main()
