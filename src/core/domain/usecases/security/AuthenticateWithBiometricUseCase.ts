import type { BiometricAuthProvider } from '../../repositories/BiometricAuthProvider';

export class AuthenticateWithBiometricUseCase {
  constructor(private readonly provider: BiometricAuthProvider) {}

  execute(reason: string): Promise<boolean> {
    return this.provider.authenticate(reason);
  }
}
