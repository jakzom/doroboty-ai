// Orbital B.02: decorative motion. Listing filters remain in listing.js.
document.getElementById('empty-reset')?.addEventListener('click', () => document.getElementById('reset')?.click());

(() => {
  const art = document.querySelector('.orbital-art');
  const control = document.getElementById('orbit-motion');
  const note = document.getElementById('orbit-motion-note');
  if (!art || !control) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const details = document.getElementById('details');
  // Geometry matches the existing SVG ellipses. Both copies share coordinates:
  // the lower foreground copy and the rear copy create occlusion at the globe.
  const paths = [
    { category: 'build', rx: 232, ry: 69, rotation: -27, phase: 0, duration: 90 },
    { category: 'apply', rx: 209, ry: 76, rotation: 26, phase: .47, duration: 110 },
    { category: 'lead', rx: 151, ry: 58, rotation: -68, phase: .45, duration: 130 },
  ].map(path => ({
    ...path,
    cos: Math.cos(path.rotation * Math.PI / 180),
    sin: Math.sin(path.rotation * Math.PI / 180),
    nodes: art.querySelectorAll('[data-orbit-planet="' + path.category + '"]'),
  }));

  let userPaused = false;
  let inView = !('IntersectionObserver' in window);
  let elapsed = 0;
  let lastTime = null;
  let frame = null;

  function draw() {
    for (const path of paths) {
      const angle = (path.phase + elapsed / (path.duration * 1000)) * Math.PI * 2;
      const x = path.rx * Math.cos(angle);
      const y = path.ry * Math.sin(angle);
      const cx = (283 + x * path.cos - y * path.sin).toFixed(3);
      const cy = (165 + x * path.sin + y * path.cos).toFixed(3);
      for (const node of path.nodes) {
        node.setAttribute('cx', cx);
        node.setAttribute('cy', cy);
      }
    }
  }

  function canMove() {
    return !userPaused && !reducedMotion.matches && inView && !document.hidden && !details?.open;
  }

  function tick(time) {
    frame = null;
    if (!canMove()) { lastTime = null; return; }
    // A long stall must not make a decorative planet jump on the next frame.
    if (lastTime !== null) elapsed += Math.min(Math.max(time - lastTime, 0), 80);
    lastTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    control.hidden = reducedMotion.matches;
    note.hidden = !reducedMotion.matches;
    control.querySelector('.motion-label').textContent = userPaused ? 'Wznów ruch' : 'Wstrzymaj ruch';
    control.querySelector('.motion-symbol').textContent = userPaused ? '▷' : 'Ⅱ';
    control.setAttribute('aria-label', userPaused ? 'Wznów ruch planet' : 'Wstrzymaj ruch planet');
    if (canMove()) {
      if (frame === null) { lastTime = null; frame = requestAnimationFrame(tick); }
    } else {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
    }
  }

  control.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      sync();
    }, { threshold: 0 }).observe(art);
  }
  if (details) new MutationObserver(sync).observe(details, { attributes: true, attributeFilter: ['open'] });
  draw();
  sync();
})();
