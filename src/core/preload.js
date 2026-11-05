// Image preloading so the first appearance of any asset is instant (and so the capture
// tool can wait until everything has decoded). Call preload([...urls]) at module level for
// every image a scene uses, including CSS background images. The boot (core/boot.js) also
// preloads every file under public/img before the clock starts.
const pending = new Map()

export function preload(urls) {
  for (const url of urls) {
    if (pending.has(url)) continue
    const img = new Image()
    img.src = url
    pending.set(url, img.decode().catch(() => {}))
  }
}

// register any other async asset (fetched data, decoded atlases) the first frame depends on
let extra = 0
export function waitFor(promise) {
  pending.set('promise:' + extra++, Promise.resolve(promise).catch(() => {}))
}

// resolves once everything registered so far (and anything registered while waiting) is ready
export async function preloaded() {
  let n
  do {
    n = pending.size
    await Promise.all(pending.values())
  } while (pending.size !== n)
}

// public/ asset URL helper (respects the Vite base path)
export const asset = (p) => import.meta.env.BASE_URL + p.replace(/^\//, '')
