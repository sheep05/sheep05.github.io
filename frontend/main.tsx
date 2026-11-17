import { beginLoading, installLoadingProgress } from '../lib/loading-progress';
import './cursor.css';
import { publicEntry } from '../lib/public-entry';
import { coverPhoto } from '../lib/cover-assets';

installLoadingProgress();
const entryLoad = beginLoading();
const finishEntry = () => requestAnimationFrame(() => requestAnimationFrame(() => entryLoad.finish()));
const entry = publicEntry(location.search);
if (entry === 'gallery') {
  void import('./gallery').then(finishEntry).catch(() => { entryLoad.finish(true); document.getElementById('root')!.textContent = 'Unable to load this page. Please refresh to try again.'; });
} else {
  const photo = coverPhoto(import.meta.env.BASE_URL);
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.href = photo.src;
  preload.imageSrcset = photo.srcset;
  preload.imageSizes = photo.sizes;
  preload.fetchPriority = 'high';
  document.head.appendChild(preload);
  const url = new URL(location.href);
  if (entry === 'collections') url.hash = 'collections';
  url.searchParams.delete('view');
  history.replaceState(null, '', url);
  void import('./cover.js').then(finishEntry).catch(() => { entryLoad.finish(true); document.getElementById('root')!.textContent = 'Unable to load this page. Please refresh to try again.'; });
}
