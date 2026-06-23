import type { SyncSettings } from '../entities/SyncSettings';

export interface SyncSettingsRepository {
  load(): Promise<SyncSettings | null>;
  save(settings: SyncSettings): Promise<void>;
}
