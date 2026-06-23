/**
 * Integration: Receive Bitcoin (Generate Address) Flow
 *
 * Tests: GenerateReceiveAddressUseCase → WalletKeyAddressProvider (real HD derivation)
 * → AddressRepositoryImpl → AddressStorage → InMemoryDatabase
 *
 * Real: address derivation via bitcoin-tx-lib, repository impl, storage
 * Mocked: EncryptedStorage (in-memory), SQLite (InMemoryDatabase)
 */
import { HDWallet } from 'bitcoin-tx-lib';
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { AddressRepositoryImpl } from '../../src/core/infrastructure/repositories/AddressRepositoryImpl';
import { AddressStorage } from '../../src/core/infrastructure/storage/AddressStorage';
import { WalletKeyAddressProvider } from '../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import { GenerateReceiveAddressUseCase } from '../../src/core/domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { createSecureStorageMock } from '../mocks/storage';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function deriveExpectedAddress(index: number): string {
  const { wallet } = HDWallet.import(TEST_MNEMONIC, undefined, {
    network: 'testnet',
    purpose: 84,
  });
  return wallet.getAddress(index, { change: 0 });
}

function makeSetup() {
  const db = new InMemoryDatabase();
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);
  const addressRepository = new AddressRepositoryImpl(new AddressStorage(db));
  const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);
  const generateAddress = new GenerateReceiveAddressUseCase(
    walletRepository,
    walletAddressProvider,
    addressRepository,
  );
  const importWallet = new ImportWalletUseCase(walletRepository);

  return { generateAddress, importWallet, addressRepository, db };
}

describe('Integration: Receive Bitcoin (Generate Address)', () => {
  it('generates the first address at index 0', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Receive Test', TEST_MNEMONIC);
    const address = await generateAddress.execute(wallet.id);

    expect(address.index).toBe(0);
    expect(address.isChange).toBe(false);
    expect(address.network).toBe('testnet4');
    expect(address.type).toBe('p2wpkh');
  });

  it('derives the correct deterministic address from the known mnemonic', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Deterministic', TEST_MNEMONIC);
    const address = await generateAddress.execute(wallet.id);

    const expected = deriveExpectedAddress(0);
    expect(address.value).toBe(expected);
  });

  it('generates a bech32 testnet address (tb1...)', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Bech32 Test', TEST_MNEMONIC);
    const address = await generateAddress.execute(wallet.id);

    expect(address.value).toMatch(/^tb1q/);
  });

  it('increments index for each subsequent address', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Index Test', TEST_MNEMONIC);

    const addr0 = await generateAddress.execute(wallet.id);
    const addr1 = await generateAddress.execute(wallet.id);
    const addr2 = await generateAddress.execute(wallet.id);

    expect(addr0.index).toBe(0);
    expect(addr1.index).toBe(1);
    expect(addr2.index).toBe(2);
  });

  it('each generated address has a unique value', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Unique Addr', TEST_MNEMONIC);

    const addr0 = await generateAddress.execute(wallet.id);
    const addr1 = await generateAddress.execute(wallet.id);
    const addr2 = await generateAddress.execute(wallet.id);

    expect(addr0.value).not.toBe(addr1.value);
    expect(addr1.value).not.toBe(addr2.value);
  });

  it('persists the address so findReceiveAddresses returns it', async () => {
    const { generateAddress, importWallet, addressRepository } = makeSetup();
    const wallet = await importWallet.execute('Persisted Addr', TEST_MNEMONIC);
    const generated = await generateAddress.execute(wallet.id);

    const stored = await addressRepository.findReceiveAddresses(wallet.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].value).toBe(generated.value);
    expect(stored[0].id).toBe(generated.id);
  });

  it('throws WALLET_NOT_FOUND for unknown wallet id', async () => {
    const { generateAddress } = makeSetup();
    await expect(generateAddress.execute('unknown-wallet-id')).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
    });
  });

  it('assigns accountId = walletId on the generated address', async () => {
    const { generateAddress, importWallet } = makeSetup();
    const wallet = await importWallet.execute('Account Id', TEST_MNEMONIC);
    const address = await generateAddress.execute(wallet.id);

    expect(address.accountId).toBe(wallet.id);
  });

  it('separates receive addresses from change addresses', async () => {
    const { generateAddress, importWallet, addressRepository } = makeSetup();
    const wallet = await importWallet.execute('Separate', TEST_MNEMONIC);
    await generateAddress.execute(wallet.id);

    const change = await addressRepository.findChangeAddresses(wallet.id);
    const receive = await addressRepository.findReceiveAddresses(wallet.id);

    expect(receive).toHaveLength(1);
    expect(change).toHaveLength(0);
  });
});
