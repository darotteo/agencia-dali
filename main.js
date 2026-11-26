const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
if (reduced.matches) document.documentElement.classList.add('calm');

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
// Section geometry is read once and on resize, so a scroll frame only writes styles.
const geo = new Map();
function measure() {
  for (const el of geo.keys()) {
    const r = el.getBoundingClientRect();
    geo.set(el, { top: r.top + scrollY, height: r.height });
  }
}
const watch = (el) => { geo.set(el, null); measure(); };
// 0 when the section's top reaches the top of the screen, 1 when its bottom reaches the bottom.
function progress(el) {
  const g = geo.get(el);
  const span = g.height - innerHeight;
  return span > 0 ? clamp((scrollY - g.top) / span) : 0;
}
const onScreen = (el) => { const g = geo.get(el); return scrollY + innerHeight > g.top && scrollY < g.top + g.height; };
const scenes = [];

// Hero: the camera flies into the ring and the light page turns to night.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || reduced.matches) return;
  const night = hero.querySelector('.hero-night');
  const world = hero.querySelector('.hero-world');
  const fly = hero.querySelector('.hero-fly');
  const foot = hero.querySelector('.hero-foot');
  watch(hero);
  scenes.push(() => {
    const p = progress(hero);
    world.style.transform = `translateZ(${(p * 1000).toFixed(1)}px)`;
    fly.style.transform = `translateZ(${(p * 1000 + 10).toFixed(1)}px)`; // the D sits 10px in front of the world
    world.style.opacity = fly.style.opacity = (1 - clamp((p - .55) / .35)).toFixed(3);
    world.style.visibility = fly.style.visibility = p > .9 ? 'hidden' : ''; // stops compositing the spinning ring once it has faded
    night.style.opacity = clamp((p - .3) / .45).toFixed(3);
    foot.style.opacity = (1 - clamp(p / .22)).toFixed(3);
    foot.style.visibility = p > .22 ? 'hidden' : '';
  });
})();

// Projects: vertical scroll moves the row of panels sideways.
(() => {
  const work = document.querySelector('.work');
  if (!work) return;
  const track = work.querySelector('.work-track');
  const bar = work.querySelector('.work-progress span');
  let distance = 0;
  const fit = () => {
    distance = Math.max(0, track.scrollWidth - innerWidth);
    work.style.height = `${innerHeight + distance}px`;
  };
  fit();
  geo.set(work, null);
  new ResizeObserver(fit).observe(track);
  addEventListener('resize', fit);
  scenes.push(() => {
    const p = progress(work);
    track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
    bar.style.transform = `scaleX(${p.toFixed(3)})`;
  });
  // Keyboard: tabbing to a panel scrolls the page to the point where that panel is on screen.
  track.addEventListener('focusin', (e) => {
    const item = e.target.closest('.panel');
    if (!item || !distance) return;
    const top = work.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + clamp((item.offsetLeft - innerWidth * .08) / distance) * distance, behavior: 'instant' });
  });
})();

