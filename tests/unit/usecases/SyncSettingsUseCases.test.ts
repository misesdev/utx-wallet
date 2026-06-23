import { LoadSyncSettingsUseCase } from '../../../src/core/domain/usecases/sync/LoadSyncSettingsUseCase';
import { SaveSyncSettingsUseCase } from '../../../src/core/domain/usecases/sync/SaveSyncSettingsUseCase';
import type { SyncSettingsRepository } from '../../../src/core/domain/repositories/SyncSettingsRepository';
import type { SyncSettings } from '../../../src/core/domain/entities/SyncSettings';
import { DEFAULT_SYNC_SETTINGS } from '../../../src/core/domain/entities/SyncSettings';

const SETTINGS: SyncSettings = {
  maxRequestsPerSecond: 5,
  parallelSync: true,
};

function makeRepo(stored: SyncSettings | null = null): jest.Mocked<SyncSettingsRepository> {
  return {
    load: jest.fn().mockResolvedValue(stored),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

describe('LoadSyncSettingsUseCase', () => {
  it('returns stored settings when they exist', async () => {
    const uc = new LoadSyncSettingsUseCase(makeRepo(SETTINGS));
    expect(await uc.execute()).toEqual(SETTINGS);
  });

  it('returns defaults when nothing is stored', async () => {
    const uc = new LoadSyncSettingsUseCase(makeRepo(null));
    expect(await uc.execute()).toEqual(DEFAULT_SYNC_SETTINGS);
  });
});

describe('SaveSyncSettingsUseCase', () => {
  it('delegates to the repository with the given settings', async () => {
    const repo = makeRepo();
    const uc = new SaveSyncSettingsUseCase(repo);
    await uc.execute(SETTINGS);
    expect(repo.save).toHaveBeenCalledWith(SETTINGS);
  });

  it('saves the minimum allowed RPS (1)', async () => {
    const repo = makeRepo();
    const uc = new SaveSyncSettingsUseCase(repo);
    await uc.execute({ maxRequestsPerSecond: 1, parallelSync: false });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('saves the maximum allowed RPS (20)', async () => {
    const repo = makeRepo();
    const uc = new SaveSyncSettingsUseCase(repo);
    await uc.execute({ maxRequestsPerSecond: 20, parallelSync: false });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('throws INVALID_SYNC_SETTINGS when RPS is 0', async () => {
    const uc = new SaveSyncSettingsUseCase(makeRepo());
    await expect(uc.execute({ maxRequestsPerSecond: 0, parallelSync: false })).rejects.toMatchObject({
      code: 'INVALID_SYNC_SETTINGS',
    });
  });

  it('throws INVALID_SYNC_SETTINGS when RPS exceeds maximum', async () => {
    const uc = new SaveSyncSettingsUseCase(makeRepo());
    await expect(uc.execute({ maxRequestsPerSecond: 21, parallelSync: false })).rejects.toMatchObject({
      code: 'INVALID_SYNC_SETTINGS',
    });
  });

  it('throws INVALID_SYNC_SETTINGS when RPS is not an integer', async () => {
    const uc = new SaveSyncSettingsUseCase(makeRepo());
    await expect(uc.execute({ maxRequestsPerSecond: 1.5, parallelSync: false })).rejects.toMatchObject({
      code: 'INVALID_SYNC_SETTINGS',
    });
  });

  it('does not call repository.save when validation fails', async () => {
    const repo = makeRepo();
    const uc = new SaveSyncSettingsUseCase(repo);
    await expect(uc.execute({ maxRequestsPerSecond: 0, parallelSync: false })).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
