import { SyncAccountUseCase } from '../../../src/core/domain/usecases/wallet/SyncAccountUseCase';
import { SyncUtxosUseCase } from '../../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { SyncStateRepository } from '../../../src/core/domain/repositories/SyncStateRepository';
import type { SyncAddressStatusUseCase } from '../../../src/core/domain/usecases/address/SyncAddressStatusUseCase';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import type { OnSyncProgress } from '../../../src/core/domain/usecases/wallet/SyncProgress';

const WALLET_ID = 'wallet-1';
const ORIGIN_ID = 'origin-1';

function makeWallet(overrides: Partial<{ id: string; network: string }> = {}) {
  return {
    id: WALLET_ID,
    name: 'Test',
    status: 'active',
    network: 'testnet',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAddress(address: string, chain: 'receive' | 'change' = 'receive', status = 'fresh'): WalletAddress {
  return {
    id: `${address}-id`,
    walletId: WALLET_ID,
    address,
    originId: ORIGIN_ID,
    originName: 'Default',
    chain,
    index: 0,
    accountIndex: 0,
    status: status as WalletAddress['status'],
    txCount: 0,
    totalReceivedSats: 0,
    totalSentSats: 0,
    incomingTxCount: 0,
    outgoingTxCount: 0,
    hasUtxos: false,
    isFrozen: false,
    createdAt: new Date().toISOString(),
    usedAt: null,
    lastSyncedAt: null,
    path: "m/84'/0'/0'/0/0",
  };
}

function makeWalletRepo(wallet = makeWallet()): jest.Mocked<WalletRepository> {
  return {
    findById: jest.fn().mockResolvedValue(wallet),
  } as unknown as jest.Mocked<WalletRepository>;
}

function makeAddressRepo(
  receiveAddresses: WalletAddress[] = [],
  changeAddresses: WalletAddress[] = [],
): jest.Mocked<WalletAddressRepository> {
  return {
    findFreshByChain: jest.fn().mockImplementation(
      (_walletId: string, _originId: string, chain: 'receive' | 'change') =>
        Promise.resolve(chain === 'receive' ? receiveAddresses : changeAddresses),
    ),
  } as unknown as jest.Mocked<WalletAddressRepository>;
}

function makeSyncUtxos(newCount = 0, spentCount = 0): jest.Mocked<SyncUtxosUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ newCount, spentCount }),
  } as unknown as jest.Mocked<SyncUtxosUseCase>;
}

function makeSyncTransactions(newCount = 0): jest.Mocked<SyncTransactionsUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ newCount, fetchedTransactions: new Map() }),
  } as unknown as jest.Mocked<SyncTransactionsUseCase>;
}

function makeSyncBalance(): jest.Mocked<SyncBalanceUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SyncBalanceUseCase>;
}

function makeSyncStateRepo(): jest.Mocked<SyncStateRepository> {
  return {
    saveLastSyncAt: jest.fn().mockResolvedValue(undefined),
    getLastSyncAt: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<SyncStateRepository>;
}

function makeSyncAddressStatus(): jest.Mocked<SyncAddressStatusUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SyncAddressStatusUseCase>;
}

function makeUseCase(overrides: {
  walletRepo?: jest.Mocked<WalletRepository>;
  addressRepo?: jest.Mocked<WalletAddressRepository>;
  syncUtxos?: jest.Mocked<SyncUtxosUseCase>;
  syncTransactions?: jest.Mocked<SyncTransactionsUseCase>;
  syncBalance?: jest.Mocked<SyncBalanceUseCase>;
  syncState?: jest.Mocked<SyncStateRepository>;
  syncAddressStatus?: jest.Mocked<SyncAddressStatusUseCase> | null;
} = {}) {
  return new SyncAccountUseCase(
    overrides.walletRepo ?? makeWalletRepo(),
    overrides.addressRepo ?? makeAddressRepo(),
    overrides.syncUtxos ?? makeSyncUtxos(),
    overrides.syncTransactions ?? makeSyncTransactions(),
    overrides.syncBalance ?? makeSyncBalance(),
    overrides.syncState ?? makeSyncStateRepo(),
    overrides.syncAddressStatus !== undefined ? overrides.syncAddressStatus : null,
  );
}

