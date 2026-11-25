// Draws the hero "D." on an OffscreenCanvas in a worker, so building and rendering it never block scrolling.
import {
  ACESFilmicToneMapping, CubeUVReflectionMapping, DataTexture, DataUtils, DirectionalLight, ExtrudeGeometry, Group, HalfFloatType,
  LinearFilter, Mesh, MeshPhysicalMaterial, PerspectiveCamera, RGBAFormat, Scene, Shape, SphereGeometry, WebGLRenderer
} from './assets/vendor/three.module.min.js';

// The Dali "D." in polished metal. Same outline as the SVG poster it replaces (1 unit = 50 SVG units).
function letterD() {
  const d = new Shape();
  d.moveTo(0, 0);
  d.lineTo(.92, 0);
  d.absarc(.92, -1, 1, Math.PI / 2, -Math.PI / 2, true);
  d.lineTo(0, -2);
  d.closePath();
  // The counter must wind opposite to the outline (counter-clockwise); same winding left its inner walls facing inward, so they were culled and the centre looked flat.
  const hole = new Shape();
  hole.moveTo(.48, -.48);
  hole.lineTo(.48, -1.52);
  hole.lineTo(.92, -1.52);
  hole.absarc(.92, -1, .52, -Math.PI / 2, Math.PI / 2, false);
  hole.closePath();
  d.holes.push(hole);
  const geometry = new ExtrudeGeometry(d, { depth: .62, bevelEnabled: true, bevelThickness: .08, bevelSize: .05, bevelSegments: 6, curveSegments: 72 });
  geometry.center();
  return geometry;
}

// shortcut: the studio light the metal reflects is baked into d-studio.png (PMREM cubeUV, sqrt-encoded over STUDIO_MAX)
// from the softbox scene in scene.js's studioEnvironment (git history); building it here took ~1.3 s. Re-bake if the lighting changes.
const STUDIO_MAX = 3.6953125;
async function studio() {
  const blob = await (await fetch(new URL('./assets/img/d-studio.png', import.meta.url))).blob();
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const { width, height } = bitmap;
  const ctx = new OffscreenCanvas(width, height).getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const half = new Uint16Array(rgba.length);
  for (let i = 0; i < rgba.length; i++) half[i] = DataUtils.toHalfFloat(i % 4 === 3 ? 1 : (rgba[i] / 255) ** 2 * STUDIO_MAX);
  const texture = new DataTexture(half, width, height, RGBAFormat, HalfFloatType);
  texture.mapping = CubeUVReflectionMapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
const studioReady = studio();

// Latest values from the page; messages may arrive before the scene is ready.
const state = { width: 0, height: 0, aimX: 0, aimY: 0, scroll: 0, run: false };
let draw = null;

self.onmessage = async ({ data }) => {
  if (data.canvas) draw = await build(data);
  else Object.assign(state, data);
  draw?.();
};

async function build({ canvas, pixelRatio, gap }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new Scene();
  scene.environment = await studioReady;
  const key = new DirectionalLight(0xfff3e8, 1.6);
  key.position.set(-4, 5, 6);
  const rim = new DirectionalLight(0xad83ff, 3);
  rim.position.set(5, 2, -4);
  scene.add(key, rim);

  const metal = new MeshPhysicalMaterial({ color: 0xdcd8e6, metalness: 1, roughness: .2, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.3 });
  const violet = new MeshPhysicalMaterial({ color: 0x5146e5, metalness: .2, roughness: .28, clearcoat: 1, clearcoatRoughness: .1 });
  // Walls (outer edge and the inside of the counter) get a lighter lavender metal so the depth reads; pure chrome walls mirrored the dark room and looked flat.
  const walls = new MeshPhysicalMaterial({ color: 0xb7a9ff, metalness: .75, roughness: .28, clearcoat: .4, envMapIntensity: 1.6 });
  const d = new Mesh(letterD(), [metal, walls]);
  const dot = new Mesh(new SphereGeometry(.24, 64, 32), violet);
  // Shift left so the D plus its dot turn around their shared centre.
  const logo = new Group();
  d.position.set(-.3, 0, 0);
  dot.position.set(1.02, -.76, .1);
  logo.add(d, dot);
  scene.add(logo);

  const camera = new PerspectiveCamera(28, 1, .1, 30);
  camera.position.set(0, 0, 6.6);
  await renderer.compileAsync(scene, camera);

  // Safari before 16.4 has no requestAnimationFrame in workers.
  const raf = self.requestAnimationFrame?.bind(self) ?? ((f) => setTimeout(() => f(performance.now()), 16));
  const now = { x: 0, y: 0 };
  let size = '';
  let last = 0;
  let ticking = false;
  let live = false;

  // The D turns toward the pointer with a damped follow, sways when idle, and spins away as the page scrolls.
  function tick(time) {
    if (!state.run) { ticking = false; return; }
    raf(tick);
    if (time - last < gap) return;
    const dt = Math.min((time - last) / 1000 || 0, .05);
    last = time;
    if (`${state.width}x${state.height}` !== size && state.width) {
      size = `${state.width}x${state.height}`;
      renderer.setSize(state.width, state.height, false);
      camera.aspect = state.width / state.height;
      camera.updateProjectionMatrix();
    }
    const follow = 1 - Math.exp(-dt * 4);
    now.x += (state.aimX - now.x) * follow;
    now.y += (state.aimY - now.y) * follow;
    logo.rotation.y = -.42 + now.x * .5 + Math.sin(time * .0005) * .1 + state.scroll * 1.6;
    logo.rotation.x = -.14 + now.y * .28;
    renderer.render(scene, camera);
    if (!live) { live = true; self.postMessage('live'); }
  }
  return () => {
    if (state.run && !ticking) { ticking = true; last = performance.now(); raf(tick); }
  };
}
