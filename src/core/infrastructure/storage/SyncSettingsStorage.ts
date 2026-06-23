import type { SecureStorage } from './SecureStorage';
import type { SyncSettings } from '../../domain/entities/SyncSettings';
import { DEFAULT_SYNC_SETTINGS, MIN_REQUESTS_PER_SECOND, MAX_REQUESTS_PER_SECOND } from '../../domain/entities/SyncSettings';

const SYNC_SETTINGS_KEY = 'sync_settings';

function isValidSettings(value: unknown): value is SyncSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.maxRequestsPerSecond === 'number' &&
    Number.isInteger(v.maxRequestsPerSecond) &&
    v.maxRequestsPerSecond >= MIN_REQUESTS_PER_SECOND &&
    v.maxRequestsPerSecond <= MAX_REQUESTS_PER_SECOND &&
    typeof v.parallelSync === 'boolean'
  );
}

export class SyncSettingsStorage {
  constructor(private readonly storage: SecureStorage) {}

  async load(): Promise<SyncSettings | null> {
    const raw = await this.storage.getItem(SYNC_SETTINGS_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSettings(parsed)) return DEFAULT_SYNC_SETTINGS;
      return parsed;
    } catch {
      return null;
    }
  }

  save(settings: SyncSettings): Promise<void> {
    return this.storage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
  }
}
