/**
 * Versioned deterministic derivation for durable gameplay identities.
 * V1 uses only ASCII domain bytes and ordered uint32 source fields.
 */
export type Mulberry32V1 = () => number;

function requireUint32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${label} must be an unsigned 32-bit integer.`);
  }
}

function requireAsciiDomain(domain: string): void {
  if (!/^[\x20-\x7e]+$/.test(domain)) {
    throw new Error("Seed derivation domain must be nonempty printable ASCII.");
  }
}

function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Derives one nonzero uint32 from a versioned domain and ordered source fields. */
export function deriveSeedV1(domain: string, ...fields: readonly number[]): number {
  requireAsciiDomain(domain);
  for (const field of fields) requireUint32(field, "Seed derivation field");
  const serialized = [domain, ...fields.map(String)].join("\0");
  const derived = fnv1a32(serialized);
  return derived === 0 ? 1 : derived;
}

/** Returns the documented Mulberry32 V1 stream as unsigned integer outputs. */
export function mulberry32V1(seed: number): Mulberry32V1 {
  requireUint32(seed, "Mulberry32 seed");
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    const result = (mixed ^ (mixed >>> 14)) >>> 0;
    return result;
  };
}
