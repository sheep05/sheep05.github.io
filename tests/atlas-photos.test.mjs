import test from 'node:test';
import assert from 'node:assert/strict';
import { mixedAtlasPhotos } from '../lib/atlas-photos.ts';
import { beginLoading, loadingSnapshot } from '../lib/loading-progress.ts';

test('Atlas interleaves all regions, omits other chapters, and deduplicates originals', () => {
  const albums = [
    { chapters: ['scenes'], photoIds: ['jp1', 'shared', 'jp2'] },
    { chapters: ['scenes'], photoIds: ['sg1', 'shared'] },
    { chapters: ['scenes'], photoIds: ['my1'] },
    { chapters: ['scenes'], photoIds: ['cn1', 'missing'] },
    { chapters: ['street'], photoIds: ['car'] },
  ];
  const photos = ['jp1','shared','jp2','sg1','my1','cn1','car'].map(id=>({id}));
  assert.deepEqual(mixedAtlasPhotos(albums, photos).map(p=>p.id), ['jp1','sg1','my1','cn1','shared','jp2']);
  assert.deepEqual(mixedAtlasPhotos([], photos), []);
});

test('loading advances from real task completion and buffering, not time', async () => {
  const image = beginLoading(), film = beginLoading();
  assert.equal(loadingSnapshot().percent, 0);
  image.finish();
  assert.equal(loadingSnapshot().percent, 50);
  film.update(.6);
  assert.equal(loadingSnapshot().percent, 80);
  await new Promise(resolve=>setTimeout(resolve, 50));
  assert.equal(loadingSnapshot().percent, 80);
  film.finish();
  assert.equal(loadingSnapshot().percent, 100);
  const failed = beginLoading(), pending = beginLoading();
  failed.finish(true);
  assert.equal(loadingSnapshot().pending, true);
  pending.finish();
  assert.equal(loadingSnapshot().failed, true);
  assert.notEqual(loadingSnapshot().percent, 100);
  await new Promise(resolve=>setTimeout(resolve, 260));
  assert.equal(loadingSnapshot().active, false);
});
