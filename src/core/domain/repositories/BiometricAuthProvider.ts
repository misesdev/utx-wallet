export type BiometricType = 'fingerprint' | 'face-id' | 'none';

export type BiometricAvailability = {
  available: boolean;
  type: BiometricType;
};

export interface BiometricAuthProvider {
  checkAvailability(): Promise<BiometricAvailability>;
  authenticate(reason: string): Promise<boolean>;
}
