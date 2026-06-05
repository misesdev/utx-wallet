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
  });

  describe('import()', () => {
    it('creates a wallet and stores the secret in encrypted storage', async () => {
      const { repo, secureStorage } = createRepo();
      const seed = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
      const wallet = await repo.import('Imported', seed);
      expect(wallet.name).toBe('Imported');
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        `wallet_secret:${wallet.id}`,
        seed,
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

    it('throws WALLET_EXISTS when name already in use', async () => {
      const { repo } = createRepo();
      await repo.create('Taken');
      await expect(repo.import('Taken', 'valid secret phrase here')).rejects.toMatchObject({
        code: 'WALLET_EXISTS',
      });
    });

    it('trims whitespace from the secret before storing', async () => {
      const { repo, secureStorage } = createRepo();
      const wallet = await repo.import('W', '  my secret  ');
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        `wallet_secret:${wallet.id}`,
        'my secret',
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
});
