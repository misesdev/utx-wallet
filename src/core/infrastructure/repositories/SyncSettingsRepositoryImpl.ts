import type { SyncSettingsRepository } from '../../domain/repositories/SyncSettingsRepository';
import type { SyncSettings } from '../../domain/entities/SyncSettings';
import type { SyncSettingsStorage } from '../storage/SyncSettingsStorage';

export class SyncSettingsRepositoryImpl implements SyncSettingsRepository {
  constructor(private readonly storage: SyncSettingsStorage) {}

  load(): Promise<SyncSettings | null> {
    return this.storage.load();
  }

  save(settings: SyncSettings): Promise<void> {
    return this.storage.save(settings);
  }
}
