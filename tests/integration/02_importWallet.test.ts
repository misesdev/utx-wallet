/**
 * Integration: Import Wallet Flow
 *
 * Tests: WalletService → ImportWalletUseCase → WalletRepositoryImpl.import()
 * Validation via real bitcoin-tx-lib HDWallet.import()
 *
 * Real: domain use case, repository impl, storage classes, bitcoin-tx-lib validation
 * Mocked: EncryptedStorage (in-memory)
 */
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../src/core/domain/usecases/wallet/LoadWalletsUseCase';
import { createSecureStorageMock } from '../mocks/storage';

// Well-known BIP-39 test mnemonic (24-word variant for completeness tests)
const VALID_MNEMONIC_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VALID_MNEMONIC_24 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

function makeImportSetup() {
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);

  return {
    importUseCase: new ImportWalletUseCase(walletRepository),
    loadWallets: new LoadWalletsUseCase(walletRepository),
    walletKeyStorage,
  };
}

describe('Integration: Import Wallet', () => {
  it('imports a wallet with a valid 12-word mnemonic', async () => {
    const { importUseCase } = makeImportSetup();
    const wallet = await importUseCase.execute('Imported Wallet', VALID_MNEMONIC_12);

    expect(wallet.name).toBe('Imported Wallet');
    expect(wallet.status).toBe('locked');
    expect(typeof wallet.id).toBe('string');
  });

  it('imports a wallet with a valid 24-word mnemonic', async () => {
    const { importUseCase } = makeImportSetup();
    const wallet = await importUseCase.execute('Long Mnemonic', VALID_MNEMONIC_24);

    expect(wallet.name).toBe('Long Mnemonic');
    expect(wallet.id.length).toBeGreaterThan(0);
  });

  it('stores the secret so it can be retrieved after import', async () => {
    const { importUseCase, walletKeyStorage } = makeImportSetup();
    const wallet = await importUseCase.execute('Secret Test', VALID_MNEMONIC_12);

    const stored = await walletKeyStorage.retrieve(wallet.id);
    expect(stored).toBe(VALID_MNEMONIC_12);
  });

  it('persists the wallet so loadWallets returns it', async () => {
    const { importUseCase, loadWallets } = makeImportSetup();
    const imported = await importUseCase.execute('Persisted', VALID_MNEMONIC_12);
    const wallets = await loadWallets.execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].id).toBe(imported.id);
  });

  it('rejects an empty secret with INVALID_SECRET', async () => {
    const { importUseCase } = makeImportSetup();
    await expect(importUseCase.execute('Bad', '')).rejects.toMatchObject({
      code: 'INVALID_SECRET',
    });
  });

  it('rejects whitespace-only secret with INVALID_SECRET', async () => {
    const { importUseCase } = makeImportSetup();
    await expect(importUseCase.execute('Bad', '   ')).rejects.toMatchObject({
      code: 'INVALID_SECRET',
    });
  });

  it('rejects a completely invalid string with INVALID_SECRET', async () => {
    const { importUseCase } = makeImportSetup();
    await expect(
      importUseCase.execute('Bad', 'not a valid mnemonic or key'),
    ).rejects.toMatchObject({ code: 'INVALID_SECRET' });
  });

  it('rejects duplicate wallet name with WALLET_EXISTS', async () => {
    const { importUseCase } = makeImportSetup();
    await importUseCase.execute('Unique', VALID_MNEMONIC_12);

    await expect(
      importUseCase.execute('Unique', VALID_MNEMONIC_24),
    ).rejects.toMatchObject({ code: 'WALLET_EXISTS' });
  });

  it('applies the specified network to the wallet', async () => {
    const { importUseCase } = makeImportSetup();
    const wallet = await importUseCase.execute('Mainnet', VALID_MNEMONIC_12, 'mainnet');
    expect(wallet.network).toBe('mainnet');
  });

  it('uses testnet4 as default network when not specified', async () => {
    const { importUseCase } = makeImportSetup();
    const wallet = await importUseCase.execute('Default Net', VALID_MNEMONIC_12);
    expect(wallet.network).toBe('testnet4');
  });

  it('trims whitespace from the mnemonic before storing', async () => {
    const { importUseCase, walletKeyStorage } = makeImportSetup();
    const padded = `  ${VALID_MNEMONIC_12}  `;
    const wallet = await importUseCase.execute('Trimmed', padded);

    const stored = await walletKeyStorage.retrieve(wallet.id);
    expect(stored).toBe(VALID_MNEMONIC_12);
  });
});
