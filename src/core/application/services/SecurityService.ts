import type { SecuritySettings } from '../../domain/entities/SecuritySettings';
import type { BiometricAvailability } from '../../domain/repositories/BiometricAuthProvider';
import { LoadSecuritySettingsUseCase } from '../../domain/usecases/security/LoadSecuritySettingsUseCase';
import { SaveSecuritySettingsUseCase } from '../../domain/usecases/security/SaveSecuritySettingsUseCase';
import { SetPinUseCase } from '../../domain/usecases/security/SetPinUseCase';
import { VerifyPinUseCase } from '../../domain/usecases/security/VerifyPinUseCase';
import { ClearPinUseCase } from '../../domain/usecases/security/ClearPinUseCase';
import { CheckBiometricAvailabilityUseCase } from '../../domain/usecases/security/CheckBiometricAvailabilityUseCase';
import { ReauthenticateUseCase, type ReauthMethod } from '../../domain/usecases/security/ReauthenticateUseCase';

export class SecurityService {
  constructor(
    private readonly loadSettings: LoadSecuritySettingsUseCase,
    private readonly saveSettings: SaveSecuritySettingsUseCase,
    private readonly setPin: SetPinUseCase,
    private readonly verifyPin: VerifyPinUseCase,
    private readonly clearPin: ClearPinUseCase,
    private readonly checkBiometric: CheckBiometricAvailabilityUseCase,
    private readonly reauth: ReauthenticateUseCase,
  ) {}

  getSettings(): Promise<SecuritySettings> {
    return this.loadSettings.execute();
  }

  updateSettings(settings: SecuritySettings): Promise<void> {
    return this.saveSettings.execute(settings);
  }

  setupPin(pin: string): Promise<void> {
    return this.setPin.execute(pin);
  }

  validatePin(pin: string): Promise<boolean> {
    return this.verifyPin.execute(pin);
  }

  removePin(): Promise<void> {
    return this.clearPin.execute();
  }

  checkBiometricAvailability(): Promise<BiometricAvailability> {
    return this.checkBiometric.execute();
  }

  reauthenticate(method: ReauthMethod, pin?: string): Promise<boolean> {
    return this.reauth.execute(method, pin);
  }
}
