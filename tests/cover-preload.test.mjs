import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { allowsCoverPreload, galleryWarmAssets, warmCoverDestinations } from '../lib/cover-preload.ts';

const manifest = {
  'gallery.tsx': { file:'assets/gallery.js', css:['assets/gallery.css'], imports:['react', 'shared'], dynamicImports:['room'] },
  react: { file:'assets/react.js', imports:['shared'] },
  shared: { file:'assets/shared.js', imports:['react'] },
  room: { file:'assets/three.js' },
};
const original = `published/media/${'a'.repeat(64)}.jpg`;
const thumb = `published/media/${'b'.repeat(64)}.jpg`;
const texture = 'materials/poly-haven/oak_veneer_02/color.jpg';
const resources = { photos:[original, thumb, original, 'https://external.test/private.jpg'], workshop:[texture] };

test('warming follows shared dependencies once, without executing or fetching the workshop', () => {
  assert.deepEqual(galleryWarmAssets(manifest), ['assets/gallery.js','assets/gallery.css','assets/react.js','assets/shared.js']);
  assert.deepEqual(galleryWarmAssets({}), []);
  assert.ok(galleryWarmAssets(manifest, true).includes('assets/three.js'));
});

test('automatic warming respects data saving and very slow connections', () => {
  assert.equal(allowsCoverPreload(), true);
  assert.equal(allowsCoverPreload({effectiveType:'4g'}), true);
  for (const connection of [{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}]) {
    assert.equal(allowsCoverPreload(connection), false);
  }
});

test('warming covers video, photos, thumbnails and workshop with bounded concurrency and no duplicate downloads', async t => {
  const requested = [], consumed = [];
  let active = 0, peak = 0;
  const signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requested.push(url);
    assert.equal(options.signal, signal);
    assert.equal(options.priority, 'low');
    if (url.endsWith('preload-manifest.json')) return {ok:true, json:async()=>manifest};
    if (url.endsWith('preload-resources.json')) return {ok:true, json:async()=>resources};
    if (url.endsWith('crystal-poster.webp')) throw new Error('offline');
    active++; peak = Math.max(peak, active);
    return {ok:true, arrayBuffer:async()=>{
      await new Promise(resolve=>setImmediate(resolve));
      active--; consumed.push(url); return new ArrayBuffer(1);
    }};
  });
  await warmCoverDestinations('/portfolio/', signal, true);
  assert.ok(consumed.includes('/portfolio/atlas/crystal-loop.mp4'));
  assert.ok(consumed.includes('/portfolio/assets/gallery.css'));
  assert.ok(consumed.includes('/portfolio/assets/gallery.js'));
  for (const file of [original, thumb, texture, 'assets/three.js']) assert.ok(consumed.includes(`/portfolio/${file}`));
  assert.equal(new Set(requested).size, requested.length);
  assert.ok(peak <= 2);
  assert.ok(requested.indexOf('/portfolio/assets/react.js') < requested.indexOf(`/portfolio/${original}`));
  assert.ok(requested.every(url=>url.startsWith('/portfolio/')));
  assert.ok(!requested.some(url=>url.includes('external.test')));
});

test('reduced motion warms only the poster and code; missing manifest is harmless', async t => {
  const requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requested.push(url);
    return {ok:!url.endsWith('.json'), arrayBuffer:async()=>new ArrayBuffer(1)};
  });
  await warmCoverDestinations('/', new AbortController().signal, false);
  assert.deepEqual(requested.sort(), ['/atlas/crystal-poster.webp','/preload-manifest.json','/preload-resources.json']);
});

test('leaving the cover stops queued background downloads', async t => {
  const controller = new AbortController(), requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requested.push(url);
    if (url.endsWith('preload-manifest.json')) return {ok:true, json:async()=>manifest};
    if (url.endsWith('preload-resources.json')) return {ok:true, json:async()=>resources};
    return {ok:true, arrayBuffer:async()=>{controller.abort(); return new ArrayBuffer(1);}};
  });
  await warmCoverDestinations('/', controller.signal, true);
  assert.ok(!requested.some(url=>url.includes('/published/') || url.includes('/materials/')));
});

const builtManifest = new URL('../outputs/github-pages/preload-manifest.json', import.meta.url);
test('the production manifest separates initial gallery code and later workshop code', {skip:!existsSync(builtManifest)}, () => {
  const built = JSON.parse(readFileSync(builtManifest));
  const files = galleryWarmAssets(built);
  assert.ok(files.some(file=>/gallery-.*\.js$/.test(file)));
  assert.ok(files.some(file=>/gallery-.*\.css$/.test(file)));
  assert.ok(files.some(file=>/react-vendor/.test(file)));
  assert.ok(!files.some(file=>/three|study-room|study-materials|RoomEnvironment/.test(file)));
  assert.ok(galleryWarmAssets(built, true).some(file=>/three/.test(file)));
});

const builtResources = new URL('../outputs/github-pages/preload-resources.json', import.meta.url);
test('the generated list includes every published photo and thumbnail and only existing local resources', {skip:!existsSync(builtResources)}, () => {
  const list = JSON.parse(readFileSync(builtResources));
  const {collection} = JSON.parse(readFileSync(new URL('../public/published/collection.json', import.meta.url)));
  for (const photo of collection.photos) for (const key of ['url','thumb']) assert.ok(list.photos.includes(photo[key].slice(1)));
  assert.equal(new Set(list.photos).size, list.photos.length);
  assert.ok(list.workshop.some(path=>path.endsWith('.hdr')));
  for (const path of [...list.photos,...list.workshop]) assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));
});
