import { SecurityService } from '../../../src/core/application/services/SecurityService';
import { LoadSecuritySettingsUseCase } from '../../../src/core/domain/usecases/security/LoadSecuritySettingsUseCase';
import { SaveSecuritySettingsUseCase } from '../../../src/core/domain/usecases/security/SaveSecuritySettingsUseCase';
import { SetPinUseCase } from '../../../src/core/domain/usecases/security/SetPinUseCase';
import { VerifyPinUseCase } from '../../../src/core/domain/usecases/security/VerifyPinUseCase';
import { ClearPinUseCase } from '../../../src/core/domain/usecases/security/ClearPinUseCase';
import { CheckBiometricAvailabilityUseCase } from '../../../src/core/domain/usecases/security/CheckBiometricAvailabilityUseCase';
import { ReauthenticateUseCase } from '../../../src/core/domain/usecases/security/ReauthenticateUseCase';
import type { SecuritySettings } from '../../../src/core/domain/entities/SecuritySettings';
import { DEFAULT_SECURITY_SETTINGS } from '../../../src/core/domain/entities/SecuritySettings';
import { AppError } from '../../../src/core/application/errors/AppError';

const SETTINGS: SecuritySettings = {
  pinEnabled: true,
  biometricEnabled: false,
  autoLockSeconds: 300,
  hideBalance: false,
  blockScreenshots: true,
};

function makeService(overrides: {
  getSettings?: jest.MockedFn<() => Promise<SecuritySettings>>;
  saveSettings?: jest.MockedFn<(s: SecuritySettings) => Promise<void>>;
  setupPin?: jest.MockedFn<(pin: string) => Promise<void>>;
  validatePin?: jest.MockedFn<(pin: string) => Promise<boolean>>;
  clearPin?: jest.MockedFn<() => Promise<void>>;
  biometricAvailable?: boolean;
  reauthResult?: boolean | Error;
} = {}) {
  const loadUC = { execute: overrides.getSettings ?? jest.fn().mockResolvedValue(DEFAULT_SECURITY_SETTINGS) } as unknown as jest.Mocked<LoadSecuritySettingsUseCase>;
  const saveUC = { execute: overrides.saveSettings ?? jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<SaveSecuritySettingsUseCase>;
  const setPinUC = { execute: overrides.setupPin ?? jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<SetPinUseCase>;
  const verifyPinUC = { execute: overrides.validatePin ?? jest.fn().mockResolvedValue(true) } as unknown as jest.Mocked<VerifyPinUseCase>;
  const clearPinUC = { execute: overrides.clearPin ?? jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<ClearPinUseCase>;

  const available = overrides.biometricAvailable ?? false;
  const checkBioUC = {
    execute: jest.fn().mockResolvedValue({ available, type: available ? 'fingerprint' : 'none' }),
  } as unknown as jest.Mocked<CheckBiometricAvailabilityUseCase>;

  const reauthResult = overrides.reauthResult ?? true;
  const reauthUC = {
    execute: typeof reauthResult === 'boolean'
      ? jest.fn().mockResolvedValue(reauthResult)
      : jest.fn().mockRejectedValue(reauthResult),
  } as unknown as jest.Mocked<ReauthenticateUseCase>;

  return new SecurityService(loadUC, saveUC, setPinUC, verifyPinUC, clearPinUC, checkBioUC, reauthUC);
}

describe('SecurityService', () => {
  describe('ocultar saldo (hideBalance)', () => {
    it('salva configuração com hideBalance=true', async () => {
      const saveSettings = jest.fn().mockResolvedValue(undefined) as jest.MockedFn<(s: SecuritySettings) => Promise<void>>;
      const svc = makeService({ saveSettings });
      await svc.updateSettings({ ...DEFAULT_SECURITY_SETTINGS, hideBalance: true });
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ hideBalance: true }),
      );
    });

    it('salva configuração com hideBalance=false', async () => {
      const saveSettings = jest.fn().mockResolvedValue(undefined) as jest.MockedFn<(s: SecuritySettings) => Promise<void>>;
      const svc = makeService({ saveSettings });
      await svc.updateSettings({ ...SETTINGS, hideBalance: false });
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ hideBalance: false }),
      );
    });
  });

  describe('PIN correto/incorreto', () => {
    it('validatePin retorna true para PIN correto', async () => {
      const svc = makeService({ validatePin: jest.fn().mockResolvedValue(true) });
      await expect(svc.validatePin('1234')).resolves.toBe(true);
    });

    it('validatePin retorna false para PIN incorreto', async () => {
      const svc = makeService({ validatePin: jest.fn().mockResolvedValue(false) });
      await expect(svc.validatePin('9999')).resolves.toBe(false);
    });

    it('setupPin delega ao use case', async () => {
      const setupPin = jest.fn().mockResolvedValue(undefined) as jest.MockedFn<(pin: string) => Promise<void>>;
      const svc = makeService({ setupPin });
      await svc.setupPin('4567');
      expect(setupPin).toHaveBeenCalledWith('4567');
    });

    it('removePin delega ao use case', async () => {
      const clearPin = jest.fn().mockResolvedValue(undefined) as jest.MockedFn<() => Promise<void>>;
      const svc = makeService({ clearPin });
      await svc.removePin();
      expect(clearPin).toHaveBeenCalledTimes(1);
    });
  });

  describe('biometria disponível/indisponível', () => {
    it('checkBiometricAvailability retorna available=true quando biometria disponível', async () => {
      const svc = makeService({ biometricAvailable: true });
      const result = await svc.checkBiometricAvailability();
      expect(result.available).toBe(true);
      expect(result.type).toBe('fingerprint');
    });

    it('checkBiometricAvailability retorna available=false quando biometria indisponível', async () => {
      const svc = makeService({ biometricAvailable: false });
      const result = await svc.checkBiometricAvailability();
      expect(result.available).toBe(false);
      expect(result.type).toBe('none');
    });
  });

  describe('reautenticação obrigatória (reauthenticate)', () => {
    it('reauthenticate com PIN correto retorna true', async () => {
      const svc = makeService({ reauthResult: true });
      await expect(svc.reauthenticate('pin', '1234')).resolves.toBe(true);
    });

    it('reauthenticate com PIN incorreto lança AppError', async () => {
      const svc = makeService({ reauthResult: new AppError('PIN incorreto', 'INVALID_PIN') });
      await expect(svc.reauthenticate('pin', '9999')).rejects.toMatchObject({ code: 'INVALID_PIN' });
    });

    it('reauthenticate com biometria retorna true', async () => {
      const svc = makeService({ reauthResult: true });
      await expect(svc.reauthenticate('biometric')).resolves.toBe(true);
    });

    it('getSettings retorna as configurações do repositório', async () => {
      const svc = makeService({ getSettings: jest.fn().mockResolvedValue(SETTINGS) });
      await expect(svc.getSettings()).resolves.toEqual(SETTINGS);
    });
  });
});
