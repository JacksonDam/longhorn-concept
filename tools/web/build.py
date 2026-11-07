#!/usr/bin/env python3
"""Make the 2003 Wayback snapshots of the OS's web sites static.

  python3 tools/web/build.py [site ...]
      -> public/web/<site>/ (index.html, a/*) and out/web/sources.json (page + every asset:
         original URL, Wayback capture used, local file or why it was dropped); downloads are
         cached (tools/web/wb.py: WB_CACHE, default out/web/cache), so a rerun fetches nothing new.
  WEB_OUT=dir puts the pages elsewhere. How a page is added: docs/briefs/os.md "Web pages".

Per page: scripts, noscript fallbacks, iframes, objects/embeds, XML data islands, <base>, meta
refresh and event-handler attributes go; trackers (web bugs, ad-impression pixels) go; scripts
that wrote fixed content are replaced by exactly what they wrote (SITES[...]['writes']); assets
(img / input image / background / stylesheets and their url()s) are fetched from the Wayback
Machine (raw id_ files, each from the capture nearest the page's) and pointed at local copies;
an asset that didn't archive becomes a transparent pixel of the same size (no broken image);
links and form actions become absolute original URLs (IE resolves them: an archived page or the
offline page).
"""
import hashlib, json, os, re, sys, html
from urllib.parse import urljoin, urlsplit, quote
import wb

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.environ.get('WEB_OUT') or os.path.join(ROOT, 'public', 'web')
SOURCES = os.path.join(ROOT, 'out', 'web', 'sources.json')

YAHOO_TIME = '<font color=black>9:03am PT, <nobr>Wed Oct 29</nobr></font>'
SITES = {
    'msn': dict(ts='20031029034300', url='http://www.msn.com/', writes={2: '<a href="#">Help</a>', 3: '<a href="#"><b>Make this my home page</b></a>'}),
    'yahoo': dict(ts='20031029090339', url='http://www.yahoo.com/', writes={8: YAHOO_TIME}),
    'google': dict(ts='20031029021055', url='http://www.google.com/'),
    # (css: IE6 layout that today's engines lay out otherwise, restored with the page's own numbers:
    # IE put an absolutely positioned table at its cell's top, beside the cell's 80 px spacer, so
    # the logo sprite fills the row; and stretched a 100%-high table to its row, the 947 px of the
    # page's left column, so the right column runs the page's height)
    'microsoft': dict(ts='20031030193257', url='http://www.microsoft.com/homepage/ms.htm',
                      css='td[height="80"] > table[style="position:absolute"] { margin-top: -80px }'),
    'ofoto': dict(ts='20031008163200', url='http://www.ofoto.com/Welcome.jsp',
                  writes={4: '<img src="http://content.ofoto.com:80/116039602_17000_090503/nonmember_home_photostack.jpg" width="232" height="236" border="0" alt="" ></a>'}),
    'windowsmedia': dict(ts='20030726031115', url='http://windowsmedia.com/Mediaguide/Home',
                         css='table.skycraper-background[height="100%"] { height: 947px }'),
    'hotmail': dict(ts='20030206075338', url='http://lc1.law13.hotmail.passport.com/cgi-bin/login'),
}
# web bugs and ad-impression pixels (removed with their tag)
TRACKERS = [r'//c\.msn\.com/c\.gif', r'msads\.net/ads/defaultads/TR\.gif', r'c\.microsoft\.com/trans_pixel', r'doubleclick\.net', r'//rd\.yahoo\.com/.*\.gif',
            r'//[a-z0-9.]*hitbox\.com', r'//[a-z0-9.]*webtrends', r'/spacer\.gif\?', r'//c\.ofoto\.com', r'//[a-z.]*atdmt\.com', r'//view\.atdmt', r'//[a-z0-9.]*2o7\.net',
            r'//sb\.google', r'//stats\.', r'//pixel\.', r'//m\.webtrends']

TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9:]*)((?:\s*[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?|\s*/(?!>))*)\s*(/?)>', re.S)
ATTR = re.compile(r'([^\s=/>]+)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+))?', re.S)
CSSURL = re.compile(r'url\(\s*([\'"]?)([^\'")]+)\1\s*\)', re.I)
CSSIMPORT = re.compile(r'@import\s+([\'"])([^\'"]+)\1', re.I)

BLANK_GIF = bytes.fromhex('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b')


def norm_asset(u):
    u = html.unescape(u.strip())
    s = urlsplit(u)
    # (characters a 2003 server took raw but a URL may not carry: percent-encode them for the fetch)
    return s._replace(path=quote(s.path, safe='/%:@!$&\'()*+,;=~-._'), query=quote(s.query, safe='=&%:@!$\'()*+,;/?~-._')).geturl()


# IE6's quirks-mode unitless lengths ("top:-111", "clip:rect(111 438 191 auto)"): today's engines
# drop some of them (clip), so they get their px
QUIRK_PROPS = r'(?:top|left|right|bottom|width|height|clip|margin(?:-\w+)?|padding(?:-\w+)?|font-size)'
def unitless(style):
    def fix(m):
        return m.group(1) + re.sub(r'(?<![\w.#-])(-?\d+(?:\.\d+)?)(?![\w.%])', lambda n: n.group(1) if n.group(1).lstrip('-') == '0' else n.group(1) + 'px', m.group(2))
    return re.sub(r'(\b' + QUIRK_PROPS + r'\s*:)([^;]*)', fix, style, flags=re.I)


class Site:
    def __init__(self, key, cfg):
        self.key, self.cfg = key, cfg
        self.ts, self.url = cfg['ts'], cfg['url']
        self.dir = os.path.join(OUT, key)
        os.makedirs(os.path.join(self.dir, 'a'), exist_ok=True)
        self.assets = {}  # original absolute URL -> record
        self.dropped = []

    # ---- assets ----
    def asset(self, url, kind):
        """original absolute URL -> local path (relative to the page) or None (didn't archive)."""
        if url in self.assets:
            return self.assets[url]['local']
        rec = {'url': url, 'kind': kind}
        self.assets[url] = rec
        if not url.startswith('http'):
            rec.update(local=None, why='not http')
            return None
        try:
            status, final, ctype, body = wb.get(f'https://web.archive.org/web/{self.ts}id_/{norm_asset(url)}')
        except RuntimeError as e:
            rec.update(local=None, why=str(e))
            return None
        m = re.search(r'/web/(\d{14})id_/', final)
        rec['capture'] = m.group(1) if m else None
        ok_type = ctype.startswith('image/') if kind == 'img' else ('css' in ctype or 'text/plain' in ctype)
        if (status != 200 or not ok_type) and re.match(r'https?://[^/]+:80/', url):
            # (the Wayback Machine filed some captures under the address without the default port)
            status, final, ctype, body = wb.get(f'https://web.archive.org/web/{self.ts}id_/{norm_asset(re.sub(r":80/", "/", url, 1))}')
            m = re.search(r'/web/(\d{14})id_/', final)
            rec['capture'] = m.group(1) if m else None
            ok_type = ctype.startswith('image/') if kind == 'img' else ('css' in ctype or 'text/plain' in ctype)
        if status != 200 or not body or not ok_type:
            rec.update(local=None, why=f'{status} {ctype[:30]}')
            return None
        if kind == 'css':
            body = self.css(body.decode('cp1252', 'replace'), url).encode('utf-8')
            ext = '.css'
        else:
            ext = {'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/pjpeg': '.jpg', 'image/png': '.png', 'image/x-icon': '.ico', 'image/bmp': '.bmp'}.get(ctype.split(';')[0].strip(), os.path.splitext(urlsplit(url).path)[1][:5] or '.img')
        name = 'a/' + hashlib.sha1(url.encode()).hexdigest()[:12] + ext
        open(os.path.join(self.dir, name), 'wb').write(body)
        rec.update(local=name, bytes=len(body), type=ctype)
        return name

    def blank(self):
        p = os.path.join(self.dir, 'a/blank.gif')
        if not os.path.exists(p):
            open(p, 'wb').write(BLANK_GIF)
        return 'a/blank.gif'

    def css(self, text, base, depth=0):
        def imp(m):
            loc = self.asset(urljoin(base, m.group(2)), 'css') if depth < 3 else None
            return f'@import "{loc[2:] if base != self.base else loc}"' if loc else ''
        text = CSSIMPORT.sub(imp, text)

        def rep(m):
            u = m.group(2).strip()
            if u.startswith('data:'):
                return m.group(0)
            loc = self.asset(urljoin(base, u), 'img')
            # (a stylesheet lives in a/, beside its images)
            return f"url('{loc[2:]}')" if loc and base != self.base else (f"url('{loc}')" if loc else 'none')
        return CSSURL.sub(rep, text)

    # ---- the page ----
    def build(self):
        status, final, ctype, body = wb.get(f'https://web.archive.org/web/{self.ts}id_/{self.url}')
        assert status == 200, (self.key, status)
        m = re.search(r'charset=([\w-]+)', ctype) or re.search(rb'charset=([\w-]+)', body[:2000])
        cs = (m.group(1) if isinstance(m.group(1), str) else m.group(1).decode()) if m else 'cp1252'
        cs = 'cp1252' if cs.lower() in ('iso-8859-1', 'latin1', 'us-ascii', 'windows-1252') else cs
        text = body.decode(cs, 'replace')
        self.base = self.url
        mb = re.search(r'<base\s[^>]*href\s*=\s*["\']?([^"\'\s>]+)', text, re.I)
        self.linkbase = urljoin(self.url, mb.group(1)) if mb else self.url

        # scripts: dropped, or replaced by what they wrote
        n = [0]
        writes = self.cfg.get('writes', {})

        def script(m):
            i = n[0]
            n[0] += 1
            return writes.get(i, '')
        text = re.sub(r'<script\b[^>]*>.*?</script\s*>', script, text, flags=re.S | re.I)
        self.scripts = n[0]
        for tag in ('noscript', 'iframe', 'object', 'applet', 'xml', 'layer', 'ilayer', 'noembed'):
            text = re.sub(rf'<{tag}\b[^>]*>.*?</{tag}\s*>', '', text, flags=re.S | re.I)
        text = re.sub(r'<embed\b[^>]*>', '', text, flags=re.I)
        text = re.sub(r'<base\b[^>]*>', '', text, flags=re.I)
        text = re.sub(r'<meta\b[^>]*http-equiv\s*=\s*["\']?(refresh|content-type|expires|pics-label)[^>]*>', '', text, flags=re.I)
        text = re.sub(r'<link\b[^>]*rel\s*=\s*["\']?(shortcut icon|icon)[^>]*>', '', text, flags=re.I)
        # <style> blocks: their url()s
        text = re.sub(r'(<style\b[^>]*>)(.*?)(</style\s*>)', lambda m: m.group(1) + self.css(m.group(2), self.base) + m.group(3), text, flags=re.S | re.I)
        text = TAG.sub(self.tag, text)
        head = ('<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; '
                'frame-src \'none\'; form-action \'none\'; connect-src \'none\'">\n')
        if self.cfg.get('css'):
            head += '<style>/* IE6 layout */ ' + self.cfg['css'] + '</style>\n'
        mh = re.search(r'<head\b[^>]*>', text, re.I)
        text = text[:mh.end()] + '\n' + head + text[mh.end():] if mh else head + text
        open(os.path.join(self.dir, 'index.html'), 'w', encoding='utf-8').write(text)
        mt = re.search(r'<title[^>]*>(.*?)</title', text, re.S | re.I)
        self.title = html.unescape(re.sub(r'\s+', ' ', mt.group(1)).strip()) if mt else ''
        return self

    def tag(self, m):
        close, name, attrs_s, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if close:
            return m.group(0)
        lname = name.lower()
        attrs = [(a.group(1), a.group(2)) for a in ATTR.finditer(attrs_s)]
        val = lambda raw: html.unescape(raw[1:-1] if raw and raw[:1] in '"\'' else (raw or ''))
        get = lambda k: next((val(v) for a, v in attrs if a.lower() == k), None)
        out = []
        # IE6 in quirks mode ignores a cell's nowrap when the cell has a pixel width (the pages
        # were laid out for it: Hotmail's left column wraps its text); today's engines don't
        quirk_nowrap = lname in ('td', 'th') and re.fullmatch(r'\s*\d+\s*', get('width') or '') is not None
        for a, raw in attrs:
            la = a.lower()
            if la.startswith('on'):
                continue
            if quirk_nowrap and la == 'nowrap':
                continue
            v = val(raw) if raw is not None else None
            if v is not None and la in ('src', 'lowsrc', 'background') and lname in ('img', 'input', 'body', 'table', 'td', 'th', 'tr', 'image'):
                absu = urljoin(self.base, v.strip())
                if any(re.search(p, absu) for p in TRACKERS):
                    if lname == 'img':
                        self.dropped.append(('tracker', absu))
                        return ''
                    continue
                if la == 'lowsrc':
                    continue
                loc = self.asset(absu, 'img')
                if loc is None and lname in ('img', 'input', 'image'):
                    self.dropped.append(('missing', absu))
                    loc = self.blank()
                if loc is None:
                    self.dropped.append(('missing background', absu))
                    continue
                v = loc
            elif v is not None and la == 'href' and lname == 'link':
                rel = (get('rel') or '').lower()
                if 'stylesheet' not in rel:
                    return ''
                loc = self.asset(urljoin(self.base, v.strip()), 'css')
                if loc is None:
                    self.dropped.append(('missing css', urljoin(self.base, v)))
                    return ''
                v = loc
            elif v is not None and la == 'href' and lname in ('a', 'area'):
                v = '#' if v.strip().lower().startswith('javascript:') else urljoin(self.linkbase, v.strip())
            elif v is not None and la == 'action' and lname == 'form':
                v = urljoin(self.linkbase, v.strip()) if not v.strip().lower().startswith('javascript:') else '#'
            elif v is not None and la == 'style':
                v = unitless(self.css(v, self.base))
            if v is None:
                out.append(a)
            else:
                out.append(f'{a}="{html.escape(v, quote=True)}"')
        return '<' + name + (' ' + ' '.join(out) if out else '') + (' /' if selfclose else '') + '>'


def main(keys):
    os.makedirs(os.path.dirname(SOURCES), exist_ok=True)
    allsrc = json.load(open(SOURCES)) if os.path.exists(SOURCES) else {}
    for k in keys or SITES:
        s = Site(k, SITES[k]).build()
        size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(s.dir) for f in fs)
        got = [r for r in s.assets.values() if r.get('local')]
        miss = [r for r in s.assets.values() if not r.get('local')]
        print(f'{k}: "{s.title}" {s.scripts} scripts removed, {len(got)} assets, {len(miss)} missing, {len([d for d in s.dropped if d[0] == "tracker"])} trackers, {size / 1024:.0f} KB')
        for r in miss:
            print('   missing', r['url'][:110], r.get('why'))
        allsrc[k] = {'page': s.url, 'timestamp': s.ts, 'title': s.title, 'assets': list(s.assets.values()), 'dropped': s.dropped, 'kb': round(size / 1024)}
    json.dump(allsrc, open(SOURCES, 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
