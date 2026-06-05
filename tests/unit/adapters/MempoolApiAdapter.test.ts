import { MempoolApiAdapter } from '../../../src/core/infrastructure/adapters/MempoolApiAdapter';
import { NetworkConfigStorage } from '../../../src/core/infrastructure/storage/NetworkConfigStorage';
import { createSecureStorageMock } from '../../mocks/storage';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const defaultConfig: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

function createMockMempoolClient(healthcheckImpl?: () => Promise<{ status: string }>) {
  return {
    getBaseUrl: jest.fn(() => 'https://mempool.space'),
    healthcheck: jest.fn(healthcheckImpl ?? (() => Promise.resolve({ status: 'ok' }))),
  };
}

function createAdapter(client = createMockMempoolClient()) {
  const configStorage = new NetworkConfigStorage(createSecureStorageMock());
  return { adapter: new MempoolApiAdapter(client as any, configStorage, defaultConfig), configStorage, client };
}

describe('MempoolApiAdapter', () => {
  describe('ping()', () => {
    it('calls healthcheck() on the mempool client', async () => {
      const { adapter, client } = createAdapter();
      await adapter.ping();
      expect(client.healthcheck).toHaveBeenCalled();
    });

    it('returns true when healthcheck resolves', async () => {
      const { adapter } = createAdapter();
      await expect(adapter.ping()).resolves.toBe(true);
    });

    it('returns false when healthcheck throws (network unreachable)', async () => {
      const client = createMockMempoolClient(() => Promise.reject(new Error('Network error')));
      const { adapter } = createAdapter(client);
      await expect(adapter.ping()).resolves.toBe(false);
    });

    it('never returns true based solely on the base URL being set', async () => {
      const client = createMockMempoolClient(() => Promise.reject(new Error('Offline')));
      const { adapter } = createAdapter(client);
      // Even though baseUrl is a non-empty string, offline → false
      await expect(adapter.ping()).resolves.toBe(false);
    });
  });

  describe('setNetworkConfig() / getNetworkConfig()', () => {
    it('persists config to storage and returns it via getNetworkConfig()', async () => {
      const { adapter } = createAdapter();
      const newConfig: NetworkConfig = { network: 'mainnet', connectivityMode: 'online', nodeMode: 'public-api' };
      await adapter.setNetworkConfig(newConfig);
      await expect(adapter.getNetworkConfig()).resolves.toEqual(newConfig);
    });

    it('reads persisted config from storage on getNetworkConfig()', async () => {
      const secureStorage = createSecureStorageMock();
      const configStorage = new NetworkConfigStorage(secureStorage);
      const mainnetConfig: NetworkConfig = { network: 'mainnet', connectivityMode: 'online', nodeMode: 'public-api' };
      await configStorage.save(mainnetConfig);

      const adapter = new MempoolApiAdapter(createMockMempoolClient() as any, configStorage, defaultConfig);
      await expect(adapter.getNetworkConfig()).resolves.toEqual(mainnetConfig);
    });

    it('falls back to defaultConfig when nothing is persisted', async () => {
      const { adapter } = createAdapter();
      await expect(adapter.getNetworkConfig()).resolves.toEqual(defaultConfig);
    });
  });
});
