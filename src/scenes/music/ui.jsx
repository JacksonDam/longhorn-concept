// Small layout helpers for the my Music window (window-local px).
export const FONT = "'Libre Franklin', 'Plex', Tahoma, sans-serif"
export const HEAVY = "'Franklin Gothic', 'Libre Franklin', sans-serif"

// Text placed by its baseline: (x, y) = left end of the baseline, like SVG <text>.
// parts: string or [[text, style], ...] runs (style: { w: weight, c: colour, f: family, ls }).
// sx: horizontal glyph scale. Libre Franklin is ~10% wider than the video's ITC Franklin Gothic.
export const SX = 0.9
export function Txt({ x, y, size = 12, w = 400, c = '#000', f = FONT, ls = 0, sx = SX, anchor = 'start', parts, children, style, op }) {
  const runs = parts || [[children, {}]]
  return (
    <svg
      width="1"
      height="1"
      style={{ position: 'absolute', left: x, top: y, overflow: 'visible', pointerEvents: 'none', opacity: op, ...style }}
    >
      <text x="0" y="0" transform={sx !== 1 ? `scale(${sx},1)` : undefined} fontFamily={f} fontSize={size} fontWeight={w} fill={c} letterSpacing={ls} textAnchor={anchor}>
        {runs.map(([s, st = {}], i) => (
          <tspan
            key={i}
            fontWeight={st.w}
            fill={st.c}
            fontFamily={st.f}
            fontSize={st.size}
            letterSpacing={st.ls}
            dx={st.dx}
          >
            {s}
          </tspan>
        ))}
      </text>
    </svg>
  )
}

export const abs = (x, y, w, h, extra) => ({ position: 'absolute', left: x, top: y, width: w, height: h, ...extra })
