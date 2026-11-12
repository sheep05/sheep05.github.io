import test from 'node:test';
import assert from 'node:assert/strict';
import { publicEntry } from '../lib/public-entry.ts';

test('home and old About links open the lightweight cover', () => {
  for (const query of ['', '?view=about', '?view=unknown', '?design=c']) {
    assert.equal(publicEntry(query), 'cover', query);
  }
});
test('the old collection entrance opens the shared black menu', () => {
  assert.equal(publicEntry('?view=collection'), 'collections');
});
test('workshop, globe, categories, and existing album deep links remain reachable', () => {
  for (const view of ['studio', 'scenes', 'portraits', 'street', 'all']) {
    assert.equal(publicEntry(`?view=${view}`), 'gallery');
  }
  assert.equal(publicEntry('?album=japan&from=scenes&region=jp'), 'gallery');
  assert.equal(publicEntry('?album=japan&view=about'), 'gallery');
});
