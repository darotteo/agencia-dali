const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

// Blocks rise in the first time they enter the viewport; those arriving together are staggered.
const io = new IntersectionObserver((entries) => {
  let i = 0;
  for (const e of entries) if (e.isIntersecting) {
    e.target.style.transitionDelay = `${i++ * 60}ms`;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Hero and sections are sticky sheets. One taller than the screen pins only once its bottom reaches the bottom edge;
// the next sheet then slides over it and a shade darkens it as it gets covered.
(() => {
  const panels = [document.querySelector('.hero'), ...document.querySelectorAll('.sheet > section')].filter(Boolean);
  if (!panels.length) return;
  const fit = () => panels.forEach((p) => { p.style.top = `${Math.min(0, innerHeight - p.offsetHeight)}px`; });
  fit();
  new ResizeObserver(fit).observe(document.body);
  addEventListener('resize', fit);
  const layers = panels.slice(1, -1).map((p, i) => {
    const shade = Object.assign(document.createElement('div'), { className: 'shade' });
    shade.setAttribute('aria-hidden', 'true');
    p.append(shade);
    return { shade, next: panels[i + 2] };
  });
  let queued = false;
  function shadeAll() {
    queued = false;
    for (const { shade, next } of layers) {
      const covered = 1 - next.getBoundingClientRect().top / innerHeight;
      shade.style.opacity = (Math.min(1, Math.max(0, covered)) * .5).toFixed(3);
    }
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(shadeAll); } }, { passive: true });
  shadeAll();
})();

// The hero D becomes real-time 3D after the page has loaded; the SVG poster stays with reduced motion, Save-Data or no WebGL2.
(() => {
  const stage = document.querySelector('.hero-d');
  const ok = stage && !reduced.matches && !navigator.connection?.saveData && 'WebGL2RenderingContext' in window;
  if (!ok) return;
  const start = () => import('./hero-d.js?v=k-2').then(({ startD }) => startD(stage)).catch((err) => console.warn('D 3D:', err));
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();

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
    { handle: 'somoscopahue', name: 'Somoscopahue', bio: 'COPAHUE | Neuquén. Un destino para vivir todo el año 🏔️', posts: '36', followers: '2.818', following: '34' }
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
  function show(i) {
    if (i === current) return;
    current = i;
    buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(j === i)));
    const a = accounts[i];
    const img = new Image();
    img.src = sheet(a);
    if (reduced.matches) { img.decode().catch(() => {}).finally(() => apply(a)); return; }
    // Fold the posts away, swap the sheet once it is decoded, then unfold.
    const out = posts.map((p, j) => p.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 180, delay: j * 35, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' }).finished);
    Promise.all([...out, img.decode().catch(() => {})]).then(() => {
      if (current !== i) return;
      apply(a);
      posts.forEach((p, j) => p.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 320, delay: j * 35, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' }));
    });
  }
  buttons.forEach((btn, i) => btn.addEventListener('click', () => show(i)));
})();

// Real-time 3D for the SyncroBeat case on large screens, loaded only when the case comes near.
(() => {
  const stage = document.querySelector('.case-stage');
  const ok = stage && matchMedia('(min-width: 861px)').matches && !reduced.matches && 'WebGL2RenderingContext' in window;
  if (!ok) return;
  const watch = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    watch.disconnect();
    import('./scene.js?v=c-1').then(({ startScene }) => startScene()).catch((err) => console.warn('Escena 3D:', err));
  }, { rootMargin: '600px 0px' });
  watch.observe(stage);
})();
