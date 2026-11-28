import { beginLoading, installLoadingProgress } from '../lib/loading-progress';
import './cursor.css';
import { publicEntry } from '../lib/public-entry';
import slides from 'virtual:cover-slides';
import { coverPhoto, slideSrcset, tallCover } from '../lib/cover-assets';

installLoadingProgress();
const entryLoad = beginLoading();
const finishEntry = () => requestAnimationFrame(() => requestAnimationFrame(() => entryLoad.finish()));
const entry = publicEntry(location.search);
if (entry === 'gallery') {
  void import('./gallery').then(finishEntry).catch(() => { entryLoad.finish(true); document.getElementById('root')!.textContent = 'Unable to load this page. Please refresh to try again.'; });
} else {
  const base = import.meta.env.BASE_URL;
  const opening = slides[0];
  const fallback = coverPhoto(base);
  const sources = opening ? [
    {srcset:slideSrcset(base, opening.wide), sizes:'100vw', media:'not all and ' + tallCover},
    {srcset:slideSrcset(base, opening.tall), sizes:'100vw', media:tallCover},
  ] : [{srcset:fallback.srcset, sizes:fallback.sizes, media:'all'}];
  for (const source of sources) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.media = source.media;
    preload.imageSrcset = source.srcset;
    preload.imageSizes = source.sizes;
    preload.fetchPriority = 'high';
    document.head.appendChild(preload);
  }
  const url = new URL(location.href);
  if (entry === 'collections') url.hash = 'collections';
  url.searchParams.delete('view');
  history.replaceState(null, '', url);
  void import('./cover.js').then(finishEntry).catch(() => { entryLoad.finish(true); document.getElementById('root')!.textContent = 'Unable to load this page. Please refresh to try again.'; });
}
