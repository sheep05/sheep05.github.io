// Share the compressed texture across Atlas visits without retaining a WebGL context.
let texture: Promise<Blob> | undefined;
let textureBase = '';
export function loadAtlasTexture(base: string): Promise<Blob> {
  if (!texture || textureBase !== base) {
    textureBase = base;
    texture = (async () => {
      for (const filename of ['earth-day-4k.jpg', 'earth-day.jpg']) {
        try {
          const response = await fetch(`${base}atlas/${filename}`, { signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error('Earth texture unavailable');
          return await response.blob();
        } catch (error) {
          if (filename === 'earth-day.jpg') throw error;
        }
      }
      throw new Error('Earth texture unavailable');
    })().catch(error => { texture = undefined; throw error; });
  }
  return texture;
}

export function warmAtlas(base: string) {
  // Intent-only warming: the cover does not fetch Earth assets until Atlas is targeted.
  return Promise.all([import('three'), loadAtlasTexture(base)]).catch(() => {});
}
