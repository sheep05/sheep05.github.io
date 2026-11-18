// Version the stored bytes so a later encode cannot reuse an older loop.
const versions: Record<string, string> = {
  'atlas/crystal-mobile.mp4': '78a5268c',
  'atlas/crystal-loop.mp4': '055338b5',
};
const cacheName = 'atlas-crystal';

export function crystalFile(compact: boolean) {
  return compact ? 'atlas/crystal-mobile.mp4' : 'atlas/crystal-loop.mp4';
}

export function compactCrystal() {
  return matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 760px)').matches;
}

function cacheKey(base: string, file: string) {
  return base + file + '?film=' + versions[file];
}

export async function storeCrystal(base: string, file: string, response: Response) {
  const bytes = await response.blob();
  const key = cacheKey(base, file);
  const cache = await caches.open(cacheName);
  await cache.put(key, new Response(bytes, { headers: { 'Content-Type': 'video/mp4' } }));
  sessionStorage.setItem(key, 'ready');
}

export async function warmedCrystal(base: string, file: string) {
  try {
    const key = cacheKey(base, file);
    if (!sessionStorage.getItem(key)) return;
    const cached = await caches.match(key, { cacheName });
    if (cached) return await cached.blob();
  } catch { /* Native video streaming also works with browser storage disabled. */ }
}
