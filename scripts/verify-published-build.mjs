import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from "sharp";
const root = 'outputs/github-pages';
const snapshot = JSON.parse(await readFile(join(root, 'published/collection.json'), 'utf8'));
const renditions = JSON.parse(await readFile(join(root, 'published/renditions.json'), 'utf8'));
let mediaBytes = 0;
const sources = new Set();
const derived = new Set();
const known = new Set(snapshot.collection.photos.map(photo => photo.url));
if (Object.keys(renditions).some(url => !known.has(url))) throw new Error('Unexpected rendition source');
for (const photo of snapshot.collection.photos) {
  for (const key of ['url','thumb']) {
    if (!/^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(photo[key])) throw new Error('Remote or invalid photo URL');
    const bytes = (await readFile(join(root, photo[key]))).length;
    if (!bytes) throw new Error('Missing exported photo');
    if (!sources.has(photo[key])) mediaBytes += bytes;
    sources.add(photo[key]);
  }
  const variants = renditions[photo.url];
  if (!variants?.length || variants.length > 4) throw new Error('Invalid rendition count');
  let last = 0;
  for (const variant of variants) {
    if (!/^\/published\/renditions\/[a-f0-9]{24}-\d+\.webp$/.test(variant.url)) throw new Error('Invalid rendition URL');
    const bytes = await readFile(join(root, variant.url));
    if (!derived.has(variant.url)) mediaBytes += bytes.length;
    derived.add(variant.url);
    const info = await sharp(bytes).metadata();
    if (info.format !== 'webp' || info.width !== variant.width || variant.width <= last || variant.width > Math.min(photo.width, 1600)) {
      throw new Error('Invalid rendition width or format');
    }
    last = variant.width;
  }
}
if (mediaBytes >= 900 * 1024 * 1024) throw new Error('Published JPEGs and WebPs exceed the media budget');
for (const file of await readdir(join(root, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const js = await readFile(join(root, 'assets', file), 'utf8');
  if (js.includes('/api/public') || js.includes('/api/media/')) throw new Error('Public build still depends on the backend');
}
console.log('Verified local public photos, matching WebP rendition files, and no visitor API dependency.');
