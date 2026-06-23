import type { SyncSettingsRepository } from '../../repositories/SyncSettingsRepository';
import { DEFAULT_SYNC_SETTINGS, type SyncSettings } from '../../entities/SyncSettings';

export class LoadSyncSettingsUseCase {
  constructor(private readonly repo: SyncSettingsRepository) {}

  async execute(): Promise<SyncSettings> {
    return (await this.repo.load()) ?? DEFAULT_SYNC_SETTINGS;
  }
}
