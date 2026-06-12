import { SyncAddressUseCase } from '../../../src/core/domain/usecases/wallet/SyncAddressUseCase';
import { SyncUtxosUseCase } from '../../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';

function makeWallet(id = 'wallet-1') {
  return { id, name: 'Test', status: 'active', network: 'mainnet', createdAt: new Date().toISOString() };
}

function makeWalletAddress(address: string, overrides: Partial<WalletAddress> = {}): WalletAddress {
  return {
    id: `${address}-id`,
    walletId: 'wallet-1',
    address,
    originId: 'origin-1',
    originName: 'Default',
    path: "m/84'/0'/0'/0/0",
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
    createdAt: new Date().toISOString(),
    usedAt: null,
    lastSyncedAt: null,
    ...overrides,
  };
}

function makeDeps(walletAddressResult: WalletAddress | null = makeWalletAddress('bc1qabc')) {
  const walletRepository: jest.Mocked<Pick<WalletRepository, 'findById'>> = {
    findById: jest.fn().mockResolvedValue(makeWallet()),
  };
  const walletAddressRepository: jest.Mocked<Pick<WalletAddressRepository, 'findByAddress'>> = {
    findByAddress: jest.fn().mockResolvedValue(walletAddressResult),
  };
  const utxoRepository = {
    listByWallet: jest.fn().mockResolvedValue([]),
    replaceAll: jest.fn().mockResolvedValue(undefined),
  };
  const blockchainProvider = {
    getUtxos: jest.fn().mockResolvedValue([]),
    getTransactions: jest.fn().mockResolvedValue([]),
  };
  const transactionRepository = {
    list: jest.fn().mockResolvedValue([]),
    upsertAll: jest.fn().mockResolvedValue(undefined),
  };
  const syncUtxos = new SyncUtxosUseCase(utxoRepository as any, blockchainProvider as any);
  const syncTransactions = new SyncTransactionsUseCase(transactionRepository as any, blockchainProvider as any);
  const syncBalance = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as SyncBalanceUseCase;

  return {
    walletRepository: walletRepository as unknown as WalletRepository,
    walletAddressRepository: walletAddressRepository as unknown as WalletAddressRepository,
    syncUtxos,
    syncTransactions,
    syncBalance,
    walletRepositoryMock: walletRepository,
    blockchainProvider,
  };
}

describe('SyncAddressUseCase', () => {
  it('throws when wallet not found', async () => {
    const deps = makeDeps();
    deps.walletRepositoryMock.findById.mockResolvedValue(null);
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );
    await expect(useCase.execute('wallet-1', 'bc1qabc')).rejects.toThrow('Wallet not found');
  });

  it('fetches UTXOs only for the specified address', async () => {
    const deps = makeDeps();
    jest.spyOn(deps.blockchainProvider, 'getUtxos');
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );
    await useCase.execute('wallet-1', 'bc1qabc');
    expect(deps.blockchainProvider.getUtxos).toHaveBeenCalledWith('bc1qabc', 'mainnet');
    expect(deps.blockchainProvider.getUtxos).toHaveBeenCalledTimes(1);
  });

  it('fetches transactions only for the specified address', async () => {
    const deps = makeDeps();
    jest.spyOn(deps.blockchainProvider, 'getTransactions');
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );
    await useCase.execute('wallet-1', 'bc1qabc');
    expect(deps.blockchainProvider.getTransactions).toHaveBeenCalledWith('bc1qabc', 'mainnet');
    expect(deps.blockchainProvider.getTransactions).toHaveBeenCalledTimes(1);
  });

  it('returns sync result with counts and syncedAt', async () => {
    const deps = makeDeps();
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );
    const result = await useCase.execute('wallet-1', 'bc1qabc');
    expect(result).toMatchObject({
      newUtxos: expect.any(Number),
      spentUtxos: expect.any(Number),
      newTransactions: expect.any(Number),
      syncedAt: expect.any(String),
    });
  });

  it('rejects unknown addresses before calling blockchain providers', async () => {
    const deps = makeDeps(null);
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );

    await expect(useCase.execute('wallet-1', 'bc1qunknown')).rejects.toMatchObject({
      code: 'ADDRESS_NOT_FOUND',
    });
    expect(deps.blockchainProvider.getUtxos).not.toHaveBeenCalled();
    expect(deps.blockchainProvider.getTransactions).not.toHaveBeenCalled();
  });

  it('rejects addresses that belong to another wallet', async () => {
    const deps = makeDeps(makeWalletAddress('bc1qabc', { walletId: 'wallet-2' }));
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );

    await expect(useCase.execute('wallet-1', 'bc1qabc')).rejects.toMatchObject({
      code: 'ADDRESS_NOT_IN_WALLET',
    });
    expect(deps.blockchainProvider.getUtxos).not.toHaveBeenCalled();
    expect(deps.blockchainProvider.getTransactions).not.toHaveBeenCalled();
  });

  it.each(['spent_once', 'change', 'archived'] as const)(
    'rejects %s addresses as non-syncable',
    async status => {
      const deps = makeDeps(makeWalletAddress('bc1qabc', { status }));
      const useCase = new SyncAddressUseCase(
        deps.walletRepository,
        deps.walletAddressRepository,
        deps.syncUtxos,
        deps.syncTransactions,
        deps.syncBalance,
      );

      await expect(useCase.execute('wallet-1', 'bc1qabc')).rejects.toMatchObject({
        code: 'ADDRESS_NOT_SYNCABLE',
      });
      expect(deps.blockchainProvider.getUtxos).not.toHaveBeenCalled();
      expect(deps.blockchainProvider.getTransactions).not.toHaveBeenCalled();
    },
  );

  it('uses AppError for invalid address ownership', async () => {
    const deps = makeDeps(makeWalletAddress('bc1qabc', { walletId: 'wallet-2' }));
    const useCase = new SyncAddressUseCase(
      deps.walletRepository,
      deps.walletAddressRepository,
      deps.syncUtxos,
      deps.syncTransactions,
      deps.syncBalance,
    );

    await expect(useCase.execute('wallet-1', 'bc1qabc')).rejects.toBeInstanceOf(AppError);
  });
});
