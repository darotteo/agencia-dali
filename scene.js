import {
  ACESFilmicToneMapping, CanvasTexture, Color, DirectionalLight,
  ExtrudeGeometry, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  PMREMGenerator, Scene, Shape, ShapeGeometry, SRGBColorSpace, TextureLoader,
  Vector3, WebGLRenderer
} from './assets/vendor/three.module.min.js';

const stage = document.querySelector('.case-stage');

const canvas = document.querySelector('.case-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');


const shots = {
  laptop: [4.34, 2.59, .045, 'web-syncrobeat.webp'],
  phone: [1.29, 2.73, .157, 'screen-syncrobeat.webp'],
};

function roundedRect(width, height, radius) {
  const x = width / 2;
  const y = height / 2;
  const s = new Shape();
  s.moveTo(-x + radius, -y);
  s.lineTo(x - radius, -y);
  s.quadraticCurveTo(x, -y, x, -y + radius);
  s.lineTo(x, y - radius);
  s.quadraticCurveTo(x, y, x - radius, y);
  s.lineTo(-x + radius, y);
  s.quadraticCurveTo(-x, y, -x, y - radius);
  s.lineTo(-x, -y + radius);
  s.quadraticCurveTo(-x, -y, -x + radius, -y);
  return s;
}

function part(parent, width, height, radius, depth, bevel, material, x, y, z) {
  const geometry = new ExtrudeGeometry(roundedRect(width, height, radius), {
    depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel,
    bevelSegments: 3, curveSegments: 8, steps: 1
  });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function panel(parent, width, height, radius, material, x, y, z) {
  const geometry = new ShapeGeometry(roundedRect(width, height, radius), 10);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) / width + .5, uv.getY(i) / height + .5);
  }
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function laptopDeck() {
  const surface = document.createElement('canvas');
  surface.width = 1024;
  surface.height = 620;
  const ctx = surface.getContext('2d');
  const metal = ctx.createLinearGradient(0, 0, 0, 620);
  metal.addColorStop(0, '#85838e');
  metal.addColorStop(1, '#b5b1bd');
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, 1024, 620);
  ctx.fillStyle = '#30303a';
  ctx.beginPath();
  ctx.roundRect(142, 70, 740, 286, 13);
  ctx.fill();

  const rows = [
    ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', ''],
    ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
    ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
    ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
    ['fn', 'control', 'option', 'cmd', ' ', 'cmd', 'option', '←', '↑', '→']
  ];
  const wideKeys = { ' ': 4.8, delete: 1.45, return: 1.7, shift: 1.7, caps: 1.3, tab: 1.2 };
  rows.forEach((row, index) => {
    const height = index === 0 ? 26 : 39;
    const y = index === 0 ? 78 : 110 + (index - 1) * 48;
    const keyWidth = (724 - 5 * (row.length - 1)) / row.reduce((sum, key) => sum + (wideKeys[key] ?? 1), 0);
    let x = 150;
    row.forEach(key => {
      const w = keyWidth * (wideKeys[key] ?? 1);
      ctx.fillStyle = '#14141b';
      ctx.beginPath();
      ctx.roundRect(x, y, w, height, 5);
      ctx.fill();
      ctx.strokeStyle = '#45434f';
      ctx.stroke();
      ctx.fillStyle = '#c0bbce';
      ctx.font = '12px sans-serif';
      ctx.fillText(key, x + 6, y + height * .63);
      x += w + 5;
    });
  });
  ctx.fillStyle = '#9995a2';
  ctx.strokeStyle = '#6d6a76';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(337, 376, 350, 200, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#565460';
  for (const edge of [69, 927]) {
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 37; y++) ctx.fillRect(edge + x * 4, 89 + y * 7, 2, 2);
    }
  }
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function screenMaterial(texture) {
  return new MeshBasicMaterial({ map: texture, toneMapped: false });
}

function makeLaptop(screen, metal, trim, glass) {
  const laptop = new Group();
  const base = new Group();
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, -1.22, .84);
  laptop.add(base);
  part(base, 4.55, 2.73, .102, .11, .032, metal, 0, 0, 0);
  panel(base, 4.53, 2.70, .11, new MeshStandardMaterial({
    map: laptopDeck(), roughness: .44, metalness: .18, envMapIntensity: .75
  }), 0, 0, .144);
  const hinge = new Group();
  hinge.position.set(0, -1.07, -.51);
  hinge.rotation.x = -.18;
  laptop.add(hinge);
  part(hinge, 4.54, 2.86, .106, .061, .027, metal, 0, 1.42, -.04);
  part(hinge, 4.48, 2.80, .086, .010, .009, trim, 0, 1.42, .046);
  panel(hinge, ...shots.laptop.slice(0, 3), screenMaterial(screen), 0, 1.435, .067);
  part(hinge, .32, .069, .019, .004, 0, trim, 0, 2.71, .069);
  panel(hinge, .029, .029, .014, glass, 0, 2.715, .074);
  return laptop;
}

