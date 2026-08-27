/**
 * An economy quantity represented by a normalized signed decimal mantissa and
 * safe-integer exponent. Zero is always `{ mantissa: 0, exponent: 0 }`; a
 * nonzero value has `1 <= abs(mantissa) < 10`.
 *
 * Construction is intentionally limited to src/brands.ts while arithmetic is
 * implemented later by src/bignum/bignum.ts.
 */
declare const bigNumBrand: unique symbol;

export type BigNum = Readonly<{
  mantissa: number;
  exponent: number;
  readonly [bigNumBrand]: true;
}>;
