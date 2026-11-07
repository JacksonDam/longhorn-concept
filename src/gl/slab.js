// Shared three.js renderer for the glassy 3D tiles ("slabs"): the login user tile, the
// my Music header device and album covers. One hidden WebGL canvas renders every slab;
// each <Slab3D> owns a 2D canvas in the DOM and receives a copy, so slabs live inside
// normal DOM layout (and inside DOM motion-blur copies) without one GL context each.
//
// Motion blur: when a slab moves, `samples` sub-frame poses are rendered and averaged in
// a half-float accumulation target (premultiplied alpha), like the video's multi-sample
// blur. Colour management is off: textures and shader maths stay in sRGB, like CSS.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

THREE.ColorManagement.enabled = false

const MAX = 2048 // largest render (px per side)

// A GL context and its render targets: { renderer, canvas, rt }. The shared one (hidden, its
// renders copied into 2D canvases: the login's slabs) and each SlabView's own (a visible canvas).
function makeGl(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    premultipliedAlpha: true,
    // the default framebuffer only receives the already-antialiased accumulation (pixel-aligned
    // quads): no MSAA resolve or preserved buffer per frame
    antialias: false,
    preserveDrawingBuffer: false,
  })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(1)
  renderer.setSize(canvas.width, canvas.height, false)
  renderer.autoClear = false
  return { renderer, canvas, rt: new Map() }
}
// The shared GL context: its drawing buffer is sized for the renders in use (the largest render
// target size), not MAX x MAX (16 MB plus depth for a 2048 square). Render targets are kept per
// size (the login's full-stage slab canvas): freeing and reallocating the login's ~200 MB of
// multisampled targets stalls a frame for hundreds of ms.
let shared = null
function sharedGl() {
  if (shared) return shared
  const c = document.createElement('canvas')
  c.width = c.height = 1
  return (shared = makeGl(c))
}
const getRenderer = () => sharedGl().renderer

// ---------------------------------------------------------------- textures
const texCache = new Map()
export function loadTexture(url) {
  if (!url) return null
  let tex = texCache.get(url)
  if (!tex) {
    tex = new THREE.TextureLoader().load(url, () => {
      tex.userData.ready = true
    })
    tex.colorSpace = THREE.NoColorSpace
    tex.anisotropy = 8
    tex.minFilter = THREE.LinearMipmapLinearFilter
    texCache.set(url, tex)
  }
  return tex
}
// optional: a live 2D canvas as the picture (slab.canvas); bump slab.canvasVersion after redrawing it
const canvasTex = new WeakMap()
function canvasTexture(canvas, version = 0) {
  let tex = canvasTex.get(canvas)
  if (!tex) {
    tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.NoColorSpace
    tex.anisotropy = 8
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.userData.version = version
    canvasTex.set(canvas, tex)
  } else if (tex.userData.version !== version) {
    tex.userData.version = version
    tex.needsUpdate = true
  }
  return tex
}
export const textureReady = (url) => !url || !!texCache.get(url)?.userData.ready

