type BuildManifest = Record<string, { file: string; imports?: string[]; dynamicImports?: string[]; css?: string[] }>;
type PreloadResources = { photos?: string[]; workshop?: string[] };
type Connection = { saveData?: boolean; effectiveType?: string };

export function allowsCoverPreload(connection?: Connection) {
  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType || '');
}

// Warm gallery essentials first; follow dynamic workshop imports in the later pass.
export function galleryWarmAssets(manifest: BuildManifest, includeDynamic = false): string[] {
  const files = new Set<string>(), visited = new Set<string>();
  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    for (const file of [chunk.file, ...(chunk.css || [])]) {
      if (/^assets\/[^?#]+\.(js|css)$/.test(file)) files.add(file);
    }
    chunk.imports?.forEach(visit);
    if (includeDynamic) chunk.dynamicImports?.forEach(visit);
  }
  visit('gallery.tsx');
  return [...files];
}

export async function warmCoverDestinations(base: string, signal: AbortSignal, animate: boolean) {
  const options = { signal, credentials: 'same-origin', priority: 'low' } as RequestInit;
  async function read<T>(file: string): Promise<T> {
    try {
      const response = await fetch(`${base}${file}`, { ...options, cache:'no-cache' });
      return response.ok ? await response.json() as T : {} as T;
    } catch { return {} as T; }
  }
  const [manifest, resources] = await Promise.all([
    read<BuildManifest>('preload-manifest.json'), read<PreloadResources>('preload-resources.json'),
  ]);
  const visited = new Set<string>();
  async function warm(file: string) {
    try {
      const response = await fetch(`${base}${file}`, options);
      // Consume the complete response so subsequent page/media requests can reuse it.
      if (response.ok) await response.arrayBuffer();
    } catch { /* Speculation must never block navigation or display an error. */ }
  }
  async function drain(files: string[]) {
    const queue = files.filter(file => {
      if (visited.has(file)) return false;
      visited.add(file);
      return true;
    });
    // Two low-priority transfers at a time; do not decode photos or run 3D code.
    await Promise.all([0, 1].map(async () => {
      while (queue.length && !signal.aborted) await warm(queue.shift()!);
    }));
  }
  await drain(['atlas/crystal-poster.webp', ...(animate ? ['atlas/crystal-loop.mp4'] : []), ...galleryWarmAssets(manifest)]);
  const media = (resources.photos || []).filter(path => /^(published\/media\/[a-f0-9]{64}|samples\/[\w-]+)\.jpg$/.test(path));
  const workshop = (resources.workshop || []).filter(path => /^materials\/poly-haven\/[\w/-]+\.(jpg|webp|png|hdr)$/.test(path));
  await drain([...media, ...galleryWarmAssets(manifest, true), ...workshop]);
}

export function scheduleCoverPreload(base: string) {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (!allowsCoverPreload(connection)) return;
  const controller = new AbortController();
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
  const run = () => {
    if (controller.signal.aborted || !allowsCoverPreload(connection)) return;
    if (document.hidden) {
      document.addEventListener('visibilitychange', run, { once: true, signal: controller.signal });
      return;
    }
    const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    void warmCoverDestinations(base, controller.signal, animate);
  };
  const ready = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 500);
  };
  // Protect the first visit: the cover image gets the connection to itself first.
  const photo = document.querySelector<HTMLImageElement>('.about-photo img');
  if (photo) void photo.decode().catch(() => {}).then(ready);
  else ready();
}
