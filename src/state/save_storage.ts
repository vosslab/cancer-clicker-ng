import type { StorageLike } from "./save_load.js";

export function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
