import { SyncAddressStatusUseCase } from '../../../src/core/domain/usecases/address/SyncAddressStatusUseCase';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { EnsureAddressPoolUseCase } from '../../../src/core/domain/usecases/address/EnsureAddressPoolUseCase';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const WALLET_ID = 'wallet-1';
const NETWORK = 'testnet' as const;
const ADDRESS_A = 'tb1qaddr_a';
const ADDRESS_B = 'tb1qaddr_b';

function makeWalletAddress(address: string, overrides: Partial<WalletAddress> = {}): WalletAddress {
  return {
    id: `wa-${address}`,
    walletId: WALLET_ID,
    originId: 'origin-1',
    originName: 'Default',
    address,
    path: "m/84'/1'/0'/0/0",
    accountIndex: 0,
    chain: 'receive',
    index: 0,
    status: 'fresh',
    totalReceivedSats: 0,
    totalSentSats: 0,
    txCount: 0,
    incomingTxCount: 0,
    outgoingTxCount: 0,
    hasUtxos: false,
    isFrozen: false,
    createdAt: '2026-06-07T00:00:00.000Z',
    usedAt: null,
    lastSyncedAt: null,
    ...overrides,
  };
}

function makeTx(txid: string, direction: 'incoming' | 'outgoing' = 'incoming', amountSats = 50_000): Transaction {
  return {
    id: txid,
    txid,
    amountSats,
    direction,
    status: 'confirmed',
    createdAt: '2026-06-07T00:00:00.000Z',
  };
}

function makeUtxo(address: string): Utxo {
  return { txid: 'utxo-tx', vout: 0, valueSats: 50_000, address, isConfirmed: true };
}

function makeWalletAddressRepo(addresses: WalletAddress[]): jest.Mocked<WalletAddressRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(addresses),
    findByOrigin: jest.fn().mockResolvedValue([]),
    findByChain: jest.fn().mockResolvedValue([]),
    findFreshByChain: jest.fn().mockResolvedValue([]),
    findByAddress: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    saveMany: jest.fn().mockResolvedValue(undefined),
    updateOriginName: jest.fn().mockResolvedValue(undefined),
    updateSyncData: jest.fn().mockResolvedValue(undefined),
    countFreshByChain: jest.fn().mockResolvedValue(0),
    nextIndex: jest.fn().mockResolvedValue(0),
  } as unknown as jest.Mocked<WalletAddressRepository>;
}

function makeOriginRepo(): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    findDefault: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<AddressOriginRepository>;
}

