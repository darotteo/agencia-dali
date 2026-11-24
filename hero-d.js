import {
  ACESFilmicToneMapping, DirectionalLight, ExtrudeGeometry, Group, Mesh,
  MeshPhysicalMaterial, PerspectiveCamera, Scene, Shape, SphereGeometry, WebGLRenderer
} from './assets/vendor/three.module.min.js';
import { studioEnvironment } from './scene.js?v=c-1';

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

export function startD(stage) {
  const canvas = stage.querySelector('.d-canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5)); // phones: less GPU work
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new Scene();
  scene.environment = studioEnvironment(renderer).texture;
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

  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }).observe(canvas);

  // The D turns toward the pointer with a damped follow, sways when idle, and spins away as the page scrolls.
  const aim = { x: 0, y: 0 };
  const now = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    aim.x = e.clientX / innerWidth * 2 - 1;
    aim.y = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  let frame = 0;
  let last = 0;
  let onScreen = true;
  let covered = false;
  const gap = matchMedia('(pointer: coarse)').matches ? 30 : 0; // phones: 30 fps is plenty for a slow sway
  function tick(time) {
    frame = requestAnimationFrame(tick);
    if (time - last < gap) return;
    const dt = Math.min((time - last) / 1000 || 0, .05);
    last = time;
    const follow = 1 - Math.exp(-dt * 4);
    now.x += (aim.x - now.x) * follow;
    now.y += (aim.y - now.y) * follow;
    const scroll = Math.min(scrollY / (innerHeight * 1.45), 1); // spans the pinned stretch until the page covers the hero
    logo.rotation.y = -.42 + now.x * .5 + Math.sin(time * .0005) * .1 + scroll * 1.6;
    logo.rotation.x = -.14 + now.y * .28;
    renderer.render(scene, camera);
    if (!stage.classList.contains('is-live')) stage.classList.add('is-live');
  }
  const run = () => {
    cancelAnimationFrame(frame);
    if (onScreen && !covered && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); }
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(stage);
  // The pinned hero stays in the viewport while it fades out, so stop drawing once it is gone.
  addEventListener('scroll', () => {
    const now = scrollY > innerHeight * 1.4;
    if (now !== covered) { covered = now; run(); }
  }, { passive: true });
  document.addEventListener('visibilitychange', run);
}
