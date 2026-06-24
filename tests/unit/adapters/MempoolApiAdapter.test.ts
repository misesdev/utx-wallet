import { MempoolApiAdapter } from '../../../src/core/infrastructure/adapters/MempoolApiAdapter';
import { NetworkConfigStorage } from '../../../src/core/infrastructure/storage/NetworkConfigStorage';
import { AppError } from '../../../src/core/application/errors/AppError';
import { createSecureStorageMock } from '../../mocks/storage';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { HttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import type {
  MempoolAddressResponse,
  MempoolUtxoEntry,
  MempoolTxResponse,
  MempoolFeeRatesResponse,
} from '../../../src/core/infrastructure/api/MempoolApiClient';

const defaultConfig: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
};

function createMockHttpClient(): jest.Mocked<HttpClient> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    postText: jest.fn(),
  };
}

function createAdapter(httpClient = createMockHttpClient()) {
  const configStorage = new NetworkConfigStorage(createSecureStorageMock());
  const adapter = new MempoolApiAdapter(httpClient, configStorage, defaultConfig);
  return { adapter, configStorage, httpClient };
}

// ── NodeRepository ────────────────────────────────────────────────────────────

describe('MempoolApiAdapter — NodeRepository', () => {
  describe('ping()', () => {
    it('returns true when healthcheck request resolves', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue({ status: 'ok' });
      await expect(adapter.ping()).resolves.toBe(true);
    });

    it('returns false when healthcheck request throws', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockRejectedValue(new Error('Network error'));
      await expect(adapter.ping()).resolves.toBe(false);
    });

    it('returns false on HTTP error', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockRejectedValue(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'));
      await expect(adapter.ping()).resolves.toBe(false);
    });
  });

  describe('setNetworkConfig() / getNetworkConfig()', () => {
    it('persists config and returns it on next get', async () => {
      const { adapter } = createAdapter();
      const mainnet: NetworkConfig = { connectivityMode: 'online', personalNodes: [], allowPublicFallback: true };
      await adapter.setNetworkConfig(mainnet);
      await expect(adapter.getNetworkConfig()).resolves.toEqual(mainnet);
    });

    it('reads persisted config from storage', async () => {
      const { configStorage, httpClient } = createAdapter();
      const mainnet: NetworkConfig = { connectivityMode: 'online', personalNodes: [], allowPublicFallback: true };
      await configStorage.save(mainnet);
      const adapter = new MempoolApiAdapter(httpClient, configStorage, defaultConfig);
      await expect(adapter.getNetworkConfig()).resolves.toEqual(mainnet);
    });

    it('falls back to defaultConfig when nothing is stored', async () => {
      const { adapter } = createAdapter();
      await expect(adapter.getNetworkConfig()).resolves.toEqual(defaultConfig);
    });
  });
});



  describe('network endpoint selection', () => {
    it('getFeeRates always uses mainnet endpoint (network-agnostic fee API)', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue({
        fastestFee: 12,
        halfHourFee: 10,
        hourFee: 8,
        economyFee: 4,
        minimumFee: 1,
      });

      await adapter.getFeeRates();

      expect(httpClient.get).toHaveBeenCalledWith('https://mempool.space/api/v1/fees/recommended', expect.any(Object));
    });
  });

// ── BlockchainProvider ────────────────────────────────────────────────────────

const ADDRESS = 'tb1qtest000000000000000000000000000000000000';
const NETWORK = 'testnet4' as const;

