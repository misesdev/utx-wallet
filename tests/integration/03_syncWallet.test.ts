/**
 * Integration: Sync Wallet Flow
 *
 * Tests: SyncWalletUseCase → SyncAccountUseCase → SyncUtxosUseCase
 * + SyncTransactionsUseCase + SyncBalanceUseCase
 *
 * Real: all sync use cases, repository impls, storage classes, address derivation pipeline
 * Mocked: BlockchainProvider (API), InMemorySecureStorage, InMemoryDatabase, SyncStateRepository
 */
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { AddressOriginRepositoryImpl } from '../../src/core/infrastructure/repositories/AddressOriginRepositoryImpl';
import { AddressOriginStorage } from '../../src/core/infrastructure/storage/AddressOriginStorage';
import { WalletAddressRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletAddressRepositoryImpl';
import { WalletAddressStorage } from '../../src/core/infrastructure/storage/WalletAddressStorage';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import { TransactionRepositoryImpl } from '../../src/core/infrastructure/repositories/TransactionRepositoryImpl';
import { TransactionStorage } from '../../src/core/infrastructure/storage/TransactionStorage';
import { WalletKeyAddressProvider } from '../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import { SyncWalletUseCase } from '../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { SyncAccountUseCase } from '../../src/core/domain/usecases/wallet/SyncAccountUseCase';
import { SyncUtxosUseCase } from '../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import { EnsureAddressPoolUseCase } from '../../src/core/domain/usecases/address/EnsureAddressPoolUseCase';
import { CreateAddressOriginUseCase } from '../../src/core/domain/usecases/address/CreateAddressOriginUseCase';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { DEFAULT_ORIGIN_NAME } from '../../src/core/domain/entities/AddressOrigin';
import type { BlockchainProvider } from '../../src/core/domain/repositories/BlockchainProvider';
import type { SyncStateRepository } from '../../src/core/domain/repositories/SyncStateRepository';
import type { Utxo } from '../../src/core/domain/entities/Utxo';
import type { Transaction } from '../../src/core/domain/entities/Transaction';
import { createSecureStorageMock } from '../mocks/storage';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function makeBlockchainProvider(
  utxos: Utxo[] = [],
  txs: Transaction[] = [],
): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn().mockResolvedValue({ confirmedSats: 0, pendingSats: 0 }),
    getUtxos: jest.fn().mockResolvedValue(utxos),
    getTransactions: jest.fn().mockResolvedValue(txs),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn().mockResolvedValue(100),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

// Provider that stamps UTXOs with the address that was actually requested, so
// the UTXO address always matches the synced address set in SyncUtxosUseCase.
function makeAddressAwareBlockchainProvider(
  utxoTemplates: Array<{ txid: string; valueSats: number }>,
  txs: Transaction[] = [],
): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn().mockResolvedValue({ confirmedSats: 0, pendingSats: 0 }),
    getUtxos: jest.fn().mockImplementation((address: string) =>
      Promise.resolve(utxoTemplates.map(u => makeUtxo(u.txid, u.valueSats, address))),
    ),
    getTransactions: jest.fn().mockResolvedValue(txs),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn().mockResolvedValue(100),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

function makeSyncStateRepo(): jest.Mocked<SyncStateRepository> {
  return {
    getLastSyncAt: jest.fn().mockResolvedValue(null),
    saveLastSyncAt: jest.fn().mockResolvedValue(undefined),
    removeLastSyncAt: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSetup() {
  const db = new InMemoryDatabase();
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);

  const addressOriginRepository = new AddressOriginRepositoryImpl(new AddressOriginStorage(db));
  const walletAddressRepository = new WalletAddressRepositoryImpl(new WalletAddressStorage(db));
  const utxoRepository = new UtxoRepositoryImpl(new UtxoStorage(db));
  const transactionRepository = new TransactionRepositoryImpl(new TransactionStorage(db));
  const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);

  const importWallet = new ImportWalletUseCase(walletRepository);
  const ensureAddressPool = new EnsureAddressPoolUseCase(
    walletAddressRepository,
    addressOriginRepository,
    walletAddressProvider,
  );
  const createAddressOrigin = new CreateAddressOriginUseCase(
    addressOriginRepository,
    walletAddressRepository,
    walletAddressProvider,
  );

  return {
    walletRepository,
    addressOriginRepository,
    walletAddressRepository,
    utxoRepository,
    transactionRepository,
    importWallet,
    createAddressOrigin,
    ensureAddressPool,
    db,
    makeSyncUseCase(provider: jest.Mocked<BlockchainProvider>) {
      const syncStateRepo = makeSyncStateRepo();
      const syncBalance = new SyncBalanceUseCase(utxoRepository);
      const syncUtxos = new SyncUtxosUseCase(utxoRepository, provider);
      const syncTransactions = new SyncTransactionsUseCase(transactionRepository, provider);
      const syncAccount = new SyncAccountUseCase(
        walletRepository,
        walletAddressRepository,
        syncUtxos,
        syncTransactions,
        syncBalance,
        syncStateRepo,
      );
      return {
        useCase: new SyncWalletUseCase(
          walletRepository,
          addressOriginRepository,
          syncAccount,
          syncStateRepo,
        ),
        syncStateRepo,
      };
    },
  };
}

function makeUtxo(txid: string, valueSats: number, address: string): Utxo {
  return { txid, vout: 0, valueSats, address, isConfirmed: true };
}

function makeTx(id: string, amountSats: number): Transaction {
  return {
    id,
    txid: id,
    amountSats,
    direction: 'incoming',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
}

describe('Integration: Sync Wallet', () => {
  it('throws WALLET_NOT_FOUND for unknown wallet id', async () => {
    const setup = makeSetup();
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider());

    await expect(useCase.execute('nonexistent')).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
    });
  });

  it('syncs nothing and returns zeros when wallet has no origins', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Empty Wallet', TEST_MNEMONIC);
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider());

    const result = await useCase.execute(wallet.id);

    expect(result.newUtxos).toBe(0);
    expect(result.newTransactions).toBe(0);
    expect(result.syncedAt).toBeDefined();
  });

  it('returns SyncResult with valid structure when origin has pool addresses', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Count Wallet', TEST_MNEMONIC);
    await setup.createAddressOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, wallet.network);

    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider());

    const result = await useCase.execute(wallet.id);

    expect(typeof result.newUtxos).toBe('number');
    expect(typeof result.newTransactions).toBe('number');
    expect(typeof result.syncedAt).toBe('string');
    expect(new Date(result.syncedAt).toISOString()).toBe(result.syncedAt);
  });

  it('persists UTXOs to storage during sync (address-aware provider)', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('UTXO Wallet', TEST_MNEMONIC);
    await setup.createAddressOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, wallet.network);

    // Address-aware provider stamps each UTXO with the actual queried pool address
    const { useCase } = setup.makeSyncUseCase(
      makeAddressAwareBlockchainProvider([{ txid: 'aaaa', valueSats: 100_000 }]),
    );

    await useCase.execute(wallet.id);

    const stored = await setup.utxoRepository.listByWallet(wallet.id);
    // 6 pool addresses, each returns 1 UTXO (distinct addresses, same txid:vout — deduplicated by SyncUtxosUseCase)
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.some(u => u.txid === 'aaaa')).toBe(true);
    expect(stored[0].valueSats).toBe(100_000);
  });

  it('persists transactions to storage during sync', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Tx Wallet', TEST_MNEMONIC);
    await setup.createAddressOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, wallet.network);

    const txs = [makeTx('txABC', 75_000)];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider([], txs));

    await useCase.execute(wallet.id);

    const stored = await setup.transactionRepository.list(wallet.id);
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.some(t => t.txid === 'txABC')).toBe(true);
    const txABC = stored.find(t => t.txid === 'txABC')!;
    expect(txABC.amountSats).toBe(75_000);
  });

  it('calculates spent UTXOs on second sync (pool-address-aware)', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Spent Wallet', TEST_MNEMONIC);
    await setup.createAddressOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, wallet.network);

    // First sync: each pool address gets UTXOs 'aaa' + 'bbb' (address-stamped)
    const { useCase } = setup.makeSyncUseCase(
      makeAddressAwareBlockchainProvider([
        { txid: 'aaa', valueSats: 100_000 },
        { txid: 'bbb', valueSats: 200_000 },
      ]),
    );
    await useCase.execute(wallet.id);

    // Second sync: 'aaa' gone, 'ccc' new
    const { useCase: useCase2 } = setup.makeSyncUseCase(
      makeAddressAwareBlockchainProvider([
        { txid: 'bbb', valueSats: 200_000 },
        { txid: 'ccc', valueSats: 50_000 },
      ]),
    );
    const result2 = await useCase2.execute(wallet.id);

    // Each pool address has 1 spent UTXO ('aaa') and 1 new UTXO ('ccc')
    expect(result2.spentUtxos).toBeGreaterThan(0);
    expect(result2.newUtxos).toBeGreaterThan(0);
  });

  it('saves syncedAt timestamp via SyncStateRepository', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Timestamp Wallet', TEST_MNEMONIC);
    const { useCase, syncStateRepo } = setup.makeSyncUseCase(makeBlockchainProvider());

    await useCase.execute(wallet.id);

    expect(syncStateRepo.saveLastSyncAt).toHaveBeenCalledWith(wallet.id, expect.any(String));
  });

  it('syncs multiple origins independently', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Multi-Origin Wallet', TEST_MNEMONIC);
    await setup.createAddressOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, wallet.network);
    await setup.createAddressOrigin.execute(wallet.id, 'Account 1', wallet.network);

    const utxos = [makeUtxo('tx-multi', 50_000, 'addr')];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider(utxos));

    const result = await useCase.execute(wallet.id);

    // 2 origins × pool addresses × 1 UTXO each = multiple UTXOs
    expect(result.newUtxos).toBeGreaterThan(0);
    expect(result.syncedAt).toBeDefined();
  });
});
