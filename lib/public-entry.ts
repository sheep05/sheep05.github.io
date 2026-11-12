// Preserve existing album URLs while making the About cover the default entry.
export function publicEntry(search: string): 'cover' | 'collections' | 'gallery' {
  const params = new URLSearchParams(search);
  if (params.has('album')) return 'gallery';
  const view = params.get('view');
  if (view === 'collection') return 'collections';
  return ['studio', 'scenes', 'portraits', 'street', 'all'].includes(view || '')
    ? 'gallery'
    : 'cover';
}
