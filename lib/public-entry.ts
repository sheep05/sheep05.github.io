// Preserve existing album URLs while making the About cover the default entry.
export function galleryRoute(search: string) {
  const params = new URLSearchParams(search);
  const from = params.get('from') || 'collection';
  return {
    view: params.has('album') ? 'album' : params.get('view') || 'studio',
    album: params.get('album'),
    region: params.get('region'),
    from: ['scenes', 'portraits', 'street', 'all'].includes(from) ? from : 'collection',
  };
}

export function publicEntry(search: string): 'cover' | 'collections' | 'gallery' {
  const params = new URLSearchParams(search);
  if (params.has('album')) return 'gallery';
  const view = params.get('view');
  if (view === 'collection') return 'collections';
  return ['studio', 'scenes', 'portraits', 'street', 'all'].includes(view || '')
    ? 'gallery'
    : 'cover';
}