// Services: shards of the work fly past the camera while each service takes the centre in turn.
(() => {
  const fly = document.querySelector('.fly');
  if (!fly || reduced.matches) return;
  const shards = [...fly.querySelectorAll('.shard')].map((el) => ({ el, x: +el.dataset.x, y: +el.dataset.y, z: +el.dataset.z }));
  const stages = [...fly.querySelectorAll('.stage')];
  const dots = [...fly.querySelectorAll('.fly-dots li')];
  const n = stages.length;
  watch(fly);
  let cap = 1;
  const fitCap = () => { cap = innerWidth < 700 ? .4 : 1; }; // on phones the text spans the screen, so shards stay in the background
  fitCap();
  addEventListener('resize', fitCap);
  scenes.push(() => {
    if (!onScreen(fly)) return;
    const p = progress(fly);
    for (const s of shards) {
      const z = -4200 + s.z * 1.02 + p * 4700;
      s.el.style.transform = `translate(-50%, -50%) translate3d(${s.x}vw, ${s.y}vh, ${z.toFixed(0)}px)`;
      // Shards stay faint while they cross the text and come up as they reach the edges.
      const k = 900 / (900 - Math.min(z, 860));
      const out = clamp(Math.max((Math.abs(s.x) * k - 22) / 12, (Math.abs(s.y) * k - 26) / 12));
      const o = clamp((z + 4200) / 1400) * clamp((420 - z) / 320) * (.14 + .86 * out) * cap;
      s.el.style.opacity = o.toFixed(3);
      s.el.style.visibility = o > 0 ? '' : 'hidden'; // drops unseen shards from compositing
    }
    const f = p * n;
    stages.forEach((st, i) => {
      const local = f - i;
      let o = i === 0 ? 1 : clamp(local / .2);
      if (i < n - 1) o = Math.min(o, clamp((1 - local) / .2));
      st.style.opacity = o.toFixed(3);
      st.style.transform = `translateY(${((1 - o) * (local < .5 ? 28 : -28)).toFixed(1)}px)`;
      st.style.pointerEvents = o < .5 ? 'none' : '';
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === Math.min(n - 1, Math.floor(f))));
  });
  // Keyboard: tabbing into a service scrolls to the moment it is on screen.
  fly.addEventListener('focusin', (e) => {
    const i = stages.indexOf(e.target.closest('.stage'));
    if (i < 0) return;
    const r = fly.getBoundingClientRect();
    scrollTo({ top: r.top + scrollY + (i + .5) / n * (r.height - innerHeight), behavior: 'instant' });
  });
})();

measure();
new ResizeObserver(measure).observe(document.body);

let queued = false;
const render = () => { queued = false; for (const scene of scenes) scene(); };
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(render); } }, { passive: true });
addEventListener('resize', render);
render();

