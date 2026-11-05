// The logged-in user's name for the apps. os/session.js (owned by the shell) provides
// currentUser(t); until it exists the video's user, Sondra, is assumed.
let session = null
const mods = import.meta.glob('../../os/session.js', { eager: true })
for (const m of Object.values(mods)) session = m

export function userName(t) {
  return session?.currentUser?.(t)?.name || 'Sondra'
}
export function userEmail(t) {
  const u = session?.currentUser?.(t)
  return u?.email || `${(u?.name || 'Sondra').toLowerCase()}@hotmail.com`
}
