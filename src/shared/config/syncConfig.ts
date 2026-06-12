// Maximum requests per second sent to the mempool.space API.
// Lower this value if you see rate-limit errors during wallet sync.
// Increase it when using a personal node that has no rate limit.
export const MEMPOOL_MAX_REQUESTS_PER_SECOND = 2;

// Minimum delay between consecutive per-address requests (derived).
export const SYNC_REQUEST_DELAY_MS = Math.floor(1000 / MEMPOOL_MAX_REQUESTS_PER_SECOND);
