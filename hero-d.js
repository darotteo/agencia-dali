// Hands the hero D's canvas to a worker (d-worker.js) and feeds it size, pointer, scroll and whether it should draw.
export function startD(stage) {
  const canvas = stage.querySelector('.d-canvas');
  // Without OffscreenCanvas (Safari before 17) the SVG poster stays; drawing on the main thread froze scrolling for seconds.
  if (!canvas.transferControlToOffscreen) return;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const worker = new Worker(new URL('./d-worker.js?v=n-1', import.meta.url), { type: 'module' });
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({
    canvas: offscreen,
    pixelRatio: Math.min(devicePixelRatio, coarse ? 1.25 : 1.5), // phones: less GPU work
    gap: coarse ? 30 : 0 // phones: 30 fps is plenty for a slow sway
  }, [offscreen]);
  worker.onmessage = () => stage.classList.add('is-live');
  worker.onerror = (e) => console.warn('D 3D:', e.message);

  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    worker.postMessage({ width, height });
  }).observe(canvas);

  addEventListener('pointermove', (e) => {
    worker.postMessage({ aimX: e.clientX / innerWidth * 2 - 1, aimY: e.clientY / innerHeight * 2 - 1 });
  }, { passive: true });

  let onScreen = true;
  let covered = false;
  let running = null;
  const run = () => {
    const next = onScreen && !covered && !document.hidden;
    if (next !== running) { running = next; worker.postMessage({ run: next }); }
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(stage);
  // The pinned hero stays in the viewport while it fades out, so stop drawing once it is gone.
  const onScroll = () => {
    covered = scrollY > innerHeight * 1.4;
    run();
    if (running) worker.postMessage({ scroll: Math.min(scrollY / (innerHeight * 1.45), 1) }); // spans the pinned stretch until the page covers the hero
  };
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', run);
  onScroll();
}
