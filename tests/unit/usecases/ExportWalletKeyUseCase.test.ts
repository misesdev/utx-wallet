import { ExportWalletKeyUseCase } from '../../../src/core/domain/usecases/wallet/ExportWalletKeyUseCase';
import { WalletImportFormatDetector } from '../../../src/core/domain/services/WalletImportFormatDetector';
import type { WalletRepository, RawWalletKey } from '../../../src/core/domain/repositories/WalletRepository';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WIF_SAMPLE = 'cVt4o7BGAig1UXywgGSmARhxMdzP5qvQsxKkSsc1XEkw3tDTQFpy';

function makeRepo(keyOverride?: Partial<RawWalletKey> | null): jest.Mocked<WalletRepository> {
  const defaultKey: RawWalletKey = { kind: 'hd', secret: MNEMONIC };
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    rename: jest.fn(),
    retrieveSeed: jest.fn(),
    retrieveRawKey: jest.fn().mockResolvedValue(
      keyOverride === null ? null : { ...defaultKey, ...keyOverride },
    ),
    delete: jest.fn(),
  };
}

describe('ExportWalletKeyUseCase', () => {
  const WALLET_ID = 'wallet-1';

  // ── getAvailableFormats ─────────────────────────────────────────────────

  describe('getAvailableFormats', () => {
    it('returns mnemonic/xpriv/xpub for HD mnemonic wallets', async () => {
      const useCase = new ExportWalletKeyUseCase(makeRepo());
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual(['mnemonic', 'xpriv', 'xpub']);
    });

    it('returns xpriv/xpub for HD xpriv wallets (tprv testnet)', async () => {
      // Stored as xprv (normalised from tprv during import)
      const repo = makeRepo({ kind: 'hd', secret: 'xprv9s21ZrQH143K3GJpoapnV8SFfure' }); // dummy xprv prefix ok for regex
      const useCase = new ExportWalletKeyUseCase(repo);
      // Won't actually call HDWallet.import in getAvailableFormats
      const formats = await useCase.getAvailableFormats(WALLET_ID);
      // xprv matches XPRIV_RE → ['xpriv','xpub']
      expect(formats).toEqual(['xpriv', 'xpub']);
    });

    it('returns xpub only for watch-only (xpub) wallets', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'xpub661MyMwAqdummy' });
      const useCase = new ExportWalletKeyUseCase(repo);
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual(['xpub']);
    });

    it('returns wif only for single-key wallets', async () => {
      const repo = makeRepo({ kind: 'single-private-key', secret: WIF_SAMPLE });
      const useCase = new ExportWalletKeyUseCase(repo);
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual(['wif']);
    });

    it('returns empty array when key is not found', async () => {
      const repo = makeRepo(null);
      const useCase = new ExportWalletKeyUseCase(repo);
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual([]);
    });
  });

  // ── mnemonic format ─────────────────────────────────────────────────────

  describe('execute – mnemonic', () => {
    it('returns the mnemonic string for HD mnemonic wallets', async () => {
      const useCase = new ExportWalletKeyUseCase(makeRepo());
      const result = await useCase.execute({ walletId: WALLET_ID, format: 'mnemonic', network: 'testnet' });
      expect(result).toEqual({ format: 'mnemonic', value: MNEMONIC });
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE for single-key wallets', async () => {
      const repo = makeRepo({ kind: 'single-private-key', secret: WIF_SAMPLE });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'mnemonic', network: 'testnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE for xpub-only wallets', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'xpub661MyMwAqdummy' });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'mnemonic', network: 'testnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });
  });

  // ── wif format ─────────────────────────────────────────────────────────

  describe('execute – wif', () => {
    it('returns WIF for single-key wallets', async () => {
      const repo = makeRepo({ kind: 'single-private-key', secret: WIF_SAMPLE });
      const result = await new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'wif', network: 'testnet' });
      expect(result).toEqual({ format: 'wif', value: WIF_SAMPLE });
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE for HD wallets', async () => {
      await expect(
        new ExportWalletKeyUseCase(makeRepo()).execute({ walletId: WALLET_ID, format: 'wif', network: 'testnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });
  });

  // ── xpriv export — network-aware ────────────────────────────────────────

  describe('execute – xpriv', () => {
    it('exports xprv... for mainnet mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'mainnet',
      });
      expect(result.format).toBe('xpriv');
      expect(result.value.startsWith('xprv')).toBe(true);
    });

    it('exports tprv... for testnet mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'testnet',
      });
      expect(result.format).toBe('xpriv');
      expect(result.value.startsWith('tprv')).toBe(true);
    });

    it('mainnet and testnet xpriv differ only in version prefix', async () => {
      const { createBase58check } = require('@scure/base');
      const { sha256 } = require('@noble/hashes/sha256');
      const b58 = createBase58check(sha256);
      const useCase = new ExportWalletKeyUseCase(makeRepo());
      const mainnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpriv', network: 'mainnet' });
      const testnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpriv', network: 'testnet' });
      expect(mainnet.value.startsWith('xprv')).toBe(true);
      expect(testnet.value.startsWith('tprv')).toBe(true);
      // Same payload bytes after the 4-byte version prefix
      const payloadMain = b58.decode(mainnet.value).slice(4);
      const payloadTest = b58.decode(testnet.value).slice(4);
      const toHex = (u: Uint8Array) => Array.from(u).map(b => b.toString(16).padStart(2, '0')).join('');
      expect(toHex(payloadMain)).toBe(toHex(payloadTest));
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE when secret is an xpub (watch-only)', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'xpub661MyMwAqdummy' });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'xpriv', network: 'mainnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE for single-key wallets', async () => {
      const repo = makeRepo({ kind: 'single-private-key', secret: WIF_SAMPLE });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'xpriv', network: 'mainnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });
  });

  // ── xpub export — network-aware ─────────────────────────────────────────

  describe('execute – xpub', () => {
    it('exports xpub... for mainnet mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'mainnet',
      });
      expect(result.format).toBe('xpub');
      expect(result.value.startsWith('xpub')).toBe(true);
    });

    it('exports tpub... for testnet mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'testnet',
      });
      expect(result.format).toBe('xpub');
      expect(result.value.startsWith('tpub')).toBe(true);
    });

    it('mainnet and testnet xpub differ only in version prefix', async () => {
      const { createBase58check } = require('@scure/base');
      const { sha256 } = require('@noble/hashes/sha256');
      const b58 = createBase58check(sha256);
      const useCase = new ExportWalletKeyUseCase(makeRepo());
      const mainnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpub', network: 'mainnet' });
      const testnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpub', network: 'testnet' });
      expect(mainnet.value.startsWith('xpub')).toBe(true);
      expect(testnet.value.startsWith('tpub')).toBe(true);
      const payloadMain = b58.decode(mainnet.value).slice(4);
      const payloadTest = b58.decode(testnet.value).slice(4);
      const toHex = (u: Uint8Array) => Array.from(u).map(b => b.toString(16).padStart(2, '0')).join('');
      expect(toHex(payloadMain)).toBe(toHex(payloadTest));
    });

    it('watch-only wallet: exports same key re-versioned for the wallet network', async () => {
      // Import via detector: zprv (mainnet BIP84) → normalised to xprv → stored
      const { HDWallet } = require('bitcoin-tx-lib');
      const { wallet: bip84 } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
      const zpub = bip84.getXPub(); // zpub...

      // Simulate what WalletImportFormatDetector stores: zpub normalised to xpub
      const { createBase58check } = require('@scure/base');
      const { sha256 } = require('@noble/hashes/sha256');
      const b58 = createBase58check(sha256);
      const xpubVer = new Uint8Array([0x04, 0x88, 0xb2, 0x1e]);
      const dec = b58.decode(zpub);
      const storedXpub = b58.encode(new Uint8Array([...xpubVer, ...dec.slice(4)]));

      const repo = makeRepo({ kind: 'hd', secret: storedXpub });
      const useCase = new ExportWalletKeyUseCase(repo);

      const mainnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpub', network: 'mainnet' });
      expect(mainnet.value.startsWith('xpub')).toBe(true);

      const testnet = await useCase.execute({ walletId: WALLET_ID, format: 'xpub', network: 'testnet' });
      expect(testnet.value.startsWith('tpub')).toBe(true);
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE for single-key wallets', async () => {
      const repo = makeRepo({ kind: 'single-private-key', secret: WIF_SAMPLE });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'xpub', network: 'mainnet' }),
      ).rejects.toMatchObject({ code: 'EXPORT_FORMAT_UNAVAILABLE' });
    });
  });

  // ── missing key ─────────────────────────────────────────────────────────

  describe('execute – missing key', () => {
    it('throws WALLET_NOT_FOUND when the wallet has no stored key', async () => {
      await expect(
        new ExportWalletKeyUseCase(makeRepo(null)).execute({ walletId: WALLET_ID, format: 'mnemonic', network: 'testnet' }),
      ).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });
    });
  });

  // ── passphrase ──────────────────────────────────────────────────────────

  describe('execute – passphrase', () => {
    it('passphrase produces a different xpriv than no passphrase', async () => {
      const repoWith = makeRepo({ kind: 'hd', secret: MNEMONIC, passphrase: 'my-passphrase' });
      const repoNo = makeRepo({ kind: 'hd', secret: MNEMONIC });
      const withPass = await new ExportWalletKeyUseCase(repoWith).execute({ walletId: WALLET_ID, format: 'xpriv', network: 'mainnet' });
      const noPass = await new ExportWalletKeyUseCase(repoNo).execute({ walletId: WALLET_ID, format: 'xpriv', network: 'mainnet' });
      expect(withPass.value).not.toBe(noPass.value);
    });
  });

  // ── export → import round-trip ──────────────────────────────────────────

  describe('export → import round-trip', () => {
    const detector = new WalletImportFormatDetector();

    it('exported mainnet xpriv can be re-imported as mainnet xpriv', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'mainnet',
      });
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpriv');
      expect(detected!.network).toBe('mainnet');
      expect(detected!.canSign).toBe(true);
    });

    it('exported testnet xpriv can be re-imported as testnet xpriv', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'testnet',
      });
      // tprv... detected and normalised to xprv with network=testnet
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpriv');
      expect(detected!.network).toBe('testnet');
      expect(detected!.canSign).toBe(true);
    });

    it('exported mainnet xpub can be re-imported as mainnet watch-only', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'mainnet',
      });
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpub');
      expect(detected!.network).toBe('mainnet');
      expect(detected!.isWatchOnly).toBe(true);
    });

    it('exported testnet xpub can be re-imported as testnet watch-only', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'testnet',
      });
      // tpub... detected and normalised to xpub with network=testnet
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpub');
      expect(detected!.network).toBe('testnet');
      expect(detected!.isWatchOnly).toBe(true);
    });
  });
});
