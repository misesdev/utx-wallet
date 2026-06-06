import type { SecuritySettings } from '../entities/SecuritySettings';

export interface SecuritySettingsRepository {
  load(): Promise<SecuritySettings | null>;
  save(settings: SecuritySettings): Promise<void>;
  savePinCredentials(hash: string, salt: string): Promise<void>;
  loadPinCredentials(): Promise<{ hash: string; salt: string } | null>;
  clearPinCredentials(): Promise<void>;
}
