#!/usr/bin/env python3
"""Polite, cached Wayback Machine fetcher (tools/web/build.py uses it; docs/briefs/os.md).

One request at a time, >= GAP s apart, exponential back-off on 429 / 5xx / network errors.
Every response (body + final URL + status + content type) is cached under CACHE, keyed by the
requested URL, so a rerun never fetches twice.

  wb.py cdx <url> [from] [to]        -> CDX rows (timestamp original statuscode mimetype length)
  wb.py get <url>                    -> fetch (or read cached), print status / final url / size
  import wb; wb.get(url) -> (status, final_url, content_type, bytes)
"""
import hashlib, json, os, subprocess, sys, time

# the download cache: WB_CACHE, else out/web/cache in the repository (gitignored)
CACHE = os.environ.get('WB_CACHE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'out', 'web', 'cache')
GAP = 2.0
UA = 'Mozilla/5.0 (research; longhorn-concept page archive; one request at a time)'
_last = [0.0]
os.makedirs(CACHE, exist_ok=True)


def _key(url):
    return os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())


def cached(url):
    k = _key(url)
    if os.path.exists(k + '.json'):
        meta = json.load(open(k + '.json'))
        body = open(k + '.bin', 'rb').read() if os.path.exists(k + '.bin') else b''
        return meta['status'], meta['final'], meta['type'], body
    return None


def get(url, tries=7, quiet=False):
    c = cached(url)
    if c:
        return c
    delay = 20
    for attempt in range(tries):
        wait = _last[0] + GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        # (curl: it trusts the system keychain, which this machine's TLS proxy needs)
        tmp = _key(url) + '.part'
        try:
            out = subprocess.run(['curl', '-sS', '-g', '-L', '--max-redirs', '8', '--max-time', '90', '-A', UA, '-o', tmp,
                                  '-w', '%{http_code} %{url_effective} %{content_type}', url], capture_output=True, text=True, timeout=120)
            parts = out.stdout.strip().split(' ', 2)
            if out.returncode == 47:  # a redirect loop (the Wayback's own, for some files): a final answer
                parts, out.returncode = ['310', url, ''], 0
            if out.returncode != 0 or len(parts) < 2:
                raise RuntimeError(f'curl {out.returncode} {out.stderr.strip()[:200]}')
            status, final = int(parts[0]), parts[1]
            ctype = parts[2] if len(parts) > 2 else ''
            body = open(tmp, 'rb').read() if os.path.exists(tmp) else b''
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception as e:  # network error: back off
            if not quiet:
                print(f'  ! {e} on {url}; waiting {delay}s', file=sys.stderr)
            time.sleep(delay)
            delay = min(delay * 2, 300)
            continue
        if status == 429 or status >= 500:
            if not quiet:
                print(f'  ! {status} on {url}; waiting {delay}s', file=sys.stderr)
            time.sleep(delay)
            delay = min(delay * 2, 300)
            continue
        k = _key(url)
        open(k + '.bin', 'wb').write(body)
        json.dump({'url': url, 'status': status, 'final': final, 'type': ctype, 'size': len(body), 'at': time.time()}, open(k + '.json', 'w'))
        return status, final, ctype, body
    raise RuntimeError('gave up on ' + url)


def cdx(url, frm='2003', to='2003'):
    q = f'https://web.archive.org/cdx/search/cdx?url={url}&from={frm}&to={to}&output=json&fl=timestamp,original,statuscode,mimetype,length'
    status, final, ctype, body = get(q)
    if status != 200:
        return []
    rows = json.loads(body or b'[]')
    return rows[1:] if rows else []


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'cdx':
        for row in cdx(*sys.argv[2:]):
            print(' '.join(row))
    elif cmd == 'get':
        s, f, t, b = get(sys.argv[2])
        print(s, f, t, len(b))
