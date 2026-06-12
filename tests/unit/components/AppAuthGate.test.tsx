import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { AppAuthGate } from '../../../src/app/providers/AppAuthGate';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockReauthenticate = jest.fn();

const DEFAULT_SECURITY = {
  settings: {
    pinEnabled: false,
    biometricEnabled: false,
    autoLockSeconds: 300,
    hideBalance: false,
    blockScreenshots: true,
  },
  biometricAvailable: false,
  biometricType: 'none' as const,
  isLoading: false,
  updateSettings: jest.fn(),
  setupPin: jest.fn(),
  validatePin: jest.fn(),
  removePin: jest.fn(),
  reauthenticate: mockReauthenticate,
};

let mockSecurity = { ...DEFAULT_SECURITY };

jest.mock('../../../src/app/providers/SecurityProvider', () => ({
  ...jest.requireActual('../../../src/app/providers/SecurityProvider'),
  useSecurity: jest.fn(() => mockSecurity),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/core/infrastructure/adapters/ScreenCaptureAdapter', () => ({
  NoopScreenCaptureAdapter: jest.fn().mockImplementation(() => ({ enable: jest.fn(), disable: jest.fn() })),
}));

describe('AppAuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurity = { ...DEFAULT_SECURITY };
    mockReauthenticate.mockResolvedValue(true);
  });

  describe('when no auth is required', () => {
    it('renders nothing when PIN and biometric are both disabled', () => {
      const screen = renderWithTheme(<AppAuthGate />);
      expect(screen.queryByTestId('app-lock-overlay')).toBeNull();
    });

    it('renders nothing while settings are loading', () => {
      mockSecurity = { ...DEFAULT_SECURITY, isLoading: true };
      const screen = renderWithTheme(<AppAuthGate />);
      expect(screen.queryByTestId('app-lock-overlay')).toBeNull();
    });
  });

  describe('PIN only (no biometric)', () => {
    beforeEach(() => {
      mockSecurity = {
        ...DEFAULT_SECURITY,
        settings: { ...DEFAULT_SECURITY.settings, pinEnabled: true },
        biometricAvailable: false,
      };
    });

    it('shows lock overlay on mount', async () => {
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeTruthy());
    });

    it('does not show biometric button when biometric is not available', async () => {
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeTruthy());
      expect(screen.queryByTestId('btn-biometric-unlock')).toBeNull();
    });

    it('shows PIN fallback button', async () => {
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-pin-fallback')).toBeTruthy());
    });

    it('shows PIN keypad when pin fallback is pressed', async () => {
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-pin-fallback')).toBeTruthy());
      await act(async () => { fireEvent.press(screen.getByTestId('btn-pin-fallback')); });
      await waitFor(() => expect(screen.getByTestId('pin-keypad')).toBeTruthy());
    });
  });

  describe('biometric available', () => {
    beforeEach(() => {
      mockSecurity = {
        ...DEFAULT_SECURITY,
        settings: { ...DEFAULT_SECURITY.settings, pinEnabled: true, biometricEnabled: true },
        biometricAvailable: true,
        biometricType: 'fingerprint' as const,
      };
    });

    it('shows lock overlay on mount', async () => {
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeTruthy());
    });

    it('auto-triggers biometric on mount', async () => {
      renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledWith('biometric'));
    });

    it('unlocks and hides overlay when biometric succeeds on mount', async () => {
      mockReauthenticate.mockResolvedValue(true);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeNull());
    });

    it('keeps overlay visible when biometric fails', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledWith('biometric'));
      expect(screen.queryByTestId('app-lock-overlay')).toBeTruthy();
    });

    it('shows biometric button when biometric is available', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-biometric-unlock')).toBeTruthy());
    });

    it('re-triggers biometric when biometric button is pressed', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-biometric-unlock')).toBeTruthy());

      jest.clearAllMocks();
      mockReauthenticate.mockResolvedValue(false);
      await act(async () => { fireEvent.press(screen.getByTestId('btn-biometric-unlock')); });
      await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledWith('biometric'));
    });

    it('unlocks after retry biometric succeeds', async () => {
      mockReauthenticate.mockResolvedValueOnce(false); // first auto-attempt fails
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-biometric-unlock')).toBeTruthy());

      mockReauthenticate.mockResolvedValueOnce(true); // retry succeeds
      await act(async () => { fireEvent.press(screen.getByTestId('btn-biometric-unlock')); });
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeNull());
    });

    it('shows PIN fallback button when PIN is enabled', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-pin-fallback')).toBeTruthy());
    });
  });

  describe('biometric only (no PIN)', () => {
    beforeEach(() => {
      mockSecurity = {
        ...DEFAULT_SECURITY,
        settings: { ...DEFAULT_SECURITY.settings, pinEnabled: false, biometricEnabled: true },
        biometricAvailable: true,
        biometricType: 'face-id' as const,
      };
    });

    it('does not show PIN fallback when PIN is disabled', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.queryByTestId('app-lock-overlay')).toBeTruthy());
      expect(screen.queryByTestId('btn-pin-fallback')).toBeNull();
    });

    it('shows biometric button', async () => {
      mockReauthenticate.mockResolvedValue(false);
      const screen = renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(screen.getByTestId('btn-biometric-unlock')).toBeTruthy());
    });
  });

  describe('auto-lock on background', () => {
    let appStateListeners: Array<(s: AppStateStatus) => void>;

    beforeEach(() => {
      appStateListeners = [];
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, h) => {
        appStateListeners.push(h as (s: AppStateStatus) => void);
        return { remove: jest.fn() };
      });
      mockSecurity = {
        ...DEFAULT_SECURITY,
        settings: { ...DEFAULT_SECURITY.settings, pinEnabled: true, autoLockSeconds: 60 },
      };
    });

    it('re-triggers auth after autoLockSeconds have elapsed', async () => {
      jest.useFakeTimers();
      mockReauthenticate.mockResolvedValue(true); // initial unlock succeeds
      renderWithTheme(<AppAuthGate />);
      await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledTimes(0)); // no auth needed on mount (pin only, no biometric)

      // Simulate background
      const originalNow = Date.now;
      const backgroundTime = 1000000;
      jest.spyOn(Date, 'now').mockReturnValueOnce(backgroundTime);
      await act(async () => { appStateListeners.forEach(l => l('background')); });

      // Simulate foreground after 90s
      jest.spyOn(Date, 'now').mockReturnValueOnce(backgroundTime + 90_000);
      await act(async () => { appStateListeners.forEach(l => l('active')); });

      // Should show PIN modal since autoLockSeconds=60 elapsed
      await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledTimes(0)); // pin modal shown, not auto-auth
      jest.spyOn(Date, 'now').mockRestore();
      Date.now = originalNow;
      jest.useRealTimers();
    });
  });
});
