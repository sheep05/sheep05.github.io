import { publicEntry } from '../lib/public-entry';
import { coverPhoto } from '../lib/cover-assets';

const entry = publicEntry(location.search);
if (entry === 'gallery') {
  void import('./gallery');
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
  void import('./cover.js');
}
