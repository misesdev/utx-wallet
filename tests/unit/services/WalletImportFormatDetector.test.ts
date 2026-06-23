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

  it('detects BIP84 mainnet xpriv (zprv) and keeps native format', () => {
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
    expect(result!.normalizedSecret).toBe(zprv);
  });

  it('detects BIP84 mainnet xpub (zpub) and keeps native format', () => {
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
    expect(result!.normalizedSecret).toBe(zpub);
  });

  it('detects BIP84 testnet xpriv (vprv) and maps network to testnet4', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'testnet', purpose: 84 });
    const vprv = wallet.getXPriv();
    expect(vprv.startsWith('vprv')).toBe(true);
    const result = detector.detect(vprv);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet4',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret).toBe(vprv);
  });

  it('detects tprv (testnet BIP44 xpriv) and maps network to testnet4', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'testnet', purpose: 44 });
    const tprv = wallet.getXPriv();
    expect(tprv.startsWith('tprv')).toBe(true);
    const result = detector.detect(tprv);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpriv',
      canSign: true,
      isWatchOnly: false,
      network: 'testnet4',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret).toBe(tprv);
  });

  it('detects tpub (testnet BIP44 xpub) and maps network to testnet4', () => {
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'testnet', purpose: 44 });
    const tpub = wallet.getXPub();
    expect(tpub.startsWith('tpub')).toBe(true);
    const result = detector.detect(tpub);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      format: 'xpub',
      canSign: false,
      isWatchOnly: true,
      network: 'testnet4',
      storageKind: 'hd',
    });
    expect(result!.normalizedSecret).toBe(tpub);
  });

  it('returns null for unsupported QR content', () => {
    expect(detector.detect('not a wallet secret')).toBeNull();
  });
});
