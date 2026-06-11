import { ExportWalletKeyUseCase } from '../../../src/core/domain/usecases/wallet/ExportWalletKeyUseCase';
import { WalletImportFormatDetector } from '../../../src/core/domain/services/WalletImportFormatDetector';
import { HDWallet } from 'bitcoin-tx-lib';
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

    it('returns xpriv/xpub for HD wallets stored as native tprv (testnet)', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'tprv8ZgxMBicQKsPd' }); // dummy tprv prefix
      const useCase = new ExportWalletKeyUseCase(repo);
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual(['xpriv', 'xpub']);
    });

    it('returns xpriv/xpub for HD wallets stored as native vprv (BIP84 testnet)', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'vprv9DMUxX4ShgxML' }); // dummy vprv prefix
      const useCase = new ExportWalletKeyUseCase(repo);
      expect(await useCase.getAvailableFormats(WALLET_ID)).toEqual(['xpriv', 'xpub']);
    });

    it('returns xpub only for watch-only (zpub) wallets', async () => {
      const repo = makeRepo({ kind: 'hd', secret: 'zpub6rFR7y4Q2AijBE' }); // dummy zpub prefix
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
      const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
      const zpub = wallet.getXPub();
      const repo = makeRepo({ kind: 'hd', secret: zpub });
      await expect(
        new ExportWalletKeyUseCase(repo).execute({ walletId: WALLET_ID, format: 'mnemonic', network: 'mainnet' }),
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

  // ── xpriv export ────────────────────────────────────────────────────────
  // bitcoin-tx-lib 2.x returns BIP84 version bytes: zprv (mainnet) / vprv (testnet)

  describe('execute – xpriv', () => {
    it('exports zprv... for mainnet BIP84 mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'mainnet',
      });
      expect(result.format).toBe('xpriv');
      expect(result.value.startsWith('zprv')).toBe(true);
    });

    it('exports vprv... for testnet BIP84 mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'testnet',
      });
      expect(result.format).toBe('xpriv');
      expect(result.value.startsWith('vprv')).toBe(true);
    });

    it('throws EXPORT_FORMAT_UNAVAILABLE when secret is a zpub (watch-only)', async () => {
      const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
      const zpub = wallet.getXPub();
      const repo = makeRepo({ kind: 'hd', secret: zpub });
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

    it('wallet stored as native vprv exports its vprv', async () => {
      const { wallet: bip84 } = HDWallet.import(MNEMONIC, undefined, { network: 'testnet', purpose: 84 });
      const vprv = bip84.getXPriv();
      expect(vprv.startsWith('vprv')).toBe(true);

      const repo = makeRepo({ kind: 'hd', secret: vprv });
      const result = await new ExportWalletKeyUseCase(repo).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'testnet',
      });
      expect(result.value.startsWith('vprv')).toBe(true);
    });
  });

  // ── xpub export ─────────────────────────────────────────────────────────
  // bitcoin-tx-lib 2.x returns BIP84 version bytes: zpub (mainnet) / vpub (testnet)

  describe('execute – xpub', () => {
    it('exports zpub... for mainnet BIP84 mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'mainnet',
      });
      expect(result.format).toBe('xpub');
      expect(result.value.startsWith('zpub')).toBe(true);
    });

    it('exports vpub... for testnet BIP84 mnemonic wallet', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'testnet',
      });
      expect(result.format).toBe('xpub');
      expect(result.value.startsWith('vpub')).toBe(true);
    });

    it('watch-only wallet stored as native zpub exports zpub', async () => {
      const { wallet: bip84 } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
      const zpub = bip84.getXPub();
      expect(zpub.startsWith('zpub')).toBe(true);

      const repo = makeRepo({ kind: 'hd', secret: zpub });
      const result = await new ExportWalletKeyUseCase(repo).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'mainnet',
      });
      expect(result.value.startsWith('zpub')).toBe(true);
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

    it('exported mainnet xpriv (zprv) can be re-imported as mainnet xpriv', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'mainnet',
      });
      expect(result.value.startsWith('zprv')).toBe(true);
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpriv');
      expect(detected!.network).toBe('mainnet');
      expect(detected!.canSign).toBe(true);
    });

    it('exported testnet xpriv (vprv) can be re-imported as testnet xpriv', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpriv', network: 'testnet',
      });
      expect(result.value.startsWith('vprv')).toBe(true);
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpriv');
      expect(detected!.network).toBe('testnet');
      expect(detected!.canSign).toBe(true);
    });

    it('exported mainnet xpub (zpub) can be re-imported as mainnet watch-only', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'mainnet',
      });
      expect(result.value.startsWith('zpub')).toBe(true);
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpub');
      expect(detected!.network).toBe('mainnet');
      expect(detected!.isWatchOnly).toBe(true);
    });

    it('exported testnet xpub (vpub) can be re-imported as testnet watch-only', async () => {
      const result = await new ExportWalletKeyUseCase(makeRepo()).execute({
        walletId: WALLET_ID, format: 'xpub', network: 'testnet',
      });
      expect(result.value.startsWith('vpub')).toBe(true);
      const detected = detector.detect(result.value);
      expect(detected).not.toBeNull();
      expect(detected!.format).toBe('xpub');
      expect(detected!.network).toBe('testnet');
      expect(detected!.isWatchOnly).toBe(true);
    });
  });
});
