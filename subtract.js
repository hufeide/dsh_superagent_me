/**
 * Return the difference of two numbers (`a - b`).
 *
 * Both arguments must be finite numbers (or values that convert to one).
 * Anything else throws a TypeError so callers fail loudly instead of
 * silently producing `NaN`.
 *
 * @param {number|string} a First operand (minuend).
 * @param {number|string} b Second operand (subtrahend).
 * @returns {number} The difference `a - b`.
 * @throws {TypeError} If either operand is not a finite number.
 */
export function subtract(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError('subtract() expects two finite numbers');
  }
  return x - y;
}

export default subtract;
