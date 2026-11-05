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

let renderer = null
let glCanvas = null
const MAX = 2048

function getRenderer() {
  if (renderer) return renderer
  glCanvas = document.createElement('canvas')
  glCanvas.width = MAX
  glCanvas.height = MAX
  renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(1)
  renderer.setSize(MAX, MAX, false)
  renderer.autoClear = false
  return renderer
}

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
  uniform float uBackFlip;   // 1: the back face shows the picture unmirrored
  void main() {
    vec3 nL = normalize(vNormalL);
    float front = smoothstep(0.55, 0.95, nL.z);
    float back = smoothstep(0.55, 0.95, -nL.z);
    vec2 uv = vUv;
    if (back > 0.5 && uBackFlip > 0.5) uv.x = 1.0 - uv.x;
    vec3 pic = uHasMap > 0.5 ? texture2D(uMap, clamp(uv, 0.002, 0.998)).rgb : uTint;
    vec3 side = mix(uEdgeColor, pic * 0.55 + uEdgeColor * 0.25, uEdgeMix);
    vec3 col = mix(side, pic, max(front, back)) * uBrightness;

    // environment: a vertical softbox reflected in the glossy surface
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    vec3 r = reflect(-v, n);
    float band = exp(-pow((r.x - uBandPos) / max(uBandWidth, 1e-3), 2.0)) * smoothstep(-0.9, 0.2, r.y);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += uSpec * band * vec3(1.0);
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
      uBackFlip: { value: 1 },
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
      uniforms: { uTex: { value: null }, uScale: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
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

const rtCache = new Map()
function targets(w, h) {
  const key = w + 'x' + h
  let t = rtCache.get(key)
  if (!t) {
    const opts = { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 }
    t = { sample: new THREE.WebGLRenderTarget(w, h, opts), accum: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }) }
    rtCache.set(key, t)
  }
  return t
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
//         canvas + canvasVersion (live 2D canvas picture), backFlip (false: the back shows the mirror image) }
// pose: { x, y, z, rx, ry, rz, s, sx, sy, opacity } in canvas px / radians
function applySlab(obj, slab, pose) {
  const { mesh, material: m } = obj
  const w = slab.w, h = slab.h, d = slab.d ?? Math.min(w, h) * 0.2
  const r = Math.min(slab.radius ?? d * 0.45, d / 2 - 0.01, Math.min(w, h) / 2 - 0.01)
  mesh.geometry = geometry(w, h, d, r)
  const u = m.uniforms
  u.uSize.value.set(w, h, d)
  const tex = slab.canvas ? canvasTexture(slab.canvas, slab.canvasVersion) : loadTexture(slab.map)
  u.uMap.value = tex
  u.uHasMap.value = tex ? 1 : 0
  if (slab.tint) u.uTint.value.setRGB(...slab.tint)
  if (slab.edgeColor) u.uEdgeColor.value.setRGB(...slab.edgeColor)
  u.uEdgeMix.value = slab.edgeMix ?? 0.6
  u.uSpec.value = slab.spec ?? 0.55
  u.uBandPos.value = (slab.bandPos ?? -0.35) + (pose.band ?? 0)
  u.uBandWidth.value = slab.bandWidth ?? 0.18
  u.uRim.value = slab.rim ?? 0.6
  u.uBrightness.value = slab.brightness ?? 1
  u.uBackFlip.value = slab.backFlip === false ? 0 : 1
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
  const r = getRenderer()
  const { cw, ch, scale } = view
  const pw = Math.min(MAX, Math.max(1, Math.round(cw * scale)))
  const ph = Math.min(MAX, Math.max(1, Math.round(ch * scale)))
  setupCamera(slabScene.camera, cw, ch, view.P ?? 1000, view.ox ?? cw / 2, view.oy ?? ch / 2)
  slabScene.ensure(items.length)
  const { sample, accum } = targets(pw, ph)
  const q = accumQuad()
  const n = times.length
  r.setRenderTarget(accum)
  r.setViewport(0, 0, pw, ph)
  r.setClearColor(0x000000, 0)
  r.clear(true, true, true)
  for (let i = 0; i < n; i++) {
    items.forEach((it, j) => applySlab(slabScene.objects[j], it.slab, it.pose(times[i])))
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
  // accum -> default framebuffer bottom-left corner -> 2D canvas
  r.setRenderTarget(null)
  r.setViewport(0, 0, pw, ph)
  r.setScissorTest(true)
  r.setScissor(0, 0, pw, ph)
  r.clear(true, true, true)
  r.setScissorTest(false)
  q.mat.uniforms.uTex.value = accum.texture
  q.mat.uniforms.uScale.value = 1
  q.mat.blending = THREE.NoBlending
  r.render(q.scene, q.cam)
  const c = ctx2d.canvas
  if (c.width !== pw || c.height !== ph) {
    c.width = pw
    c.height = ph
  }
  ctx2d.clearRect(0, 0, pw, ph)
  ctx2d.drawImage(glCanvas, 0, MAX - ph, pw, ph, 0, 0, pw, ph)
}
