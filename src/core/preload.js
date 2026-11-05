// Image preloading so the first appearance of any asset is instant (and so the capture
// tool can wait until everything has decoded). Call preload([...urls]) at module level for
// every image a scene uses, including CSS background images.
const pending = new Map()

export function preload(urls) {
  for (const url of urls) {
    if (pending.has(url)) continue
    const img = new Image()
    img.src = url
    pending.set(url, img.decode().catch(() => {}))
  }
}

export function preloaded() {
  return Promise.all(pending.values())
}

// public/ asset URL helper (respects the Vite base path)
export const asset = (p) => import.meta.env.BASE_URL + p.replace(/^\//, '')
