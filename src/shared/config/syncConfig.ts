// Default maximum requests per second for the public mempool.space API.
// This is the fallback used before the user configures sync settings.
// Users can override this via Global Settings → Sync Settings.
export const MEMPOOL_MAX_REQUESTS_PER_SECOND = 1;

// Minimum delay between consecutive per-address requests (derived from the default RPS).
export const SYNC_REQUEST_DELAY_MS = Math.floor(1000 / MEMPOOL_MAX_REQUESTS_PER_SECOND);