// Decorative tilt toward the pointer for the 3D stages and project shots. Mouse only.
document.querySelectorAll('[data-tilt]').forEach((area) => {
  const target = area.querySelector('.tilt') || area;
  const max = Number(area.dataset.tilt);
  area.addEventListener('pointermove', (e) => {
    if (!finePointer.matches) return;
    const r = area.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    target.style.transform = `perspective(1100px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
  });
  area.addEventListener('pointerleave', () => { target.style.transform = ''; });
});

// Lower sections: each block settles in once as it reaches the screen; the CSS gives each kind its own entrance.
(() => {
  if (reduced.matches) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.sec-head, .kinds-copy, .studio-copy, .swap li, .case, .steps li, .deliverables li, .timeline li, .faq details, .contact h2, .contact .wrap > p, .contact-list li').forEach((el) => {
    el.style.setProperty('--i', Math.min([...el.parentElement.children].indexOf(el), 6)); // stagger within its list
    el.classList.add('reveal');
    io.observe(el);
  });
})();

// App kinds: an ARIA tablist; the 3D stage turns to the selected kind.
(() => {
  const tabs = [...document.querySelectorAll('.kind-tabs [role="tab"]')];
  const visuals = [...document.querySelectorAll('.kind-visual')];
  function select(tab, focus) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    const id = tab.getAttribute('aria-controls');
    visuals.forEach((v) => v.classList.toggle('is-on', v.dataset.kind === id));
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home') select(tabs[0], true);
      else if (e.key === 'End') select(tabs[tabs.length - 1], true);
      else if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
      else return;
      e.preventDefault();
    });
  });
})();

// Managed accounts: switching account flips every post over, one after another.
(() => {
  const card = document.querySelector('.profile-card');
  if (!card) return;
  // Public profile data as shown on Instagram in November 2026.
  const accounts = [
    { handle: 'aldeatermalcopahue', name: 'Aldea Termal', bio: 'Complejo Hotelero en las Termas de Copahue', posts: '160', followers: '846', following: '141' },
    { handle: 'lasaraucariascaviahue', name: 'Las Araucarias Caviahue', bio: 'Nuestra cabaña de montaña es ese refugio que invita a bajar el ritmo y disfrutar de lo simple.', posts: '183', followers: '3.689', following: '130' },
    { handle: 'ananda_caviahue', name: 'Ananda Caviahue', bio: 'Despertate mirando el Lago Caviahue en un lugar soñado. ✨', posts: '94', followers: '588', following: '65' },
    { handle: 'hosteria_hualcupen', name: 'Hosteria Hualcupen', bio: 'Tu casa en Copahue 🇦🇷 A 1 cuadra de las termas.', posts: '167', followers: '2.718', following: '450' },
    { handle: 'somoscopahue', name: 'Somoscopahue', bio: 'COPAHUE | Neuquén. Un destino para vivir todo el año 🏔️', posts: '36', followers: '2.818', following: '34' },
    { handle: 'syncrobeat.app', name: 'SyncroBeat | Metrónomo para bandas', bio: 'Click y pistas para bandas. Click en auriculares, pistas a la consola con Modo Studio. Para ensayos y shows. Probá SyncroBeat ↓', posts: '9', followers: '522', following: '375' }
  ];
  const buttons = [...document.querySelectorAll('.brand-tabs button')];
  const posts = [...card.querySelectorAll('.profile-grid span')];
  const link = document.querySelector('.profile-link');
  const sheet = (a) => `assets/img/cuenta-${a.handle}.webp`;
  const set = (sel, text) => { card.querySelector(sel).textContent = text; };
  let current = 0;
  function label(a) { posts.forEach((p, i) => p.setAttribute('aria-label', `Publicación ${i + 1} de @${a.handle}`)); }
  function apply(a) {
    card.style.setProperty('--sheet', `url("${sheet(a)}")`);
    set('.handle', a.handle);
    set('.name', a.name);
    set('.bio', a.bio);
    set('.n-posts', a.posts);
    set('.n-followers', a.followers);
    set('.n-following', a.following);
    card.querySelectorAll('.avatar').forEach((img) => { img.src = `assets/img/avatar-${a.handle}.webp`; });
    link.href = `https://www.instagram.com/${a.handle}/`;
    label(a);
  }
  label(accounts[0]);
  // Every account's posts and avatar are fetched and decoded once the page has loaded,
  // so a tap swaps at once instead of waiting on a 60-170 KB download with the posts folded away.
  const ready = new Map();
  const load = (a) => {
    if (!ready.has(a)) {
      const img = new Image();
      img.src = sheet(a);
      const avatar = new Image();
      avatar.src = `assets/img/avatar-${a.handle}.webp`;
      ready.set(a, { img, done: Promise.all([img.decode(), avatar.decode()]).catch(() => {}) });
    }
    return ready.get(a).done;
  };
  const preload = () => (self.requestIdleCallback ?? setTimeout)(() => accounts.forEach(load));
  if (document.readyState === 'complete') preload(); else addEventListener('load', preload, { once: true });
  function show(i) {
    if (i === current) return;
    current = i;
    buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(j === i)));
    const a = accounts[i];
    const loaded = load(a);
    if (reduced.matches) { loaded.then(() => { if (current === i) apply(a); }); return; }
    // Fold the posts away, swap the sheet (already decoded), then unfold.
    posts.forEach((p) => p.getAnimations().forEach((anim) => anim.cancel()));
    const out = posts.map((p, j) => p.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 120, delay: j * 20, easing: 'cubic-bezier(.55, 0, 1, .45)', fill: 'forwards' }).finished.catch(() => {}));
    Promise.all([...out, loaded]).then(() => {
      if (current !== i) return;
      apply(a);
      posts.forEach((p, j) => p.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 260, delay: j * 20, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' }));
    });
  }
  buttons.forEach((btn, i) => btn.addEventListener('click', () => show(i)));
})();

