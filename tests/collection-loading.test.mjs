import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCollection } from '../frontend/load-collection.ts';
const backend = 'https://photos.example.test';
const fixture = { settings: { name: 'Owner collection', tagline: 'Slowly.', bio: 'Photographs.', email: '', showSamples: false }, albums: [], photos: [{ id: 'photo', url: '/api/media/photo', thumb: '/api/media/thumb' }], isOwner: true, signedIn: true };
function waitForAbort(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) return reject(signal.reason);
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}
test('an unresponsive photo service times out instead of holding the page indefinitely', async t => {
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    requestSignal = options.signal;
    return waitForAbort(options.signal);
  });
  await assert.rejects(loadCollection(backend, new AbortController().signal, 20), /timed out/);
  assert.equal(requestSignal.aborted, true);
});
test('the deadline also covers a stalled JSON response body', async t => {
  t.mock.method(globalThis, 'fetch', async (_, {signal}) => ({ ok: true, json: () => waitForAbort(signal) }));
  await assert.rejects(loadCollection(backend, new AbortController().signal, 20), /timed out/);
});
test('retry can recover and normalizes public media without owner privileges or cookies', async t => {
  let attempt = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, `${backend}/api/public`);
    assert.equal(options.credentials, 'omit');
    if (!attempt++) return new Response('', { status: 503 });
    return Response.json(fixture);
  });
  await assert.rejects(loadCollection(backend, new AbortController().signal), /unavailable/);
  const result = await loadCollection(backend, new AbortController().signal);
  assert.equal(result.photos[0].url, `${backend}/api/media/photo`);
  assert.equal(result.photos[0].thumb, `${backend}/api/media/thumb`);
  assert.equal(result.isOwner, false);
  assert.equal(result.signedIn, false);
});
test('unmount cancels the request and malformed responses are rejected', async t => {
  t.mock.method(globalThis, 'fetch', async (_, {signal}) => waitForAbort(signal));
  const controller = new AbortController();
  const pending = loadCollection(backend, controller.signal);
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
  t.mock.restoreAll();
  for (const response of [
    { settings: {} },
    { settings: {}, albums: [], photos: [] },
    { ...fixture, settings: { ...fixture.settings, name: null } },
    { ...fixture, settings: { ...fixture.settings, showSamples: 'yes' } },
  ]) {
    t.mock.restoreAll();
    t.mock.method(globalThis, 'fetch', async () => Response.json(response));
    await assert.rejects(loadCollection(backend, new AbortController().signal), /Invalid/);
  }
});
