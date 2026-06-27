import { MultiNodeBlockchainProvider } from '../../../src/core/infrastructure/adapters/MultiNodeBlockchainProvider';
import { NetworkConfigStorage } from '../../../src/core/infrastructure/storage/NetworkConfigStorage';
import { AppError } from '../../../src/core/application/errors/AppError';
import { createSecureStorageMock } from '../../mocks/storage';
import type { HttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';

const MAINNET_NODE: PersonalNode = {
  id: 'node-1',
  label: 'Primary',
  url: 'http://node1.local',
  network: 'testnet4',
  priority: 1,
};

const SECONDARY_NODE: PersonalNode = {
  id: 'node-2',
  label: 'Secondary',
  url: 'http://node2.local',
  network: 'testnet4',
  priority: 2,
};

const MAINNET_NODE_OTHER: PersonalNode = {
  id: 'node-3',
  label: 'Mainnet',
  url: 'http://node3.local',
  network: 'mainnet',
  priority: 1,
};

const BASE_CONFIG: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [MAINNET_NODE, SECONDARY_NODE, MAINNET_NODE_OTHER],
  allowPublicFallback: false,
};

function createHttpClient(): jest.Mocked<HttpClient> {
  return { get: jest.fn(), post: jest.fn(), postText: jest.fn() };
}

function createPublicFallback(): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

async function makeProvider(config: NetworkConfig) {
  const secureStorage = createSecureStorageMock();
  const configStorage = new NetworkConfigStorage(secureStorage);
  await configStorage.save(config);
  const httpClient = createHttpClient();
  const publicFallback = createPublicFallback();
  const provider = new MultiNodeBlockchainProvider(httpClient, configStorage, publicFallback);
  return { provider, httpClient, publicFallback, configStorage };
}

