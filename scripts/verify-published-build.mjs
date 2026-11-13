import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root = 'outputs/github-pages';
const snapshot = JSON.parse(await readFile(join(root, 'published/collection.json'), 'utf8'));
const backend = JSON.parse(await readFile('config/backend.json', 'utf8'));
for (const photo of snapshot.collection.photos) {
  for (const key of ['url','thumb']) {
    if (!/^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(photo[key])) throw new Error('Remote or invalid photo URL');
    if (!(await readFile(join(root, photo[key]))).length) throw new Error('Missing exported photo');
  }
  const full = new URL(photo.fullUrl);
  if (full.origin !== backend.publicOrigin || full.username || full.password || full.search || full.hash || !/^\/api\/media\/[\w-]+$/.test(full.pathname))
    throw new Error('Unexpected full-screen media origin');
}
for (const file of await readdir(join(root, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const js = await readFile(join(root, 'assets', file), 'utf8');
  if (js.includes('/api/public')) throw new Error('Public build fetches the library at runtime');
}
console.log('Verified local previews, local full-size fallbacks, and approved click-only media URLs.');
