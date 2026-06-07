import React from 'react';
import { Switch } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { SecuritySettingsScreen } from '../../../src/presentation/screens/settings/SecuritySettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { DEFAULT_SECURITY_SETTINGS } from '../../../src/core/domain/entities/SecuritySettings';
import type { UseSecuritySettingsState } from '../../../src/presentation/hooks/useSecuritySettings';

const mockOpenPinSetup = jest.fn();
const mockOpenPinRemove = jest.fn();
const mockClosePinModal = jest.fn();
const mockSubmitPinStep = jest.fn().mockResolvedValue(undefined);
const mockToggleBiometric = jest.fn().mockResolvedValue(undefined);
const mockSetAutoLock = jest.fn().mockResolvedValue(undefined);
const mockToggleHideBalance = jest.fn().mockResolvedValue(undefined);
const mockToggleBlockScreenshots = jest.fn().mockResolvedValue(undefined);

const BASE_STATE: UseSecuritySettingsState = {
  settings: { ...DEFAULT_SECURITY_SETTINGS },
  biometricAvailable: false,
  isLoading: false,
  isSaving: false,
  error: null,
  pinModalVisible: false,
  pinModalStep: 'none',
  pinError: null,
  openPinSetup: mockOpenPinSetup,
  openPinRemove: mockOpenPinRemove,
  closePinModal: mockClosePinModal,
  submitPinStep: mockSubmitPinStep,
  toggleBiometric: mockToggleBiometric,
  setAutoLock: mockSetAutoLock,
  toggleHideBalance: mockToggleHideBalance,
  toggleBlockScreenshots: mockToggleBlockScreenshots,
};

let mockState: UseSecuritySettingsState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSecuritySettings', () => ({
  useSecuritySettings: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SecuritySettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE, settings: { ...DEFAULT_SECURITY_SETTINGS } };
  });

  describe('Loading state', () => {
    it('renders nothing when isLoading is true', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.queryByText('PIN')).toBeNull();
    });
  });

  describe('PIN section', () => {
    it('renders the PIN toggle row', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.enablePin')).toBeTruthy();
    });

    it('shows "Sem PIN configurado" description when PIN is disabled', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.noPinConfigured')).toBeTruthy();
    });

    it('shows "PIN configurado" description when PIN is enabled', () => {
      mockState = { ...BASE_STATE, settings: { ...DEFAULT_SECURITY_SETTINGS, pinEnabled: true } };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.pinConfigured')).toBeTruthy();
    });

    it('calls openPinSetup when PIN switch is toggled with PIN disabled', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      fireEvent(switches[0], 'valueChange', true);
      expect(mockOpenPinSetup).toHaveBeenCalledTimes(1);
    });

    it('calls openPinRemove when PIN switch is toggled with PIN enabled', () => {
      mockState = { ...BASE_STATE, settings: { ...DEFAULT_SECURITY_SETTINGS, pinEnabled: true } };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      fireEvent(switches[0], 'valueChange', false);
      expect(mockOpenPinRemove).toHaveBeenCalledTimes(1);
    });

    it('shows "Alterar PIN" button when PIN is enabled', () => {
      mockState = { ...BASE_STATE, settings: { ...DEFAULT_SECURITY_SETTINGS, pinEnabled: true } };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.changePin')).toBeTruthy();
    });

    it('does not show "Alterar PIN" button when PIN is disabled', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.queryByText('security.changePin')).toBeNull();
    });
  });

  describe('Biometric section', () => {
    it('does not render biometric section when biometrics are unavailable', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.queryByText('security.biometrics')).toBeNull();
    });

    it('renders biometric section when biometrics are available', () => {
      mockState = { ...BASE_STATE, biometricAvailable: true };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.biometrics')).toBeTruthy();
      expect(screen.getByText('security.enableBiometrics')).toBeTruthy();
    });
  });

  describe('Auto-lock options', () => {
    it('renders the auto-lock section', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.autoLock')).toBeTruthy();
    });

    it('renders lock option for 5 minutes', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('5 minutos')).toBeTruthy();
    });

    it('calls setAutoLock when a lock option is pressed', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      fireEvent.press(screen.getByTestId('lock-option-60'));
      expect(mockSetAutoLock).toHaveBeenCalledWith(60);
    });
  });

  describe('Privacy section', () => {
    it('renders hide balance and block screenshots rows', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByText('security.hideBalance')).toBeTruthy();
      expect(screen.getByText('security.blockScreenshots')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders error message when error is set', () => {
      mockState = { ...BASE_STATE, error: 'Falha ao salvar configurações' };
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.getByTestId('settings-error')).toBeTruthy();
      expect(screen.getByText('Falha ao salvar configurações')).toBeTruthy();
    });

    it('does not render error testID when error is null', () => {
      const screen = renderWithTheme(<SecuritySettingsScreen />);
      expect(screen.queryByTestId('settings-error')).toBeNull();
    });
  });
});
