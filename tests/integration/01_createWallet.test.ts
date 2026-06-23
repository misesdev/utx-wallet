/**
 * Integration: Create Wallet Flow
 *
 * Tests the full chain: WalletService → CreateWalletUseCase → WalletRepositoryImpl
 * → WalletStorage + WalletKeyStorage → InMemorySecureStorage
 *
 * Real: domain use cases, repository impl, storage classes, bitcoin-tx-lib (HDWallet.create)
 * Mocked: EncryptedStorage (in-memory), no external APIs
 */
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { WalletService } from '../../src/core/application/services/WalletService';
import { CreateWalletUseCase } from '../../src/core/domain/usecases/wallet/CreateWalletUseCase';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../src/core/domain/usecases/wallet/LoadWalletsUseCase';
import { SelectWalletUseCase } from '../../src/core/domain/usecases/wallet/SelectWalletUseCase';
import { DeleteWalletUseCase } from '../../src/core/domain/usecases/wallet/DeleteWalletUseCase';
import { RenameWalletUseCase } from '../../src/core/domain/usecases/wallet/RenameWalletUseCase';
import { GetWalletSeedUseCase } from '../../src/core/domain/usecases/wallet/GetWalletSeedUseCase';
import { LoadTransactionsUseCase } from '../../src/core/domain/usecases/wallet/LoadTransactionsUseCase';
import { LoadUtxosUseCase } from '../../src/core/domain/usecases/wallet/LoadUtxosUseCase';
import { SyncWalletUseCase } from '../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { FreezeUtxoUseCase } from '../../src/core/domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../src/core/domain/usecases/wallet/UnfreezeUtxoUseCase';
import { createSecureStorageMock } from '../mocks/storage';

function makeWalletService() {
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);

  const createWallet = new CreateWalletUseCase(walletRepository);
  const importWallet = new ImportWalletUseCase(walletRepository);
  const loadWallets = new LoadWalletsUseCase(walletRepository);
  const selectWallet = new SelectWalletUseCase(walletRepository);

  const stubSyncState = { getLastSyncAt: jest.fn(), saveLastSyncAt: jest.fn(), removeLastSyncAt: jest.fn().mockResolvedValue(undefined) };
  const stubUtxoRepo = { listByWallet: jest.fn().mockResolvedValue([]), replaceAll: jest.fn(), freeze: jest.fn(), unfreeze: jest.fn(), deleteByWallet: jest.fn().mockResolvedValue(undefined) };
  const stubTxRepo = { list: jest.fn().mockResolvedValue([]), upsertAll: jest.fn(), build: jest.fn(), sign: jest.fn(), broadcast: jest.fn(), deleteByWallet: jest.fn().mockResolvedValue(undefined) };
  const stubWalletAddressRepo = { findByWallet: jest.fn().mockResolvedValue([]), findByOrigin: jest.fn(), findByChain: jest.fn(), findFreshByChain: jest.fn(), findByAddress: jest.fn(), save: jest.fn(), saveMany: jest.fn(), updateStatus: jest.fn(), updateOriginName: jest.fn(), updateSyncData: jest.fn(), countFreshByChain: jest.fn(), getMaxIndexByChain: jest.fn(), deleteByOrigin: jest.fn().mockResolvedValue(undefined), deleteByWallet: jest.fn().mockResolvedValue(undefined) };
  const stubAddressOriginRepo = { findByWallet: jest.fn().mockResolvedValue([]), findById: jest.fn(), findDefault: jest.fn(), getMaxAccountIndex: jest.fn(), save: jest.fn(), archive: jest.fn(), deleteByWallet: jest.fn().mockResolvedValue(undefined) };
  const stubAddressRepo = { findByWallet: jest.fn().mockResolvedValue([]), findReceiveAddresses: jest.fn().mockResolvedValue([]), findChangeAddresses: jest.fn().mockResolvedValue([]), save: jest.fn(), saveMany: jest.fn(), markUsed: jest.fn(), deleteByWallet: jest.fn().mockResolvedValue(undefined) };

  const deleteWallet = new DeleteWalletUseCase(
    walletRepository, stubUtxoRepo, stubTxRepo, stubWalletAddressRepo, stubAddressOriginRepo, stubAddressRepo, stubSyncState,
  );
  const stubSyncUseCase = { execute: jest.fn() } as unknown as SyncWalletUseCase;

  return {
    service: new WalletService(
      createWallet,
      importWallet,
      loadWallets,
      selectWallet,
      deleteWallet,
      new RenameWalletUseCase(walletRepository),
      new GetWalletSeedUseCase(walletRepository),
      new LoadTransactionsUseCase(stubTxRepo),
      new LoadUtxosUseCase(stubUtxoRepo),
      stubSyncUseCase,
      new FreezeUtxoUseCase(stubUtxoRepo),
      new UnfreezeUtxoUseCase(stubUtxoRepo),
    ),
    walletRepository,
    walletKeyStorage,
  };
}

