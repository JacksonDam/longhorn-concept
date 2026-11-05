import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// `virtual:boot-assets`: every file under public/img (paths relative to public/), so the boot
// (src/core/boot.js) fetches and decodes all of them before the OS's clock starts.
// The built index.html also preloads the font files (they otherwise load only when text first
// uses them, after the bundle has run) and marks the entry script data-cfasync="false": the live
// site's CDN (Cloudflare) runs Rocket Loader, which rewrites module scripts and runs them late.
function boot() {
  const ID = 'virtual:boot-assets'
  const RID = '\0' + ID
  const pub = join(import.meta.dirname, 'public')
  let base = '/'
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name.startsWith('.') ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
  return {
    name: 'longhorn-boot',
    configResolved: (c) => void (base = c.base),
    resolveId: (id) => (id === ID ? RID : null),
    load: (id) => (id === RID ? `export default ${JSON.stringify(walk(join(pub, 'img')).map((f) => relative(pub, f).split('\\').join('/')).sort())}` : null),
    configureServer(server) {
      // a file added to or removed from public/img changes the list
      const update = (f) => {
        if (!f.startsWith(join(pub, 'img'))) return
        const m = server.moduleGraph.getModuleById(RID)
        if (m) server.reloadModule(m)
      }
      server.watcher.on('add', update)
      server.watcher.on('unlink', update)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        html = html.replace(/<script type="module"/g, '<script type="module" data-cfasync="false"')
        if (!ctx.bundle) return html
        const fonts = Object.keys(ctx.bundle).filter((f) => /\.woff2?$/.test(f))
        const links = fonts.map((f) => `<link rel="preload" as="font" type="font/${f.endsWith('2') ? 'woff2' : 'woff'}" crossorigin href="${base}${f}">`)
        return html.replace('</head>', `  ${links.join('\n    ')}\n  </head>`)
      },
    },
  }
}

export default defineConfig({
  base: '/longhorn-concept/',
  plugins: [react(), boot()],
})
