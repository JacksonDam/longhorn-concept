// Catmull-Rom keyframe tracks over frames (shared by the window system and apps).
// Catmull-Rom through rows [[f, v0, v1, ...], ...] sorted by f (clamped at both ends)
export function table(rows) {
  return (f) => {
    if (f <= rows[0][0]) return rows[0].slice(1)
    const n = rows.length
    if (f >= rows[n - 1][0]) return rows[n - 1].slice(1)
    let i = 1
    while (rows[i][0] < f) i++
    const a = rows[Math.max(0, i - 2)], b = rows[i - 1], c = rows[i], d = rows[Math.min(n - 1, i + 1)]
    const u = (f - b[0]) / (c[0] - b[0])
    const out = []
    for (let j = 1; j < b.length; j++) {
      const m1 = (c[j] - a[j]) / Math.max(1e-6, c[0] - a[0]) * (c[0] - b[0])
      const m2 = (d[j] - b[j]) / Math.max(1e-6, d[0] - b[0]) * (c[0] - b[0])
      const u2 = u * u, u3 = u2 * u
      out.push((2 * u3 - 3 * u2 + 1) * b[j] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * c[j] + (u3 - u2) * m2)
    }
    return out
  }
}
