# Build the Windows XP icon sprites from the original binaries (docs/desktop-spec.md, "XP icon art").
# usage (from the repo root): python3 -I tools/icons/xpicons.py
#
# Reads the XP SP3 PE files in assets-src/icons/xp-sp3-iso/*.bin (shell32 from
# assets-src/icons/xp-shell32-sp3/shell32.dll.bin, Office 2003's Outlook and Word from
# assets-src/icons/office-2003/*.bin) as data: a small PE resource reader, nothing is
# loaded or run (assets-src/SOURCES.md section 11). Every icon keeps its own size designs: an icon
# group gives its 16, 24, 32 and 48 px images (32-bit with alpha), a toolbar strip one cell per
# size. Writes one sprite per size, public/img/xp/xp<size>.webp (lossless; cells of size + 4 px, the
# icon at +2, 16 columns), and src/os/xpSheet.js (name -> cell index per size).
import io, json, os, struct, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets-src', 'icons', 'xp-sp3-iso')
OFFICE = os.path.join(ROOT, 'assets-src', 'icons', 'office-2003')


def BIN(b):
    if b == 'shell32.dll':
        return os.path.join(ROOT, 'assets-src', 'icons', 'xp-shell32-sp3', 'shell32.dll.bin')
    if b in ('outlook.exe', 'winword.exe', 'outllibr.dll'):
        return os.path.join(OFFICE, b + '.bin')
    return os.path.join(SRC, b + '.bin')
SIZES = (16, 24, 32, 48)
COLS = 16
PAD = 2

