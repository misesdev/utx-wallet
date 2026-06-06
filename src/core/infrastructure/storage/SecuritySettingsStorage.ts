import type { SecureStorage } from './SecureStorage';
import type { SecuritySettings } from '../../domain/entities/SecuritySettings';
import { DEFAULT_SECURITY_SETTINGS } from '../../domain/entities/SecuritySettings';

const SECURITY_SETTINGS_KEY = 'security_settings';
const SECURITY_PIN_KEY = 'security_pin_credentials';

function isValidSettings(value: unknown): value is SecuritySettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.pinEnabled === 'boolean' &&
    typeof v.biometricEnabled === 'boolean' &&
    typeof v.autoLockSeconds === 'number' &&
    typeof v.hideBalance === 'boolean' &&
    typeof v.blockScreenshots === 'boolean'
  );
}

export class SecuritySettingsStorage {
  constructor(private readonly storage: SecureStorage) {}

  async load(): Promise<SecuritySettings | null> {
    const raw = await this.storage.getItem(SECURITY_SETTINGS_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSettings(parsed)) return DEFAULT_SECURITY_SETTINGS;
      return parsed;
    } catch {
      return null;
    }
  }

  save(settings: SecuritySettings): Promise<void> {
    return this.storage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(settings));
  }

  savePinCredentials(hash: string, salt: string): Promise<void> {
    return this.storage.setItem(SECURITY_PIN_KEY, JSON.stringify({ hash, salt }));
  }

  async loadPinCredentials(): Promise<{ hash: string; salt: string } | null> {
    const raw = await this.storage.getItem(SECURITY_PIN_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { hash: string; salt: string };
      if (typeof parsed.hash === 'string' && typeof parsed.salt === 'string') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  clearPinCredentials(): Promise<void> {
    return this.storage.removeItem(SECURITY_PIN_KEY);
  }
}