describe('SyncAccountUseCase', () => {
  describe('wallet validation', () => {
    it('throws WALLET_NOT_FOUND when wallet does not exist', async () => {
      const walletRepo = makeWalletRepo();
      walletRepo.findById.mockResolvedValue(null);
      const useCase = makeUseCase({ walletRepo });
      await expect(useCase.execute(WALLET_ID, ORIGIN_ID)).rejects.toMatchObject({
        code: 'WALLET_NOT_FOUND',
      });
    });
  });

  describe('pool-based sync', () => {
    it('syncs only pool addresses from findFreshByChain', async () => {
      const receiveAddr = makeAddress('receive-addr', 'receive');
      const changeAddr = makeAddress('change-addr', 'change');
      const addressRepo = makeAddressRepo([receiveAddr], [changeAddr]);
      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(addressRepo.findFreshByChain).toHaveBeenCalledWith(WALLET_ID, ORIGIN_ID, 'receive', ['received']);
      expect(addressRepo.findFreshByChain).toHaveBeenCalledWith(WALLET_ID, ORIGIN_ID, 'change', ['reserved']);
      const syncedAddresses = (syncUtxos.execute as jest.Mock).mock.calls[0][1];
      expect(syncedAddresses).toContain('receive-addr');
      expect(syncedAddresses).toContain('change-addr');
    });

    it('stops immediately when pool is empty', async () => {
      const addressRepo = makeAddressRepo([], []);
      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(syncUtxos.execute).not.toHaveBeenCalled();
    });

    it('does not re-sync addresses already synced in a previous iteration', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = {
        findFreshByChain: jest.fn().mockImplementation(
          (_wid: string, _oid: string, chain: 'receive' | 'change') => {
            // Iteration 1: return addr-A; Iteration 2+: return addr-A again (simulating no EnsurePool)
            if (chain === 'receive') return Promise.resolve([receiveAddr]);
            return Promise.resolve([]);
          },
        ),
      } as unknown as jest.Mocked<WalletAddressRepository>;

      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      // Pool was addr-A, then addr-A again but filtered by syncedThisRun → empty → break
      expect(syncUtxos.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('reserved change address sync', () => {
    it('includes reserved change addresses in sync batch', async () => {
      const receiveAddr = makeAddress('receive-addr', 'receive');
      const reservedChangeAddr = makeAddress('change-reserved', 'change', 'reserved');
      const addressRepo: jest.Mocked<WalletAddressRepository> = {
        findFreshByChain: jest.fn().mockImplementation(
          (_wid: string, _oid: string, chain: 'receive' | 'change', additionalStatuses?: string[]) => {
            if (chain === 'receive') return Promise.resolve([receiveAddr]);
            // Ensure reserved addresses are included only when asked
            if (chain === 'change' && additionalStatuses?.includes('reserved')) {
              return Promise.resolve([reservedChangeAddr]);
            }
            return Promise.resolve([]);
          },
        ),
      } as unknown as jest.Mocked<WalletAddressRepository>;
      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(addressRepo.findFreshByChain).toHaveBeenCalledWith(WALLET_ID, ORIGIN_ID, 'change', ['reserved']);
      const syncedAddresses: string[] = (syncUtxos.execute as jest.Mock).mock.calls[0][1];
      expect(syncedAddresses).toContain('change-reserved');
    });

    it('syncs reserved change address so its UTXO is not lost after a send', async () => {
      // The change address is reserved (status set by BuildTransactionUseCase after a send).
      // Without passing ['reserved'] to findFreshByChain, the change UTXO would never sync
      // and the wallet balance would appear zeroed after any transaction.
      const reservedChange = makeAddress('bc1qchange', 'change', 'reserved');
      const addressRepo: jest.Mocked<WalletAddressRepository> = {
        findFreshByChain: jest.fn().mockResolvedValue([reservedChange]),
      } as unknown as jest.Mocked<WalletAddressRepository>;
      const syncUtxos = makeSyncUtxos(1, 0); // 1 new UTXO found (the change UTXO)
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      const result = await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(result.newUtxos).toBe(1);
      const syncedAddresses: string[] = (syncUtxos.execute as jest.Mock).mock.calls[0][1];
      expect(syncedAddresses).toContain('bc1qchange');
    });
  });

  describe('discover loop', () => {
    it('continues syncing when EnsureAddressPool generates new pool addresses', async () => {
      const receiveAddr1 = makeAddress('addr-1', 'receive');
      const receiveAddr2 = makeAddress('addr-2', 'receive');
      let syncStatusCalled = 0;

      const syncAddressStatus = {
        execute: jest.fn().mockImplementation(async () => { syncStatusCalled++; }),
      } as unknown as jest.Mocked<SyncAddressStatusUseCase>;

      // addr-2 appears only after syncAddressStatus has run (simulating EnsureAddressPool)
      const addressRepo = {
        findFreshByChain: jest.fn().mockImplementation(
          (_wid: string, _oid: string, chain: 'receive' | 'change') => {
            if (chain !== 'receive') return Promise.resolve([]);
            // Before EnsureAddressPool runs: only addr-1
            // After EnsureAddressPool runs once: addr-2 also available
            return Promise.resolve(syncStatusCalled === 0 ? [receiveAddr1] : [receiveAddr1, receiveAddr2]);
          },
        ),
      } as unknown as jest.Mocked<WalletAddressRepository>;

      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos, syncAddressStatus });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      // First iteration syncs addr-1, second iteration sees addr-2 (new), syncs it
      expect(syncUtxos.execute).toHaveBeenCalledTimes(2);
      const firstBatch: string[] = (syncUtxos.execute as jest.Mock).mock.calls[0][1];
      const secondBatch: string[] = (syncUtxos.execute as jest.Mock).mock.calls[1][1];
      expect(firstBatch).toContain('addr-1');
      expect(secondBatch).toContain('addr-2');
      expect(secondBatch).not.toContain('addr-1');
    });

    it('terminates loop when no new pool addresses remain', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncUtxos = makeSyncUtxos();
      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      // Only one iteration (pool exhausted after first sync)
      expect(syncUtxos.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasActivity flag', () => {
    it('returns hasActivity=false when no pool address has transactions', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncTransactions = makeSyncTransactions(0);
      const useCase = makeUseCase({ addressRepo, syncTransactions });

      const result = await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(result.hasActivity).toBe(false);
    });

    it('returns hasActivity=true when at least one pool address has transactions', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncTransactions = {
        execute: jest.fn().mockResolvedValue({
          newCount: 1,
          fetchedTransactions: new Map([['addr-A', [{ id: 'tx1', amountSats: 1000 }]]]),
        }),
      } as unknown as jest.Mocked<SyncTransactionsUseCase>;
      const useCase = makeUseCase({ addressRepo, syncTransactions });

      const result = await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(result.hasActivity).toBe(true);
    });
  });

  describe('result aggregation', () => {
    it('returns correct counts and syncedAt', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncUtxos = makeSyncUtxos(3, 1);
      const syncTransactions = makeSyncTransactions(2);
      const useCase = makeUseCase({ addressRepo, syncUtxos, syncTransactions });

      const result = await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(result.newUtxos).toBe(3);
      expect(result.spentUtxos).toBe(1);
      expect(result.newTransactions).toBe(2);
      expect(result.syncedAt).toBeDefined();
      expect(new Date(result.syncedAt).toISOString()).toBe(result.syncedAt);
    });

    it('saves last sync timestamp', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncState = makeSyncStateRepo();
      const useCase = makeUseCase({ addressRepo, syncState });

      const result = await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(syncState.saveLastSyncAt).toHaveBeenCalledWith(WALLET_ID, result.syncedAt);
    });
  });

  describe('syncAddressStatus integration', () => {
    it('calls syncAddressStatus with prefetched transactions after each iteration', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const fetchedMap = new Map([['addr-A', []]]);
      const syncTransactions = {
        execute: jest.fn().mockResolvedValue({ newCount: 0, fetchedTransactions: fetchedMap }),
      } as unknown as jest.Mocked<SyncTransactionsUseCase>;
      const syncAddressStatus = makeSyncAddressStatus();
      const useCase = makeUseCase({ addressRepo, syncTransactions, syncAddressStatus });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(syncAddressStatus.execute).toHaveBeenCalledWith(WALLET_ID, 'testnet', fetchedMap);
    });

    it('does not call syncAddressStatus when not provided', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const syncAddressStatus = makeSyncAddressStatus();
      const useCase = makeUseCase({ addressRepo, syncAddressStatus: null });

      await useCase.execute(WALLET_ID, ORIGIN_ID);

      expect(syncAddressStatus.execute).not.toHaveBeenCalled();
    });
  });

  describe('progress callbacks', () => {
    it('calls onProgress with utxos phase forwarded from syncUtxos', async () => {
      const receiveAddr = makeAddress('addr-A', 'receive');
      const addressRepo = makeAddressRepo([receiveAddr], []);
      const progressEvents: Array<{ phase: string }> = [];
      const onProgress: OnSyncProgress = (p) => progressEvents.push(p);

      const syncUtxos = {
        execute: jest.fn().mockImplementation(
          async (_wid: string, addresses: string[], _net: string, prog?: OnSyncProgress) => {
            prog?.({ currentAddress: addresses[0], currentIndex: 0, totalAddresses: addresses.length, phase: 'utxos' });
            return { newCount: 0, spentCount: 0 };
          },
        ),
      } as unknown as jest.Mocked<SyncUtxosUseCase>;

      const useCase = makeUseCase({ addressRepo, syncUtxos });

      await useCase.execute(WALLET_ID, ORIGIN_ID, onProgress);

      const utxoEvents = progressEvents.filter(e => e.phase === 'utxos');
      expect(utxoEvents.length).toBeGreaterThan(0);
    });
  });
});