function makeUtxoRepo(utxos: Utxo[] = []): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(utxos),
    replaceAll: jest.fn().mockResolvedValue(undefined),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProvider(): jest.Mocked<BlockchainProvider> {
  return {
    getTransactions: jest.fn().mockResolvedValue([]),
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

function makeEnsurePool(): jest.Mocked<EnsureAddressPoolUseCase> {
  return { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<EnsureAddressPoolUseCase>;
}

function createUseCase(overrides: {
  walletAddressRepo?: jest.Mocked<WalletAddressRepository>;
  originRepo?: jest.Mocked<AddressOriginRepository>;
  utxoRepo?: jest.Mocked<UtxoRepository>;
  provider?: jest.Mocked<BlockchainProvider>;
  ensurePool?: jest.Mocked<EnsureAddressPoolUseCase>;
} = {}) {
  return new SyncAddressStatusUseCase(
    overrides.walletAddressRepo ?? makeWalletAddressRepo([]),
    overrides.originRepo ?? makeOriginRepo(),
    overrides.utxoRepo ?? makeUtxoRepo(),
    overrides.provider ?? makeProvider(),
    overrides.ensurePool ?? makeEnsurePool(),
  );
}

describe('SyncAddressStatusUseCase', () => {
  describe('pre-fetched transactions (no network calls)', () => {
    it('uses pre-fetched data instead of calling the provider', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const provider = makeProvider();
      const tx = makeTx('tx1');
      const prefetched = new Map([[ADDRESS_A, [tx]]]);

      const useCase = createUseCase({ walletAddressRepo, provider });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(provider.getTransactions).not.toHaveBeenCalled();
      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ txCount: 1, incomingTxCount: 1 }),
      );
    });

    it('skips addresses absent from pre-fetched map without calling the network', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const provider = makeProvider();
      const prefetched = new Map<string, Transaction[]>(); // ADDRESS_A not in map

      const useCase = createUseCase({ walletAddressRepo, provider });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(provider.getTransactions).not.toHaveBeenCalled();
      expect(walletAddressRepo.updateSyncData).not.toHaveBeenCalled();
    });
  });

  describe('address status transitions', () => {
    it('marks address as "received" when it has only incoming transactions', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const tx = makeTx('tx1', 'incoming');
      const prefetched = new Map([[ADDRESS_A, [tx]]]);

      const useCase = createUseCase({ walletAddressRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ status: 'received' }),
      );
    });

    it('marks address as "spent_once" when it has an outgoing tx and no UTXOs', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const tx = makeTx('tx1', 'outgoing');
      const prefetched = new Map([[ADDRESS_A, [tx]]]);

      const useCase = createUseCase({ walletAddressRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ status: 'spent_once' }),
      );
    });

    it('marks address as "inconsistent" when it has outgoing txs AND UTXOs (unusual)', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const utxoRepo = makeUtxoRepo([makeUtxo(ADDRESS_A)]);
      const tx = makeTx('tx1', 'outgoing');
      const prefetched = new Map([[ADDRESS_A, [tx]]]);

      const useCase = createUseCase({ walletAddressRepo, utxoRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ status: 'inconsistent' }),
      );
    });

    it('keeps "fresh" status when there are no transactions', async () => {
      const addr = makeWalletAddress(ADDRESS_A, { status: 'fresh' });
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const prefetched = new Map([[ADDRESS_A, []]]);

      const useCase = createUseCase({ walletAddressRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ status: 'fresh' }),
      );
    });

    it('keeps "reserved" status when address was reserved but no tx arrived yet', async () => {
      const addr = makeWalletAddress(ADDRESS_A, { status: 'reserved' });
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const prefetched = new Map([[ADDRESS_A, []]]);

      const useCase = createUseCase({ walletAddressRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({ status: 'reserved' }),
      );
    });

    it('skips archived addresses entirely', async () => {
      const addr = makeWalletAddress(ADDRESS_A, { status: 'archived' });
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const provider = makeProvider();
      const prefetched = new Map([[ADDRESS_A, [makeTx('tx1')]]]);

      const useCase = createUseCase({ walletAddressRepo, provider });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).not.toHaveBeenCalled();
    });
  });

  describe('aggregated stats', () => {
    it('computes totalReceivedSats and totalSentSats from transactions', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const incoming = makeTx('tx1', 'incoming', 100_000);
      const outgoing = makeTx('tx2', 'outgoing', 40_000);
      const prefetched = new Map([[ADDRESS_A, [incoming, outgoing]]]);

      const useCase = createUseCase({ walletAddressRepo });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(walletAddressRepo.updateSyncData).toHaveBeenCalledWith(
        addr.id,
        expect.objectContaining({
          totalReceivedSats: 100_000,
          totalSentSats: 40_000,
          txCount: 2,
          incomingTxCount: 1,
          outgoingTxCount: 1,
        }),
      );
    });
  });

  describe('empty wallet', () => {
    it('returns early when there are no HD addresses', async () => {
      const walletAddressRepo = makeWalletAddressRepo([]);
      const provider = makeProvider();

      const useCase = createUseCase({ walletAddressRepo, provider });
      await useCase.execute(WALLET_ID, NETWORK);

      expect(provider.getTransactions).not.toHaveBeenCalled();
      expect(walletAddressRepo.updateSyncData).not.toHaveBeenCalled();
    });
  });

  describe('pool replenishment', () => {
    it('calls ensureAddressPool after syncing', async () => {
      const addr = makeWalletAddress(ADDRESS_A);
      const walletAddressRepo = makeWalletAddressRepo([addr]);
      const ensurePool = makeEnsurePool();
      const prefetched = new Map([[ADDRESS_A, []]]);

      const useCase = createUseCase({ walletAddressRepo, ensurePool });
      await useCase.execute(WALLET_ID, NETWORK, prefetched);

      expect(ensurePool.execute).toHaveBeenCalledWith(WALLET_ID, NETWORK);
    });
  });

  describe('network fallback (no pre-fetched data)', () => {
    it('calls getTransactions for each address when no prefetched data provided', async () => {
      const addrA = makeWalletAddress(ADDRESS_A);
      const addrB = makeWalletAddress(ADDRESS_B, { id: 'wa-b', index: 1 });
      const walletAddressRepo = makeWalletAddressRepo([addrA, addrB]);
      const provider = makeProvider();

      const useCase = createUseCase({ walletAddressRepo, provider });
      await useCase.execute(WALLET_ID, NETWORK); // no prefetched arg

      expect(provider.getTransactions).toHaveBeenCalledTimes(2);
      expect(provider.getTransactions).toHaveBeenCalledWith(ADDRESS_A, NETWORK);
      expect(provider.getTransactions).toHaveBeenCalledWith(ADDRESS_B, NETWORK);
    });
  });
});
