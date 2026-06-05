import { WalletStorage } from '../../../src/core/infrastructure/storage/WalletStorage';
import { createSecureStorageMock } from '../../mocks/storage';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const validWallet: Wallet = {
  id: 'w-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

describe('WalletStorage', () => {
  it('returns empty array when storage is empty', async () => {
    const storage = new WalletStorage(createSecureStorageMock());
    await expect(storage.load()).resolves.toEqual([]);
  });

  it('saves and loads a wallet round-trip', async () => {
    const storage = new WalletStorage(createSecureStorageMock());
    await storage.save([validWallet]);
    await expect(storage.load()).resolves.toEqual([validWallet]);
  });

  it('saves and loads multiple wallets', async () => {
    const storage = new WalletStorage(createSecureStorageMock());
    const second: Wallet = { ...validWallet, id: 'w-2', name: 'Secondary' };
    await storage.save([validWallet, second]);
    const loaded = await storage.load();
    expect(loaded).toHaveLength(2);
  });

  it('filters out entries missing required fields', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('wallets', JSON.stringify([validWallet, { broken: true }, { id: 123 }]));
    const storage = new WalletStorage(mock);
    const loaded = await storage.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('w-1');
  });

  it('returns empty array when stored value is not a JSON array', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('wallets', JSON.stringify({ not: 'an array' }));
    const storage = new WalletStorage(mock);
    await expect(storage.load()).resolves.toEqual([]);
  });

  it('returns empty array when stored value is invalid JSON', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('wallets', '{{invalid json}}');
    const storage = new WalletStorage(mock);
    await expect(storage.load()).resolves.toEqual([]);
  });
});
