import { SyncWalletUseCase } from '../../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { SyncUtxosUseCase } from '../../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import { GenerateReceiveAddressUseCase } from '../../../src/core/domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { AddressRepository } from '../../../src/core/domain/repositories/AddressRepository';
import type { SyncStateRepository } from '../../../src/core/domain/repositories/SyncStateRepository';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { Address } from '../../../src/core/domain/entities/Address';

const WALLET_ID = 'wallet-1';

const WALLET: Wallet = {
  id: WALLET_ID,
  name: 'Test Wallet',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

function makeAddress(index: number, value: string): Address {
  return {
    id: `addr-${index}`,
    accountId: WALLET_ID,
    value,
    network: 'testnet4',
    type: 'p2wpkh',
    isChange: false,
    index,
    isUsed: false,
  };
}

const ADDR_0 = makeAddress(0, 'tb1qfg9m8mz886uryl9tg33na979sx6wegzgfrypq3');
const ADDR_1 = makeAddress(1, 'tb1qdgsamuwacq4xwefqrc84xs0tv6hdz73zp42xz8');

function makeWalletRepo(wallet: Wallet | null = WALLET): jest.Mocked<WalletRepository> {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn().mockResolvedValue(wallet),
    delete: jest.fn(),
  };
}

function makeAddressRepo(addresses: Address[] = [ADDR_0]): jest.Mocked<AddressRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(addresses),
    findReceiveAddresses: jest.fn().mockResolvedValue(addresses),
    findChangeAddresses: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    saveMany: jest.fn().mockResolvedValue(undefined),
    markUsed: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSyncStateRepo(): jest.Mocked<SyncStateRepository> {
  return {
    getLastSyncAt: jest.fn().mockResolvedValue(null),
    saveLastSyncAt: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSyncUtxos(newCount = 0, spentCount = 0): jest.Mocked<SyncUtxosUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ newCount, spentCount }),
  } as unknown as jest.Mocked<SyncUtxosUseCase>;
}

function makeSyncTransactions(newCount = 0): jest.Mocked<SyncTransactionsUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ newCount }),
  } as unknown as jest.Mocked<SyncTransactionsUseCase>;
}

function makeSyncBalance(): jest.Mocked<SyncBalanceUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ confirmedSats: 0, pendingSats: 0 }),
  } as unknown as jest.Mocked<SyncBalanceUseCase>;
}

function makeGenerateReceiveAddress(address: Address = ADDR_0): jest.Mocked<GenerateReceiveAddressUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(address),
  } as unknown as jest.Mocked<GenerateReceiveAddressUseCase>;
}

function createUseCase(overrides: {
  walletRepo?: jest.Mocked<WalletRepository>;
  addressRepo?: jest.Mocked<AddressRepository>;
  generateReceiveAddress?: jest.Mocked<GenerateReceiveAddressUseCase>;
  syncUtxos?: jest.Mocked<SyncUtxosUseCase>;
  syncTxs?: jest.Mocked<SyncTransactionsUseCase>;
  syncBalance?: jest.Mocked<SyncBalanceUseCase>;
  syncState?: jest.Mocked<SyncStateRepository>;
} = {}) {
  return new SyncWalletUseCase(
    overrides.walletRepo ?? makeWalletRepo(),
    overrides.addressRepo ?? makeAddressRepo(),
    overrides.generateReceiveAddress ?? makeGenerateReceiveAddress(),
    overrides.syncUtxos ?? makeSyncUtxos(),
    overrides.syncTxs ?? makeSyncTransactions(),
    overrides.syncBalance ?? makeSyncBalance(),
    overrides.syncState ?? makeSyncStateRepo(),
  );
}

