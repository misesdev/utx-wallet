/**
 * Noop adapter — real biometric auth requires a native module (e.g. react-native-biometrics).
 * Wire up a native implementation here when the module is available.
 */
import type { BiometricAuthProvider, BiometricAvailability } from '../../domain/repositories/BiometricAuthProvider';

export class NoopBiometricAuthAdapter implements BiometricAuthProvider {
  checkAvailability(): Promise<BiometricAvailability> {
    return Promise.resolve({ available: false, type: 'none' });
  }

  authenticate(_reason: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
