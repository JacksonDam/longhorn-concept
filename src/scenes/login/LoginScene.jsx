// Placeholder: login screen (framework smoke test until the real scene lands).
import { useTime } from '../../core/time.jsx'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { Slab3D } from '../../gl/Slab3D.jsx'

export const LOGIN_EXIT = 1.2 // seconds the login layer stays after login.submit

export function LoginScene() {
  const t = useTime()
  const k = (t % 2) / 2
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#0a1fb0,#3d8ff0)' }}>
      <MotionBlur
        t={t}
        moving
        samples={8}
        shutter={1 / 30}
        style={{ left: 0, top: 0, width: 960, height: 720 }}
        pose={(tt) => ({ transform: `translate(${100 + ((tt % 2) / 2) * 700}px, 100px)` })}
      >
        <div style={{ width: 80, height: 80, background: '#fff', borderRadius: 8 }} />
      </MotionBlur>
      <Slab3D
        width={960}
        height={720}
        moving
        samples={8}
        shutter={1 / 30}
        items={[
          {
            slab: { w: 90, h: 90, d: 18, tint: [0.9, 0.6, 0.3] },
            pose: (tt) => ({ x: 300 + k * 300, y: 400, ry: tt * 6, rx: 0.2 }),
          },
        ]}
      />
    </div>
  )
}
