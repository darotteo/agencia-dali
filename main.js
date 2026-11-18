// Projects rise in the first time they enter the viewport.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Native scroll timelines keep the device movement on the compositor.
// The fallback is scroll-driven too, and stops scheduling frames while idle.
(() => {
  const hero = document.querySelector('.hero');
  const devices = [...document.querySelectorAll('.device')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nativeTimeline = CSS.supports('animation-timeline: view()');
  let bounds = { top: 0, range: 1 };
  let frame = 0;
  let visible = true;
  let entries = [];

  function measure() {
    const rect = hero.getBoundingClientRect();
    bounds = { top: 0, range: Math.max(innerHeight, 1) }; // same range as the CSS: 0 to 100vh of page scroll
    entries = devices.map(device => {
      const image = device.querySelector('.screen-image');
      const screen = device.querySelector('.device-screen');
      const css = getComputedStyle(device);
      const travel = Math.min(Math.max(image.offsetHeight - screen.clientHeight, 0), screen.clientHeight * .72);
      image.style.setProperty('--screen-travel', `${-travel}px`);
      return { device, image, travel, x: parseFloat(css.getPropertyValue('--drift-x')), y: parseFloat(css.getPropertyValue('--drift-y')), angle: parseFloat(css.getPropertyValue('--angle')), end: parseFloat(css.getPropertyValue('--end-angle')) };
    });
    requestFrame();
  }

  function update() {
    frame = 0;
    if (nativeTimeline) return;
    const progress = reduced.matches ? 0 : Math.min(1, Math.max(0, (scrollY - bounds.top) / bounds.range));
    for (const item of entries) {
      item.device.style.transform = `translate3d(${item.x * progress}px, ${item.y * progress}px, 0) rotate(${item.angle + (item.end - item.angle) * progress}deg)`;
      item.image.style.transform = `translateY(${-item.travel * progress}px)`;
    }
  }

  function requestFrame() {
    if (!nativeTimeline && !frame && visible) frame = requestAnimationFrame(update);
  }

  if (!nativeTimeline) {
    addEventListener('scroll', requestFrame, { passive: true });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; requestFrame(); }).observe(hero);
  }
  const resize = new ResizeObserver(measure);
  resize.observe(hero);
  for (const image of hero.querySelectorAll('.screen-image')) {
    if (!image.complete) image.addEventListener('load', measure, { once: true });
  }
  reduced.addEventListener('change', () => { measure(); update(); });
  measure();
})();
