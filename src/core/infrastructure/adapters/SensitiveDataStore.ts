/**
 * Ephemeral in-memory store for sensitive strings (seeds, private keys, passphrases)
 * that must cross a navigation boundary without being embedded in nav params.
 *
 * Caller stashes the value and receives an opaque key, which is safe to put in a
 * navigation param. The destination screen pops the value (which deletes it from
 * the store) on mount. Values are never persisted to disk.
 */

const store = new Map<string, string>();
let counter = 0;

export function stashSensitiveData(value: string): string {
  const key = `s${++counter}`;
  store.set(key, value);
  return key;
}

/** Retrieves and permanently removes the value. Returns undefined if the key is gone. */
export function popSensitiveData(key: string): string | undefined {
  const value = store.get(key);
  store.delete(key);
  return value;
}

/** Emergency wipe — call on wallet delete or security reset. */
export function clearAllSensitiveData(): void {
  store.clear();
}