function makePhone(screen, metal, trim, glass) {
  const phone = new Group();
  part(phone, 1.39, 2.84, .188, .141, .044, metal, 0, 0, -.118);
  part(phone, 1.373, 2.809, .180, .019, .012, trim, 0, 0, .058);
  panel(phone, ...shots.phone.slice(0, 3), screenMaterial(screen), 0, 0, .092);
  panel(phone, .36, .10, .05, trim, 0, 1.238, .096);
  panel(phone, .033, .033, .016, glass, .126, 1.238, .098);
  panel(phone, .40, .027, .013, new MeshBasicMaterial({ color: 0xe8e3ed }), 0, -1.30, .096);
  part(phone, .025, .36, .012, .054, .009, metal, .735, .40, -.071);
  part(phone, .025, .24, .012, .052, .009, metal, -.736, .40, -.071);
  part(phone, .025, .24, .012, .052, .009, metal, -.736, .07, -.071);
  return phone;
}

export function studioEnvironment(renderer) {
  const studio = new Scene();
  studio.background = new Color(0x40374d);
  const softboxes = [
    { position: [-4, 4, 4], size: [6, 3], color: 0xfff1e0, power: 3.7 },
    { position: [4, 2, -3], size: [3, 7], color: 0xad8fff, power: 3.4 },
    { position: [.5, 7, 0], size: [4, 3], color: 0xe8ddff, power: 2.2 },
    { position: [0, -.5, 6.2], size: [5, 1], color: 0xece8ff, power: 1.15 }
  ];
  for (const { position, size, color, power } of softboxes) {
    const box = new Mesh(new PlaneGeometry(...size), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) }));
    box.position.set(...position);
    box.lookAt(0, 0, 0);
    studio.add(box);
  }
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .035, .1, 25, { size: 128 });
  for (const box of studio.children) {
    box.geometry.dispose();
    box.material.dispose();
  }
  pmrem.dispose();
  return environment;
}

function shadow(width, length, opacity) {
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = 128;
  const ctx = sheet.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, '#04020a');
  gradient.addColorStop(.36, 'rgba(4, 2, 10, .65)');
  gradient.addColorStop(1, 'rgba(4, 2, 10, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const mesh = new Mesh(new PlaneGeometry(width, length), new MeshBasicMaterial({
    map: new CanvasTexture(sheet), transparent: true, opacity, depthWrite: false, toneMapped: false
  }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function configureScreen(texture, width, height, renderer) {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const viewport = Math.min(texture.image.width * (height / width) / texture.image.height, 1);
  texture.repeat.set(1, viewport);
  texture.offset.y = 1 - viewport;
  return viewport;
}

