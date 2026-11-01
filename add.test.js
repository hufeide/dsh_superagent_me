import test from 'node:test';
import assert from 'node:assert/strict';

import { add } from './add.js';

test('adds two positive integers', () => {
  assert.equal(add(2, 3), 5);
});

test('adds negative numbers', () => {
  assert.equal(add(-2, 5), 3);
});

test('adds decimal numbers', () => {
  assert.equal(add(0.1, 0.2), 0.30000000000000004);
  assert.equal(add(-1.5, 2), 0.5);
});

test('adds zero and numeric strings', () => {
  assert.equal(add(0, 7), 7);
  assert.equal(add('4', 6), 10);
});

test('throws when an operand is not a number', () => {
  assert.throws(() => add(1, 'x'), TypeError);
  assert.throws(() => add(NaN, 1), TypeError);
  assert.throws(() => add(1, Infinity), TypeError);
  assert.throws(() => add(1), TypeError);
});
