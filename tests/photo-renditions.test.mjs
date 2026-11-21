import test from 'node:test';
import assert from 'node:assert/strict';
import { albumPhotoSizes, atlasPhotoSizes, inlinePhoto, streetPhotoSizes } from '../lib/photo-renditions.ts';

const photo = {url: '/full.jpg', thumb: '/thumb.jpg', width: 1500, height: 1000};
test('inline photos use width-based variants, retaining an unchanged full URL for fullscreen', () => {
  const withRenditions = {...photo, renditions: [{url: '/480.webp', width: 480}, {url: '/1200.webp', width: 1200}]};
  assert.deepEqual(inlinePhoto(withRenditions, '90vw'), {
    src: '/480.webp', srcSet: '/480.webp 480w, /1200.webp 1200w', sizes: '90vw',
  });
  assert.equal(withRenditions.url, '/full.jpg');
});
test('unpublished, preview or sample photos without derivatives keep their existing URL', () => {
  assert.deepEqual(inlinePhoto(photo, '90vw'), {src: '/full.jpg'});
});
test('sizes reflect the layouts and account for portrait ratios and narrower Atlas columns', () => {
  assert.equal(streetPhotoSizes(photo), 'clamp(270px, min(81svh, 75vw), 1020px)');
  assert.equal(atlasPhotoSizes(2, 0), '(max-width: 600px) 79vw, 29vw');
  assert.equal(atlasPhotoSizes(2, 1), '(max-width: 600px) 92vw, 53vw');
  assert.notEqual(albumPhotoSizes(0, false), albumPhotoSizes(0, true));
});