# ---------------------------------------------------------------- manifest
# icon groups: name -> (binary, group id)
ICONS = {
    # places, drives and files
    'folder': ('shell32.dll', 4), 'folder-open': ('shell32.dll', 5),
    'mydocs': ('shell32.dll', 235), 'mypics': ('mydocs.dll', 101), 'mymusic': ('shell32.dll', 237),
    'myvideos': ('shell32.dll', 238), 'shared': ('shell32.dll', 267), 'programs': ('shell32.dll', 20),
    'computer': ('explorer.exe', 100), 'network': ('shell32.dll', 18), 'drive': ('shell32.dll', 9),
    'cd': ('shell32.dll', 12), 'dvd': ('shell32.dll', 291), 'floppy': ('shell32.dll', 7),
    'camera': ('shell32.dll', 248), 'cdr': ('shell32.dll', 295), 'disc': ('shell32.dll', 302),
    'text': ('shell32.dll', 152), 'image': ('shimgvw.dll', 4), 'video': ('shell32.dll', 224),
    'audio': ('shell32.dll', 225), 'recycle': ('shell32.dll', 32), 'webpage': ('iexplore.exe', 32529),
    # shell
    'app': ('shell32.dll', 3), 'ie': ('iexplore.exe', 32528), 'internet': ('explorer.exe', 253), 'mail': ('explorer.exe', 254),
    'help': ('shell32.dll', 24), 'run': ('shell32.dll', 25), 'search': ('shell32.dll', 23),
    'control': ('shell32.dll', 137), 'setting': ('shell32.dll', 330), 'printers': ('shell32.dll', 138),
    'printer': ('shell32.dll', 17), 'logoff': ('shell32.dll', 45), 'shutdown': ('shell32.dll', 28),
    'tour': ('tourstrt.exe', 100), 'sysinfo': ('sysdm.cpl', 1), 'winupdate': ('shell32.dll', 47),
    # applets (classic view)
    'display': ('desk.cpl', 100), 'datetime': ('timedate.cpl', 200), 'sound': ('mmsys.cpl', 3004),
    'mouse': ('main.cpl', 100), 'users': ('nusrmgr.cpl', 200), 'netconn': ('netshell.dll', 3),
    'addremove': ('appwiz.cpl', 1500),
    # Control Panel category view
    'cat-appearance': ('shell32.dll', 270), 'cat-addremove': ('shell32.dll', 271),
    'cat-hardware': ('shell32.dll', 272), 'cat-network': ('shell32.dll', 273),
    'cat-perf': ('shell32.dll', 275), 'cat-datetime': ('shell32.dll', 276),
    'cat-sound': ('shell32.dll', 277), 'cat-users': ('shell32.dll', 279), 'cat-access': ('shell32.dll', 268),
    # programs
    'calc': ('calc.exe', 'SC'), 'charmap': ('charmap.exe', 111), 'solitaire': ('sol.exe', 500),
    'paint': ('mspaint.exe', 2), 'notepad': ('notepad.exe', 2), 'wordpad': ('wordpad.exe', 128),
    # task-pane tasks
    'newfolder': ('shell32.dll', 319), 'publish': ('shell32.dll', 244), 'slideshow': ('shell32.dll', 249),
    'orderprints': ('shell32.dll', 251), 'printpics': ('shell32.dll', 252), 'playall': ('shell32.dll', 292),
    # Windows Media Player 9 library icons (the second reference's my Pictures task pane)
    'wmp-album': ('wmploc.dll', 601), 'wmp-burn': ('wmploc.dll', 605), 'wmp-video': ('wmploc.dll', 504),
    # message boxes
    'msg-warning': ('user32.dll', 101), 'msg-question': ('user32.dll', 102),
    'msg-error': ('user32.dll', 103), 'msg-info': ('user32.dll', 104),
    # Office 2003: Outlook and Word, the Word document, Outlook's folder list
    'outlook': ('outlook.exe', 1), 'word': ('winword.exe', 1), 'worddoc': ('winword.exe', 2),
    'ol-folder': ('outllibr.dll', 9600), 'ol-root': ('outllibr.dll', 9607), 'ol-inbox': ('outllibr.dll', 9608),
    'ol-sent': ('outllibr.dll', 9609), 'ol-outbox': ('outllibr.dll', 9610), 'ol-deleted': ('outllibr.dll', 9611),
    'ol-drafts': ('outllibr.dll', 9617), 'ol-search': ('outllibr.dll', 9618), 'ol-junk': ('outllibr.dll', 9622),
    'ol-unread': ('outllibr.dll', 9403), 'ol-read': ('outllibr.dll', 9704),
}
# toolbar strips: (binary, bitmap id per size, cell size per size, transparent key or None, cells)
STRIPS = [
    # IE6 (XP) toolbar: shell32 204 (24 px) / 206 (16 px)
    ('shell32.dll', {24: 204, 16: 206}, None, {
        'tb-back': 0, 'tb-forward': 1, 'tb-stop': 2, 'tb-refresh': 3, 'tb-home': 4, 'tb-search': 5,
        'tb-favorites': 6, 'tb-print': 7, 'tb-media': 11, 'tb-history': 12, 'tb-mail': 13}),
    # Explorer toolbar: shell32 214 (24 px) / 216 (16 px)
    ('shell32.dll', {24: 214, 16: 216}, None, {
        'tb-cut': 5, 'tb-copy': 6, 'tb-paste': 7, 'tb-undo': 8, 'tb-redo': 9, 'tb-delete': 10,
        'tb-new': 11, 'tb-open': 12, 'tb-save': 13, 'tb-props': 15, 'tb-find': 17, 'tb-up': 28,
        'tb-folders': 43}),
    # Outlook Express 6 toolbar: msoeres 74 (24 px) / 73 (16 px)
    ('msoeres.dll', {24: 74, 16: 73}, None, {
        'oe-addresses': 0, 'oe-delete': 5, 'oe-find': 7, 'oe-sendrecv': 10, 'oe-newmail': 11,
        'oe-print': 29, 'oe-reply': 32, 'oe-replyall': 33, 'oe-forward': 34, 'oe-send': 47,
        'oe-attach': 49}),
    # Windows Picture and Fax Viewer toolbar (16 px): shimgvw 105
    ('shimgvw.dll', {16: 105}, None, {
        'pv-prev': 0, 'pv-next': 1, 'pv-zoomin': 2, 'pv-zoomout': 3, 'pv-bestfit': 5, 'pv-actual': 6,
        'pv-slideshow': 8, 'pv-rotccw': 11, 'pv-rotcw': 12, 'pv-print': 20, 'pv-delete': 25,
        'pv-edit': 26}),
    # Paint tool box (16 px, 16 colours on a red key)
    ('mspaint.exe', {16: 859}, (255, 0, 0), {
        'pt-freeselect': 0, 'pt-select': 1, 'pt-eraser': 2, 'pt-fill': 3, 'pt-pick': 4, 'pt-zoom': 5,
        'pt-pencil': 6, 'pt-brush': 7, 'pt-airbrush': 8, 'pt-text': 9, 'pt-line': 10, 'pt-curve': 11,
        'pt-rect': 12, 'pt-polygon': 13, 'pt-ellipse': 14, 'pt-roundrect': 15}),
]
# single bitmaps: name -> (binary, bitmap id, size it is filed under)
BITMAPS = {
    'tb-go': ('shell32.dll', 230, 24),  # the IE6 address bar's Go arrow, 20 x 20, centred in a 24 cell
}


