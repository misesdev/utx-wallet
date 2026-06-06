/**
 * Integration: Security Settings Flow
 *
 * Tests: SecurityService → all 7 security use cases → SecuritySettingsRepositoryImpl
 * → SecuritySettingsStorage → InMemorySecureStorage
 * Uses real WebCryptoPinHasher (Node.js crypto.subtle)
 *
 * Real: all security use cases, repository impl, storage, WebCryptoPinHasher
 * Mocked: BiometricAuthProvider (NoopBiometricAuthAdapter), SecureStorage (in-memory)
 */
import { SecurityService } from '../../src/core/application/services/SecurityService';
import { LoadSecuritySettingsUseCase } from '../../src/core/domain/usecases/security/LoadSecuritySettingsUseCase';
import { SaveSecuritySettingsUseCase } from '../../src/core/domain/usecases/security/SaveSecuritySettingsUseCase';
import { SetPinUseCase } from '../../src/core/domain/usecases/security/SetPinUseCase';
import { VerifyPinUseCase } from '../../src/core/domain/usecases/security/VerifyPinUseCase';
import { ClearPinUseCase } from '../../src/core/domain/usecases/security/ClearPinUseCase';
import { CheckBiometricAvailabilityUseCase } from '../../src/core/domain/usecases/security/CheckBiometricAvailabilityUseCase';
import { AuthenticateWithBiometricUseCase } from '../../src/core/domain/usecases/security/AuthenticateWithBiometricUseCase';
import { ReauthenticateUseCase } from '../../src/core/domain/usecases/security/ReauthenticateUseCase';
import { SecuritySettingsRepositoryImpl } from '../../src/core/infrastructure/repositories/SecuritySettingsRepositoryImpl';
import { SecuritySettingsStorage } from '../../src/core/infrastructure/storage/SecuritySettingsStorage';
import { WebCryptoPinHasher } from '../../src/core/infrastructure/adapters/PinHasherAdapter';
import { NoopBiometricAuthAdapter } from '../../src/core/infrastructure/adapters/BiometricAuthAdapter';
import { DEFAULT_SECURITY_SETTINGS } from '../../src/core/domain/entities/SecuritySettings';
import { createSecureStorageMock } from '../mocks/storage';

function makeSetup() {
  const secureStorage = createSecureStorageMock();
  const storage = new SecuritySettingsStorage(secureStorage);
  const repository = new SecuritySettingsRepositoryImpl(storage);
  const hasher = new WebCryptoPinHasher();
  const biometricProvider = new NoopBiometricAuthAdapter();

  const loadSettings = new LoadSecuritySettingsUseCase(repository);
  const saveSettings = new SaveSecuritySettingsUseCase(repository);
  const setPin = new SetPinUseCase(repository, hasher);
  const verifyPin = new VerifyPinUseCase(repository, hasher);
  const clearPin = new ClearPinUseCase(repository);
  const checkBiometric = new CheckBiometricAvailabilityUseCase(biometricProvider);
  const authBiometric = new AuthenticateWithBiometricUseCase(biometricProvider);
  const reauth = new ReauthenticateUseCase(verifyPin, authBiometric);

  const service = new SecurityService(
    loadSettings, saveSettings, setPin, verifyPin, clearPin, checkBiometric, reauth,
  );

  return { service, repository };
}

