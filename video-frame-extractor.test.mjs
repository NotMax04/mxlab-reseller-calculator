import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVideoFrameTimes } from './video-frame-extractor.js';

test('returns no frame for invalid duration', () => {
  assert.deepEqual(chooseVideoFrameTimes(0), []);
});

test('uses at least eight frames for a short useful video', () => {
  const times = chooseVideoFrameTimes(24);
  assert.equal(times.length, 8);
  assert.ok(times[0] >= 0);
  assert.ok(times.at(-1) <= 24);
});

test('caps long recordings at eighteen frames', () => {
  const times = chooseVideoFrameTimes(180);
  assert.equal(times.length, 18);
});

test('spreads frames in chronological order', () => {
  const times = chooseVideoFrameTimes(87);
  assert.equal(times.length, 18);
  assert.ok(times.every((value, index) => index === 0 || value > times[index - 1]));
});
