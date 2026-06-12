import { SyncWalletUseCase } from '../../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { SyncStateRepository } from '../../../src/core/domain/repositories/SyncStateRepository';
import type { SyncAccountUseCase, SyncAccountResult } from '../../../src/core/domain/usecases/wallet/SyncAccountUseCase';
import type { AddressManagerService } from '../../../src/core/application/services/AddressManagerService';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const WALLET_ID = 'wallet-1';

const WALLET: Wallet = {
  id: WALLET_ID,
  name: 'Test Wallet',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

function makeOrigin(id: string, name: string, accountIndex = 0): AddressOrigin {
  return {
    id,
    walletId: WALLET_ID,
    name,
    type: 'default',
    accountIndex,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
}

function makeWalletRepo(wallet: Wallet | null = WALLET): jest.Mocked<WalletRepository> {
  return {
    findById: jest.fn().mockResolvedValue(wallet),
  } as unknown as jest.Mocked<WalletRepository>;
}

function makeOriginRepo(origins: AddressOrigin[] = []): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(origins),
  } as unknown as jest.Mocked<AddressOriginRepository>;
}

function makeSyncStateRepo(): jest.Mocked<SyncStateRepository> {
  return {
    saveLastSyncAt: jest.fn().mockResolvedValue(undefined),
    getLastSyncAt: jest.fn().mockResolvedValue(null),
    removeLastSyncAt: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAccountResult(overrides: Partial<SyncAccountResult> = {}): SyncAccountResult {
  return {
    newUtxos: 0,
    spentUtxos: 0,
    newTransactions: 0,
    syncedAt: new Date().toISOString(),
    hasActivity: false,
    ...overrides,
  };
}

function makeSyncAccount(result: SyncAccountResult = makeAccountResult()): jest.Mocked<SyncAccountUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(result),
  } as unknown as jest.Mocked<SyncAccountUseCase>;
}

