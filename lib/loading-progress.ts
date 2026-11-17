// Progress measures required assets, not elapsed time. Each image/module is one
// unit; a video's unit advances with its buffered duration. Lazy offscreen photos
// do not hold the page open. Failures/cancellations settle without a false 100%.
type Task = { value: number; failed: boolean };
const tasks = new Map<symbol, Task>();
const listeners = new Set<() => void>();
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
let highWater = 0;
let batch = 0;
function notify() { listeners.forEach(fn => fn()); }
export function loadingSnapshot() {
  const entries = [...tasks.values()];
  const pending = entries.some(t => t.value < 1);
  const failed = entries.some(t => t.failed);
  const progress = entries.length ? entries.reduce((sum, t) => sum + t.value, 0) / entries.length : 0;
  highWater = pending ? Math.max(highWater, Math.min(99, Math.floor(progress * 100))) : failed ? highWater : 100;
  return { active: entries.length > 0, pending, failed, percent: highWater, batch };
}
export function beginLoading() {
  clearTimeout(cleanupTimer);
  if (![...tasks.values()].some(t => t.value < 1)) { tasks.clear(); highWater = 0; batch++; }
  const id = Symbol();
  const task = { value: 0, failed: false };
  tasks.set(id, task); notify();
  const timeout = setTimeout(() => finish(true), 30000);
  function finish(failed = false) {
    if (!tasks.has(id) || task.value === 1) return;
    clearTimeout(timeout); task.value = 1; task.failed = failed; notify();
    if (![...tasks.values()].some(t => t.value < 1)) cleanupTimer = setTimeout(() => { tasks.clear(); highWater = 0; notify(); }, failed ? 0 : 240);
  }
  return { finish, update(value: number) { if (tasks.has(id)) { task.value = Math.max(task.value, Math.min(.99, value)); notify(); } } };
}

let installed = false;
export function installLoadingProgress() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const badge = document.createElement('div');
  badge.className = 'loading-cursor';
  badge.setAttribute('role', 'progressbar');
  badge.setAttribute('aria-hidden', 'true');
  badge.setAttribute('aria-label', 'Loading visible content');
  badge.setAttribute('aria-valuemin', '0'); badge.setAttribute('aria-valuemax', '100');
  badge.innerHTML = '<i aria-hidden="true"></i><span aria-hidden="true">0%</span>';
  document.body.appendChild(badge);
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let wasActive = false;
  let displayedBatch = -1;
  let displayed = 0;
  let target = 0;
  let frame = 0;
  let previousTime = 0;
  const label = badge.querySelector('span')!;
  const paint = () => {
    badge.style.setProperty('--load', `${displayed}%`);
    badge.setAttribute('aria-valuenow', String(Math.floor(displayed)));
    label.textContent = `${Math.floor(displayed)}%`;
  };
  const hide = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    badge.classList.remove('is-loading');
    badge.setAttribute('aria-hidden', 'true');
    wasActive = false;
  };
  const animate = (time: number) => {
    // Move at a constant rate toward measured progress, never ahead of it.
    // Cap a frame's step so returning from a background tab cannot cause a jump.
    displayed = Math.min(target, displayed + Math.min(time - previousTime, 32) * .1);
    previousTime = time;
    paint();
    frame = 0;
    if (displayed < target) frame = requestAnimationFrame(animate);
    else if (displayed === 100) hideTimer = setTimeout(hide, 160);
  };
  const render = () => {
    const state = loadingSnapshot();
    if (!state.active) return; // Let the final sweep finish after task cleanup.
    if (!state.pending && state.failed) { hide(); return; }
    clearTimeout(hideTimer);
    if (!wasActive || displayedBatch !== state.batch) {
      hide();
      displayedBatch = state.batch;
      displayed = 0;
      paint();
      badge.setAttribute('aria-hidden', 'false');
      showTimer = setTimeout(() => badge.classList.add('is-loading'), 120);
    }
    wasActive = true;
    target = Math.max(displayed, state.percent);
    if (!frame && displayed < target) {
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  };
  listeners.add(render);
  let x = 0, y = 0, hasPointer = false;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  function position() {
    badge.classList.toggle('at-pointer', hasPointer && fine.matches);
    if (hasPointer && fine.matches) {
      badge.style.left = `${Math.max(8, Math.min(x + 24, innerWidth - 92))}px`;
      badge.style.top = `${Math.max(8, Math.min(y + 12, innerHeight - 32))}px`;
    } else { badge.style.left = ''; badge.style.top = ''; }
  }
  try { const last = JSON.parse(sessionStorage.getItem('pointer-position') || 'null'); if (last) { [x, y] = last; hasPointer = true; position(); } } catch { /* Storage may be disabled. */ }
  document.addEventListener('pointermove', event => { hasPointer = event.pointerType === 'mouse'; x = event.clientX; y = event.clientY; position(); });
  window.addEventListener('pagehide', () => { try { if (hasPointer) sessionStorage.setItem('pointer-position', JSON.stringify([x, y])); } catch {} });
  window.addEventListener('resize', position);
  document.documentElement.addEventListener('pointerleave', () => { hasPointer = false; position(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') { hasPointer = false; position(); } });
  const tracked = new Map<HTMLImageElement | HTMLVideoElement, { src: string; cancel: () => void }>();
  function track(media: HTMLImageElement | HTMLVideoElement) {
    const src = media.getAttribute('src') || media.getAttribute('srcset')
      ? `${media.getAttribute('src') || ''}|${media.getAttribute('srcset') || ''}` : '';
    if (!src || tracked.get(media)?.src === src) return;
    tracked.get(media)?.cancel();
    if (media instanceof HTMLImageElement && media.complete) return;
    if (media instanceof HTMLVideoElement && media.readyState >= 3) return;
    const task = beginLoading();
    let ended = false;
    const readyEvent = media instanceof HTMLImageElement ? 'load' : 'canplay';
    const clean = () => { media.removeEventListener(readyEvent, ready); media.removeEventListener('error', error); media.removeEventListener('progress', progress); };
    const finish = (failed: boolean) => { if (ended) return; ended = true; clean(); task.finish(failed); };
    const ready = () => {
      if (media instanceof HTMLImageElement) void media.decode().catch(() => {}).then(() => finish(false));
      else finish(false);
    };
    const error = () => finish(true);
    const progress = () => {
      if (media instanceof HTMLVideoElement && Number.isFinite(media.duration) && media.duration > 0 && media.buffered.length) task.update(media.buffered.end(media.buffered.length - 1) / media.duration);
    };
    tracked.set(media, { src, cancel: () => finish(true) });
    media.addEventListener(readyEvent, ready); media.addEventListener('error', error); media.addEventListener('progress', progress);
  }
  const near = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) track(entry.target as HTMLImageElement | HTMLVideoElement); });
  const observed = new WeakSet<Element>();
  function scan() {
    const host = document.querySelector('dialog[open]') || document.body;
    if (badge.parentElement !== host) host.appendChild(badge);
    for (const [media, task] of tracked) if (!media.isConnected) { task.cancel(); tracked.delete(media); }
    for (const media of document.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img,video')) {
      if (!observed.has(media)) { near.observe(media); observed.add(media); }
      const rect = media.getBoundingClientRect();
      if (rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0 && !media.closest('[inert],[hidden]')) track(media);
    }
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => !badge.contains(record.target))) scan();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'open'] });
  scan(); render();
}
