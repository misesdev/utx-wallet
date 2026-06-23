import { DeleteWalletUseCase } from '../../../src/core/domain/usecases/wallet/DeleteWalletUseCase';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { TransactionRepository } from '../../../src/core/domain/repositories/TransactionRepository';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { AddressRepository } from '../../../src/core/domain/repositories/AddressRepository';
import type { SyncStateRepository } from '../../../src/core/domain/repositories/SyncStateRepository';

function makeWalletRepo(overrides: Partial<WalletRepository> = {}): WalletRepository {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(async () => null),
    rename: jest.fn(),
    retrieveSeed: jest.fn(),
    retrieveRawKey: jest.fn(),
    delete: jest.fn(async () => {}),
    ...overrides,
  };
}

function makeUtxoRepo(): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn(),
    replaceAll: jest.fn(),
    freeze: jest.fn(),
    unfreeze: jest.fn(),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeTxRepo(): jest.Mocked<TransactionRepository> {
  return {
    build: jest.fn(),
    sign: jest.fn(),
    broadcast: jest.fn(),
    list: jest.fn(),
    upsertAll: jest.fn(),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeWalletAddressRepo(): jest.Mocked<WalletAddressRepository> {
  return {
    findByWallet: jest.fn(),
    findByOrigin: jest.fn(),
    findByChain: jest.fn(),
    findFreshByChain: jest.fn(),
    findByAddress: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    updateStatus: jest.fn(),
    updateOriginName: jest.fn(), updateSyncData: jest.fn(),
    countFreshByChain: jest.fn(),
    getMaxIndexByChain: jest.fn(),
    deleteByOrigin: jest.fn().mockResolvedValue(undefined),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAddressOriginRepo(): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn(),
    findById: jest.fn(),
    findDefault: jest.fn(),
    getMaxAccountIndex: jest.fn(),
    save: jest.fn(),
    archive: jest.fn(),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAddressRepo(): jest.Mocked<AddressRepository> {
  return {
    findByWallet: jest.fn(),
    findReceiveAddresses: jest.fn(),
    findChangeAddresses: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    markUsed: jest.fn(),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSyncStateRepo(): jest.Mocked<SyncStateRepository> {
  return {
    getLastSyncAt: jest.fn(),
    saveLastSyncAt: jest.fn(),
    removeLastSyncAt: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUseCase(walletOverrides: Partial<WalletRepository> = {}) {
  const walletRepo = makeWalletRepo(walletOverrides);
  const utxoRepo = makeUtxoRepo();
  const txRepo = makeTxRepo();
  const walletAddressRepo = makeWalletAddressRepo();
  const addressOriginRepo = makeAddressOriginRepo();
  const addressRepo = makeAddressRepo();
  const syncStateRepo = makeSyncStateRepo();
  const useCase = new DeleteWalletUseCase(
    walletRepo, utxoRepo, txRepo, walletAddressRepo, addressOriginRepo, addressRepo, syncStateRepo,
  );
  return { useCase, walletRepo, utxoRepo, txRepo, walletAddressRepo, addressOriginRepo, addressRepo, syncStateRepo };
}

describe('DeleteWalletUseCase', () => {
  it('delegates deletion to the wallet repository', async () => {
    const { useCase, walletRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(walletRepo.delete).toHaveBeenCalledWith('wallet-1');
  });

  it('cleans up UTXOs for the wallet', async () => {
    const { useCase, utxoRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(utxoRepo.deleteByWallet).toHaveBeenCalledWith('wallet-1');
  });

  it('cleans up transactions for the wallet', async () => {
    const { useCase, txRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(txRepo.deleteByWallet).toHaveBeenCalledWith('wallet-1');
  });

  it('cleans up wallet addresses for the wallet', async () => {
    const { useCase, walletAddressRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(walletAddressRepo.deleteByWallet).toHaveBeenCalledWith('wallet-1');
  });

  it('cleans up address origins for the wallet', async () => {
    const { useCase, addressOriginRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(addressOriginRepo.deleteByWallet).toHaveBeenCalledWith('wallet-1');
  });

  it('removes sync state for the wallet', async () => {
    const { useCase, syncStateRepo } = makeUseCase();
    await useCase.execute('wallet-1');
    expect(syncStateRepo.removeLastSyncAt).toHaveBeenCalledWith('wallet-1');
  });

  it('resolves without error on successful deletion', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute('wallet-1')).resolves.toBeUndefined();
  });

  it('propagates errors thrown by the wallet repository', async () => {
    const { useCase } = makeUseCase({
      delete: jest.fn(async () => { throw new Error('WALLET_NOT_FOUND'); }),
    });
    await expect(useCase.execute('unknown-id')).rejects.toThrow('WALLET_NOT_FOUND');
  });
});
