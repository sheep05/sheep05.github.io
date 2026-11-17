import test from 'node:test';
import assert from 'node:assert/strict';
import { beginLoading, installLoadingProgress } from '../lib/loading-progress.ts';

test('cursor progress sweeps through intermediate values and finishes before hiding', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let time = 0, nextFrame = 0;
  const frames = new Map(), attributes = new Map(), classes = new Set();
  const label = { textContent: '' };
  const badge = {
    style: { setProperty() {} },
    setAttribute: (key, value) => attributes.set(key, value),
    querySelector: () => label,
    classList: { add: key => classes.add(key), remove: key => classes.delete(key), toggle() {} },
  };
  const body = { appendChild: node => { node.parentElement = body; } };
  const globals = {
    document: { createElement: () => badge, body, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: { addEventListener() {} } },
    window: { addEventListener() {} },
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class { observe() {} },
    MutationObserver: class { observe() {} },
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  t.mock.method(performance, 'now', () => time);
  const step = () => {
    time += 16;
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(fn => fn(time));
    t.mock.timers.tick(16);
  };
  installLoadingProgress();
  const assets = Array.from({ length: 4 }, () => beginLoading());
  assets[0].finish();
  assert.equal(label.textContent, '0%'); // Completing an asset must not jump to 25%.
  step();
  assert.equal(label.textContent, '1%');
  step();
  assert.equal(label.textContent, '3%');
  for (let i = 0; i < 30; i++) step();
  assert.equal(label.textContent, '25%'); // Never outrun real loading.
  assets.slice(1).forEach(asset => asset.finish());
  for (let i = 0; i < 20; i++) step(); // Task cleanup occurs at 240ms.
  assert.ok(parseInt(label.textContent) > 25 && parseInt(label.textContent) < 100);
  assert.ok(classes.has('is-loading'));
  for (let i = 0; i < 40; i++) step();
  assert.equal(label.textContent, '100%');
  assert.ok(!classes.has('is-loading'));
  const next = beginLoading();
  assert.equal(label.textContent, '0%');
  next.finish(true);
  assert.equal(attributes.get('aria-hidden'), 'true');
  assert.notEqual(label.textContent, '100%');
});
