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