describe('SyncWalletUseCase', () => {
  describe('successful sync', () => {
    it('returns sync result with counts and timestamp', async () => {
      const useCase = createUseCase({
        syncUtxos: makeSyncUtxos(3, 1),
        syncTxs: makeSyncTransactions(2),
      });
      const result = await useCase.execute(WALLET_ID);
      expect(result.newUtxos).toBe(3);
      expect(result.spentUtxos).toBe(1);
      expect(result.newTransactions).toBe(2);
      expect(result.syncedAt).toBeDefined();
      expect(new Date(result.syncedAt).toISOString()).toBe(result.syncedAt);
    });

    it('passes all stored address values to sync sub-use-cases', async () => {
      const syncUtxos = makeSyncUtxos();
      const syncTxs = makeSyncTransactions();
      const addressRepo = makeAddressRepo([ADDR_0, ADDR_1]);
      const useCase = createUseCase({ addressRepo, syncUtxos, syncTxs });
      await useCase.execute(WALLET_ID);
      expect(syncUtxos.execute).toHaveBeenCalledWith(
        WALLET_ID,
        [ADDR_0.value, ADDR_1.value],
        WALLET.network,
      );
      expect(syncTxs.execute).toHaveBeenCalledWith(
        WALLET_ID,
        [ADDR_0.value, ADDR_1.value],
        WALLET.network,
      );
    });

    it('saves last sync timestamp on success', async () => {
      const syncState = makeSyncStateRepo();
      const useCase = createUseCase({ syncState });
      const result = await useCase.execute(WALLET_ID);
      expect(syncState.saveLastSyncAt).toHaveBeenCalledWith(WALLET_ID, result.syncedAt);
    });
  });

  describe('address bootstrap', () => {
    it('generates index-0 address when repository has none, then syncs it', async () => {
      const emptyRepo = makeAddressRepo([]);
      // After generate is called, repo returns ADDR_0
      emptyRepo.findReceiveAddresses
        .mockResolvedValueOnce([])   // first call: empty
        .mockResolvedValueOnce([ADDR_0]); // second call: after generate
      const generateReceiveAddress = makeGenerateReceiveAddress(ADDR_0);
      const syncUtxos = makeSyncUtxos();
      const useCase = createUseCase({ addressRepo: emptyRepo, generateReceiveAddress, syncUtxos });
      await useCase.execute(WALLET_ID);
      expect(generateReceiveAddress.execute).toHaveBeenCalledWith(WALLET_ID);
      expect(syncUtxos.execute).toHaveBeenCalledWith(WALLET_ID, [ADDR_0.value], WALLET.network);
    });

    it('does not generate an address when repository already has addresses', async () => {
      const generateReceiveAddress = makeGenerateReceiveAddress();
      const useCase = createUseCase({ generateReceiveAddress });
      await useCase.execute(WALLET_ID);
      expect(generateReceiveAddress.execute).not.toHaveBeenCalled();
    });
  });

  describe('wallet not found', () => {
    it('throws WALLET_NOT_FOUND when wallet does not exist', async () => {
      const useCase = createUseCase({ walletRepo: makeWalletRepo(null) });
      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });
    });

    it('does not attempt to sync when wallet is not found', async () => {
      const syncUtxos = makeSyncUtxos();
      const useCase = createUseCase({ walletRepo: makeWalletRepo(null), syncUtxos });
      await expect(useCase.execute(WALLET_ID)).rejects.toBeDefined();
      expect(syncUtxos.execute).not.toHaveBeenCalled();
    });
  });

  describe('sync failures', () => {
    it('propagates TIMEOUT error and does not save sync state', async () => {
      const syncState = makeSyncStateRepo();
      const syncUtxos = makeSyncUtxos();
      syncUtxos.execute.mockRejectedValue(new AppError('Request timed out', 'TIMEOUT'));
      const useCase = createUseCase({ syncUtxos, syncState });
      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({ code: 'TIMEOUT' });
      expect(syncState.saveLastSyncAt).not.toHaveBeenCalled();
    });

    it('propagates HTTP_ERROR when provider returns 503', async () => {
      const syncTxs = makeSyncTransactions();
      syncTxs.execute.mockRejectedValue(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'));
      const useCase = createUseCase({ syncTxs });
      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });

    it('does not save sync state on provider error', async () => {
      const syncState = makeSyncStateRepo();
      const syncUtxos = makeSyncUtxos();
      syncUtxos.execute.mockRejectedValue(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'));
      const useCase = createUseCase({ syncUtxos, syncState });
      await expect(useCase.execute(WALLET_ID)).rejects.toBeDefined();
      expect(syncState.saveLastSyncAt).not.toHaveBeenCalled();
    });
  });

  describe('state persistence', () => {
    it('sync state is persisted so it survives app restart', async () => {
      const syncState = makeSyncStateRepo();
      const useCase = createUseCase({ syncState });
      await useCase.execute(WALLET_ID);
      expect(syncState.saveLastSyncAt).toHaveBeenCalledTimes(1);
    });
  });
});
