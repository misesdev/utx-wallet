/**
 * Integration: Sync Wallet Flow
 *
 * Tests: WalletService.syncWallet() → SyncWalletUseCase → GenerateReceiveAddressUseCase
 * + SyncUtxosUseCase + SyncTransactionsUseCase + SyncBalanceUseCase
 *
 * Real: all sync use cases, repository impls, storage classes, address derivation pipeline
 * Mocked: BlockchainProvider (API), InMemorySecureStorage, InMemoryDatabase, SyncStateRepository
 */
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { AddressRepositoryImpl } from '../../src/core/infrastructure/repositories/AddressRepositoryImpl';
import { AddressStorage } from '../../src/core/infrastructure/storage/AddressStorage';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import { TransactionRepositoryImpl } from '../../src/core/infrastructure/repositories/TransactionRepositoryImpl';
import { TransactionStorage } from '../../src/core/infrastructure/storage/TransactionStorage';
import { WalletKeyAddressProvider } from '../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import { SyncWalletUseCase } from '../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { SyncUtxosUseCase } from '../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import { GenerateReceiveAddressUseCase } from '../../src/core/domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
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
  const addressRepository = new AddressRepositoryImpl(new AddressStorage(db));
  const utxoRepository = new UtxoRepositoryImpl(new UtxoStorage(db));
  const transactionRepository = new TransactionRepositoryImpl(new TransactionStorage(db));
  const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);

  const importWallet = new ImportWalletUseCase(walletRepository);
  const generateAddress = new GenerateReceiveAddressUseCase(
    walletRepository, walletAddressProvider, addressRepository,
  );

  return {
    walletRepository,
    addressRepository,
    utxoRepository,
    transactionRepository,
    generateAddress,
    importWallet,
    db,
    makeSyncUseCase(provider: jest.Mocked<BlockchainProvider>) {
      const syncStateRepo = makeSyncStateRepo();
      return {
        useCase: new SyncWalletUseCase(
          walletRepository,
          addressRepository,
          generateAddress,
          new SyncUtxosUseCase(utxoRepository, provider),
          new SyncTransactionsUseCase(transactionRepository, provider),
          new SyncBalanceUseCase(utxoRepository),
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

  it('first sync auto-generates receive address at index 0', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Sync Wallet', TEST_MNEMONIC);
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider());

    await useCase.execute(wallet.id);

    const addresses = await setup.addressRepository.findReceiveAddresses(wallet.id);
    expect(addresses).toHaveLength(1);
    expect(addresses[0].index).toBe(0);
    expect(addresses[0].isChange).toBe(false);
    expect(addresses[0].value).toMatch(/^tb1/);
  });

  it('returns SyncResult with correct counts on first sync', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Count Wallet', TEST_MNEMONIC);
    const utxos = [makeUtxo('tx1', 50_000, 'tb1qaddr'), makeUtxo('tx2', 30_000, 'tb1qaddr')];
    const txs = [makeTx('tx1', 50_000), makeTx('tx2', 30_000)];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider(utxos, txs));

    const result = await useCase.execute(wallet.id);

    expect(result.newUtxos).toBe(2);
    expect(result.spentUtxos).toBe(0);
    expect(result.newTransactions).toBe(2);
    expect(typeof result.syncedAt).toBe('string');
  });

  it('persists UTXOs to storage during sync', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('UTXO Wallet', TEST_MNEMONIC);
    const utxos = [makeUtxo('aaaa', 100_000, 'tb1q')];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider(utxos));

    await useCase.execute(wallet.id);

    const stored = await setup.utxoRepository.listByWallet(wallet.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].txid).toBe('aaaa');
    expect(stored[0].valueSats).toBe(100_000);
  });

  it('persists transactions to storage during sync', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Tx Wallet', TEST_MNEMONIC);
    const txs = [makeTx('txABC', 75_000)];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider([], txs));

    await useCase.execute(wallet.id);

    const stored = await setup.transactionRepository.list(wallet.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].txid).toBe('txABC');
    expect(stored[0].amountSats).toBe(75_000);
  });

  it('calculates spent UTXOs correctly on second sync', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Spent Wallet', TEST_MNEMONIC);
    const utxos1 = [makeUtxo('aaa', 100_000, 'tb1q'), makeUtxo('bbb', 200_000, 'tb1q')];
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider(utxos1));

    await useCase.execute(wallet.id);

    // Second sync: 'aaa' was spent, 'ccc' is new
    const utxos2 = [makeUtxo('bbb', 200_000, 'tb1q'), makeUtxo('ccc', 50_000, 'tb1q')];
    const { useCase: useCase2 } = setup.makeSyncUseCase(makeBlockchainProvider(utxos2));
    const result2 = await useCase2.execute(wallet.id);

    expect(result2.spentUtxos).toBe(1);
    expect(result2.newUtxos).toBe(1);
  });

  it('deduplicates transactions that appear in multiple address results', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Dedup Wallet', TEST_MNEMONIC);
    const tx = makeTx('shared-tx', 10_000);
    // Provider returns same tx twice (for two addresses)
    const provider = makeBlockchainProvider([], [tx]);
    provider.getTransactions
      .mockResolvedValueOnce([tx])
      .mockResolvedValueOnce([tx]);
    const { useCase } = setup.makeSyncUseCase(provider);

    await useCase.execute(wallet.id);

    const stored = await setup.transactionRepository.list(wallet.id);
    // After dedup, only one tx should be stored
    expect(stored.filter(t => t.txid === 'shared-tx')).toHaveLength(1);
  });

  it('saves syncedAt timestamp via SyncStateRepository', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Timestamp Wallet', TEST_MNEMONIC);
    const { useCase, syncStateRepo } = setup.makeSyncUseCase(makeBlockchainProvider());

    await useCase.execute(wallet.id);

    expect(syncStateRepo.saveLastSyncAt).toHaveBeenCalledWith(wallet.id, expect.any(String));
  });

  it('does not regenerate address if one already exists', async () => {
    const setup = makeSetup();
    const wallet = await setup.importWallet.execute('Already Addr Wallet', TEST_MNEMONIC);
    await setup.generateAddress.execute(wallet.id);
    const { useCase } = setup.makeSyncUseCase(makeBlockchainProvider());

    await useCase.execute(wallet.id);

    const addresses = await setup.addressRepository.findReceiveAddresses(wallet.id);
    expect(addresses).toHaveLength(1);
  });
});