# ---------------------------------------------------------------- PE resources (read as data)
def resources(path):
    d = open(path, 'rb').read()
    pe = struct.unpack_from('<I', d, 0x3c)[0]
    assert d[pe:pe + 4] == b'PE\0\0', path
    nsec = struct.unpack_from('<H', d, pe + 6)[0]
    optsz = struct.unpack_from('<H', d, pe + 20)[0]
    opt = pe + 24
    ddir = opt + (96 if struct.unpack_from('<H', d, opt)[0] == 0x10b else 112)
    rva = struct.unpack_from('<I', d, ddir + 16)[0]
    secs = [struct.unpack_from('<8sIIII', d, opt + optsz + i * 40) for i in range(nsec)]

    def off(r):
        for _, vsz, va, rsz, rp in secs:
            if va <= r < va + max(vsz, rsz):
                return r - va + rp
        raise ValueError(hex(r))
    base = off(rva)

    def rdir(o):
        nn, ni = struct.unpack_from('<HH', d, base + o + 12)
        out = []
        for i in range(nn + ni):
            nm, tgt = struct.unpack_from('<II', d, base + o + 16 + i * 8)
            if nm & 0x80000000:
                so = base + (nm & 0x7fffffff)
                nm = d[so + 2:so + 2 + struct.unpack_from('<H', d, so)[0] * 2].decode('utf-16le')
            out.append((nm, tgt))
        return out
    res = {}
    for tk, tt in rdir(0):
        for nk, nt in rdir(tt & 0x7fffffff):
            lt = rdir(nt & 0x7fffffff)[0][1] if nt & 0x80000000 else nt
            r, size = struct.unpack_from('<II', d, base + lt)
            res.setdefault(tk, {})[nk] = d[off(r):off(r) + size]
    return res


_cache = {}
def res_of(b):
    if b not in _cache:
        _cache[b] = resources(BIN(b))
    return _cache[b]


def group_images(b, gid):
    """size -> RGBA image: the best (deepest) image of each size in an icon group"""
    r = res_of(b)
    g = r[14][gid]
    n = struct.unpack_from('<H', g, 4)[0]
    best = {}
    for i in range(n):
        w, h, cc, _, planes, bpp, size, iid = struct.unpack_from('<BBBBHHIH', g, 6 + i * 14)
        w = w or 256
        blob = r[3][iid]
        if w in best and best[w][0] >= bpp:
            continue
        one = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', w % 256, h % 256, cc, 0, planes, bpp, len(blob), 22) + blob
        im = Image.open(io.BytesIO(one))
        im.load()
        best[w] = (bpp, im.convert('RGBA'))
    return {w: im for w, (bpp, im) in best.items()}


