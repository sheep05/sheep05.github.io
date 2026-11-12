import { publicEntry } from '../lib/public-entry';

const entry = publicEntry(location.search);
if (entry === 'gallery') {
  void import('./gallery');
} else {
  const url = new URL(location.href);
  if (entry === 'collections') url.hash = 'collections';
  url.searchParams.delete('view');
  history.replaceState(null, '', url);
  void import('./cover.js');
}