describe('Integration: Create Wallet', () => {
  it('creates a wallet with correct metadata', async () => {
    const { service } = makeWalletService();
    const wallet = await service.createWallet('My Wallet');

    expect(wallet.name).toBe('My Wallet');
    expect(wallet.network).toBe('testnet4');
    expect(wallet.status).toBe('locked');
    expect(typeof wallet.id).toBe('string');
    expect(wallet.id.length).toBeGreaterThan(0);
    expect(typeof wallet.createdAt).toBe('string');
  });

  it('persists the wallet so loadWallets returns it', async () => {
    const { service } = makeWalletService();
    const created = await service.createWallet('Persist Test');
    const wallets = await service.loadWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].id).toBe(created.id);
    expect(wallets[0].name).toBe('Persist Test');
  });

  it('stores the wallet key so it can be retrieved after creation', async () => {
    const { service, walletKeyStorage } = makeWalletService();
    const wallet = await service.createWallet('Key Test');

    const storedKey = await walletKeyStorage.retrieve(wallet.id);
    expect(storedKey).not.toBeNull();
    expect(typeof storedKey).toBe('string');
    expect(storedKey!.length).toBeGreaterThan(0);
  });

  it('rejects duplicate wallet names with WALLET_EXISTS', async () => {
    const { service } = makeWalletService();
    await service.createWallet('Duplicated');

    await expect(service.createWallet('Duplicated')).rejects.toMatchObject({
      code: 'WALLET_EXISTS',
    });
  });

  it('allows multiple wallets with different names', async () => {
    const { service } = makeWalletService();
    await service.createWallet('Wallet A');
    await service.createWallet('Wallet B');
    await service.createWallet('Wallet C');

    const wallets = await service.loadWallets();
    expect(wallets).toHaveLength(3);
    expect(wallets.map(w => w.name)).toContain('Wallet A');
    expect(wallets.map(w => w.name)).toContain('Wallet B');
    expect(wallets.map(w => w.name)).toContain('Wallet C');
  });

  it('each wallet gets a unique id', async () => {
    const { service } = makeWalletService();
    const a = await service.createWallet('Alpha');
    const b = await service.createWallet('Beta');

    expect(a.id).not.toBe(b.id);
  });

  it('selectWallet returns the created wallet by id', async () => {
    const { service } = makeWalletService();
    const created = await service.createWallet('Select Me');
    const selected = await service.selectWallet(created.id);

    expect(selected.id).toBe(created.id);
    expect(selected.name).toBe('Select Me');
  });

  it('deleteWallet removes it from storage', async () => {
    const { service } = makeWalletService();
    const wallet = await service.createWallet('To Delete');
    await service.deleteWallet(wallet.id);

    const wallets = await service.loadWallets();
    expect(wallets).toHaveLength(0);
  });

  it('throws WALLET_NOT_FOUND when selecting unknown wallet', async () => {
    const { service } = makeWalletService();
    await expect(service.selectWallet('nonexistent-id')).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
    });
  });
});
