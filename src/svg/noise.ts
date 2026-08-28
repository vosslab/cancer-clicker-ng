/** Pure, bounded seeded primitives for deterministic morphology variation. */

export const MIN_NOISE_OCTAVES = 1;
export const MAX_NOISE_OCTAVES = 4;

type SeedPart = number | string;

function requireUint32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${label} must be an unsigned 32-bit integer.`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function mixByte(hash: number, byte: number): number {
  const mixed = Math.imul(hash ^ byte, 0x01000193);
  return mixed >>> 0;
}

/** Hashes an ordered, ASCII-safe seed tuple with a version-stable FNV-1a pass. */
export function hash_seed(parts: readonly SeedPart[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = typeof part === "number" ? String(part) : part;
    if (typeof part === "number") {
      requireUint32(part, "Numeric seed part");
    }
    for (let index = 0; index < text.length; index += 1) {
      const character = text.charCodeAt(index);
      hash = mixByte(hash, character & 0xff);
      hash = mixByte(hash, character >>> 8);
    }
    hash = mixByte(hash, 0);
  }
  return hash === 0 ? 1 : hash;
}

/** Returns a fresh deterministic stream; it does not retain module-global state. */
export function mulberry32(seed: number): () => number {
  requireUint32(seed, "Seed");
  let state = seed;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    const value = ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
    return value;
  };
}

function smoothstep(value: number): number {
  const smoothed = value * value * (3 - 2 * value);
  return smoothed;
}

function interpolate(left: number, right: number, position: number): number {
  const interpolated = left + (right - left) * position;
  return interpolated;
}

function latticeValue(seed: number, x: number, y: number): number {
  const latticeSeed = hash_seed([seed, `x:${x}`, `y:${y}`]);
  const random = mulberry32(latticeSeed);
  const value = random();
  return value;
}

/** Samples smooth value noise in the inclusive range 0..1 at finite coordinates. */
export function value_noise_2d(seed: number, x: number, y: number): number {
  requireUint32(seed, "Seed");
  requireFinite(x, "Noise x");
  requireFinite(y, "Noise y");

  const lowerX = Math.floor(x);
  const lowerY = Math.floor(y);
  const upperX = lowerX + 1;
  const upperY = lowerY + 1;
  const xWeight = smoothstep(x - lowerX);
  const yWeight = smoothstep(y - lowerY);
  const lower = interpolate(
    latticeValue(seed, lowerX, lowerY),
    latticeValue(seed, upperX, lowerY),
    xWeight,
  );
  const upper = interpolate(
    latticeValue(seed, lowerX, upperY),
    latticeValue(seed, upperX, upperY),
    xWeight,
  );
  const value = interpolate(lower, upper, yWeight);
  return value;
}

/** Combines one to four correlated value-noise octaves without exceeding 0..1. */
export function fbm_2d(seed: number, x: number, y: number, octaves: number): number {
  requireUint32(seed, "Seed");
  requireFinite(x, "Noise x");
  requireFinite(y, "Noise y");
  if (
    !Number.isSafeInteger(octaves) ||
    octaves < MIN_NOISE_OCTAVES ||
    octaves > MAX_NOISE_OCTAVES
  ) {
    throw new Error(
      `Noise octaves must be an integer from ${MIN_NOISE_OCTAVES} to ${MAX_NOISE_OCTAVES}.`,
    );
  }

  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let amplitudeTotal = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    const octaveSeed = hash_seed([seed, octave]);
    total += value_noise_2d(octaveSeed, x * frequency, y * frequency) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  const value = total / amplitudeTotal;
  return value;
}
