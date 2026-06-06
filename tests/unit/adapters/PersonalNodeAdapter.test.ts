import { PersonalNodeAdapter } from '../../../src/core/infrastructure/adapters/PersonalNodeAdapter';
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

function createHttpClient(): jest.Mocked<HttpClient> {
  return { get: jest.fn(), post: jest.fn(), postText: jest.fn() };
}

function createAdapter(config: NetworkConfig = DEFAULT_CONFIG) {
  const httpClient = createHttpClient();
  const storage = new NetworkConfigStorage(createSecureStorageMock());
  const adapter = new PersonalNodeAdapter(httpClient, storage, config);
  return { adapter, httpClient };
}

describe('PersonalNodeAdapter', () => {
  it('returns connected when personal node reports the configured network', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue({ network: 'testnet4' });

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'connected',
      expectedNetwork: 'testnet4',
      actualNetwork: 'testnet4',
    });
    expect(httpClient.get).toHaveBeenCalledWith('http://node.local:3000/v1/network', {
      headers: undefined,
      timeoutMs: 10_000,
    });
  });

  it('sends auth token as bearer header when configured', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue({ network: 'testnet4' });

    await adapter.testConnection({ ...DEFAULT_CONFIG, personalNodeAuthToken: 'secret-token' });

    expect(httpClient.get).toHaveBeenCalledWith('http://node.local:3000/v1/network', {
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

  it('returns network-incompatible when personal node network differs', async () => {
    const { adapter, httpClient } = createAdapter();
    httpClient.get.mockResolvedValue({ network: 'mainnet' });

    await expect(adapter.testConnection(DEFAULT_CONFIG)).resolves.toEqual({
      status: 'network-incompatible',
      expectedNetwork: 'testnet4',
      actualNetwork: 'mainnet',
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
});