describe('MempoolApiAdapter — BlockchainProvider', () => {
  describe('getBalance()', () => {
    it('returns confirmed and unconfirmed sats from chain/mempool stats', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockAddress: MempoolAddressResponse = {
        address: ADDRESS,
        chain_stats: { funded_txo_sum: 500_000, spent_txo_sum: 200_000, tx_count: 3 },
        mempool_stats: { funded_txo_sum: 50_000, spent_txo_sum: 0, tx_count: 1 },
      };
      httpClient.get.mockResolvedValue(mockAddress);
      const balance = await adapter.getBalance(ADDRESS, NETWORK);
      expect(balance.confirmedSats).toBe(300_000);
      expect(balance.unconfirmedSats).toBe(50_000);
    });

    it('returns zero balances when chain and mempool stats are empty', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockAddress: MempoolAddressResponse = {
        address: ADDRESS,
        chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
      };
      httpClient.get.mockResolvedValue(mockAddress);
      const balance = await adapter.getBalance(ADDRESS, NETWORK);
      expect(balance.confirmedSats).toBe(0);
      expect(balance.unconfirmedSats).toBe(0);
    });

    it('throws on HTTP error', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockRejectedValue(new AppError('HTTP 404: Not Found', 'HTTP_ERROR'));
      await expect(adapter.getBalance(ADDRESS, NETWORK)).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });
  });

  describe('getUtxos() — parsing', () => {
    it('maps confirmed UTXO correctly', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockUtxos: MempoolUtxoEntry[] = [
        { txid: 'abc123', vout: 0, status: { confirmed: true, block_height: 800_000 }, value: 100_000 },
      ];
      httpClient.get.mockResolvedValue(mockUtxos);
      const utxos = await adapter.getUtxos(ADDRESS, NETWORK);
      expect(utxos).toHaveLength(1);
      expect(utxos[0]).toEqual({
        txid: 'abc123',
        vout: 0,
        valueSats: 100_000,
        address: ADDRESS,
        isConfirmed: true,
      });
    });

    it('maps unconfirmed (mempool) UTXO correctly', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockUtxos: MempoolUtxoEntry[] = [
        { txid: 'def456', vout: 1, status: { confirmed: false }, value: 50_000 },
      ];
      httpClient.get.mockResolvedValue(mockUtxos);
      const [utxo] = await adapter.getUtxos(ADDRESS, NETWORK);
      expect(utxo.isConfirmed).toBe(false);
      expect(utxo.valueSats).toBe(50_000);
      expect(utxo.vout).toBe(1);
    });

    it('returns empty array when no UTXOs exist', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([]);
      await expect(adapter.getUtxos(ADDRESS, NETWORK)).resolves.toEqual([]);
    });

    it('maps multiple UTXOs preserving all fields', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockUtxos: MempoolUtxoEntry[] = [
        { txid: 'tx1', vout: 0, status: { confirmed: true }, value: 10_000 },
        { txid: 'tx2', vout: 2, status: { confirmed: false }, value: 20_000 },
        { txid: 'tx3', vout: 0, status: { confirmed: true }, value: 30_000 },
      ];
      httpClient.get.mockResolvedValue(mockUtxos);
      const utxos = await adapter.getUtxos(ADDRESS, NETWORK);
      expect(utxos).toHaveLength(3);
      expect(utxos.map(u => u.txid)).toEqual(['tx1', 'tx2', 'tx3']);
      expect(utxos.map(u => u.valueSats)).toEqual([10_000, 20_000, 30_000]);
    });
  });

  describe('getTransactions() — parsing', () => {
    const buildTx = (overrides: Partial<MempoolTxResponse> = {}): MempoolTxResponse => ({
      txid: 'txid1',
      vin: [{ txid: 'prev1', vout: 0, sequence: 0xFFFFFFFE, prevout: { scriptpubkey_address: 'other-addr', value: 200_000 } }],
      vout: [
        { scriptpubkey_address: ADDRESS, value: 100_000 },
        { scriptpubkey_address: 'other-addr', value: 99_000 },
      ],
      fee: 1_000,
      status: { confirmed: true, block_time: 1_700_000_000 },
      ...overrides,
    });

    it('maps incoming confirmed transaction correctly', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([buildTx()]);
      const [tx] = await adapter.getTransactions(ADDRESS, NETWORK);
      expect(tx.txid).toBe('txid1');
      expect(tx.id).toBe('txid1');
      expect(tx.direction).toBe('incoming');
      expect(tx.amountSats).toBe(100_000);
      expect(tx.feeSats).toBe(1_000);
      expect(tx.status).toBe('confirmed');
      expect(tx.createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
    });

    it('maps outgoing transaction correctly', async () => {
      const { adapter, httpClient } = createAdapter();
      const outgoingTx = buildTx({
        vin: [{ txid: 'prev1', vout: 0, sequence: 0xFFFFFFFE, prevout: { scriptpubkey_address: ADDRESS, value: 200_000 } }],
        vout: [
          { scriptpubkey_address: 'recipient', value: 150_000 },
          { scriptpubkey_address: ADDRESS, value: 49_000 }, // change
        ],
        fee: 1_000,
      });
      httpClient.get.mockResolvedValue([outgoingTx]);
      const [tx] = await adapter.getTransactions(ADDRESS, NETWORK);
      expect(tx.direction).toBe('outgoing');
      expect(tx.amountSats).toBe(200_000 - 49_000); // sent minus change returned
    });

    it('maps pending (unconfirmed) transaction status', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([
        buildTx({ status: { confirmed: false } }),
      ]);
      const [tx] = await adapter.getTransactions(ADDRESS, NETWORK);
      expect(tx.status).toBe('pending');
    });

    it('uses current time as createdAt when block_time is absent', async () => {
      const { adapter, httpClient } = createAdapter();
      const before = Date.now();
      httpClient.get.mockResolvedValue([buildTx({ status: { confirmed: false } })]);
      const [tx] = await adapter.getTransactions(ADDRESS, NETWORK);
      const after = Date.now();
      const createdAt = new Date(tx.createdAt).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });

    it('returns empty array when no transactions exist', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([]);
      await expect(adapter.getTransactions(ADDRESS, NETWORK)).resolves.toEqual([]);
    });
  });

  describe('getTransactionStatus()', () => {
    it('returns confirmed status with block details', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockTx: MempoolTxResponse = {
        txid: 'txid1',
        vin: [], vout: [], fee: 0,
        status: { confirmed: true, block_height: 800_000, block_time: 1_700_000_000 },
      };
      httpClient.get.mockResolvedValue(mockTx);
      const status = await adapter.getTransactionStatus('txid1');
      expect(status).toEqual({
        txid: 'txid1',
        confirmed: true,
        blockHeight: 800_000,
        blockTime: 1_700_000_000,
      });
    });

    it('returns pending status for mempool transaction', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockTx: MempoolTxResponse = {
        txid: 'txid2',
        vin: [], vout: [], fee: 100,
        status: { confirmed: false },
      };
      httpClient.get.mockResolvedValue(mockTx);
      const status = await adapter.getTransactionStatus('txid2');
      expect(status.confirmed).toBe(false);
      expect(status.blockHeight).toBeUndefined();
    });
  });

  describe('getFeeRates()', () => {
    it('maps Mempool fee rates to domain FeeRates', async () => {
      const { adapter, httpClient } = createAdapter();
      const mockRates: MempoolFeeRatesResponse = {
        fastestFee: 20,
        halfHourFee: 15,
        hourFee: 10,
        economyFee: 5,
        minimumFee: 1,
      };
      httpClient.get.mockResolvedValue(mockRates);
      const rates = await adapter.getFeeRates();
      expect(rates).toEqual({
        fastSatsPerVByte: 20,
        halfHourSatsPerVByte: 15,
        hourSatsPerVByte: 10,
        economySatsPerVByte: 5,
        minimumSatsPerVByte: 1,
      });
    });
  });

  describe('broadcastTransaction()', () => {
    it('posts raw hex and returns the txid', async () => {
      const { adapter, httpClient } = createAdapter();
      const expectedTxid = 'abcdef1234567890';
      httpClient.postText.mockResolvedValue(expectedTxid);
      const txid = await adapter.broadcastTransaction('deadbeef');
      expect(txid).toBe(expectedTxid);
      expect(httpClient.postText).toHaveBeenCalledWith(
        expect.stringContaining('/tx'),
        'deadbeef',
        expect.objectContaining({ timeoutMs: expect.any(Number) }),
      );
    });

    it('throws on broadcast failure', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.postText.mockRejectedValue(
        new AppError('HTTP 400: Bad Request', 'HTTP_ERROR'),
      );
      await expect(adapter.broadcastTransaction('badhex')).rejects.toMatchObject({
        code: 'HTTP_ERROR',
      });
    });
  });

  describe('network URL routing', () => {
    it('uses testnet4 URL when network param is testnet4', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([]);
      await adapter.getUtxos(ADDRESS, 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('testnet4'),
        expect.any(Object),
      );
    });

    it('uses mainnet URL when network param is mainnet, regardless of adapter config', async () => {
      const { adapter, httpClient } = createAdapter(); // adapter configured for testnet4
      httpClient.get.mockResolvedValue([]);
      await adapter.getUtxos(ADDRESS, 'mainnet');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('mempool.space/api/'),
        expect.any(Object),
      );
    });

    it('uses testnet URL when network param is testnet3', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.get.mockResolvedValue([]);
      await adapter.getUtxos(ADDRESS, 'testnet3');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('testnet/api'),
        expect.any(Object),
      );
    });

    it('always uses public mempool URL — personal node routing is handled by NodeProviderSelector', async () => {
      // MempoolApiAdapter is the public-API implementation; it should NEVER route to a personal
      // node. NodeProviderSelector is responsible for selecting the correct provider.
      const configStorage = new NetworkConfigStorage(createSecureStorageMock());
      const httpClient = createMockHttpClient();
      const adapter = new MempoolApiAdapter(httpClient, configStorage, {
        connectivityMode: 'online',
        personalNodes: [{ id: 'n1', label: 'N', url: 'http://mynode:8081', network: 'testnet4', priority: 1 }],
        allowPublicFallback: false,
        // Even when personal nodes are configured, MempoolApiAdapter is the public-only implementation.
        // Routing to personal nodes is handled by NodeProviderSelector / MultiNodeBlockchainProvider.
      });
      httpClient.get.mockResolvedValue([]);
      await adapter.getUtxos(ADDRESS, 'testnet4');
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('mempool.space'),
        expect.any(Object),
      );
    });
  });
});
