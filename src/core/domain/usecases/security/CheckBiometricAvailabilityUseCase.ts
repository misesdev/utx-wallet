import type { BiometricAuthProvider, BiometricAvailability } from '../../repositories/BiometricAuthProvider';

export class CheckBiometricAvailabilityUseCase {
  constructor(private readonly provider: BiometricAuthProvider) {}

  execute(): Promise<BiometricAvailability> {
    return this.provider.checkAvailability();
  }
}
