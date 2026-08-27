# BigNum operation contract

## Scope and boundary

This is the M3 contract for costs, bulk purchases, tick and offline accrual, prestige
calculations, canonical save fields, replay, and magnitude display. `BigNum` is normalized base-10
scientific notation, not a general arbitrary-precision package. M3 adds no runtime dependency and
does not select game balance values, prestige constants, or UI copy.

`src/brands.ts` is the only branded-value constructor and normalization authority:

```ts
bigNum(mantissa: number, exponent: number): BigNum
```

Every arithmetic result calls `bigNum`; no arithmetic module casts an object to `BigNum`. A
canonical value is either zero (`{ mantissa: 0, exponent: 0 }`) or has finite mantissa
`1 <= abs(mantissa) < 10` and a safe-integer exponent. Finite denormalized nonzero inputs
normalize through `bigNum`. NaN, infinities, unsafe input exponents, and normalization whose
resulting exponent is unsafe throw `Error` at this boundary. Inputs with either `+0` or `-0`
mantissa canonicalize to the one zero representation `{ mantissa: 0, exponent: 0 }`, regardless
of the supplied safe exponent. No alternate zero representation can survive construction.

M3 serialization testing is deliberately narrow: extract canonical `{ mantissa, exponent }`
fields from a trusted BigNum, reconstruct with `bigNum`, and require field equality. Unknown-input
parse, migration, rejection, and visible recovery belong to M4's `save_load.ts` tests.

## Public operations

`src/bignum/bignum.ts` exports these explicit named functions:

```ts
zero(): BigNum
one(): BigNum
fromNumber(value: number): BigNum
fromSafeInteger(value: number): BigNum
isZero(value: BigNum): boolean
isPositive(value: BigNum): boolean
isNegative(value: BigNum): boolean
abs(value: BigNum): BigNum
negate(value: BigNum): BigNum
compare(left: BigNum, right: BigNum): -1 | 0 | 1
equals(left: BigNum, right: BigNum): boolean
min(left: BigNum, right: BigNum): BigNum
max(left: BigNum, right: BigNum): BigNum
add(left: BigNum, right: BigNum): BigNum
subtract(left: BigNum, right: BigNum): BigNum
multiply(left: BigNum, right: BigNum): BigNum
divide(dividend: BigNum, divisor: BigNum): BigNum
multiplyByNumber(value: BigNum, multiplier: number): BigNum
divideByNumber(value: BigNum, divisor: number): BigNum
sum(values: readonly BigNum[]): BigNum
pow(base: BigNum, exponent: number): BigNum
log10(value: BigNum): number
toNumber(value: BigNum): number
toNumberClamped(value: BigNum, limit: number): number
approximatelyEquals(left: BigNum, right: BigNum, relativeTolerance: number): boolean
```

`fromNumber` accepts only finite JavaScript numbers. `fromSafeInteger` additionally requires a
safe integer. `zero()` and `one()` are canonical values. `sum` starts from canonical zero and is
deterministic in supplied order. Economy code, rather than this generic signed boundary, enforces
nonnegative costs and currencies.

`compare` orders sign, absolute exponent, then mantissa; it reverses absolute comparison for two
negatives. It must not subtract exponents or convert values to JavaScript numbers. `equals`,
`min`, and `max` are defined through `compare` only.

## Arithmetic precision and domains

### Addition and subtraction

Let `P = 15`, the number of reliable decimal digits retained by the JavaScript mantissa. For
addition, first choose the operand with greater exponent as `large`; if exponents are equal, use
the supplied left operand as `large`. Exponent-gap handling must never subtract arbitrary safe
integers: the difference between two safe integers need not itself be safe. Let
`MIN_SAFE = Number.MIN_SAFE_INTEGER` and use this predicate first:

```text
gapExceedsPrecision(largeExponent, smallExponent, P):
  require largeExponent >= smallExponent and P is a nonnegative safe integer
  if largeExponent > MIN_SAFE + P:
    return smallExponent < largeExponent - P
  return false
```

When it returns true, the gap is greater than `P` without calculating it. When it returns false,
the gap is known to be in `0..P`, so `large.exponent - small.exponent` is safe to calculate.

- If `gapExceedsPrecision(...)` is true, return `large` unchanged. The small contribution cannot
  affect the retained mantissa and is intentionally discarded.
- Otherwise compute the now-bounded `gap`, then
  `large.mantissa + small.mantissa * 10 ** -gap`, and normalize through
  `bigNum` with `large.exponent`.