describe('SyncAccountUseCase with SyncSettingsRepository', () => {
  function makeSyncSettingsRepo(settings: { maxRequestsPerSecond: number; parallelSync: boolean } | null = null) {
    return {
      load: jest.fn().mockResolvedValue(settings),
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('uses default settings when no repository is provided', async () => {
    const receiveAddr = makeAddress('addr-A', 'receive');
    const addressRepo = makeAddressRepo([receiveAddr], []);
    const syncUtxos = makeSyncUtxos();
    const useCase = new SyncAccountUseCase(
      makeWalletRepo(),
      addressRepo,
      syncUtxos,
      makeSyncTransactions(),
      makeSyncBalance(),
      makeSyncStateRepo(),
    );
    await useCase.execute(WALLET_ID, ORIGIN_ID);
    expect(syncUtxos.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.any(String),
      undefined,
      { parallel: false },
    );
  });

  it('reads settings from repository and passes opts to syncUtxos', async () => {
    const receiveAddr = makeAddress('addr-A', 'receive');
    const addressRepo = makeAddressRepo([receiveAddr], []);
    const syncUtxos = makeSyncUtxos();
    const settingsRepo = makeSyncSettingsRepo({ maxRequestsPerSecond: 5, parallelSync: true });
    const useCase = new SyncAccountUseCase(
      makeWalletRepo(),
      addressRepo,
      syncUtxos,
      makeSyncTransactions(),
      makeSyncBalance(),
      makeSyncStateRepo(),
      null,
      settingsRepo,
    );
    await useCase.execute(WALLET_ID, ORIGIN_ID);
    expect(settingsRepo.load).toHaveBeenCalled();
    expect(syncUtxos.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.any(String),
      undefined,
      expect.objectContaining({ parallel: true, requestDelayMs: 200 }),
    );
  });

  it('falls back to defaults when repository returns null', async () => {
    const receiveAddr = makeAddress('addr-A', 'receive');
    const addressRepo = makeAddressRepo([receiveAddr], []);
    const syncUtxos = makeSyncUtxos();
    const settingsRepo = makeSyncSettingsRepo(null);
    const useCase = new SyncAccountUseCase(
      makeWalletRepo(),
      addressRepo,
      syncUtxos,
      makeSyncTransactions(),
      makeSyncBalance(),
      makeSyncStateRepo(),
      null,
      settingsRepo,
    );
    await useCase.execute(WALLET_ID, ORIGIN_ID);
    expect(syncUtxos.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.any(String),
      undefined,
      { parallel: false, requestDelayMs: 1000 },
    );
  });
});