describe('Integration: Security Settings', () => {
  describe('getSettings', () => {
    it('returns DEFAULT_SECURITY_SETTINGS when nothing is stored', async () => {
      const { service } = makeSetup();
      const settings = await service.getSettings();
      expect(settings).toEqual(DEFAULT_SECURITY_SETTINGS);
    });
  });

  describe('updateSettings', () => {
    it('persists updated settings and retrieves them correctly', async () => {
      const { service } = makeSetup();
      const updated = { ...DEFAULT_SECURITY_SETTINGS, hideBalance: true, pinEnabled: true };

      await service.updateSettings(updated);
      const loaded = await service.getSettings();

      expect(loaded.hideBalance).toBe(true);
      expect(loaded.pinEnabled).toBe(true);
    });

    it('persists autoLockSeconds value', async () => {
      const { service } = makeSetup();
      await service.updateSettings({ ...DEFAULT_SECURITY_SETTINGS, autoLockSeconds: 600 });

      const settings = await service.getSettings();
      expect(settings.autoLockSeconds).toBe(600);
    });

    it('persists blockScreenshots flag', async () => {
      const { service } = makeSetup();
      await service.updateSettings({ ...DEFAULT_SECURITY_SETTINGS, blockScreenshots: false });

      const settings = await service.getSettings();
      expect(settings.blockScreenshots).toBe(false);
    });
  });

  describe('PIN setup & validation', () => {
    it('setupPin stores hashed credentials', async () => {
      const { service, repository } = makeSetup();
      await service.setupPin('1234');

      const credentials = await repository.loadPinCredentials();
      expect(credentials).not.toBeNull();
      expect(typeof credentials!.hash).toBe('string');
      expect(typeof credentials!.salt).toBe('string');
      expect(credentials!.hash.length).toBeGreaterThan(0);
    });

    it('stores a non-plaintext hash (not the PIN itself)', async () => {
      const { service, repository } = makeSetup();
      await service.setupPin('1234');

      const credentials = await repository.loadPinCredentials();
      expect(credentials!.hash).not.toBe('1234');
    });

    it('validatePin returns true for the correct PIN', async () => {
      const { service } = makeSetup();
      await service.setupPin('1234');

      const result = await service.validatePin('1234');
      expect(result).toBe(true);
    });

    it('validatePin returns false for wrong PIN', async () => {
      const { service } = makeSetup();
      await service.setupPin('1234');

      const result = await service.validatePin('0000');
      expect(result).toBe(false);
    });

    it('validatePin returns false when no PIN is set', async () => {
      const { service } = makeSetup();
      const result = await service.validatePin('1234');
      expect(result).toBe(false);
    });

    it('each setupPin call generates a different salt (different hash for same PIN)', async () => {
      const { service, repository } = makeSetup();
      await service.setupPin('9999');
      const cred1 = await repository.loadPinCredentials();

      await service.setupPin('9999');
      const cred2 = await repository.loadPinCredentials();

      expect(cred1!.salt).not.toBe(cred2!.salt);
      // Hashes may differ if salts differ (they will)
    });

    it('validates a longer PIN (8 digits)', async () => {
      const { service } = makeSetup();
      await service.setupPin('12345678');

      expect(await service.validatePin('12345678')).toBe(true);
      expect(await service.validatePin('12345679')).toBe(false);
    });
  });

  describe('PIN format validation', () => {
    it('rejects PIN shorter than 4 digits', async () => {
      const { service } = makeSetup();
      await expect(service.setupPin('123')).rejects.toMatchObject({
        code: 'INVALID_PIN_FORMAT',
      });
    });

    it('rejects PIN longer than 8 digits', async () => {
      const { service } = makeSetup();
      await expect(service.setupPin('123456789')).rejects.toMatchObject({
        code: 'INVALID_PIN_FORMAT',
      });
    });

    it('rejects non-numeric PIN', async () => {
      const { service } = makeSetup();
      await expect(service.setupPin('abcd')).rejects.toMatchObject({
        code: 'INVALID_PIN_FORMAT',
      });
    });

    it('accepts 4-digit PIN', async () => {
      const { service } = makeSetup();
      await expect(service.setupPin('0000')).resolves.not.toThrow();
    });
  });

  describe('removePin', () => {
    it('clears PIN credentials from storage', async () => {
      const { service, repository } = makeSetup();
      await service.setupPin('1234');

      await service.removePin();

      const credentials = await repository.loadPinCredentials();
      expect(credentials).toBeNull();
    });

    it('validatePin returns false after PIN is removed', async () => {
      const { service } = makeSetup();
      await service.setupPin('1234');
      await service.removePin();

      const result = await service.validatePin('1234');
      expect(result).toBe(false);
    });
  });

  describe('reauthenticate', () => {
    it('reauthenticates with correct PIN and returns true', async () => {
      const { service } = makeSetup();
      await service.setupPin('5678');

      const result = await service.reauthenticate('pin', '5678');
      expect(result).toBe(true);
    });

    it('throws INVALID_PIN when wrong PIN is provided', async () => {
      const { service } = makeSetup();
      await service.setupPin('5678');

      await expect(service.reauthenticate('pin', '0000')).rejects.toMatchObject({
        code: 'INVALID_PIN',
      });
    });

    it('throws PIN_REQUIRED when method is pin but no pin provided', async () => {
      const { service } = makeSetup();
      await expect(service.reauthenticate('pin')).rejects.toMatchObject({
        code: 'PIN_REQUIRED',
      });
    });

    it('biometric reauth returns false when biometric is unavailable (noop adapter)', async () => {
      const { service } = makeSetup();
      const result = await service.reauthenticate('biometric');
      expect(result).toBe(false);
    });
  });

  describe('checkBiometricAvailability', () => {
    it('returns available: false with noop adapter', async () => {
      const { service } = makeSetup();
      const availability = await service.checkBiometricAvailability();

      expect(availability.available).toBe(false);
      expect(availability.type).toBe('none');
    });
  });
});