// A face drawn on the GPU (slab.face: { key, size, base, over, rects }, music/device.js deviceFace):
// the still base canvas, the cells (rects: [x, y, w, h, r, g, b, a] in face px, straight alpha,
// drawn over in order) and the still `over` canvas, into a target with mipmaps, one per GL context,
// redrawn when its key changes (the cells' edges aren't antialiased: the slab shows the face at a
// quarter of its size or less, through its mipmaps). Nothing is uploaded but the two still canvases,
// once. (The canvas faces upload on every change: canvasTexture.)
const FACE_V = 'attribute vec4 aCol; varying vec4 vCol; varying vec2 vUv; void main(){ vCol = aCol; vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
const FACE_F = 'varying vec4 vCol; varying vec2 vUv; uniform sampler2D uTex; uniform float uUseTex; void main(){ gl_FragColor = uUseTex > 0.5 ? texture2D(uTex, vUv) : vCol; }'
function faceTexture(gl, face) {
  if (!gl.faces) gl.faces = new Map()
  let f = gl.faces.get(face.base)
  if (!f) {
    const rt = new THREE.WebGLRenderTarget(face.size, face.size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter })
    rt.texture.anisotropy = 8
    rt.texture.colorSpace = THREE.NoColorSpace
    const mat = (tex) =>
      new THREE.ShaderMaterial({
        uniforms: { uTex: { value: tex }, uUseTex: { value: tex ? 1 : 0 } },
        vertexShader: FACE_V,
        fragmentShader: FACE_F,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      })
    const quad = () => {
      const g = new THREE.PlaneGeometry(2, 2)
      g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(16), 4))
      return g
    }
    const base = new THREE.Mesh(quad(), mat(canvasTexture(face.base, 0)))
    base.material.blending = THREE.NoBlending
    const over = new THREE.Mesh(quad(), mat(canvasTexture(face.over, 0)))
    const cells = new THREE.Mesh(new THREE.BufferGeometry(), mat(null))
    for (const m of [base, cells, over]) m.frustumCulled = false
    base.renderOrder = 0
    cells.renderOrder = 1
    over.renderOrder = 2
    const scene = new THREE.Scene()
    scene.add(base, cells, over)
    f = { rt, scene, cells, cam: new THREE.Camera(), key: null }
    gl.faces.set(face.base, f)
  }
  if (f.key !== face.key) {
    f.key = face.key
    const n = face.rects.length / 8
    const pos = new Float32Array(n * 18), col = new Float32Array(n * 24)
    const S = face.size
    for (let i = 0; i < n; i++) {
      const [x, y, w, h, r, g, b, a] = face.rects.slice(i * 8, i * 8 + 8)
      const x0 = (x / S) * 2 - 1, x1 = ((x + w) / S) * 2 - 1, y0 = 1 - (y / S) * 2, y1 = 1 - ((y + h) / S) * 2
      pos.set([x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0], i * 18)
      for (let k = 0; k < 6; k++) col.set([r, g, b, a], i * 24 + k * 4)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aCol', new THREE.BufferAttribute(col, 4))
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 12), 2))
    f.cells.geometry.dispose()
    f.cells.geometry = geo
    const r = gl.renderer
    r.setRenderTarget(f.rt)
    r.setViewport(0, 0, S, S)
    r.setClearColor(0x000000, 0)
    r.clear(true, true, true)
    r.render(f.scene, f.cam)
  }
  return f.rt.texture
}
export function texturesReady() {
  return new Promise((resolve) => {
    const check = () => ([...texCache.values()].every((t) => t.userData.ready) ? resolve(true) : setTimeout(check, 30))
    check()
  })
}

