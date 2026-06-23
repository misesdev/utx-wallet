import { WalletRepositoryImpl } from '../../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletStorage } from '../../../src/core/infrastructure/storage/WalletStorage';
import { WalletKeyStorage } from '../../../src/core/infrastructure/storage/WalletKeyStorage';
import { AppError } from '../../../src/core/application/errors/AppError';
import { createSecureStorageMock } from '../../mocks/storage';

function createRepo() {
  const secureStorage = createSecureStorageMock();
  const repo = new WalletRepositoryImpl(
    new WalletStorage(secureStorage),
    new WalletKeyStorage(secureStorage),
  );
  return { repo, secureStorage };
}

describe('WalletRepositoryImpl', () => {
  describe('create()', () => {
    it('creates a wallet with the given name', async () => {
      const { repo } = createRepo();
      const wallet = await repo.create('Primary');
      expect(wallet.name).toBe('Primary');
      expect(wallet.status).toBe('locked');
      expect(wallet.network).toBe('testnet4');
    });

    it('generates a non-empty unique ID', async () => {
      const { repo } = createRepo();
      const w1 = await repo.create('A');
      const w2 = await repo.create('B');
      expect(w1.id).toBeTruthy();
      expect(w1.id).not.toBe(w2.id);
    });

    it('persists wallet so list() returns it', async () => {
      const { repo } = createRepo();
      await repo.create('Mine');
      const list = await repo.list();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Mine');
    });

    it('throws WALLET_EXISTS when name is duplicated', async () => {
      const { repo } = createRepo();
      await repo.create('Dup');
      await expect(repo.create('Dup')).rejects.toMatchObject({
        code: 'WALLET_EXISTS',
      });
      await expect(repo.create('Dup')).rejects.toThrow(AppError);
    });

    it('serializes concurrent create() calls — both wallets are preserved', async () => {
      const { repo } = createRepo();
      await Promise.all([repo.create('Wallet A'), repo.create('Wallet B')]);
      const all = await repo.list();
      expect(all).toHaveLength(2);
      expect(all.map(w => w.name)).toContain('Wallet A');
      expect(all.map(w => w.name)).toContain('Wallet B');
    });

    it('stores a generated mnemonic in encrypted storage', async () => {
      const { repo, secureStorage } = createRepo();
      const wallet = await repo.create('MnemonicTest');
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        `wallet_secret:${wallet.id}`,
        expect.stringMatching(/^(\w+ ){11}\w+$/),
      );
    });
  });

  describe('import()', () => {
    // Standard BIP39 test mnemonic (all-zeros entropy)
    const VALID_MNEMONIC =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    it('creates a wallet and stores the secret in encrypted storage', async () => {
      const { repo, secureStorage } = createRepo();
      const wallet = await repo.import('Imported', VALID_MNEMONIC);
      expect(wallet.name).toBe('Imported');
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        `wallet_secret:${wallet.id}`,
        VALID_MNEMONIC,
      );
    });

    it('throws INVALID_SECRET when secret is empty', async () => {
      const { repo } = createRepo();
      await expect(repo.import('W', '')).rejects.toMatchObject({ code: 'INVALID_SECRET' });
    });

    it('throws INVALID_SECRET when secret is only whitespace', async () => {
      const { repo } = createRepo();
      await expect(repo.import('W', '   ')).rejects.toMatchObject({ code: 'INVALID_SECRET' });
    });

    it('throws INVALID_SECRET for an invalid mnemonic phrase', async () => {
      const { repo } = createRepo();
      await expect(repo.import('W', 'not a valid bip39 mnemonic phrase at all here')).rejects.toMatchObject({
        code: 'INVALID_SECRET',
      });
    });

    it('throws WALLET_EXISTS when name already in use', async () => {
      const { repo } = createRepo();
      await repo.create('Taken');
      await expect(repo.import('Taken', VALID_MNEMONIC)).rejects.toMatchObject({
        code: 'WALLET_EXISTS',
      });
    });

    it('trims whitespace from the secret before storing', async () => {
      const { repo, secureStorage } = createRepo();
      const wallet = await repo.import('W', `  ${VALID_MNEMONIC}  `);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        `wallet_secret:${wallet.id}`,
        VALID_MNEMONIC,
      );
    });
  });

  describe('list()', () => {
    it('returns all created wallets', async () => {
      const { repo } = createRepo();
      await repo.create('A');
      await repo.create('B');
      await expect(repo.list()).resolves.toHaveLength(2);
    });

    it('returns empty array when no wallets exist', async () => {
      const { repo } = createRepo();
      await expect(repo.list()).resolves.toEqual([]);
    });
  });

  describe('findById()', () => {
    it('returns the wallet with matching id', async () => {
      const { repo } = createRepo();
      const created = await repo.create('FindMe');
      const found = await repo.findById(created.id);
      expect(found?.name).toBe('FindMe');
    });

    it('returns null for an unknown id', async () => {
      const { repo } = createRepo();
      await expect(repo.findById('nonexistent-id')).resolves.toBeNull();
    });
  });

  describe('delete()', () => {
    it('removes the wallet from the list', async () => {
      const { repo } = createRepo();
      const wallet = await repo.create('ToDelete');
      await repo.delete(wallet.id);
      await expect(repo.list()).resolves.toHaveLength(0);
    });

    it('removes the associated secret from storage', async () => {
      const { repo, secureStorage } = createRepo();
      const wallet = await repo.create('ToDelete');
      await repo.delete(wallet.id);
      expect(secureStorage.removeItem).toHaveBeenCalledWith(`wallet_secret:${wallet.id}`);
    });

    it('throws WALLET_NOT_FOUND when the wallet does not exist', async () => {
      const { repo } = createRepo();
      await expect(repo.delete('nonexistent-id')).rejects.toMatchObject({
        code: 'WALLET_NOT_FOUND',
      });
    });

    it('does not affect other wallets', async () => {
      const { repo } = createRepo();
      const a = await repo.create('A');
      await repo.create('B');
      await repo.delete(a.id);
      const remaining = await repo.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('B');
    });
  });
});