function makeAddressManager(): jest.Mocked<AddressManagerService> {
  return {
    ensureDefaultOrigin: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AddressManagerService>;
}

function createUseCase(overrides: {
  walletRepo?: jest.Mocked<WalletRepository>;
  originRepo?: jest.Mocked<AddressOriginRepository>;
  syncAccount?: jest.Mocked<SyncAccountUseCase>;
  syncState?: jest.Mocked<SyncStateRepository>;
  addressManager?: jest.Mocked<AddressManagerService> | null;
} = {}) {
  return new SyncWalletUseCase(
    overrides.walletRepo ?? makeWalletRepo(),
    overrides.originRepo ?? makeOriginRepo(),
    overrides.syncAccount ?? makeSyncAccount(),
    overrides.syncState ?? makeSyncStateRepo(),
    overrides.addressManager !== undefined ? overrides.addressManager : null,
  );
}

describe('SyncWalletUseCase', () => {
  describe('wallet validation', () => {
    it('throws WALLET_NOT_FOUND when wallet does not exist', async () => {
      const useCase = createUseCase({ walletRepo: makeWalletRepo(null) });
      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });
    });

    it('does not call syncAccount when wallet is not found', async () => {
      const syncAccount = makeSyncAccount();
      const useCase = createUseCase({ walletRepo: makeWalletRepo(null), syncAccount });
      await expect(useCase.execute(WALLET_ID)).rejects.toBeDefined();
      expect(syncAccount.execute).not.toHaveBeenCalled();
    });
  });

  describe('origin iteration', () => {
    it('calls syncAccount once per active origin', async () => {
      const origins = [makeOrigin('o1', 'Default'), makeOrigin('o2', 'Account 1', 1)];
      const originRepo = makeOriginRepo(origins);
      const syncAccount = makeSyncAccount();
      const useCase = createUseCase({ originRepo, syncAccount });

      await useCase.execute(WALLET_ID);

      expect(syncAccount.execute).toHaveBeenCalledTimes(2);
      expect(syncAccount.execute).toHaveBeenCalledWith(WALLET_ID, 'o1', undefined);
      expect(syncAccount.execute).toHaveBeenCalledWith(WALLET_ID, 'o2', undefined);
    });

    it('skips archived origins', async () => {
      const active = makeOrigin('o1', 'Default');
      const archived = { ...makeOrigin('o2', 'Account 1', 1), archivedAt: '2026-01-01T00:00:00.000Z' };
      const originRepo = makeOriginRepo([active, archived]);
      const syncAccount = makeSyncAccount();
      const useCase = createUseCase({ originRepo, syncAccount });

      await useCase.execute(WALLET_ID);

      expect(syncAccount.execute).toHaveBeenCalledTimes(1);
      expect(syncAccount.execute).toHaveBeenCalledWith(WALLET_ID, 'o1', undefined);
    });

    it('does not call syncAccount when there are no origins', async () => {
      const syncAccount = makeSyncAccount();
      const useCase = createUseCase({ originRepo: makeOriginRepo([]), syncAccount });

      await useCase.execute(WALLET_ID);

      expect(syncAccount.execute).not.toHaveBeenCalled();
    });
  });

  describe('result aggregation', () => {
    it('aggregates newUtxos and newTransactions across all origins', async () => {
      const origins = [makeOrigin('o1', 'Default'), makeOrigin('o2', 'Account 1', 1)];
      const originRepo = makeOriginRepo(origins);
      const syncAccount = {
        execute: jest.fn()
          .mockResolvedValueOnce(makeAccountResult({ newUtxos: 3, newTransactions: 2 }))
          .mockResolvedValueOnce(makeAccountResult({ newUtxos: 1, newTransactions: 5 })),
      } as unknown as jest.Mocked<SyncAccountUseCase>;
      const useCase = createUseCase({ originRepo, syncAccount });

      const result = await useCase.execute(WALLET_ID);

      expect(result.newUtxos).toBe(4);
      expect(result.newTransactions).toBe(7);
    });

    it('aggregates spentUtxos across all origins', async () => {
      const origins = [makeOrigin('o1', 'Default'), makeOrigin('o2', 'Account 1', 1)];
      const originRepo = makeOriginRepo(origins);
      const syncAccount = {
        execute: jest.fn()
          .mockResolvedValueOnce(makeAccountResult({ spentUtxos: 2 }))
          .mockResolvedValueOnce(makeAccountResult({ spentUtxos: 1 })),
      } as unknown as jest.Mocked<SyncAccountUseCase>;
      const useCase = createUseCase({ originRepo, syncAccount });

      const result = await useCase.execute(WALLET_ID);

      expect(result.spentUtxos).toBe(3);
    });

    it('returns syncedAt as a valid ISO timestamp', async () => {
      const useCase = createUseCase();
      const result = await useCase.execute(WALLET_ID);
      expect(new Date(result.syncedAt).toISOString()).toBe(result.syncedAt);
    });

    it('saves last sync timestamp', async () => {
      const origins = [makeOrigin('o1', 'Default')];
      const syncState = makeSyncStateRepo();
      const useCase = createUseCase({ originRepo: makeOriginRepo(origins), syncState });

      const result = await useCase.execute(WALLET_ID);

      expect(syncState.saveLastSyncAt).toHaveBeenCalledWith(WALLET_ID, result.syncedAt);
    });
  });

  describe('addressManager integration', () => {
    it('calls ensureDefaultOrigin before finding origins when addressManager is provided', async () => {
      const addressManager = makeAddressManager();
      const useCase = createUseCase({ addressManager });

      await useCase.execute(WALLET_ID);

      expect(addressManager.ensureDefaultOrigin).toHaveBeenCalledWith(WALLET_ID, WALLET.network);
    });

    it('does not call ensureDefaultOrigin when addressManager is null', async () => {
      const addressManager = makeAddressManager();
      const useCase = createUseCase({ addressManager: null });

      await useCase.execute(WALLET_ID);

      expect(addressManager.ensureDefaultOrigin).not.toHaveBeenCalled();
    });
  });

  describe('progress forwarding', () => {
    it('wraps onProgress with accountName before passing to syncAccount', async () => {
      const origins = [makeOrigin('o1', 'Default')];
      const syncAccount = makeSyncAccount();
      const useCase = createUseCase({ originRepo: makeOriginRepo(origins), syncAccount });
      const progressEvents: Array<{ accountName?: string }> = [];
      const onProgress = jest.fn((p: { accountName?: string }) => progressEvents.push(p));

      // Capture the wrapped callback passed to syncAccount and invoke it with a sample event
      syncAccount.execute.mockImplementation(async (_wid, _oid, wrapped) => {
        wrapped?.({ currentAddress: 'addr-A', currentIndex: 0, totalAddresses: 6, phase: 'utxos' });
        return { newUtxos: 0, spentUtxos: 0, newTransactions: 0, syncedAt: new Date().toISOString(), hasActivity: false };
      });

      await useCase.execute(WALLET_ID, onProgress);

      expect(progressEvents).toHaveLength(1);
      expect(progressEvents[0].accountName).toBe('Default');
    });
  });

  describe('error propagation', () => {
    it('propagates errors from syncAccount without saving sync state', async () => {
      const origins = [makeOrigin('o1', 'Default')];
      const syncState = makeSyncStateRepo();
      const syncAccount = makeSyncAccount();
      syncAccount.execute.mockRejectedValue(new AppError('timeout', 'TIMEOUT'));
      const useCase = createUseCase({
        originRepo: makeOriginRepo(origins),
        syncAccount,
        syncState,
      });

      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({ code: 'TIMEOUT' });
      expect(syncState.saveLastSyncAt).not.toHaveBeenCalled();
    });
  });
});
