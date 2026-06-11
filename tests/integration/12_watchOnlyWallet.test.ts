/**
 * Integration: Watch-Only Wallet Flow
 *
 * Tests the full import and usage pipeline for non-mnemonic key formats:
 * xpub (watch-only), xpriv (HD signing), WIF (single-key signing).
 *
 * Note: The detector and address provider use version-byte format xpub/xprv
 * (generated with purpose=44 at BIP32 account level). The WalletKeyAddressProvider
 * re-imports them internally with purpose=84, so all derived addresses are BIP84
 * (native segwit, bech32).
 *
 * Real: domain use cases, repository impl, storage classes, bitcoin-tx-lib
 * Mocked: EncryptedStorage (in-memory)
 */
import { HDWallet, ECPairKey, Address } from 'bitcoin-tx-lib';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { WalletKeyAddressProvider } from '../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import { WalletTransactionSigner } from '../../src/core/infrastructure/adapters/WalletTransactionSigner';
import type { BuiltTransaction } from '../../src/core/domain/entities/BuiltTransaction';
import { createSecureStorageMock } from '../mocks/storage';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// purpose=44 is required to produce standard xpub/xprv version bytes.
// The detector regex only matches xpub/tpub/xprv/tprv prefixes.
function getXpub(network: 'mainnet' | 'testnet') {
  const { wallet } = HDWallet.import(MNEMONIC, undefined, { network, purpose: 44 });
  return wallet.getXPub();
}
function getXpriv(network: 'mainnet' | 'testnet') {
  const { wallet } = HDWallet.import(MNEMONIC, undefined, { network, purpose: 44 });
  return wallet.getXPriv();
}
// Expected address after WalletKeyAddressProvider re-imports the key with purpose=84
function expectedAddr(xpubOrXpriv: string, network: 'mainnet' | 'testnet', index: number, change: 0 | 1 = 0) {
  const { wallet } = HDWallet.import(xpubOrXpriv, undefined, { network, purpose: 84 });
  return wallet.getAddress(index, { change });
}

function makeSetup() {
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);
  const importWallet = new ImportWalletUseCase(walletRepository);
  const addressProvider = new WalletKeyAddressProvider(walletKeyStorage);
  const signer = new WalletTransactionSigner(walletKeyStorage);
  return { importWallet, addressProvider, signer };
}

function fakeBuiltTx(walletId: string, inputAddr: string, outputAddr: string): BuiltTransaction {
  return {
    id: 'built-1',
    walletId,
    inputs: [{
      txid: 'a'.repeat(64),
      vout: 0,
      valueSats: 100_000,
      address: inputAddr,
      scriptPubKey: Address.getScriptPubkey(inputAddr),
    }],
    outputs: [{ address: outputAddr, amountSats: 90_000, isChange: false }],
    amountSats: 90_000,
    feeSats: 10_000,
    totalSats: 100_000,
    changeSats: 0,
    feeRateSatsPerVByte: 5,
    estimatedVBytes: 110,
    status: 'built',
    createdAt: new Date().toISOString(),
  };
}

// ─── xpub — watch-only ───────────────────────────────────────────────────────

describe('Integration: Watch-Only Wallet (xpub)', () => {
  it('imports xpub as watch-only with correct status', async () => {
    const { importWallet } = makeSetup();
    const wallet = await importWallet.execute('Watch Only', getXpub('mainnet'), 'mainnet');
    expect(wallet.status).toBe('watch-only');
    expect(wallet.network).toBe('mainnet');
  });

  it('auto-detects mainnet network from xpub prefix', async () => {
    const { importWallet } = makeSetup();
    const wallet = await importWallet.execute('Auto Mainnet', getXpub('mainnet'));
    expect(wallet.network).toBe('mainnet');
  });

  it('network auto-detected from tpub prefix resolves to testnet', async () => {
    const { importWallet } = makeSetup();
    // bitcoin-tx-lib 2.0.3+ correctly emits tpub for testnet wallets (BIP44 testnet version bytes).
    // The detector maps tpub prefix → testnet.
    const wallet = await importWallet.execute('Tpub Testnet', getXpub('testnet'));
    expect(wallet.network).toBe('testnet');
  });

  it('derives receive addresses from the stored xpub', async () => {
    const { importWallet, addressProvider } = makeSetup();
    const xpub = getXpub('testnet');
    const wallet = await importWallet.execute('Watch Addr', xpub, 'testnet');

    const [addr0, addr1] = await Promise.all([
      addressProvider.getReceiveAddress(wallet.id, 'testnet', 0),
      addressProvider.getReceiveAddress(wallet.id, 'testnet', 1),
    ]);

    expect(addr0).toBe(expectedAddr(xpub, 'testnet', 0, 0));
    expect(addr1).toBe(expectedAddr(xpub, 'testnet', 1, 0));
  });

  it('derives change addresses from the stored xpub', async () => {
    const { importWallet, addressProvider } = makeSetup();
    const xpub = getXpub('testnet');
    const wallet = await importWallet.execute('Watch Change', xpub, 'testnet');
    const changeAddr = await addressProvider.getChangeAddress(wallet.id, 'testnet', 0);
    expect(changeAddr).toBe(expectedAddr(xpub, 'testnet', 0, 1));
  });

  it('blocks signing with WATCH_ONLY_WALLET error', async () => {
    const { importWallet, signer } = makeSetup();
    const xpub = getXpub('testnet');
    const wallet = await importWallet.execute('Block Sign', xpub, 'testnet');
    const inputAddr = expectedAddr(xpub, 'testnet', 0, 0);
    const built = fakeBuiltTx(wallet.id, inputAddr, expectedAddr(xpub, 'testnet', 1, 0));

    await expect(signer.sign(built, wallet.id, 'testnet')).rejects.toMatchObject({
      code: 'WATCH_ONLY_WALLET',
    });
  });

  it('blocks signing when imported with explicit watch-only prefix', async () => {
    const { importWallet, signer } = makeSetup();
    const xpub = getXpub('testnet');
    const wallet = await importWallet.execute('Watch Explicit', `watch-only:${xpub}`, 'testnet');
    const inputAddr = expectedAddr(xpub, 'testnet', 0, 0);
    const built = fakeBuiltTx(wallet.id, inputAddr, expectedAddr(xpub, 'testnet', 1, 0));

    await expect(signer.sign(built, wallet.id, 'testnet')).rejects.toMatchObject({
      code: 'WATCH_ONLY_WALLET',
    });
  });

  it('rejects duplicate wallet name with WALLET_EXISTS', async () => {
    const { importWallet } = makeSetup();
    await importWallet.execute('Same Name', getXpub('testnet'));
    await expect(
      importWallet.execute('Same Name', getXpub('mainnet')),
    ).rejects.toMatchObject({ code: 'WALLET_EXISTS' });
  });
});

