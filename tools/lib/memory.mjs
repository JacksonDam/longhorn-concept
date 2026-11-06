// Memory of a Chrome launched by a tool (macOS): the physical footprint (phys_footprint, what the
// OS counts against a process and what iOS kills tabs over; on Apple silicon it includes the GPU
// allocations: textures, IOSurfaces, Metal buffers) of its renderer and GPU processes, sampled
// every 100 ms by a small sampler, plus each process's own lifetime maximum.
//
//   const mem = memorySampler(chrome.pid)
//   ... run the scenario ...
//   const m = await mem.stop()   // { peak, renderer, gpu, end } in MB (peak: of renderer + GPU)
import { spawn } from 'node:child_process'

const SAMPLER = String.raw`
import ctypes, json, subprocess, sys, time
lib = ctypes.CDLL('/usr/lib/libproc.dylib')
class RU(ctypes.Structure):
    _fields_ = [('uuid', ctypes.c_uint8 * 16), ('v', ctypes.c_uint64 * 40)]
def usage(pid):
    r = RU()
    if lib.proc_pid_rusage(pid, 4, ctypes.byref(r)) != 0: return None
    return r.v[7], r.v[28]   # ri_phys_footprint, ri_lifetime_max_phys_footprint
root = int(sys.argv[1]); dt = float(sys.argv[2])
kids = {}; scan = 0
peak = {'total': 0, 'renderer': 0, 'gpu': 0}; life = {}; last = None
def rescan():
    out = subprocess.run(['ps', '-A', '-o', 'pid=,ppid=,command='], capture_output=True, text=True).stdout
    procs = [l.split(None, 2) for l in out.splitlines() if l.strip()]
    found = {}
    for p in procs:
        if len(p) < 3 or int(p[1]) != root: continue
        cmd = p[2]
        kind = 'gpu' if '--type=gpu-process' in cmd else 'renderer' if '--type=renderer' in cmd else None
        if kind: found[int(p[0])] = kind
    return found
while True:
    if time.time() - scan > 1:
        kids = rescan(); scan = time.time()
    now = {'renderer': 0, 'gpu': 0}
    for pid, kind in list(kids.items()):
        u = usage(pid)
        if u is None: continue
        now[kind] += u[0]
        life[pid] = (kind, u[1])
    tot = now['renderer'] + now['gpu']
    last = {'renderer': now['renderer'], 'gpu': now['gpu'], 'total': tot}
    if tot > peak['total']: peak = {'total': tot, 'renderer': now['renderer'], 'gpu': now['gpu']}
    sys.stdout.write(json.dumps({'peak': peak, 'last': last, 'life': {k: v for k, v in life.items()}}) + '\n')
    sys.stdout.flush()
    time.sleep(dt)
`

const MB = (b) => Math.round(b / 1048576)

export function memorySampler(browserPid, { interval = 0.1 } = {}) {
  const p = spawn('python3', ['-I', '-c', SAMPLER, String(browserPid), String(interval)], { stdio: ['ignore', 'pipe', 'ignore'] })
  let line = ''
  let latest = null
  p.stdout.on('data', (d) => {
    line += d
    const parts = line.split('\n')
    line = parts.pop()
    if (parts.length) latest = parts[parts.length - 1]
  })
  return {
    // the current reading (MB): { total, renderer, gpu }
    now() {
      if (!latest) return null
      const s = JSON.parse(latest)
      return { total: MB(s.last.total), renderer: MB(s.last.renderer), gpu: MB(s.last.gpu) }
    },
    async stop() {
      await new Promise((r) => setTimeout(r, interval * 1000 * 2))
      p.kill()
      if (!latest) return null
      const s = JSON.parse(latest)
      let lifeR = 0, lifeG = 0
      for (const [kind, v] of Object.values(s.life)) kind === 'gpu' ? (lifeG += v) : (lifeR += v)
      return {
        peak: MB(s.peak.total), peakRenderer: MB(s.peak.renderer), peakGpu: MB(s.peak.gpu),
        end: MB(s.last.total), lifeRenderer: MB(lifeR), lifeGpu: MB(lifeG),
      }
    },
  }
}

export const fmtMem = (m) => (m ? `mem peak ${m.peak} MB (renderer ${m.peakRenderer} + GPU ${m.peakGpu}), end ${m.end} MB` : 'mem n/a')
