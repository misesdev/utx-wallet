import { AppError } from '../../../application/errors/AppError';
import type { VerifyPinUseCase } from './VerifyPinUseCase';
import type { AuthenticateWithBiometricUseCase } from './AuthenticateWithBiometricUseCase';

export type ReauthMethod = 'pin' | 'biometric';

export class ReauthenticateUseCase {
  constructor(
    private readonly verifyPin: VerifyPinUseCase,
    private readonly authenticateWithBiometric: AuthenticateWithBiometricUseCase,
  ) {}

  async execute(method: ReauthMethod, pin?: string): Promise<boolean> {
    if (method === 'biometric') {
      return this.authenticateWithBiometric.execute('Confirme sua identidade para continuar');
    }
    if (!pin) {
      throw new AppError('PIN obrigatório', 'PIN_REQUIRED');
    }
    const ok = await this.verifyPin.execute(pin);
    if (!ok) {
      throw new AppError('PIN incorreto', 'INVALID_PIN');
    }
    return true;
  }
}