// ─── xpriv — HD signing ───────────────────────────────────────────────────────

describe('Integration: Signing Wallet (xpriv)', () => {
  it('imports xpriv with status locked (signing capable)', async () => {
    const { importWallet } = makeSetup();
    const wallet = await importWallet.execute('Xpriv Wallet', getXpriv('mainnet'), 'mainnet');
    expect(wallet.status).toBe('locked');
    expect(wallet.network).toBe('mainnet');
  });

  it('auto-detects mainnet from xprv prefix', async () => {
    const { importWallet } = makeSetup();
    const wallet = await importWallet.execute('Xprv Auto', getXpriv('mainnet'));
    expect(wallet.network).toBe('mainnet');
  });

  it('derives receive addresses from stored xpriv', async () => {
    const { importWallet, addressProvider } = makeSetup();
    const xpriv = getXpriv('testnet');
    const wallet = await importWallet.execute('Xpriv Addr', xpriv, 'testnet');
    const addr = await addressProvider.getReceiveAddress(wallet.id, 'testnet', 0);
    expect(addr).toBe(expectedAddr(xpriv, 'testnet', 0, 0));
  });

  it('signs a transaction from xpriv wallet', async () => {
    const { importWallet, signer } = makeSetup();
    const xpriv = getXpriv('testnet');
    const wallet = await importWallet.execute('Xpriv Sign', xpriv, 'testnet');
    const inputAddr = expectedAddr(xpriv, 'testnet', 0, 0);
    const built = fakeBuiltTx(wallet.id, inputAddr, expectedAddr(xpriv, 'testnet', 1, 0));

    const signed = await signer.sign(built, wallet.id, 'testnet');

    expect(typeof signed.rawHex).toBe('string');
    expect(signed.rawHex.length).toBeGreaterThan(0);
    expect(signed.txid).toBeTruthy();
  });
});

// ─── WIF — single-key signing ─────────────────────────────────────────────────

describe('Integration: Single-Key Wallet (WIF)', () => {
  it('imports WIF as locked signing wallet', async () => {
    const { importWallet } = makeSetup();
    const pair = new ECPairKey({ network: 'testnet' });
    const wallet = await importWallet.execute('WIF Wallet', pair.getWif(), 'testnet');
    expect(wallet.status).toBe('locked');
  });

  it('auto-detects mainnet network from WIF prefix', async () => {
    const { importWallet } = makeSetup();
    const pair = new ECPairKey({ network: 'mainnet' });
    const wallet = await importWallet.execute('WIF Mainnet', pair.getWif());
    expect(wallet.network).toBe('mainnet');
  });

  it('auto-detects testnet network from WIF prefix', async () => {
    const { importWallet } = makeSetup();
    const pair = new ECPairKey({ network: 'testnet' });
    const wallet = await importWallet.execute('WIF Testnet', pair.getWif());
    expect(wallet.network).toBe('testnet');
  });

  it('derives the p2wpkh address from stored WIF', async () => {
    const { importWallet, addressProvider } = makeSetup();
    const pair = new ECPairKey({ network: 'testnet' });
    const wallet = await importWallet.execute('WIF Addr', pair.getWif(), 'testnet');
    const address = await addressProvider.getReceiveAddress(wallet.id, 'testnet', 0);
    expect(address).toBe(pair.getAddress('p2wpkh'));
  });

  it('signs a transaction from WIF wallet', async () => {
    const { importWallet, signer } = makeSetup();
    const pair = new ECPairKey({ network: 'testnet' });
    const wallet = await importWallet.execute('WIF Sign', pair.getWif(), 'testnet');
    const addr = pair.getAddress('p2wpkh');
    const built = fakeBuiltTx(wallet.id, addr, addr);

    const signed = await signer.sign(built, wallet.id, 'testnet');

    expect(typeof signed.rawHex).toBe('string');
    expect(signed.rawHex.length).toBeGreaterThan(0);
  });

  it('rejects index > 0 for single-key wallets', async () => {
    const { importWallet, addressProvider } = makeSetup();
    const pair = new ECPairKey({ network: 'testnet' });
    const wallet = await importWallet.execute('WIF Single', pair.getWif(), 'testnet');

    await expect(
      addressProvider.getReceiveAddress(wallet.id, 'testnet', 1),
    ).rejects.toMatchObject({ code: 'ADDRESS_DERIVATION_UNSUPPORTED' });
  });
});
