// Group newly visible siblings into one reading-order sequence per viewport update.
let observer: IntersectionObserver | undefined;

export function observeScrollReveal(element: HTMLElement | null) {
  if (!element || typeof IntersectionObserver === 'undefined') return;
  element.dataset.reveal = 'below';
  observer ??= new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    visible.sort((a, b) =>
      a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    visible.forEach((entry, index) => {
      const item = entry.target as HTMLElement;
      if (!item.hasAttribute('data-reveal')) return;
      item.style.setProperty('--reveal-delay', `${180 + Math.min(index, 10) * 125}ms`);
      item.dataset.reveal = 'visible';
    });
    for (const entry of entries) {
      const item = entry.target as HTMLElement;
      if (entry.isIntersecting || !item.hasAttribute('data-reveal')) continue;
      item.style.removeProperty('--reveal-delay');
      item.dataset.reveal = entry.boundingClientRect.bottom <= 0 ? 'above' : 'below';
    }
  });
  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    delete element.dataset.reveal;
    element.style.removeProperty('--reveal-delay');
  };
}

let photoObserver: IntersectionObserver | undefined;
let lastPhotoScrollY = 0;

export function observePhotoReveal(frame: HTMLElement | null) {
  const image = frame?.querySelector('img');
  if (!frame || !image || typeof IntersectionObserver === 'undefined') return;

  // Observe the stationary frame so the moving picture cannot retrigger itself.
  photoObserver ??= new IntersectionObserver(entries => {
    const scrollY = window.scrollY;
    for (const entry of entries) {
      const frame = entry.target as HTMLElement;
      if (!entry.isIntersecting) {
        frame.dataset.photoReveal = 'outside';
        continue;
      }
      const fromAbove = scrollY === lastPhotoScrollY
        ? entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)
        : scrollY < lastPhotoScrollY;
      frame.dataset.photoReveal = frame.dataset.photoReveal !== 'initial' && fromAbove ? 'above' : 'below';
    }
    lastPhotoScrollY = scrollY;
  });
  frame.dataset.photoReveal = 'initial';
  photoObserver.observe(frame);

  let mounted = true;
  const ready = () => { if (mounted) frame.dataset.photoReady = ''; };
  const afterLoad = () => {
    if (image.decode) void image.decode().then(ready, ready);
    else ready();
  };
  image.addEventListener('load', afterLoad);
  image.addEventListener('error', ready);
  if (image.complete) afterLoad();

  return () => {
    mounted = false;
    photoObserver?.unobserve(frame);
    image.removeEventListener('load', afterLoad);
    image.removeEventListener('error', ready);
    delete frame.dataset.photoReveal;
    delete frame.dataset.photoReady;
  };
}
