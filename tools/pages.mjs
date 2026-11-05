// A local stand-in for the live host (GitHub Pages behind the jacksondam.com CDN), for cold-start
// measurements that include the network: HTTP/2 over TLS (self-signed; Chrome needs
// --ignore-certificate-errors), gzip for text, the live site's cache headers (index.html
// max-age=600, everything else max-age=14400), ETag / Last-Modified with 304s. `vite preview`
// sends Cache-Control: no-cache and no compression, so a warm run there revalidates every file
// and a throttled run downloads the bundle uncompressed.
//
// usage: node tools/pages.mjs [--dir dist] [--port 5311] [--base /longhorn-concept/]
import { createSecureServer } from 'node:http2'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, normalize, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const root = resolve(opt('--dir', 'dist'))
const port = +opt('--port', 5311)
const base = opt('--base', '/longhorn-concept/')

const here = fileURLToPath(new URL('.', import.meta.url))
const certDir = join(here, '..', 'out', 'pages-cert')
const key = join(certDir, 'key.pem'), cert = join(certDir, 'cert.pem')
if (!existsSync(key)) {
  mkdirSync(certDir, { recursive: true })
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '365', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' })
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.json': 'application/json', '.map': 'application/json',
}
const GZIP = new Set(['.html', '.js', '.css', '.svg', '.json', '.map'])
const cache = new Map()
function load(file) {
  const st = statSync(file)
  let c = cache.get(file)
  if (!c || c.mtime !== st.mtimeMs) {
    const body = readFileSync(file)
    const ext = extname(file)
    c = { mtime: st.mtimeMs, body, gz: GZIP.has(ext) ? gzipSync(body, { level: 9 }) : null, type: TYPES[ext] || 'application/octet-stream',
      etag: `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`, modified: new Date(st.mtimeMs).toUTCString() }
    cache.set(file, c)
  }
  return c
}

const server = createSecureServer({ key: readFileSync(key), cert: readFileSync(cert), allowHTTP1: true }, (req, res) => {
  const url = new URL(req.url, 'https://x')
  let p = decodeURIComponent(url.pathname)
  if (!p.startsWith(base)) return res.writeHead(404).end()
  p = normalize(p.slice(base.length)).replace(/^(\.\.[/\\])+/, '')
  let file = join(root, p)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return res.writeHead(404).end('not found')
  const c = load(file)
  const headers = {
    'content-type': c.type, etag: c.etag, 'last-modified': c.modified, vary: 'Accept-Encoding',
    'cache-control': file.endsWith('.html') ? 'max-age=600' : 'max-age=14400', 'access-control-allow-origin': '*',
  }
  if (req.headers['if-none-match'] === c.etag) return res.writeHead(304, headers).end()
  const gz = c.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')
  if (gz) headers['content-encoding'] = 'gzip'
  const body = gz ? c.gz : c.body
  headers['content-length'] = body.length
  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
})
server.listen(port, '127.0.0.1', () => console.log(`pages: https://127.0.0.1:${port}${base} serving ${root}`))
