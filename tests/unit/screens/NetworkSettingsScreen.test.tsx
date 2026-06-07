import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { NetworkSettingsScreen } from '../../../src/presentation/screens/settings/NetworkSettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseNetworkSettingsState } from '../../../src/presentation/hooks/useNetworkSettings';

const mockSelectNetwork = jest.fn();
const mockConfirmNetworkChange = jest.fn().mockResolvedValue(undefined);

const BASE_STATE: UseNetworkSettingsState = {
  activeNetwork: 'testnet4',
  pendingNetwork: 'testnet4',
  options: [
    { network: 'mainnet', isActive: false, isWalletCompatible: false },
    { network: 'testnet3', isActive: false, isWalletCompatible: true },
    { network: 'testnet4', isActive: true, isWalletCompatible: true },
  ],
  warning: null,
  error: null,
  isSaving: false,
  selectNetwork: mockSelectNetwork,
  confirmNetworkChange: mockConfirmNetworkChange,
};

let mockState: UseNetworkSettingsState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useNetworkSettings', () => ({
  useNetworkSettings: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('NetworkSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Active network display', () => {
    it('renders the active network name', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      // testnet4 appears in both the active network display and the option buttons
      expect(screen.getAllByText('testnet4').length).toBeGreaterThan(0);
    });

    it('renders "Rede ativa" section label', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('networkSettings.activeNetwork')).toBeTruthy();
    });
  });

  describe('Network option buttons', () => {
    it('renders buttons for all network options', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('mainnet')).toBeTruthy();
      expect(screen.getByText('testnet3')).toBeTruthy();
    });

    it('calls selectNetwork when a network button is pressed', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      fireEvent.press(screen.getByText('testnet3'));
      expect(mockSelectNetwork).toHaveBeenCalledWith('testnet3');
    });
  });

  describe('Warning state', () => {
    it('does not show warning card when warning is null', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.queryByText('networkSettings.incompatibleTitle')).toBeNull();
    });

    it('shows warning card when warning is set', () => {
      mockState = { ...BASE_STATE, warning: 'Trocar a rede atualizará os providers.' };
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('networkSettings.incompatibleTitle')).toBeTruthy();
      expect(screen.getByText('Trocar a rede atualizará os providers.')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('does not show error card when error is null', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.queryByText('networkSettings.incompatibleNetwork')).toBeNull();
    });

    it('shows error card when error is set', () => {
      mockState = { ...BASE_STATE, error: 'A rede selecionada não é compatível com a carteira atual.' };
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('networkSettings.incompatibleNetwork')).toBeTruthy();
    });
  });

  describe('Apply button', () => {
    it('renders apply button', () => {
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('networkSettings.apply')).toBeTruthy();
    });

    it('shows saving text when isSaving is true', () => {
      mockState = { ...BASE_STATE, isSaving: true };
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      expect(screen.getByText('networkSettings.saving')).toBeTruthy();
    });

    it('calls confirmNetworkChange when apply button is pressed', () => {
      mockState = { ...BASE_STATE, pendingNetwork: 'testnet3' };
      const screen = renderWithTheme(<NetworkSettingsScreen />);
      fireEvent.press(screen.getByText('networkSettings.apply'));
      expect(mockConfirmNetworkChange).toHaveBeenCalledTimes(1);
    });
  });
});