def bitmap(b, bid, key=None):
    """an RT_BITMAP as RGBA: 32-bit keeps its alpha; 4/8-bit (plain or RLE) maps `key` to transparent"""
    blob = res_of(b)[2][bid]
    hs, w, h, _, bpp, comp = struct.unpack_from('<IiiHHI', blob, 0)
    H = abs(h)
    if bpp == 32:
        im = Image.frombuffer('RGBA', (w, H), blob[hs:hs + w * H * 4], 'raw', 'BGRA', 0, -1 if h > 0 else 1)
        return im.copy()
    ncol = struct.unpack_from('<I', blob, 32)[0] or (1 << bpp)
    pal = [(blob[hs + i * 4 + 2], blob[hs + i * 4 + 1], blob[hs + i * 4]) for i in range(ncol)]
    data = blob[hs + ncol * 4:]
    px = [[0] * w for _ in range(H)]
    if comp == 0:
        stride = ((w * bpp + 31) // 32) * 4
        for y in range(H):
            row = data[y * stride:(y + 1) * stride]
            for x in range(w):
                px[y][x] = (row[x // 2] >> 4 if x % 2 == 0 else row[x // 2] & 15) if bpp == 4 else row[x]
    else:  # BI_RLE8 (1) / BI_RLE4 (2)
        i = x = y = 0
        def put(v):
            nonlocal x
            if x < w and y < H:
                px[y][x] = v
            x += 1
        while i + 1 < len(data):
            n, c = data[i], data[i + 1]
            i += 2
            if n:
                for k in range(n):
                    put(((c >> 4) if k % 2 == 0 else c & 15) if comp == 2 else c)
            elif c == 0:
                x, y = 0, y + 1
            elif c == 1:
                break
            elif c == 2:
                x, y = x + data[i], y + data[i + 1]
                i += 2
            else:
                nb = (c + 1) // 2 if comp == 2 else c
                for k in range(c):
                    put(((data[i + k // 2] >> 4) if k % 2 == 0 else data[i + k // 2] & 15) if comp == 2 else data[i + k])
                i += nb + (nb & 1)
    im = Image.new('RGBA', (w, H))
    for yy in range(H):
        for xx in range(w):
            col = pal[px[yy][xx]]
            im.putpixel((xx, H - 1 - yy if h > 0 else yy), col + ((0,) if key and col == key else (255,)))
    return im


# ---------------------------------------------------------------- build
def main():
    cells = {s: [] for s in SIZES}  # size -> [(name, image)]
    for name, (b, gid) in ICONS.items():
        imgs = group_images(b, gid)
        for s in SIZES:
            if s in imgs:
                cells[s].append((name, imgs[s]))
    for b, ids, key, names in STRIPS:
        for s, bid in ids.items():
            strip = bitmap(b, bid, key)
            for name, i in names.items():
                cells[s].append((name, strip.crop((i * s, 0, i * s + s, s))))
    for name, (b, bid, s) in BITMAPS.items():
        im = bitmap(b, bid)
        cell = Image.new('RGBA', (s, s))
        cell.alpha_composite(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
        cells[s].append((name, cell))
    out = os.path.join(ROOT, 'public', 'img', 'xp')
    os.makedirs(out, exist_ok=True)
    index = {}
    for s in SIZES:
        c = s + 2 * PAD
        rows = (len(cells[s]) + COLS - 1) // COLS
        sheet = Image.new('RGBA', (COLS * c, rows * c))
        for i, (name, im) in enumerate(cells[s]):
            sheet.alpha_composite(im, ((i % COLS) * c + PAD, (i // COLS) * c + PAD))
            index.setdefault(name, {})[s] = i
        sheet.save(os.path.join(out, f'xp{s}.webp'), lossless=True, quality=100, method=6, exact=True)
        print(f'xp{s}.webp', sheet.size, len(cells[s]), 'cells', os.path.getsize(os.path.join(out, f'xp{s}.webp')), 'bytes')
    dims = {s: [COLS * (s + 2 * PAD), ((len(cells[s]) + COLS - 1) // COLS) * (s + 2 * PAD)] for s in SIZES}
    js = ('// generated by tools/icons/xpicons.py: Windows XP icon art (assets-src/SOURCES.md section 11).\n'
          '// SHEETS: size -> [width, height] of public/img/xp/xp<size>.webp (cells of size + 4 px, the icon\n'
          f'// at +2, {COLS} columns); ICONS: name -> {{ size: cell index }}\n'
          f'export const COLS = {COLS}\nexport const PAD = {PAD}\n'
          f'export const SHEETS = {json.dumps(dims)}\n'
          'export const ICONS = {\n' + ''.join(f'  {json.dumps(n)}: {json.dumps(v, separators=(",", ": "))},\n' for n, v in index.items()) + '}\n')
    open(os.path.join(ROOT, 'src', 'os', 'xpSheet.js'), 'w').write(js)


main()
