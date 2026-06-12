import { MEMPOOL_MAX_REQUESTS_PER_SECOND, SYNC_REQUEST_DELAY_MS } from '../../../src/shared/config/syncConfig';

describe('syncConfig', () => {
  it('MEMPOOL_MAX_REQUESTS_PER_SECOND is a positive integer', () => {
    expect(MEMPOOL_MAX_REQUESTS_PER_SECOND).toBeGreaterThan(0);
    expect(Number.isInteger(MEMPOOL_MAX_REQUESTS_PER_SECOND)).toBe(true);
  });

  it('SYNC_REQUEST_DELAY_MS is derived from max requests per second', () => {
    expect(SYNC_REQUEST_DELAY_MS).toBe(Math.floor(1000 / MEMPOOL_MAX_REQUESTS_PER_SECOND));
  });

  it('SYNC_REQUEST_DELAY_MS is a non-negative integer', () => {
    expect(SYNC_REQUEST_DELAY_MS).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(SYNC_REQUEST_DELAY_MS)).toBe(true);
  });
});
