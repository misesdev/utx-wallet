import ReactNativeBiometrics from 'react-native-biometrics';
import type { BiometricAuthProvider, BiometricAvailability } from '../../domain/repositories/BiometricAuthProvider';

export class NativeBiometricAuthAdapter implements BiometricAuthProvider {
  private readonly rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      if (!available) return { available: false, type: 'none' };
      return {
        available: true,
        type: biometryType === 'FaceID' ? 'face-id' : 'fingerprint',
      };
    } catch {
      return { available: false, type: 'none' };
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Cancelar',
      });
      return success;
    } catch {
      return false;
    }
  }
}

export class NoopBiometricAuthAdapter implements BiometricAuthProvider {
  checkAvailability(): Promise<BiometricAvailability> {
    return Promise.resolve({ available: false, type: 'none' });
  }

  authenticate(_reason: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