async function startScene() {
  const renderer = new WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'default'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, .1, 35);
  const target = new Vector3();
  const metal = new MeshStandardMaterial({ color: 0xaaa6b3, roughness: .31, metalness: .93 });
  const phoneMetal = new MeshStandardMaterial({ color: 0x9992ac, roughness: .25, metalness: .87 });
  const trim = new MeshStandardMaterial({ color: 0x111016, roughness: .3, metalness: .19 });
  const glass = new MeshPhysicalMaterial({ color: 0x242232, roughness: .14, metalness: .52, clearcoat: 1 });

  const textureLoader = new TextureLoader();
  const textures = await Promise.all(Object.values(shots).map(([, , , src]) => textureLoader.loadAsync('assets/img/' + src)));
  const [laptopScreen, phoneScreen] = textures;
  const laptopCrop = configureScreen(laptopScreen, ...shots.laptop.slice(0, 2), renderer);
  const phoneCrop = configureScreen(phoneScreen, ...shots.phone.slice(0, 2), renderer);
  const environment = studioEnvironment(renderer);
  scene.environment = environment.texture;
  scene.add(new HemisphereLight(0xf3e7ff, 0x302444, 1.45));
  const key = new DirectionalLight(0xfff3e8, 2.1);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xad83ff, 2.3);
  rim.position.set(4, 4, -4);
  scene.add(rim);

  const laptop = makeLaptop(laptopScreen, metal, trim, glass);
  const phone = makePhone(phoneScreen, phoneMetal, trim, glass);
  laptop.scale.setScalar(.88);
  phone.scale.setScalar(.86);
  const notebookShadow = shadow(5.15, 3.6, .83);
  const phoneShadow = shadow(2.42, 2.35, .61);
  scene.add(notebookShadow, phoneShadow, laptop, phone);

  // Opening composition, an oblique view of the hardware, then a direct view of the two sites.
  const views = [
    { camera: [-.10, .67, 9.78], target: [-.10, .02, .48], laptop: [-.56, .17, -.20, -.10, -.24, -.07], phone: [1.58, -.17, 2.37, -.09, .24, -.14] },
    { camera: [.52, 1.08, 9.62], target: [.02, -.02, .48], laptop: [-.69, .18, -.24, -.045, -.48, -.055], phone: [1.62, -.11, 2.4, -.11, .43, -.055] },
    { camera: [.90, .62, 9.6], target: [.12, -.02, .47], laptop: [-.67, .13, -.35, -.035, -.13, -.045], phone: [1.69, -.11, 2.43, -.035, -.14, .085] }
  ];

  const lerp = MathUtils.lerp;
  let progress = 0;
  let frame = 0;
  let lastTime = 0;
  let visible = false;
  let dirty = true;
  let start = 0;
  let distance = 1;

  function render(value) {
    const from = value < .48 ? views[0] : views[1];
    const to = value < .48 ? views[1] : views[2];
    const blend = value < .48
      ? MathUtils.smoothstep(value, 0, .48)
      : MathUtils.smoothstep(value, .48, 1);

    interpolatePosition(camera.position, from.camera, to.camera, blend);
    interpolatePosition(target, from.target, to.target, blend);
    camera.lookAt(target);
    pose(laptop, from.laptop, to.laptop, blend);
    pose(phone, from.phone, to.phone, blend);
    notebookShadow.position.set(laptop.position.x + .08, -1.68, .42);
    phoneShadow.position.set(phone.position.x + .15, -1.67, phone.position.z - .18);
    laptopScreen.offset.y = 1 - laptopCrop - value * .18;
    phoneScreen.offset.y = 1 - phoneCrop - value * .16;
    renderer.render(scene, camera);
  }

  function interpolatePosition(vector, from, to, blend) {
    vector.set(lerp(from[0], to[0], blend), lerp(from[1], to[1], blend), lerp(from[2], to[2], blend));
  }

  function pose(group, from, to, blend) {
    interpolatePosition(group.position, from, to, blend);
    group.rotation.set(lerp(from[3], to[3], blend), lerp(from[4], to[4], blend), lerp(from[5], to[5], blend));
  }

  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    const next = reducedMotion.matches ? 0 : MathUtils.clamp((scrollY - start) / distance, 0, 1);
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
    progress = reducedMotion.matches ? next : MathUtils.damp(progress, next, 13, dt);
    const moving = Math.abs(progress - next) > .0008;
    if (!moving) progress = next;
    if (dirty || moving || lastTime) render(progress);
    dirty = false;
    lastTime = moving ? time : 0;
    if (moving) schedule();
  }

  function measure() {
    const rect = stage.getBoundingClientRect();
    const deviceRatio = stage.clientWidth < 600 ? 1.35 : 1.65;
    renderer.setPixelRatio(Math.min(devicePixelRatio, deviceRatio));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    // Maintain the framing when the stage is narrower than the poster.
    camera.fov = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(17)) * Math.max(1, 1.23 / camera.aspect)));
    camera.updateProjectionMatrix();
    // Progress runs while the stage crosses the viewport.
    start = Math.max(0, rect.top + scrollY - innerHeight * .8);
    distance = Math.max(1, rect.height + innerHeight * .4);
    dirty = true;
    schedule();
  }

  // Set dimensions before revealing the canvas so the poster never yields to a blank frame.
  measure();
  progress = reducedMotion.matches ? 0 : MathUtils.clamp((scrollY - start) / distance, 0, 1);
  render(progress);
  stage.classList.toggle('scene-ready', !reducedMotion.matches);
  measure();
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stage.classList.remove('scene-ready');
    visible = false;
    cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (reducedMotion.matches) return;
    visible = true;
    stage.classList.add('scene-ready');
    measure();
  });
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !renderer.getContext().isContextLost();
    if (visible) measure();
  }, { rootMargin: '60px' }).observe(stage);
  addEventListener('resize', measure, { passive: true });
  addEventListener('scroll', () => {
    if (reducedMotion.matches) return;
    dirty = true;
    schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => {
    stage.classList.toggle('scene-ready', !reducedMotion.matches && !renderer.getContext().isContextLost());
    measure();
  });
}

export { startScene };
