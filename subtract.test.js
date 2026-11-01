import test from 'node:test';
import assert from 'node:assert/strict';

import { subtract } from './subtract.js';

test('subtracts two positive integers', () => {
  assert.equal(subtract(5, 3), 2);
});

test('subtracts to a negative result', () => {
  assert.equal(subtract(2, 5), -3);
});

test('subtracts decimal numbers', () => {
  assert.equal(subtract(0.3, 0.1), 0.19999999999999998);
  assert.equal(subtract(-1.5, 2), -3.5);
});

test('subtracts zero and numeric strings', () => {
  assert.equal(subtract(7, 0), 7);
  assert.equal(subtract('9', 4), 5);
});

test('throws when an operand is not a number', () => {
  assert.throws(() => subtract(1, 'x'), TypeError);
  assert.throws(() => subtract(NaN, 1), TypeError);
  assert.throws(() => subtract(1, Infinity), TypeError);
  assert.throws(() => subtract(1), TypeError);
});
