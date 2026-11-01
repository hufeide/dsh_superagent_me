/**
 * Return the sum of two numbers.
 *
 * Both arguments must be finite numbers (or values that convert to one).
 * Anything else throws a TypeError so callers fail loudly instead of
 * silently producing `NaN`.
 *
 * @param {number|string} a First operand.
 * @param {number|string} b Second operand.
 * @returns {number} The sum `a + b`.
 * @throws {TypeError} If either operand is not a finite number.
 */
export function add(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError('add() expects two finite numbers');
  }
  return x + y;
}

export default add;
