import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root = 'outputs/github-pages';
const snapshot = JSON.parse(await readFile(join(root, 'published/collection.json'), 'utf8'));
for (const photo of snapshot.collection.photos) {
  for (const key of ['url','thumb']) {
    if (!/^\/published\/media\/[a-f0-9]{64}\.jpg$/.test(photo[key])) throw new Error('Remote or invalid photo URL');
    if (!(await readFile(join(root, photo[key]))).length) throw new Error('Missing exported photo');
  }
}
for (const file of await readdir(join(root, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const js = await readFile(join(root, 'assets', file), 'utf8');
  if (js.includes('/api/public') || js.includes('/api/media/')) throw new Error('Public build still depends on the backend');
}
console.log('Verified local public photos and no visitor API dependency.');
