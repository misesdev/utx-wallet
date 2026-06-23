import { PersonalNodeAdapter, normalizeNodeUrl } from '../../../src/core/infrastructure/adapters/PersonalNodeAdapter';
import { NetworkConfigStorage } from '../../../src/core/infrastructure/storage/NetworkConfigStorage';
import { AppError } from '../../../src/core/application/errors/AppError';
import { createSecureStorageMock } from '../../mocks/storage';
import type { HttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const DEFAULT_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
  personalNodeUrl: 'node.local',
  personalNodePort: 3000,
};

// Minimal valid fee rates response (what the probe endpoint returns)
const VALID_RATES = { fastestFee: 30, halfHourFee: 20, hourFee: 15, economyFee: 10, minimumFee: 5 };

function createHttpClient(): jest.Mocked<HttpClient> {
  return { get: jest.fn(), post: jest.fn(), postText: jest.fn() };
}

function createAdapter(config: NetworkConfig = DEFAULT_CONFIG) {
  const httpClient = createHttpClient();
  const storage = new NetworkConfigStorage(createSecureStorageMock());
  const adapter = new PersonalNodeAdapter(httpClient, storage, config);
  return { adapter, httpClient };
}

// ── normalizeNodeUrl ──────────────────────────────────────────────────────────

describe('normalizeNodeUrl', () => {
  it('strips /v1 version suffix from URL path', () => {
    expect(normalizeNodeUrl('http://192.168.15.14:8081/api/v1')).toBe('http://192.168.15.14:8081/api');
  });

  it('strips /v1/ with trailing slash', () => {
    expect(normalizeNodeUrl('http://host:8080/api/v1/')).toBe('http://host:8080/api');
  });

  it('preserves /api path without version suffix', () => {
    expect(normalizeNodeUrl('http://host:8080/api')).toBe('http://host:8080/api');
  });

  it('handles URL without path', () => {
    expect(normalizeNodeUrl('node.local', 3000)).toBe('http://node.local:3000');
  });

  it('adds http:// when protocol is missing', () => {
    expect(normalizeNodeUrl('192.168.1.10:8080/api')).toBe('http://192.168.1.10:8080/api');
  });

  it('prefers explicit port parameter over port in URL', () => {
    expect(normalizeNodeUrl('http://host:8080/api', 9000)).toBe('http://host:9000/api');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeNodeUrl('')).toBe('');
    expect(normalizeNodeUrl('   ')).toBe('');
  });

  it('strips /v2 and other version suffixes', () => {
    expect(normalizeNodeUrl('http://host:8080/api/v2')).toBe('http://host:8080/api');
  });
});

// ── PersonalNodeAdapter ───────────────────────────────────────────────────────

describe('PersonalNodeAdapter', () => {
  it('returns connected when probe endpoint responds with valid fee rates', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue(VALID_RATES);

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'connected',
      expectedNetwork: 'testnet4',
      actualNetwork: 'testnet4',
    });
  });

  it('probes /v1/fees/recommended — the endpoint that exists in all mempool instances', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue(VALID_RATES);

    await adapter.testConnection(DEFAULT_CONFIG);

    expect(httpClient.get).toHaveBeenCalledWith('http://node.local:3000/v1/fees/recommended', {
      headers: undefined,
      timeoutMs: 10_000,
    });
  });

  it('sends auth token as bearer header when configured', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue(VALID_RATES);

    await adapter.testConnection({ ...DEFAULT_CONFIG, personalNodeAuthToken: 'secret-token' });

    expect(httpClient.get).toHaveBeenCalledWith('http://node.local:3000/v1/fees/recommended', {
      headers: { Authorization: 'Bearer secret-token' },
      timeoutMs: 10_000,
    });
  });

  it('returns disconnected when personal node cannot be reached', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockRejectedValue(new Error('offline'));

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'disconnected',
      expectedNetwork: 'testnet4',
    });
  });

  it('returns disconnected when probe response is not valid fee rates (e.g. HTML proxy page)', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue({ message: 'OK' }); // not fee rates

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'disconnected',
      expectedNetwork: 'testnet4',
    });
  });

  it('returns authentication-error on HTTP 401 or 403', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockRejectedValue(new AppError('HTTP 401: Unauthorized', 'HTTP_ERROR'));

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'authentication-error',
      expectedNetwork: 'testnet4',
    });
  });

  it('strips /v1 from user-provided URL so probe hits the correct endpoint', async () => {
    const config: NetworkConfig = {
      ...DEFAULT_CONFIG,
      personalNodeUrl: 'http://192.168.15.14:8081/api/v1',
      personalNodePort: undefined,
    };
    const { adapter, httpClient } = createAdapter(config);
    httpClient.get.mockResolvedValue(VALID_RATES);

    await adapter.testConnection(config);

    expect(httpClient.get).toHaveBeenCalledWith('http://192.168.15.14:8081/api/v1/fees/recommended', {
      headers: undefined,
      timeoutMs: 10_000,
    });
  });

  it('works when user provides the correct /api base URL', async () => {
    const config: NetworkConfig = {
      ...DEFAULT_CONFIG,
      personalNodeUrl: 'http://192.168.15.14:8081/api',
      personalNodePort: undefined,
    };
    const { adapter, httpClient } = createAdapter(config);
    httpClient.get.mockResolvedValue(VALID_RATES);

    await adapter.testConnection(config);

    expect(httpClient.get).toHaveBeenCalledWith('http://192.168.15.14:8081/api/v1/fees/recommended', {
      headers: undefined,
      timeoutMs: 10_000,
    });
  });
});
