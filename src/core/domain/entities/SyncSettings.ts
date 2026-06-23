export type SyncSettings = {
  maxRequestsPerSecond: number;
  parallelSync: boolean;
};

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  maxRequestsPerSecond: 1,
  parallelSync: false,
};

export const MIN_REQUESTS_PER_SECOND = 1;
export const MAX_REQUESTS_PER_SECOND = 20;
