import { MempoolApiClient } from '../../../src/core/infrastructure/api/MempoolApiClient';
import { FetchHttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import { AppError } from '../../../src/core/application/errors/AppError';

type MockFetch = jest.MockedFunction<typeof globalThis.fetch>;

function mockFetch(status: number, body: unknown, isText = false): void {
  (globalThis.fetch as MockFetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(isText ? String(body) : JSON.stringify(body)),
  } as Response);
}

function mockFetchError(err: Error): void {
  (globalThis.fetch as MockFetch).mockRejectedValueOnce(err);
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as typeof globalThis & { fetch: MockFetch }).fetch = jest.fn();
  jest.useRealTimers();
});

describe('MempoolApiClient — static helpers', () => {
  it('forNetwork returns mainnet base URL for mainnet', () => {
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    expect(client.getBaseUrl()).toBe('https://mempool.space/api');
  });

  it('forNetwork returns testnet4 base URL for testnet4', () => {
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    expect(client.getBaseUrl()).toBe('https://mempool.space/testnet4/api');
  });

  it('forNetwork returns testnet URL for testnet3', () => {
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet3');
    expect(client.getBaseUrl()).toBe('https://mempool.space/testnet/api');
  });

  it('forNetwork returns testnet4 URL for testnet (testnet = testnet4)', () => {
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet');
    expect(client.getBaseUrl()).toBe('https://mempool.space/testnet4/api');
  });

  it('baseUrlForNetwork returns correct URL for each network', () => {
    expect(MempoolApiClient.baseUrlForNetwork('mainnet')).toBe('https://mempool.space/api');
    expect(MempoolApiClient.baseUrlForNetwork('testnet')).toBe('https://mempool.space/testnet4/api');
    expect(MempoolApiClient.baseUrlForNetwork('testnet4')).toBe('https://mempool.space/testnet4/api');
    expect(MempoolApiClient.baseUrlForNetwork('testnet3')).toBe('https://mempool.space/testnet/api');
  });
});

describe('MempoolApiClient — healthcheck()', () => {
  it('calls the v1/health endpoint', async () => {
    mockFetch(200, { status: 'ok' });
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await client.healthcheck();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://mempool.space/api/v1/health',
      expect.any(Object),
    );
  });
});

describe('MempoolApiClient — getAddress()', () => {
  const ADDRESS = 'bc1qtest';

  it('calls the correct address endpoint', async () => {
    mockFetch(200, { address: ADDRESS, chain_stats: {}, mempool_stats: {} });
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await client.getAddress(ADDRESS);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://mempool.space/api/address/${ADDRESS}`,
      expect.any(Object),
    );
  });

  it('returns the parsed address response', async () => {
    const mockData = {
      address: ADDRESS,
      chain_stats: { funded_txo_sum: 500_000, spent_txo_sum: 200_000, tx_count: 3 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
    };
    mockFetch(200, mockData);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    const result = await client.getAddress(ADDRESS);
    expect(result.chain_stats.funded_txo_sum).toBe(500_000);
  });
});

describe('MempoolApiClient — getAddressUtxos()', () => {
  const ADDRESS = 'tb1qtest';

  it('calls the utxo endpoint for the address', async () => {
    mockFetch(200, []);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    await client.getAddressUtxos(ADDRESS);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://mempool.space/testnet4/api/address/${ADDRESS}/utxo`,
      expect.any(Object),
    );
  });

  it('returns array of UTXO entries', async () => {
    const utxos = [
      { txid: 'abc', vout: 0, status: { confirmed: true }, value: 100_000 },
      { txid: 'def', vout: 1, status: { confirmed: false }, value: 50_000 },
    ];
    mockFetch(200, utxos);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    const result = await client.getAddressUtxos(ADDRESS);
    expect(result).toHaveLength(2);
    expect(result[0].txid).toBe('abc');
    expect(result[1].value).toBe(50_000);
  });
});

describe('MempoolApiClient — getAddressTransactions()', () => {
  const ADDRESS = 'tb1qtest';

  it('calls the transactions endpoint', async () => {
    mockFetch(200, []);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    await client.getAddressTransactions(ADDRESS);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://mempool.space/testnet4/api/address/${ADDRESS}/txs`,
      expect.any(Object),
    );
  });

  it('returns parsed transaction array', async () => {
    const txs = [
      {
        txid: 'tx1',
        vin: [],
        vout: [{ scriptpubkey_address: ADDRESS, value: 100_000 }],
        fee: 500,
        status: { confirmed: true, block_time: 1_700_000_000 },
      },
    ];
    mockFetch(200, txs);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    const result = await client.getAddressTransactions(ADDRESS);
    expect(result).toHaveLength(1);
    expect(result[0].txid).toBe('tx1');
    expect(result[0].fee).toBe(500);
  });
});

describe('MempoolApiClient — getTransaction()', () => {
  it('calls the tx endpoint with the txid', async () => {
    const txid = 'abc123';
    mockFetch(200, { txid, vin: [], vout: [], fee: 0, status: { confirmed: true } });
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await client.getTransaction(txid);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://mempool.space/api/tx/${txid}`,
      expect.any(Object),
    );
  });
});

