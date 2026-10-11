'use strict';
(() => {
  const scene = document.querySelector('#heroScene');
  if (!scene || !window.matchMedia || !window.requestAnimationFrame) return;
  const hero = scene.querySelector('.hero');
  const background = scene.querySelector('.hero-bg');
  const copy = scene.querySelector('.hero-copy');
  const hint = scene.querySelector('.hero-bottom');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  let frame = 0;
  let size = null;
  let lastProgress = -1;

  function measure() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    // Book centre in the retained 1672 × 941 panorama, after background-cover cropping.
    const ratio = Math.max(width / 1672, height / 941);
    const style = window.getComputedStyle(background);
    const positionX = parseFloat(style.backgroundPositionX) / 100;
    const positionY = parseFloat(style.backgroundPositionY) / 100;
    const focusX = 1672 * ratio * .616 + (width - 1672 * ratio) * positionX;
    const focusY = 941 * ratio * .731 + (height - 941 * ratio) * positionY;
    size = {
      travel: Math.max(1, scene.offsetHeight - height),
      x: width * .5 - focusX,
      y: height * .57 - focusY,
      zoom: width <= 600 ? 2.45 : 3.05
    };
    scene.style.setProperty('--book-x', focusX + 'px');
    scene.style.setProperty('--book-y', focusY + 'px');
  }

  function paint() {
    frame = 0;
    if (reduced.matches) return;
    const progress = clamp(-scene.getBoundingClientRect().top / size.travel);
    if (progress === lastProgress) return;
    lastProgress = progress;
    // Finish the zoom before the sticky scene releases into the next section.
    const zoom = ease(clamp(progress / .86));
    const fade = clamp(progress / .38);
    scene.style.setProperty('--hero-scale', (1 + (size.zoom - 1) * zoom).toFixed(4));
    scene.style.setProperty('--hero-x', (size.x * zoom).toFixed(2) + 'px');
    scene.style.setProperty('--hero-y', (size.y * zoom).toFixed(2) + 'px');
    scene.style.setProperty('--hero-copy-opacity', (1 - fade).toFixed(3));
    scene.style.setProperty('--hero-copy-y', (-32 * fade).toFixed(2) + 'px');
    scene.style.setProperty('--hero-hint-opacity', (1 - clamp(progress / .2)).toFixed(3));
    scene.style.setProperty('--hero-shade-opacity', (1 - .38 * zoom).toFixed(3));
    const hidden = fade === 1;
    scene.classList.toggle('hero-reading', hidden);
    copy.inert = hidden;
    hint.inert = hidden;
  }

  function requestPaint() {
    if (!reduced.matches && !frame) frame = window.requestAnimationFrame(paint);
  }

  function refresh() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastProgress = -1;
    scene.classList.toggle('is-animated', !reduced.matches);
    if (reduced.matches) {
      scene.classList.remove('hero-reading');
      scene.removeAttribute('style');
      copy.inert = false;
      hint.inert = false;
      return;
    }
    measure();
    paint();
  }

  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  reduced.addEventListener('change', refresh);
  refresh();
})();
