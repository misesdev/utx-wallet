import { SyncSettingsStorage } from '../../../src/core/infrastructure/storage/SyncSettingsStorage';
import { createSecureStorageMock } from '../../mocks/storage';
import { DEFAULT_SYNC_SETTINGS } from '../../../src/core/domain/entities/SyncSettings';
import type { SyncSettings } from '../../../src/core/domain/entities/SyncSettings';

const VALID_SETTINGS: SyncSettings = {
  maxRequestsPerSecond: 5,
  parallelSync: true,
};

describe('SyncSettingsStorage', () => {
  it('returns null when storage is empty', async () => {
    const storage = new SyncSettingsStorage(createSecureStorageMock());
    await expect(storage.load()).resolves.toBeNull();
  });

  it('saves and loads settings round-trip', async () => {
    const storage = new SyncSettingsStorage(createSecureStorageMock());
    await storage.save(VALID_SETTINGS);
    await expect(storage.load()).resolves.toEqual(VALID_SETTINGS);
  });

  it('saves and loads minimum valid settings', async () => {
    const storage = new SyncSettingsStorage(createSecureStorageMock());
    const minSettings: SyncSettings = { maxRequestsPerSecond: 1, parallelSync: false };
    await storage.save(minSettings);
    await expect(storage.load()).resolves.toEqual(minSettings);
  });

  it('saves and loads maximum valid settings', async () => {
    const storage = new SyncSettingsStorage(createSecureStorageMock());
    const maxSettings: SyncSettings = { maxRequestsPerSecond: 20, parallelSync: true };
    await storage.save(maxSettings);
    await expect(storage.load()).resolves.toEqual(maxSettings);
  });

  it('returns defaults when stored JSON is invalid', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('sync_settings', '{{not json}}');
    const storage = new SyncSettingsStorage(mock);
    await expect(storage.load()).resolves.toBeNull();
  });

  it('returns defaults when stored object is missing required fields', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('sync_settings', JSON.stringify({ maxRequestsPerSecond: 5 }));
    const storage = new SyncSettingsStorage(mock);
    await expect(storage.load()).resolves.toEqual(DEFAULT_SYNC_SETTINGS);
  });

  it('returns defaults when rps is out of range', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('sync_settings', JSON.stringify({ maxRequestsPerSecond: 0, parallelSync: false }));
    const storage = new SyncSettingsStorage(mock);
    await expect(storage.load()).resolves.toEqual(DEFAULT_SYNC_SETTINGS);
  });

  it('returns defaults when rps is not an integer', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('sync_settings', JSON.stringify({ maxRequestsPerSecond: 2.5, parallelSync: false }));
    const storage = new SyncSettingsStorage(mock);
    await expect(storage.load()).resolves.toEqual(DEFAULT_SYNC_SETTINGS);
  });

  it('returns defaults when parallelSync is not a boolean', async () => {
    const mock = createSecureStorageMock();
    await mock.setItem('sync_settings', JSON.stringify({ maxRequestsPerSecond: 2, parallelSync: 'yes' }));
    const storage = new SyncSettingsStorage(mock);
    await expect(storage.load()).resolves.toEqual(DEFAULT_SYNC_SETTINGS);
  });
});
