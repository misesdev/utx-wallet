import type { SecuritySettingsRepository } from '../../domain/repositories/SecuritySettingsRepository';
import type { SecuritySettings } from '../../domain/entities/SecuritySettings';
import type { SecuritySettingsStorage } from '../storage/SecuritySettingsStorage';

export class SecuritySettingsRepositoryImpl implements SecuritySettingsRepository {
  constructor(private readonly storage: SecuritySettingsStorage) {}

  load(): Promise<SecuritySettings | null> {
    return this.storage.load();
  }

  save(settings: SecuritySettings): Promise<void> {
    return this.storage.save(settings);
  }

  savePinCredentials(hash: string, salt: string): Promise<void> {
    return this.storage.savePinCredentials(hash, salt);
  }

  loadPinCredentials(): Promise<{ hash: string; salt: string } | null> {
    return this.storage.loadPinCredentials();
  }

  clearPinCredentials(): Promise<void> {
    return this.storage.clearPinCredentials();
  }
}
