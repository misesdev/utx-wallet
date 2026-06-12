import ReactNativeBiometrics from 'react-native-biometrics';
import { NativeBiometricAuthAdapter, NoopBiometricAuthAdapter } from '../../../src/core/infrastructure/adapters/BiometricAuthAdapter';

jest.mock('react-native-biometrics');
const MockBiometrics = ReactNativeBiometrics as jest.MockedClass<typeof ReactNativeBiometrics>;

function makeMockInstance(overrides: Partial<{
  isSensorAvailable: () => Promise<unknown>;
  simplePrompt: () => Promise<unknown>;
}> = {}) {
  const instance = {
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: false })),
    simplePrompt: jest.fn(() => Promise.resolve({ success: false })),
    ...overrides,
  };
  MockBiometrics.mockImplementation(() => instance as unknown as ReactNativeBiometrics);
  return instance;
}

describe('NativeBiometricAuthAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('returns available=false when sensor not available', async () => {
      makeMockInstance({ isSensorAvailable: () => Promise.resolve({ available: false }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.checkAvailability();
      expect(result).toEqual({ available: false, type: 'none' });
    });

    it('returns fingerprint type when biometryType is TouchID', async () => {
      makeMockInstance({ isSensorAvailable: () => Promise.resolve({ available: true, biometryType: 'TouchID' }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.checkAvailability();
      expect(result).toEqual({ available: true, type: 'fingerprint' });
    });

    it('returns fingerprint type when biometryType is Biometrics (Android)', async () => {
      makeMockInstance({ isSensorAvailable: () => Promise.resolve({ available: true, biometryType: 'Biometrics' }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.checkAvailability();
      expect(result).toEqual({ available: true, type: 'fingerprint' });
    });

    it('returns face-id type when biometryType is FaceID', async () => {
      makeMockInstance({ isSensorAvailable: () => Promise.resolve({ available: true, biometryType: 'FaceID' }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.checkAvailability();
      expect(result).toEqual({ available: true, type: 'face-id' });
    });

    it('returns available=false and type=none when native call throws', async () => {
      makeMockInstance({ isSensorAvailable: () => Promise.reject(new Error('native error')) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.checkAvailability();
      expect(result).toEqual({ available: false, type: 'none' });
    });
  });

  describe('authenticate', () => {
    it('returns true when simplePrompt succeeds', async () => {
      makeMockInstance({ simplePrompt: () => Promise.resolve({ success: true }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.authenticate('Authenticate');
      expect(result).toBe(true);
    });

    it('returns false when user cancels (success=false)', async () => {
      makeMockInstance({ simplePrompt: () => Promise.resolve({ success: false }) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.authenticate('Authenticate');
      expect(result).toBe(false);
    });

    it('returns false when native call throws (biometric hardware failure)', async () => {
      makeMockInstance({ simplePrompt: () => Promise.reject(new Error('hw error')) });
      const adapter = new NativeBiometricAuthAdapter();
      const result = await adapter.authenticate('Authenticate');
      expect(result).toBe(false);
    });

    it('passes the reason string to simplePrompt', async () => {
      const promptMock = jest.fn(() => Promise.resolve({ success: true }));
      const instance = {
        isSensorAvailable: jest.fn(() => Promise.resolve({ available: false })),
        simplePrompt: promptMock,
      };
      MockBiometrics.mockImplementation(() => instance as unknown as ReactNativeBiometrics);
      const adapter = new NativeBiometricAuthAdapter();
      await adapter.authenticate('Confirm your identity');
      expect(promptMock).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: 'Confirm your identity' }),
      );
    });
  });
});

describe('NoopBiometricAuthAdapter', () => {
  it('checkAvailability always returns not available', async () => {
    const adapter = new NoopBiometricAuthAdapter();
    const result = await adapter.checkAvailability();
    expect(result).toEqual({ available: false, type: 'none' });
  });

  it('authenticate always returns false', async () => {
    const adapter = new NoopBiometricAuthAdapter();
    const result = await adapter.authenticate('any reason');
    expect(result).toBe(false);
  });
});
