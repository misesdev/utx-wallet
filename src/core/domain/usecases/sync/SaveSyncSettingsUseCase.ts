import type { SyncSettingsRepository } from '../../repositories/SyncSettingsRepository';
import type { SyncSettings } from '../../entities/SyncSettings';
import { MIN_REQUESTS_PER_SECOND, MAX_REQUESTS_PER_SECOND } from '../../entities/SyncSettings';
import { AppError } from '../../../application/errors/AppError';

export class SaveSyncSettingsUseCase {
  constructor(private readonly repo: SyncSettingsRepository) {}

  async execute(settings: SyncSettings): Promise<void> {
    if (
      settings.maxRequestsPerSecond < MIN_REQUESTS_PER_SECOND ||
      settings.maxRequestsPerSecond > MAX_REQUESTS_PER_SECOND ||
      !Number.isInteger(settings.maxRequestsPerSecond)
    ) {
      throw new AppError(
        `maxRequestsPerSecond must be an integer between ${MIN_REQUESTS_PER_SECOND} and ${MAX_REQUESTS_PER_SECOND}`,
        'INVALID_SYNC_SETTINGS',
      );
    }
    await this.repo.save(settings);
  }
}
