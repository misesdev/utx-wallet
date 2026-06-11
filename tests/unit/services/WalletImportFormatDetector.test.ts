import { ECPairKey, HDWallet } from 'bitcoin-tx-lib';
import { WalletImportFormatDetector } from '../../../src/core/domain/services/WalletImportFormatDetector';

const detector = new WalletImportFormatDetector();
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('WalletImportFormatDetector', () => {
  it('detects a seed phrase as signable HD wallet', () => {
    const result = detector.detect(MNEMONIC, 'testnet');
    expect(result).toMatchObject({
      format: 'mnemonic',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet',
      storageKind: 'hd',
    });
  });

  it('detects xpub as watch-only wallet', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    const result = detector.detect(wallet.getXPub());
    expect(result).toMatchObject({
      format: 'xpub',
      canSign: false,
      isWatchOnly: true,
      network: 'mainnet',
      storageKind: 'hd',
    });
  });

  it('detects watch-only wrapper around xpub', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    const result = detector.detect(`watch-only:${wallet.getXPub()}`);
    expect(result).toMatchObject({
      format: 'watch-only',
      canSign: false,
      isWatchOnly: true,
      network: 'mainnet',
    });
  });

  it('detects xpriv as signable HD wallet', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    const result = detector.detect(wallet.getXPriv());
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'mainnet',
      storageKind: 'hd',
    });
  });

  it('detects WIF and resolves its network', () => {
    const wif = new ECPairKey({ network: 'mainnet' }).getWif();
    const result = detector.detect(wif, 'testnet');
    expect(result).toMatchObject({
      format: 'wif',
      canSign: true,
      isWatchOnly: false,
      network: 'mainnet',
      storageKind: 'single-private-key',
    });
  });

  it('detects raw private key as WIF-backed single-key wallet', () => {
    const privateKey = new ECPairKey({ network: 'testnet' }).getPrivateKeyHex();
    const result = detector.detect(privateKey, 'testnet4');
    expect(result).toMatchObject({
      format: 'private-key',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet4',
      storageKind: 'single-private-key',
    });
    expect(result?.normalizedSecret).not.toBe(privateKey);
  });

  it('detects BIP84 mainnet xpriv (zprv) and normalizes to xprv', () => {
    // The key from the user's bug report
    const zprv = 'zprvAWgYBBk7JR8GjvBeH5ALExdq1GJhktbkc8hNLk7sTcVbouFaJ94ZHAXTfkmjBmpqZg7QqJm5GjxjxHMizTGqHPKeonfxptr8Unis47R1zJp';
    const result = detector.detect(zprv);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'mainnet',
      storageKind: 'hd',
    });
    // normalizedSecret must be xprv (not zprv) so HDWallet.import can handle it
    expect(result!.normalizedSecret.startsWith('xprv')).toBe(true);
  });

  it('detects BIP84 mainnet xpub (zpub) and normalizes to xpub', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
    const zpub = wallet.getXPub();
    expect(zpub.startsWith('zpub')).toBe(true);
    const result = detector.detect(zpub);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpub',
      canSign: false,
      isWatchOnly: true,
      network: 'mainnet',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret.startsWith('xpub')).toBe(true);
  });

  it('detects BIP84 testnet xpriv (vprv) and normalizes to xprv', () => {
    const { createBase58check } = require('@scure/base');
    const { sha256 } = require('@noble/hashes/sha256');
    const b58 = createBase58check(sha256);
    const zprv = 'zprvAWgYBBk7JR8GjvBeH5ALExdq1GJhktbkc8hNLk7sTcVbouFaJ94ZHAXTfkmjBmpqZg7QqJm5GjxjxHMizTGqHPKeonfxptr8Unis47R1zJp';
    const decoded = b58.decode(zprv);
    const vprvVersion = new Uint8Array([0x04, 0x5f, 0x18, 0xbc]);
    const vprv = b58.encode(new Uint8Array([...vprvVersion, ...decoded.slice(4)]));
    const result = detector.detect(vprv);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret.startsWith('xprv')).toBe(true);
  });

  it('detects tprv (testnet BIP44 xpriv exported by this app) and normalizes to xprv', () => {
    // tprv is what ExportWalletKeyUseCase produces for testnet xpriv
    const { createBase58check } = require('@scure/base');
    const { sha256 } = require('@noble/hashes/sha256');
    const b58 = createBase58check(sha256);
    // Get xprv from mnemonic, re-version to tprv
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
    const xprv = wallet.getXPriv();
    const tprvVersion = new Uint8Array([0x04, 0x35, 0x83, 0x94]);
    const dec = b58.decode(xprv);
    const tprv = b58.encode(new Uint8Array([...tprvVersion, ...dec.slice(4)]));

    const result = detector.detect(tprv);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet',
      storageKind: 'hd',
    });
    // Must be normalised to xprv so the rest of the app can use HDWallet.import
    expect(result!.normalizedSecret.startsWith('xprv')).toBe(true);
  });

  it('detects tpub (testnet BIP44 xpub exported by this app) and normalizes to xpub', () => {
    const { createBase58check } = require('@scure/base');
    const { sha256 } = require('@noble/hashes/sha256');
    const b58 = createBase58check(sha256);
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
    const xpub = wallet.getXPub();
    const tpubVersion = new Uint8Array([0x04, 0x35, 0x87, 0xcf]);
    const dec = b58.decode(xpub);
    const tpub = b58.encode(new Uint8Array([...tpubVersion, ...dec.slice(4)]));

    const result = detector.detect(tpub);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpub',
      canSign: false,
      isWatchOnly: true,
      network: 'testnet',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret.startsWith('xpub')).toBe(true);
  });

  it('returns null for unsupported QR content', () => {
    expect(detector.detect('not a wallet secret')).toBeNull();
  });
});