describe('MempoolApiClient — getFeeRates()', () => {
  it('calls the fee rates endpoint', async () => {
    mockFetch(200, { fastestFee: 20, halfHourFee: 15, hourFee: 10, economyFee: 5, minimumFee: 1 });
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await client.getFeeRates();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://mempool.space/api/v1/fees/recommended',
      expect.any(Object),
    );
  });

  it('returns parsed fee rates', async () => {
    mockFetch(200, { fastestFee: 20, halfHourFee: 15, hourFee: 10, economyFee: 5, minimumFee: 1 });
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    const rates = await client.getFeeRates();
    expect(rates.fastestFee).toBe(20);
    expect(rates.minimumFee).toBe(1);
  });
});

describe('MempoolApiClient — broadcastTransaction()', () => {
  it('POSTs raw hex to the tx broadcast endpoint', async () => {
    const txid = 'deadbeef01020304';
    (globalThis.fetch as MockFetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(txid),
    } as Response);
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'testnet4');
    const result = await client.broadcastTransaction('deadbeef01020304');
    expect(result).toBe(txid);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://mempool.space/testnet4/api/tx',
      expect.objectContaining({
        method: 'POST',
        body: 'deadbeef01020304',
        headers: expect.objectContaining({ 'Content-Type': 'text/plain' }),
      }),
    );
  });
});

describe('MempoolApiClient — HTTP error handling', () => {
  it('throws AppError with HTTP_ERROR on 404', async () => {
    mockFetch(404, {});
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await expect(client.getAddress('bc1q...')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
  });

  it('throws AppError with HTTP_ERROR on 500', async () => {
    mockFetch(500, {});
    mockFetch(500, {}); // retry 1
    mockFetch(500, {}); // retry 2
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await expect(client.getAddress('bc1q...')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
  });

  it('throws AppError on 400 without retrying', async () => {
    mockFetch(400, {});
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await expect(client.getAddress('invalid')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('propagates network-level errors', async () => {
    mockFetchError(new Error('Failed to fetch'));
    mockFetchError(new Error('Failed to fetch')); // retry 1
    mockFetchError(new Error('Failed to fetch')); // retry 2
    const client = MempoolApiClient.forNetwork(new FetchHttpClient(), 'mainnet');
    await expect(client.getAddress('bc1q...')).rejects.toThrow('Failed to fetch');
  });
});

describe('MempoolApiClient — timeout handling', () => {
  it('passes timeoutMs option to each HTTP request', async () => {
    const mockHttp = {
      get: jest.fn().mockResolvedValue({
        address: 'bc1q...',
        chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
      }),
      post: jest.fn(),
      postText: jest.fn(),
    };
    const client = new MempoolApiClient(mockHttp, 'https://mempool.space/api');
    await client.getAddress('bc1qtest');
    expect(mockHttp.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    );
  });

  it('propagates TIMEOUT from httpClient and retries before throwing', async () => {
    const mockHttp = {
      get: jest.fn().mockRejectedValue(new AppError('Request timed out', 'TIMEOUT')),
      post: jest.fn(),
      postText: jest.fn(),
    };
    jest.useFakeTimers();
    const client = new MempoolApiClient(mockHttp, 'https://mempool.space/api');
    let caughtError: unknown;
    const settled = client.getAddress('bc1qtest').catch(e => { caughtError = e; });
    await jest.runAllTimersAsync();
    await settled;
    expect(caughtError).toMatchObject({ code: 'TIMEOUT' });
    expect(mockHttp.get).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('MempoolApiClient — retry on server errors', () => {
  it('retries on 5xx and succeeds if a later attempt resolves', async () => {
    const successData = {
      address: 'bc1q...',
      chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
    };
    let callCount = 0;
    const mockHttp = {
      get: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'));
        }
        return Promise.resolve(successData);
      }),
      post: jest.fn(),
      postText: jest.fn(),
    };
    jest.useFakeTimers();
    const client = new MempoolApiClient(mockHttp, 'https://mempool.space/api');
    const promise = client.getAddress('bc1q...');
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toEqual(successData);
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx client errors', async () => {
    const mockHttp = {
      get: jest.fn().mockRejectedValue(new AppError('HTTP 404: Not Found', 'HTTP_ERROR')),
      post: jest.fn(),
      postText: jest.fn(),
    };
    const client = new MempoolApiClient(mockHttp, 'https://mempool.space/api');
    await expect(client.getAddress('bad-address')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });

  it('exhausts all retries and throws the last error', async () => {
    const mockHttp = {
      get: jest.fn().mockRejectedValue(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR')),
      post: jest.fn(),
      postText: jest.fn(),
    };
    jest.useFakeTimers();
    const client = new MempoolApiClient(mockHttp, 'https://mempool.space/api');
    let caughtError: unknown;
    const settled = client.getAddress('bc1q...').catch(e => { caughtError = e; });
    await jest.runAllTimersAsync();
    await settled;
    expect(caughtError).toMatchObject({ code: 'HTTP_ERROR' });
    expect(mockHttp.get).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