- `subtract(left, right)` is exactly `add(left, negate(right))` and follows the same rule.
- Opposite values that produce a JavaScript zero normalize to canonical zero. A near-cancellation
  result is normalized normally; it is never silently replaced with an operand.

`multiply` and `divide` combine mantissas and exponents then call `bigNum`. Before construction,
they must reject an exponent addition or subtraction outside the safe-integer range. Division by
zero throws. Number-scalar operations reject non-finite scalars; division also rejects zero.

### Power and conversion

`pow` accepts only a finite exponent.

- Any nonzero base to exponent `0` is exactly `one()`.
- `0^0` and zero to a negative exponent throw `Error`; zero to a positive exponent is `zero()`.
- A positive base accepts every finite exponent.
- A negative base accepts safe-integer exponents only. Its magnitude is `abs(base)^exponent`; the
  result is negative exactly when the safe integer exponent is odd. A negative base with a
  fractional or unsafe-integer exponent throws; this keeps parity exact.
- Any intermediate or resulting exponent outside the safe-integer range throws through the
  constructor boundary.

`log10` requires a positive value and returns `value.exponent + Math.log10(value.mantissa)`.
`toNumber` returns the finite representable number, signed infinity on overflow, and signed zero
on underflow. It does not drive state mutation. `toNumberClamped` requires a finite `limit >= 0`:
it returns `0` for a zero limit; otherwise it preserves sign and returns a finite number in
`[-limit, limit]`, preserving negative zero only when the conversion itself underflows.

`approximatelyEquals` requires finite `relativeTolerance >= 0`. It returns true for canonical
equality. If tolerance is zero, it returns false for unequal values. If signs differ, it returns
false. Otherwise let `scale = max(abs(left), abs(right))`; if `scale` is zero both were equal, and
otherwise return `abs(left - right) <= scale * relativeTolerance`, computed with BigNum operations
and `compare`. This formula works across huge exponent gaps without `Number` conversion.

## Bulk purchase solver

`src/bignum/solve.ts` exports:

```ts
geometricCost(firstCost: BigNum, growth: number, owned: number, quantity: number): BigNum
maxAffordable(
  budget: BigNum,
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantityLimit?: number,
): number
```

For `C`, ratio `r`, owned `n`, and quantity `q`, `geometricCost` is the sole authoritative game
quote and debit. Its mathematical value is the ordered sum:

```text
geometricCost(C, r, n, q) = sum(i = 0 to q - 1, C * r^(n + i))
```

The economy debits exactly the returned `geometricCost`; it must not calculate, quote, or debit a
second cost. The solver also calls this same function for every accepted and rejected affordability
boundary, so estimates never decide affordability.

`RECURRENCE_QUANTITY_MAX = 10_000` is the bounded ordered-recurrence domain. For
`0 < q <= RECURRENCE_QUANTITY_MAX`, `geometricCost` evaluates terms in increasing `i` order and
adds them in that same order. For `q > RECURRENCE_QUANTITY_MAX`, it deterministically returns the
closed-form BigNum result described below. These are two representations of the same mathematical
sum; they are not separate game prices. A test-only comparison may run both routes only for
`q <= RECURRENCE_QUANTITY_MAX`: individual ordered sums and the recurrence result require exact
canonical equality, while recurrence versus the closed-form route is compared with relative
tolerance `1e-12`. No infeasible recurrence is required or attempted above the bound.

For `r > 1`, set `T = C * r^n` using BigNum multiplication and `pow`, then compute
`T * (r^q - 1) / (r - 1)`. The normal closed-form route constructs `r` and `r - 1` as finite
BigNums, computes `pow(fromNumber(r), q)`, and uses BigNum subtract, divide, and multiply. It
throws if any required BigNum result exceeds the safe-exponent representation boundary. This is
the resource bound for a supported large quote; it never falls back to an unbounded recurrence.

When `0 < r - 1 <= 1e-8`, the implementation first attempts a stable Number coefficient:

```text
delta = r - 1
logGrowth = Math.log1p(delta)
scaledLog = logGrowth * q
numerator = Math.expm1(scaledLog)
coefficient = numerator / delta
```

It uses `fromNumber(coefficient)` only if `logGrowth`, `scaledLog`, `numerator`, and
`coefficient` are all finite and `coefficient > 0`; the returned quote is then
`T * fromNumber(coefficient)`. If any intermediate is non-finite, nonpositive, or cannot be
constructed, it uses the normal BigNum closed-form route. This finite predicate is mandatory and
is the only Number-intermediate path. `r === 1` is handled separately as `C * q` and never
divides by `delta`.