describe('MultiNodeBlockchainProvider', () => {
  describe('Priority routing', () => {
    it('calls the highest-priority node first', async () => {
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      httpClient.get.mockResolvedValueOnce([]);
      await provider.getUtxos('tb1qtest', 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('node1.local'),
        expect.anything(),
      );
    });

    it('only calls nodes matching the requested network', async () => {
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      httpClient.get.mockResolvedValueOnce([]);
      await provider.getUtxos('bc1qtest', 'mainnet');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('node3.local'),
        expect.anything(),
      );
      expect(httpClient.get).not.toHaveBeenCalledWith(
        expect.stringContaining('node1.local'),
        expect.anything(),
      );
    });
  });

  describe('Failover', () => {
    it('falls back to secondary node when primary has a transport error', async () => {
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      // Make all calls to node1 fail (even retries), let node2 succeed
      httpClient.get.mockImplementation((url: string) => {
        if ((url as string).includes('node1.local')) return Promise.reject(new Error('timeout'));
        return Promise.resolve([]);
      });
      await provider.getUtxos('tb1qtest', 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('node2.local'),
        expect.anything(),
      );
    });

    it('does not retry on 4xx client errors', async () => {
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      httpClient.get.mockRejectedValue(new AppError('HTTP 400 — bad request', 'HTTP_ERROR'));
      await expect(provider.getUtxos('tb1qtest', 'testnet4')).rejects.toThrow('HTTP 400');
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it('throws last error when all nodes fail and fallback is disabled', async () => {
      const { provider, httpClient } = await makeProvider({
        ...BASE_CONFIG,
        allowPublicFallback: false,
      });
      httpClient.get.mockRejectedValue(new Error('node offline'));
      await expect(provider.getUtxos('tb1qtest', 'testnet4')).rejects.toThrow('node offline');
    });

    it('uses public fallback when all nodes fail and fallback is enabled', async () => {
      const { provider, httpClient, publicFallback } = await makeProvider({
        ...BASE_CONFIG,
        allowPublicFallback: true,
      });
      httpClient.get.mockRejectedValue(new Error('node offline'));
      publicFallback.getUtxos.mockResolvedValue([]);
      const result = await provider.getUtxos('tb1qtest', 'testnet4');
      expect(result).toEqual([]);
      expect(publicFallback.getUtxos).toHaveBeenCalledWith('tb1qtest', 'testnet4');
    });
  });

  describe('No nodes configured', () => {
    it('uses public fallback when no nodes are configured for the network', async () => {
      const { provider, publicFallback } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [],
      });
      publicFallback.getUtxos.mockResolvedValue([]);
      const result = await provider.getUtxos('tb1qtest', 'testnet4');
      expect(result).toEqual([]);
      expect(publicFallback.getUtxos).toHaveBeenCalledTimes(1);
    });

    it('uses public fallback when no nodes configured and fallback is explicitly enabled', async () => {
      const { provider, publicFallback } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [],
        allowPublicFallback: true,
      });
      publicFallback.getUtxos.mockResolvedValue([]);
      const result = await provider.getUtxos('tb1qtest', 'testnet4');
      expect(result).toEqual([]);
      expect(publicFallback.getUtxos).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auth headers', () => {
    it('sends bearer token when node has authToken', async () => {
      const nodeWithAuth: PersonalNode = { ...MAINNET_NODE, authToken: 'my-secret' };
      const { provider, httpClient } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [nodeWithAuth],
      });
      httpClient.get.mockResolvedValueOnce([]);
      await provider.getUtxos('tb1qtest', 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { Authorization: 'Bearer my-secret' } }),
      );
    });

    it('sends no auth header when node has no authToken', async () => {
      const { provider, httpClient } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [MAINNET_NODE],
      });
      httpClient.get.mockResolvedValueOnce([]);
      await provider.getUtxos('tb1qtest', 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: undefined }),
      );
    });
  });

  describe('getFeeRates', () => {
    it('maps Mempool fee rates to domain FeeRates', async () => {
      const { provider, httpClient } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [MAINNET_NODE],
      });
      httpClient.get.mockResolvedValueOnce({
        fastestFee: 20,
        halfHourFee: 15,
        hourFee: 10,
        economyFee: 5,
        minimumFee: 1,
      });
      const rates = await provider.getFeeRates('testnet4');
      expect(rates.fastSatsPerVByte).toBe(20);
      expect(rates.minimumSatsPerVByte).toBe(1);
    });
  });

  describe('broadcastTransaction', () => {
    const RAW_HEX = 'deadbeef01020304';

    it('continues to the next node when the first node rejects with HTTP 400', async () => {
      // Unlike data queries, a 400 from broadcast (e.g. -26 policy rejection) should not
      // halt the failover chain — another node may accept the transaction.
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      httpClient.postText.mockImplementation((url: string) => {
        if (url.includes('node1.local'))
          return Promise.reject(new AppError('HTTP 400 — sendrawtransaction RPC error: -26', 'HTTP_ERROR'));
        return Promise.resolve('accepted-txid');
      });
      const txid = await provider.broadcastTransaction(RAW_HEX, 'testnet4');
      expect(txid).toBe('accepted-txid');
      expect(httpClient.postText).toHaveBeenCalledTimes(2);
    });

    it('uses public fallback when all personal nodes reject with 400 and fallback is enabled', async () => {
      const { provider, httpClient, publicFallback } = await makeProvider({
        ...BASE_CONFIG,
        allowPublicFallback: true,
      });
      httpClient.postText.mockRejectedValue(new AppError('HTTP 400 — policy rejection', 'HTTP_ERROR'));
      publicFallback.broadcastTransaction.mockResolvedValue('fallback-txid');
      const txid = await provider.broadcastTransaction(RAW_HEX, 'testnet4');
      expect(txid).toBe('fallback-txid');
      expect(publicFallback.broadcastTransaction).toHaveBeenCalledWith(RAW_HEX, 'testnet4');
    });

    it('throws last error when all nodes reject with 400 and fallback is disabled (safe mode)', async () => {
      const { provider, httpClient } = await makeProvider({
        ...BASE_CONFIG,
        allowPublicFallback: false,
      });
      const err = new AppError('HTTP 400 — sendrawtransaction RPC error: -26', 'HTTP_ERROR');
      httpClient.postText.mockRejectedValue(err);
      await expect(provider.broadcastTransaction(RAW_HEX, 'testnet4')).rejects.toThrow('-26');
    });

    it('passes the correct network to the public fallback', async () => {
      const { provider, httpClient, publicFallback } = await makeProvider({
        ...BASE_CONFIG,
        personalNodes: [],
        allowPublicFallback: true,
      });
      httpClient.postText.mockRejectedValue(new Error('timeout'));
      publicFallback.broadcastTransaction.mockResolvedValue('public-txid');
      const txid = await provider.broadcastTransaction(RAW_HEX, 'mainnet');
      expect(publicFallback.broadcastTransaction).toHaveBeenCalledWith(RAW_HEX, 'mainnet');
      expect(txid).toBe('public-txid');
    });

    it('does NOT continue to next node for data queries that return 400 (non-broadcast ops)', async () => {
      // For get operations (UTXOs, etc.) a 400 is a definitive client error — don't retry.
      const { provider, httpClient } = await makeProvider(BASE_CONFIG);
      httpClient.get.mockRejectedValue(new AppError('HTTP 400 — bad request', 'HTTP_ERROR'));
      await expect(provider.getUtxos('tb1qtest', 'testnet4')).rejects.toThrow('HTTP 400');
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });
  });
});
