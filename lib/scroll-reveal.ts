// One observer serves the gallery, including albums mounted after navigation.
let observer: IntersectionObserver | undefined;

export function observeScrollReveal(element: HTMLElement | null) {
  if (!element || typeof IntersectionObserver === 'undefined') return;

  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      const item = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        item.dataset.reveal = 'visible';
      } else {
        item.dataset.reveal = entry.boundingClientRect.bottom <= 0 ? 'above' : 'below';
      }
    }
  });

  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    delete element.dataset.reveal;
  };
}