Inputs require `C >= 0`, finite `r >= 1`, and safe integers `owned >= 0`, `quantity >= 0`. The
implementation must reject `owned + quantity` if it is not safe. `q === 0` returns zero.
`r === 1` returns `multiplyByNumber(C, q)`. The near-one predicate is exactly
`0 < r - 1 <= 1e-8`; its finite stable route and deterministic BigNum fallback are specified
above. No recurrence or approximate estimate is used to alter the returned large-quantity quote.

`maxAffordable` accepts a nonnegative budget and the same `C`, `r`, and `owned` domains.
`quantityLimit`, if supplied, is a safe integer `>= 0`. It is a maximum additional quantity, not a
total-owned count. Define the representable additional-purchase capacity
`MAX_PURCHASABLE = Number.MAX_SAFE_INTEGER - owned`; a supplied `quantityLimit` must not exceed
that capacity. The answer `q` is the greatest affordable safe nonnegative integer in
`0..MAX_PURCHASABLE`, subject to `quantityLimit` when supplied, and has these postconditions:

```text
geometricCost(C, r, owned, q) <= budget
q === quantityLimit OR
q === MAX_PURCHASABLE OR
(owned + q + 1 is safe AND geometricCost(C, r, owned, q + 1) > budget)
```

The solver never evaluates an unsafe `owned + q + 1`; the terminal-capacity postcondition applies
instead. If `quantityLimit` is zero, return zero. If `C` is zero and a limit exists, return that
limit. If `C` is zero with no limit, throw `Error` because the result is unbounded. For positive
costs without a limit, returning an affordable `MAX_PURCHASABLE` is allowed. Estimates may use
logarithms, but the final accepted and rejected boundary must call the same `geometricCost` used
for debit and compare BigNums. The solver corrects estimates with bounded exponential search plus
binary search.

## Illion names and display

