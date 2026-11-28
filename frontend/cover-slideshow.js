import slides from 'virtual:cover-slides';
import { coverPhoto, slideSrcset, tallCover } from '../lib/cover-assets';

export function installCoverSlideshow(base) {
  const stage = document.querySelector('.cover-frames');
  const playback = document.querySelector('.cover-playback');
  const pause = playback.querySelector('.cover-pause');
  const next = playback.querySelector('.cover-next');
  const caption = playback.querySelector('.cover-caption');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches || !!navigator.connection?.saveData;
  let menuOpen = false;
  let current = 0;
  let pending;
  let changing = false;
  let ready = false;
  let advanceTimer, preloadTimer;
  const unavailable = new Set();

  function picture(slide, first = false) {
    const frame = document.createElement('picture');
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = first ? 'high' : 'low';
    image.alt = slide?.alt ?? 'Sheep holding a camera beneath trees';
    if (slide) {
      const mobile = document.createElement('source');
      mobile.media = tallCover;
      mobile.sizes = '100vw';
      mobile.srcset = slideSrcset(base, slide.tall);
      frame.append(mobile, image);
      image.sizes = '100vw';
      image.srcset = slideSrcset(base, slide.wide);
      image.src = base + slide.wide[0].url.slice(1);
    } else {
      const fallback = coverPhoto(base);
      frame.append(image);
      image.sizes = fallback.sizes;
      image.srcset = fallback.srcset;
      image.src = fallback.src;
    }
    return frame;
  }

  function canPlay() { return !paused && !menuOpen && !document.hidden; }
  function nextIndex() {
    for (let step = 1; step < slides.length; step++) {
      const index = (current + step) % slides.length;
      if (!unavailable.has(index)) return index;
    }
    return -1;
  }
  function schedule() {
    clearTimeout(advanceTimer);
    clearTimeout(preloadTimer);
    pause.dataset.paused = String(paused);
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    playback.hidden = nextIndex() < 0;
    if (!ready || changing || playback.hidden || !canPlay()) return;
    preloadTimer = setTimeout(prepare, 1200);
    advanceTimer = setTimeout(() => advance(false), 5200);
  }
  function prepare() {
    if (pending) return pending;
    const index = nextIndex();
    if (index < 0) return;
    const frame = picture(slides[index]);
    const decoded = frame.querySelector('img').decode().then(() => true, () => false);
    pending = {index,frame,decoded};
    return pending;
  }
  async function advance(manual) {
    if (changing || !ready || menuOpen || document.hidden) return;
    let upcoming = prepare();
    if (!upcoming) return;
    changing = true;
    clearTimeout(advanceTimer);
    clearTimeout(preloadTimer);
    try {
      while (upcoming && !(await upcoming.decoded)) {
        unavailable.add(upcoming.index);
        pending = undefined;
        if (!manual && !canPlay()) return;
        upcoming = prepare();
      }
      if (!upcoming || menuOpen || document.hidden || (!manual && !canPlay())) return;
      const previous = stage.firstElementChild;
      previous.setAttribute('aria-hidden','true');
      stage.append(upcoming.frame);
      // Keep the old frame opaque underneath for the entire dissolve.
      upcoming.frame.getBoundingClientRect();
      upcoming.frame.classList.add('shown');
      current = upcoming.index;
      pending = undefined;
      caption.textContent = slides[current].title;
      const animations = upcoming.frame.getAnimations();
      await Promise.allSettled(animations.map(animation => animation.finished));
      previous.remove();
    } finally {
      changing = false;
      schedule();
    }
  }

  const first = picture(slides[0], true);
  first.classList.add('shown');
  stage.append(first);
  caption.textContent = slides[0]?.title ?? '';
  first.querySelector('img').decode().catch(() => {
    if (slides[0]) {
      unavailable.add(0);
      const fallback = picture(null, true);
      fallback.classList.add('shown');
      first.replaceWith(fallback);
      caption.textContent = '';
    }
  }).finally(() => { ready = true; schedule(); });
  pause.addEventListener('click', () => { paused = !paused; schedule(); });
  next.addEventListener('click', () => advance(true));
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { if (motion.matches) paused = true; schedule(); });
  schedule();
  return { setMenuOpen(open) { menuOpen = open; schedule(); } };
}