// ---------------------------------------------------------------- slab material
const vert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalL;   // object-space normal
  varying vec3 vPosL;      // object-space position
  varying vec3 vNormalV;   // view-space normal
  varying vec3 vViewDir;   // view-space direction to the eye
  uniform vec3 uSize;
  void main() {
    vPosL = position;
    vNormalL = normal;
    vUv = position.xy / uSize.xy + 0.5;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalL;
  varying vec3 vPosL;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uTint;        // colour when no map
  uniform vec3 uSize;
  uniform float uOpacity;
  uniform vec3 uEdgeColor;   // glass edge tint
  uniform float uEdgeMix;    // how much the edge shows the picture vs tint
  uniform float uSpec;       // strength of the environment reflection
  uniform float uBandPos;    // horizontal position of the bright softbox reflection
  uniform float uBandWidth;
  uniform float uRim;        // fresnel rim brightness
  uniform float uBrightness;
  // optional picture grading + glass look (defaults keep the plain look)
  uniform float uSat;        // picture saturation (1 = as is)
  uniform float uContrast;   // picture contrast about 0.5
  uniform vec3 uLift;        // added after grading (0..1)
  uniform float uVignette;   // darkening of the face towards its rounded border (refraction)
  uniform vec3 uVigColor;
  uniform float uBandGain;   // extra brightness of the softbox band on the face only
  uniform vec3 uFaceBand;    // explicit light band on the face: u centre, width, intensity
  uniform float uFlipBack;   // 1: the back face reads the picture the right way round; 0: see-through glass (mirrored)
  void main() {
    vec3 nL = normalize(vNormalL);
    float front = smoothstep(0.55, 0.95, nL.z);
    float back = smoothstep(0.55, 0.95, -nL.z);
    vec2 uv = vUv;
    if (back > 0.5 && uFlipBack > 0.5) uv.x = 1.0 - uv.x;
    vec3 pic = uHasMap > 0.5 ? texture2D(uMap, clamp(uv, 0.002, 0.998)).rgb : uTint;
    float luma = dot(pic, vec3(0.299, 0.587, 0.114));
    pic = vec3(luma) + (pic - vec3(luma)) * uSat;
    pic = (pic - 0.5) * uContrast + 0.5 + uLift;
    vec3 side = mix(uEdgeColor, pic * 0.55 + uEdgeColor * 0.25, uEdgeMix);
    float faceMask = max(front, back);
    // the bevel refracts the picture darker towards the face border
    vec2 e = abs(vUv * 2.0 - 1.0);
    float border = smoothstep(0.78, 1.0, max(e.x, e.y));
    pic = mix(pic, uVigColor, uVignette * border);
    vec3 col = mix(side, pic, faceMask) * uBrightness;

    // environment: a vertical softbox reflected in the glossy surface
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    vec3 r = reflect(-v, n);
    float band = exp(-pow((r.x - uBandPos) / max(uBandWidth, 1e-3), 2.0)) * smoothstep(-0.9, 0.2, r.y);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += uSpec * band * (1.0 + uBandGain * faceMask) * vec3(1.0);
    if (uFaceBand.z > 0.0) {
      float fu = (vUv.x - uFaceBand.x) / max(uFaceBand.y, 1e-3);
      col += uFaceBand.z * exp(-fu * fu) * faceMask * vec3(1.0, 0.97, 0.95);
    }
    col += uRim * fres * vec3(0.85, 0.92, 1.0);
    gl_FragColor = vec4(col * uOpacity, uOpacity);
  }
`

function makeMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    premultipliedAlpha: true,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uTint: { value: new THREE.Color(0.3, 0.5, 0.9) },
      uSize: { value: new THREE.Vector3(1, 1, 1) },
      uOpacity: { value: 1 },
      uEdgeColor: { value: new THREE.Color(0.08, 0.1, 0.16) },
      uEdgeMix: { value: 0.6 },
      uSpec: { value: 0.55 },
      uBandPos: { value: -0.35 },
      uBandWidth: { value: 0.18 },
      uRim: { value: 0.6 },
      uBrightness: { value: 1 },
      uSat: { value: 1 },
      uContrast: { value: 1 },
      uLift: { value: new THREE.Vector3(0, 0, 0) },
      uVignette: { value: 0 },
      uVigColor: { value: new THREE.Color(0.05, 0.06, 0.12) },
      uBandGain: { value: 0 },
      uFaceBand: { value: new THREE.Vector3(0.5, 0.2, 0) },
      uFlipBack: { value: 1 },
    },
  })
}

// ---------------------------------------------------------------- per-slab scene
const geoCache = new Map()
function geometry(w, h, d, r) {
  const key = [w, h, d, r].join(',')
  let g = geoCache.get(key)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 6, r)
    geoCache.set(key, g)
  }
  return g
}

const accumQuad = (() => {
  let q
  return () => {
    if (q) return q
    const mat = new THREE.ShaderMaterial({
      // (uUv: the part of the target the render covers, see targets)
      uniforms: { uTex: { value: null }, uScale: { value: 1 }, uUv: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 vUv; uniform vec2 uUv; void main(){ vUv = uv * uUv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform sampler2D uTex; uniform float uScale; void main(){ gl_FragColor = texture2D(uTex, vUv) * uScale; }',
      depthTest: false,
      depthWrite: false,
      transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    const scene = new THREE.Scene()
    scene.add(mesh)
    q = { mat, scene, cam: new THREE.Camera() }
    return q
  }
})()

// Render targets come in a few sizes, 256 px steps, the render using their bottom-left part: a
// canvas whose size changes every frame (the login's slab canvas, cropped to its slabs) reuses
// one pair instead of allocating one per size, which grew GPU memory frame by frame and with it
// the state a frame was drawn in (a frame then rendered differently after others than alone).
// The three most recently used sizes stay allocated.
// (slot: a second accumulation target of the same size, for a render kept while another is made:
// a SlabView's slab and its reflection; they share the multisampled one)
const STEP_PX = 256
const KEEP = 3
function targets(gl, pw, ph, slot = 0) {
  const rtCache = gl.rt // size -> { sample, accum: [per slot], w, h }, most recently used last
  const w = Math.min(MAX, Math.ceil(pw / STEP_PX) * STEP_PX)
  const h = Math.min(MAX, Math.ceil(ph / STEP_PX) * STEP_PX)
  const key = w + 'x' + h
  let t = rtCache.get(key)
  if (t) rtCache.delete(key)
  else {
    const opts = { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 }
    t = { sample: new THREE.WebGLRenderTarget(w, h, opts), accums: [], w, h }
    for (const [k, old] of rtCache) {
      if (rtCache.size < KEEP) break
      old.sample.dispose()
      for (const a of old.accums) a?.dispose()
      rtCache.delete(k)
    }
  }
  if (!t.accums[slot]) t.accums[slot] = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType })
  rtCache.set(key, t)
  return { sample: t.sample, accum: t.accums[slot], w, h }
}
// the drawing buffer: as large as the largest target size in use (resizing it reallocates it)
function bufferSize(gl) {
  let w = 1, h = 1
  for (const t of gl.rt.values()) {
    w = Math.max(w, t.w)
    h = Math.max(h, t.h)
  }
  return [w, h]
}

export class SlabScene {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera()
    this.objects = [] // { mesh, material }
  }
  ensure(n) {
    while (this.objects.length < n) {
      const material = makeMaterial()
      const mesh = new THREE.Mesh(geometry(1, 1, 1, 0.1), material)
      mesh.frustumCulled = false
      this.scene.add(mesh)
      this.objects.push({ mesh, material })
    }
    this.objects.forEach((o, i) => (o.mesh.visible = i < n))
  }
}

// Scenes are pooled, never disposed: a slab canvas that mounts again (a window reopened, a seek
// back) reuses a scene whose materials, programs and textures are already on the GPU.
const scenePool = []
export const acquireSlabScene = () => scenePool.pop() || new SlabScene()
export const releaseSlabScene = (s) => scenePool.push(s)

// upload every loaded slab texture now (call when idle, e.g. after load), so no slab uploads a
// picture on the first frame it appears
export function warmTextures() {
  const r = getRenderer()
  for (const tex of texCache.values()) if (tex.userData.ready) r.initTexture(tex)
}

// Camera for a canvas of css size (cw x ch) whose 1 world unit = 1 stage px at z = 0,
// perspective distance P (px) and vanishing point (ox, oy) in canvas px. y points down
// in pose space and is flipped here.
function setupCamera(cam, cw, ch, P, ox, oy) {
  const near = 1, far = P * 10
  const k = near / P
  cam.projectionMatrix.makePerspective(-ox * k, (cw - ox) * k, oy * k, -(ch - oy) * k, near, far)
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert()
  cam.position.set(ox, -oy, P)
  cam.quaternion.identity()
  cam.updateMatrixWorld(true)
}

// slab: { w, h, d, radius, map (url), tint, edgeColor, edgeMix, spec, bandPos, bandWidth, rim, brightness,
//         sat, contrast, lift: [r,g,b], vignette, vigColor: [r,g,b], bandGain, faceBand, seeThrough,
//         canvas + canvasVersion (live 2D canvas picture), backFlip }
//         (all optional; seeThrough or backFlip: false shows the picture mirrored on the back face, like glass)
// pose: { x, y, z, rx, ry, rz, s, sx, sy, opacity, band, brightness, faceBand: {u, w, a} } (px / radians)
function applySlab(gl, obj, slab, pose) {
  const { mesh, material: m } = obj
  const w = slab.w, h = slab.h, d = slab.d ?? Math.min(w, h) * 0.2
  const r = Math.min(slab.radius ?? d * 0.45, d / 2 - 0.01, Math.min(w, h) / 2 - 0.01)
  mesh.geometry = geometry(w, h, d, r)
  const u = m.uniforms
  u.uSize.value.set(w, h, d)
  const tex = slab.face ? faceTexture(gl, slab.face) : slab.canvas ? canvasTexture(slab.canvas, slab.canvasVersion) : loadTexture(slab.map)
  u.uMap.value = tex
  u.uHasMap.value = tex ? 1 : 0
  if (slab.tint) u.uTint.value.setRGB(...slab.tint)
  if (slab.edgeColor) u.uEdgeColor.value.setRGB(...slab.edgeColor)
  u.uEdgeMix.value = slab.edgeMix ?? 0.6
  u.uSpec.value = slab.spec ?? 0.55
  u.uBandPos.value = (slab.bandPos ?? -0.35) + (pose.band ?? 0)
  u.uBandWidth.value = slab.bandWidth ?? 0.18
  u.uRim.value = slab.rim ?? 0.6
  u.uBrightness.value = (slab.brightness ?? 1) * (pose.brightness ?? 1)
  u.uSat.value = slab.sat ?? 1
  u.uContrast.value = slab.contrast ?? 1
  if (slab.lift) u.uLift.value.set(...slab.lift)
  else u.uLift.value.set(0, 0, 0)
  u.uVignette.value = slab.vignette ?? 0
  if (slab.vigColor) u.uVigColor.value.setRGB(...slab.vigColor)
  u.uBandGain.value = slab.bandGain ?? 0
  u.uFlipBack.value = slab.seeThrough || slab.backFlip === false ? 0 : 1
  const fb = pose.faceBand ?? slab.faceBand
  if (fb) u.uFaceBand.value.set(fb.u ?? 0.5, fb.w ?? 0.2, fb.a ?? 0)
  else u.uFaceBand.value.set(0.5, 0.2, 0)
  u.uOpacity.value = pose.opacity ?? 1
  mesh.position.set(pose.x ?? 0, -(pose.y ?? 0), pose.z ?? 0)
  mesh.rotation.set(-(pose.rx ?? 0), pose.ry ?? 0, -(pose.rz ?? 0), 'YXZ')
  const s = pose.s ?? 1
  mesh.scale.set(s * (pose.sx ?? 1), s * (pose.sy ?? 1), s)
  mesh.visible = (pose.opacity ?? 1) > 0.001 && pose.visible !== false
}

// Render `items` ([{slab, pose(tt)}]) into ctx2d (a 2D canvas context, cleared first).
// times: sub-frame sample times. view: { cw, ch, scale, P, ox, oy }.
export function renderSlabs(ctx2d, slabScene, items, times, view) {
  const gl = sharedGl()
  const r = gl.renderer
  const glCanvas = gl.canvas
  const { pw, ph, tg } = accumulate(gl, slabScene, items, times, view)
  const q = accumQuad()
  // accum -> default framebuffer -> 2D canvas
  const [bw, bh] = bufferSize(gl)
  if (glCanvas.width !== bw || glCanvas.height !== bh) r.setSize(bw, bh, false)
  r.setRenderTarget(null)
  r.setViewport(0, 0, pw, ph)
  r.setScissorTest(true)
  r.setScissor(0, 0, pw, ph)
  r.clear(true, true, true)
  r.setScissorTest(false)
  q.mat.uniforms.uUv.value.set(pw / tg.w, ph / tg.h)
  q.mat.uniforms.uTex.value = tg.accum.texture
  q.mat.uniforms.uScale.value = 1
  q.mat.blending = THREE.NoBlending
  r.render(q.scene, q.cam)
  const c = ctx2d.canvas
  if (c.width !== pw || c.height !== ph) {
    c.width = pw
    c.height = ph
  }
  ctx2d.clearRect(0, 0, pw, ph)
  ctx2d.drawImage(glCanvas, 0, glCanvas.height - ph, pw, ph, 0, 0, pw, ph)
}

// The multi-sample render of `items` at `times` into an accumulation target of gl (slot: which
// one) -> { pw, ph (px drawn), tg: { accum (its texture holds the render, premultiplied, in its
// bottom-left pw x ph), w, h } }
function accumulate(gl, slabScene, items, times, view, slot = 0) {
  const r = gl.renderer
  const { cw, ch, scale } = view
  const pw = Math.min(MAX, Math.max(1, Math.round(cw * scale)))
  const ph = Math.min(MAX, Math.max(1, Math.round(ch * scale)))
  setupCamera(slabScene.camera, cw, ch, view.P ?? 1000, view.ox ?? cw / 2, view.oy ?? ch / 2)
  slabScene.ensure(items.length)
  const tg = targets(gl, pw, ph, slot)
  const { sample, accum } = tg
  const q = accumQuad()
  q.mat.uniforms.uUv.value.set(pw / tg.w, ph / tg.h)
  const n = times.length
  r.setRenderTarget(accum)
  r.setViewport(0, 0, pw, ph)
  r.setClearColor(0x000000, 0)
  r.clear(true, true, true)
  for (let i = 0; i < n; i++) {
    items.forEach((it, j) => applySlab(gl, slabScene.objects[j], it.slab, it.pose(times[i])))
    r.setRenderTarget(sample)
    r.setViewport(0, 0, pw, ph)
    r.clear(true, true, true)
    r.render(slabScene.scene, slabScene.camera)
    q.mat.uniforms.uTex.value = sample.texture
    q.mat.uniforms.uScale.value = 1 / n
    q.mat.blending = THREE.CustomBlending
    q.mat.blendEquation = THREE.AddEquation
    q.mat.blendSrc = THREE.OneFactor
    q.mat.blendDst = THREE.OneFactor
    q.mat.blendSrcAlpha = THREE.OneFactor
    q.mat.blendDstAlpha = THREE.OneFactor
    r.setRenderTarget(accum)
    r.setViewport(0, 0, pw, ph)
    r.render(q.scene, q.cam)
  }
  return { pw, ph, tg }
}

// ---------------------------------------------------------------- SlabView
// A visible WebGL canvas showing a slab image on every layer of a window at once: the slab render
// and its floor reflection composed into one image (`image`), drawn once per shown layer (the live
// window; mid-motion, each motion-blur copy) with the layer's own CSS transform as a projective
// quad and its opacity, the layers' parts added together as the copies' plus-lighter adds them
// (`draw`). One render a frame and no copy out of the GL context: the image never goes through a
// 2D canvas (in WebKit that copy waited on the GPU process, behind the painting of the window's
// layers: 4-50 ms a frame while my Music opened), and the copies need no canvases of their own.
// The canvas lies over the window's layers (os/PlexWindow app.Overlay), so a copy's slab is drawn
// over the copies' sum rather than over its own copy: the same pixels at rest; mid-motion it
// differs by the slab's alpha spread times the spread of what lies under it across the copies (a
// smooth header background: well under a level).
const COMPOSE_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
// the slab over its reflection; the reflection at uOp under a vertical mask: 0 at uMask.x, 1 at
// uMask.y, 0 at uMask.z (box px, from the top; the row's centre: (uPh - gl_FragCoord.y) / uScale)
const COMPOSE_F = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMain;
  uniform sampler2D uRefl;
  uniform vec2 uUv;
  uniform float uOp;
  uniform vec3 uMask;
  uniform float uPh;
  uniform float uScale;
  uniform float uHasRefl;
  void main() {
    vec2 uv = vUv * uUv;
    vec4 m = texture2D(uMain, uv);
    float y = (uPh - gl_FragCoord.y) / uScale;
    float k = y <= uMask.x ? 0.0 : y < uMask.y ? (y - uMask.x) / (uMask.y - uMask.x) : y < uMask.z ? (uMask.z - y) / (uMask.z - uMask.y) : 0.0;
    vec4 r = uHasRefl > 0.5 ? texture2D(uRefl, uv) * (uOp * k) : vec4(0.0);
    gl_FragColor = m + r * (1.0 - m.a);
  }
`
// a layer's quad: clip-space position per corner (homogeneous: the layer's perspective), the
// image's uv, the layer-local px (for the window open's body shade) and the layer's opacity and
// shade level (os/PlexWindow OPEN_SHADE: rgb over the slab, ramping down and to the right)
const LAYER_V = /* glsl */ `
  attribute vec4 aClip;
  attribute vec2 aUv;
  attribute vec2 aLocal;
  attribute vec2 aOpShade;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec2 vOpShade;
  void main() {
    vUv = aUv;
    vLocal = aLocal;
    vOpShade = aOpShade;
    gl_Position = aClip;
  }
`
const LAYER_F = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec2 vOpShade;
  uniform sampler2D uImg;
  uniform vec3 uShadeCol;
  uniform vec4 uShadeRamps; // y0, y1, x0, x1 (layer px)
  void main() {
    vec4 c = texture2D(uImg, vUv);
    float s = vOpShade.y;
    if (s > 0.0) {
      // the shades over the slab as over the window (source-over): rgb' = rgb (1 - a) + col a alpha
      float ay = clamp((vLocal.y - uShadeRamps.x) / (uShadeRamps.y - uShadeRamps.x), 0.0, 1.0) * s;
      c.rgb = c.rgb * (1.0 - ay) + uShadeCol * ay * c.a;
      float ax = clamp((vLocal.x - uShadeRamps.z) / (uShadeRamps.w - uShadeRamps.z), 0.0, 1.0) * s;
      c.rgb = c.rgb * (1.0 - ax) + uShadeCol * ax * c.a;
    }
    gl_FragColor = c * vOpShade.x;
  }
`
const MAX_LAYERS = 24

export class SlabView {
  constructor() {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    c.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none'
    this.canvas = c
    this.gl = makeGl(c)
    this.scenes = [new SlabScene(), new SlabScene()]
    this.img = null
    this.size = null // { pw, ph, uv: [u, v] } of the image
    const compose = new THREE.ShaderMaterial({
      uniforms: {
        uMain: { value: null }, uRefl: { value: null }, uUv: { value: new THREE.Vector2(1, 1) }, uOp: { value: 0 },
        uMask: { value: new THREE.Vector3(0, 1, 2) }, uPh: { value: 1 }, uScale: { value: 1 }, uHasRefl: { value: 0 },
      },
      vertexShader: COMPOSE_V,
      fragmentShader: COMPOSE_F,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })
    this.compose = { mat: compose, scene: new THREE.Scene(), cam: new THREE.Camera() }
    this.compose.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compose))
    const g = new THREE.BufferGeometry()
    const n = MAX_LAYERS * 4
    this.attr = {
      aClip: new THREE.BufferAttribute(new Float32Array(n * 4), 4),
      aUv: new THREE.BufferAttribute(new Float32Array(n * 2), 2),
      aLocal: new THREE.BufferAttribute(new Float32Array(n * 2), 2),
      aOpShade: new THREE.BufferAttribute(new Float32Array(n * 2), 2),
    }
    for (const [k, a] of Object.entries(this.attr)) {
      a.setUsage(THREE.DynamicDrawUsage)
      g.setAttribute(k, a)
    }
    // (three.js wants a position attribute to count vertices)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const idx = []
    for (let i = 0; i < MAX_LAYERS; i++) idx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3)
    g.setIndex(idx)
    const mat = new THREE.ShaderMaterial({
      uniforms: { uImg: { value: null }, uShadeCol: { value: new THREE.Vector3() }, uShadeRamps: { value: new THREE.Vector4(0, 1, 0, 1) } },
      vertexShader: LAYER_V,
      fragmentShader: LAYER_F,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    })
    const mesh = new THREE.Mesh(g, mat)
    mesh.frustumCulled = false
    this.layers = { mat, geo: g, scene: new THREE.Scene(), cam: new THREE.Camera() }
    this.layers.scene.add(mesh)
  }

  // the image: `items` rendered (samples at `times`, view as renderSlabs) over their reflection
  // (`refl`: { items (the mirrored poses), op, mask: [y0, y1, y2] } or null)
  image(items, times, view, refl) {
    const gl = this.gl
    const r = gl.renderer
    const main = accumulate(gl, this.scenes[0], items, times, view, 0)
    const rr = refl ? accumulate(gl, this.scenes[1], refl.items, times, view, 1) : null
    const { pw, ph, tg } = main
    if (!this.img || this.img.width !== tg.w || this.img.height !== tg.h) {
      this.img?.dispose()
      this.img = new THREE.WebGLRenderTarget(tg.w, tg.h)
    }
    const u = this.compose.mat.uniforms
    u.uMain.value = tg.accum.texture
    u.uRefl.value = rr ? rr.tg.accum.texture : null
    u.uHasRefl.value = rr ? 1 : 0
    u.uUv.value.set(pw / tg.w, ph / tg.h)
    u.uOp.value = refl ? refl.op : 0
    if (refl) u.uMask.value.set(...refl.mask)
    u.uPh.value = ph
    u.uScale.value = view.scale
    r.setRenderTarget(this.img)
    r.setViewport(0, 0, pw, ph)
    r.setScissorTest(true)
    r.setScissor(0, 0, pw, ph)
    r.render(this.compose.scene, this.compose.cam)
    r.setScissorTest(false)
    this.size = { pw, ph, u: pw / tg.w, v: ph / tg.h }
  }

  // Draw the image once per layer onto the canvas: layers [{ m (DOMMatrix: the image's box px ->
  // the canvas's css px, homogeneous), op, shade }], the canvas css size w x h at `scale` device px
  // per css px; box: the image's size in css px; shade: { col: [r, g, b] (0..1), ramps: [y0, y1,
  // x0, x1] (layer px), at: { x, y } (the box's corner in layer px) }
  draw(layers, w, h, scale, box, shade) {
    const gl = this.gl
    const r = gl.renderer
    const c = this.canvas
    const bw = Math.max(1, Math.round(w * scale)), bh = Math.max(1, Math.round(h * scale))
    if (c.width !== bw || c.height !== bh) r.setSize(bw, bh, false)
    r.setRenderTarget(null)
    r.setViewport(0, 0, bw, bh)
    r.setClearColor(0x000000, 0)
    r.clear(true, true, true)
    if (!this.img || !layers.length) return
    const { aClip, aUv, aLocal, aOpShade } = this.attr
    const n = Math.min(MAX_LAYERS, layers.length)
    const P = (m, x, y) => m.transformPoint(new DOMPoint(x, y, 0, 1))
    for (let i = 0; i < n; i++) {
      const L = layers[i]
      // corners: top-left, top-right, bottom-left, bottom-right (box px), image uv (its top row at v)
      const cs = [[0, 0, 0, this.size.v], [box.w, 0, this.size.u, this.size.v], [0, box.h, 0, 0], [box.w, box.h, this.size.u, 0]]
      cs.forEach(([x, y, u, v], j) => {
        const p = P(L.m, x, y)
        const o = i * 4 + j
        // css px -> clip space, kept homogeneous (perspective-correct uv)
        aClip.array.set([(p.x * 2) / w - p.w, p.w - (p.y * 2) / h, 0, p.w], o * 4)
        aUv.array.set([u, v], o * 2)
        aLocal.array.set([shade ? shade.at.x + x : 0, shade ? shade.at.y + y : 0], o * 2)
        aOpShade.array.set([L.op, L.shade || 0], o * 2)
      })
    }
    for (const a of Object.values(this.attr)) a.needsUpdate = true
    this.layers.geo.setDrawRange(0, n * 6)
    const u = this.layers.mat.uniforms
    u.uImg.value = this.img.texture
    if (shade) {
      u.uShadeCol.value.set(...shade.col)
      u.uShadeRamps.value.set(...shade.ramps)
    }
    r.render(this.layers.scene, this.layers.cam)
  }
}

// Views are pooled, never disposed: a window that mounts its slab again (reopened, restored)
// takes one whose context, programs, textures and targets are ready (making a context and
// compiling its programs stalls a frame). warmSlabView makes and warms the first at load.
const viewPool = []
export const acquireSlabView = () => viewPool.pop() || new SlabView()
export const releaseSlabView = (v) => {
  v.canvas.remove()
  viewPool.push(v)
}
// (two: my Music and my Pictures can show at once; each draws `slabs` once, uploading their
// pictures, a canvas face's too, and again once the image files have loaded)
export function warmSlabView(slabs) {
  if (typeof document === 'undefined' || viewPool.length) return
  for (let i = 0; i < 2; i++) {
    const v = new SlabView()
    const items = slabs.map((slab) => ({ slab, pose: () => ({ x: 4, y: 4 }) }))
    const draw = () => {
      v.image(items, [0], { cw: 8, ch: 8, scale: 1, P: 900 }, { items, op: 0.2, mask: [0, 4, 8] })
      v.draw([{ m: new DOMMatrix(), op: 1, shade: 0.1 }], 8, 8, 1, { w: 8, h: 8 }, { col: [0, 0, 0], ramps: [0, 1, 0, 1], at: { x: 0, y: 0 } })
    }
    draw()
    texturesReady().then(() => {
      draw()
      for (const tex of texCache.values()) if (tex.userData.ready) v.gl.renderer.initTexture(tex)
    })
    viewPool.push(v)
  }
}