The naming convention is short-scale Conway-Guy-Wechsler (CGW), derived from John H. Conway and
Richard K. Guy, _The Book of Numbers_ (Springer, 1996), pp. 14-15, the normative source
([DOI](https://doi.org/10.1007/978-1-4612-4072-3)). The accessible implementation authority is
Mark Coppenbarger, "The Number of Iterations Needed for Numbers to Converge to Four," _Journal of
Integer Sequences_ 21 (2018), Definition 6 and Tables 5-7
([PDF](https://cs.uwaterloo.ca/journals/JIS/VOL21/Coppenbarger/coppen3.pdf)). That paper records
Conway and Guy's credit to Allan Wechsler and makes the construction, including `millinillion`,
implementable. The [Conway zillion reference](https://kyodaisuu.github.io/illion/) and
[MROB large-number reference](https://www.mrob.com/pub/math/largenum.html) are corroboration only.

The exported product profile is CGW-derived, with one deliberate product-orthography exception:
ordinal 27 exports `septenvigintillion` to preserve the approved product behavior. Authentic CGW
construction at that ordinal is `septemvigintillion`. This exception is not a claim that the
exported spelling is pure Conway-Wechsler, and no other spelling override is permitted.

The implementation supports named groups `2..1001` (illion ordinals `1..1000`). Display still
treats groups `0..3` as ordinary decimal/K/M/B labels; low ordinals are constructed and tested so
the CGW implementation has a complete, auditable boundary. Valid groups above 1001 have no name or
suffix and use scientific fallback. This explicit bound avoids inventing an untested multi-group
spelling.

For a nonnegative safe integer `group = floor(exponent / 3)`:

- Groups `0..3` are ordinary display groups: `""`, `K`, `M`, and `B`.
- For `group >= 4`, `illionOrdinal = group - 1`.
- Thus group 11 / ordinal 10 is `decillion`, group 28 / ordinal 27 is
  `septenvigintillion`, group 101 / ordinal 100 is `centillion`, group 1000 / ordinal 999 is
  `novenonagintanongentillion`, and group 1001 / ordinal 1000 is `millinillion`.

`src/bignum/illion.ts` exports:

```ts
shortSuffixForGroup(group: number): string | undefined
illionNameForGroup(group: number): string | undefined
```

Invalid groups throw. Valid but unsupported groups return `undefined`. The short suffix table is
normative and deliberately conservative. `illionNameForGroup` may return low names for groups 2 and
3, but the formatter uses the ordinary display rule above for those groups:

| Group | Short suffix |
| ----- | ------------ |
| 0     | `""`         |
| 1     | `K`          |
| 2     | `M`          |
| 3     | `B`          |
| 4     | `T`          |
| 5     | `Qa`         |
| 6     | `Qi`         |
| 7     | `Sx`         |
| 8     | `Sp`         |
| 9     | `Oc`         |
| 10    | `No`         |
| 11    | `Dc`         |

For groups above 11, `shortSuffixForGroup` returns `undefined`; display falls back to normalized
scientific notation. This keeps short labels common, legible, and deterministic while full names
remain available through group 1001.

For ordinals `1..9`, use the established forms `million`, `billion`, `trillion`, `quadrillion`,
`quintillion`, `sextillion`, `septillion`, `octillion`, and `nonillion`. For `10..999`, decompose
`ordinal = 100 * h + 10 * t + u` and construct the authentic name as
`A[u] + mu + B[t] + nu + C[h] + "illion"`, omitting empty components. The roots have their terminal
vowels removed before composition:

| Digit | `A` units  | `B` tens      | `C` hundreds  |
| ----- | ---------- | ------------- | ------------- |
| 0     | `""`       | `""`          | `""`          |
| 1     | `un`       | `dec`         | `cent`        |
| 2     | `duo`      | `vigint`      | `ducent`      |
| 3     | `tre`      | `trigint`     | `trecent`     |
| 4     | `quattuor` | `quadragint`  | `quadringent` |
| 5     | `quinqua`  | `quinquagint` | `quingent`    |
| 6     | `se`       | `sexagint`    | `sescent`     |
| 7     | `septe`    | `septuagint`  | `septingent`  |
| 8     | `octo`     | `octogint`    | `octingent`   |
| 9     | `nove`     | `nonagint`    | `nongent`     |

`mu` is the units-to-next-component assimilation. It is empty unless the following matrix says to
insert the listed letter. When `t > 0`, use the tens column; otherwise use the hundreds column.

| Units `u`   | Before tens `t`                  | Before hundreds `h` when `t = 0` |
| ----------- | -------------------------------- | -------------------------------- |
| `tre` (3)   | `s`: 2, 3, 4, 5, 8               | `s`: 1, 3, 4, 5, 6, 9; `x`: 8    |
| `se` (6)    | `s`: 2, 3, 4, 5; `x`: 8          | `s`: 3, 4, 5; `x`: 1, 8          |
| `septe` (7) | `n`: 1, 3, 4, 5, 6, 7; `m`: 2, 8 | `n`: 1, 2, 3, 4, 5, 6, 7; `m`: 8 |
| `nove` (9)  | `n`: 1, 3, 4, 5, 6, 7; `m`: 2, 8 | `n`: 1, 2, 3, 4, 5, 6, 7; `m`: 8 |

`nu` is present only when both tens and hundreds components are present: use `i` for `t` 1 or 2,
and `a` for `t` 3 through 9. Otherwise it is empty. Thus all construction is reproducible: validate
the group, apply ordinary-group display handling, derive its ordinal, construct authentic CGW, apply
the product override map `{ 27: "septenvigintillion" }`, then return. There are no other silent
overrides. Ordinal 1000 is exactly `millinillion`, not `millillion`.

`src/bignum/format.ts` exports:

```ts
formatBigNum(value: BigNum, format: NumberFormat, fractionalDigits: number): string
formatQuantity(
  value: BigNum,
  format: NumberFormat,
  fractionalDigits: number,
  singularUnit: string,
  pluralUnit: string,
): string
```

`fractionalDigits` is a safe integer in `0..6`; other values throw. Values below group 1 use
ordinary decimal formatting. Other values use the triad coefficient
`abs(mantissa) * 10 ** (exponent - 3 * group)`, rounded to `fractionalDigits` decimal places.
If rounding produces `1000`, increment group, recompute the coefficient, and round again.
Render exactly `fractionalDigits` digits after the decimal point, including trailing zeroes; at
zero fractional digits, render no decimal point. Prepend `-` for negative values.

Short format appends the short suffix; full format appends the illion name. A missing requested
suffix or name falls back to normalized scientific notation `[-]m.m...eE`, with the same fixed
fractional-digit rule. Magnitude names do not pluralize. `formatQuantity` adds `singularUnit` only
for canonical `+1` or `-1`, and `pluralUnit` otherwise. It does not localize text.

The exported product checkpoints are pinned: `10^33` is `decillion`; `10^84` is
`septenvigintillion` through the only override; `10^303` is `centillion`; `10^3000` is
`novenonagintanongentillion`; and `10^3003` is `millinillion`. Above group 1001, full formatting
uses the same scientific fallback as all unsupported named groups.

## Imports and ownership

Allowed import edges are exact:

```text
src/bignum/bignum.ts -> src/types/bignum.ts, src/brands.ts
src/bignum/illion.ts -> no runtime game modules
src/bignum/format.ts -> src/types/bignum.ts, src/types/state.ts (type-only), src/bignum/illion.ts
src/bignum/solve.ts -> src/types/bignum.ts, src/bignum/bignum.ts
economy/* -> src/bignum/bignum.ts, src/bignum/solve.ts
render/* -> src/bignum/format.ts
```

`src/bignum/*` imports no state instance, event, economy, prestige, renderer, DOM, browser
storage, clock, random source, or test helper. `format.ts` may import `NumberFormat` from
`src/types/state.ts` only with `import type`; it creates no runtime state dependency. Save/load is
M4-owned and imports `bigNum` only at the trusted rehydration boundary. M3 owns only trusted
canonical field reconstruction tests; M4 exclusively owns untrusted serialization, migration,
rejection, and recovery tests.

Three implementation lanes own source only: arithmetic owns `src/bignum/bignum.ts`; solver owns
`src/bignum/solve.ts`; naming/format owns `src/bignum/illion.ts` and `src/bignum/format.ts`.
After all source lands, one fresh test integrator exclusively owns `tests/test_bignum.mjs` and
`tests/test_bignum_solve.mjs`. No implementation lane edits either shared test file.

## Required M3 tests

Tests use `node --import tsx --test`, no DOM, no random input, and no sleeps. They prove
game-facing properties, not a generic mathematics package.

| Area                 | Required deterministic checks                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical values     | `+0` and `-0` canonicalization, normalization, constructor rejection, safe-exponent overflow, signed comparison total-order fixtures                                                                                                                                                                                                                                                           |
| Arithmetic           | exact in-range identities, `P` cutoff, safe-gap branches at extreme safe exponents, cancellation, empty sum, divide/domain errors, exponent overflow                                                                                                                                                                                                                                           |
| Power and conversion | every pow branch, including safe negative-base parity and unsafe-integer rejection, fractional tolerance, `log10`, numeric overflow, underflow, signed zero, clamp zero and finite limits                                                                                                                                                                                                      |
| Tolerance            | tolerance zero, equal values, mixed signs, zero/nonzero, huge-exponent values without Number conversion                                                                                                                                                                                                                                                                                        |
| Names and format     | CGW provenance and product-override tests; low ordinals 1..9; authentic vectors 23, 36, 86, 17, 19, 29, 303, 806, 807, 123, 333, 999, 1000; proof that authentic ordinal 27 is `septemvigintillion` before exported `septenvigintillion`; five pinned product checkpoints; ordinary groups, suffix/name fallback, triad rounding carry, digits and trailing zeroes, negatives, singular/plural |
| Geometric costs      | q 0, 1, 10, 100, ratio one, near one finite route, near-one non-finite fallback, exact ordered-sum equality inside the recurrence bound, closed-form tolerance only where both routes run, invalid inputs                                                                                                                                                                                      |
| Solver               | every returned q meets the debit-cost boundary; next q fails; zero limit; owned/quantity/probe overflow; zero-cost bounded and unbounded; huge budgets; monotonic budget fixtures                                                                                                                                                                                                              |
| Serialization        | field extraction plus reconstruct-and-equal canonical fields only; unknown-input tests are deferred to M4                                                                                                                                                                                                                                                                                      |
| Prestige fixture     | a representative monotonic public-operation fixture only; it is not evidence for M13's eventual formula                                                                                                                                                                                                                                                                                        |

Exact assertions cover canonical representation, order, solver acceptance/rejection, and ordered
cost sums in the recurrence range. Relative tolerance `1e-12` covers fractional power and the
bounded recurrence-versus-closed-form comparison. Mathematically zero expected results are exact.
The final solver boundary is never tolerance-based.

## Deferred tuning

M21 owns producer prices, ratios, soft caps, prestige exponents, panel precision, and UI purchase
limits. These stable operations need no additional numeric primitive before M4-M20.
