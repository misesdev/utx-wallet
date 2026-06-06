import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SettingsScreen } from '../../../src/presentation/screens/settings/SettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockNavigate = jest.fn();

const DEFAULT_NETWORK: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({ networkConfig: DEFAULT_NETWORK }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Settings screen title', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('displays the current network', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    expect(screen.getByText('testnet4')).toBeTruthy();
  });

  it('renders all setting section buttons', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    expect(screen.getByTestId('settings-security')).toBeTruthy();
    expect(screen.getByTestId('settings-network')).toBeTruthy();
    expect(screen.getByTestId('settings-node')).toBeTruthy();
    expect(screen.getByTestId('settings-backup')).toBeTruthy();
    expect(screen.getByTestId('settings-offline')).toBeTruthy();
    expect(screen.getByTestId('settings-safe-mode')).toBeTruthy();
  });

  it('navigates to SecuritySettings when Security is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-security'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.SecuritySettings);
  });

  it('navigates to NetworkSettings when Network is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-network'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.NetworkSettings);
  });

  it('navigates to NodeSettings when Node is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-node'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.NodeSettings);
  });

  it('navigates to BackupSettings when Backup is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-backup'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.BackupSettings);
  });

  it('navigates to OfflineMode when Offline Mode is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-offline'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.OfflineMode);
  });

  it('navigates to SafeMode when Safe Mode is pressed', () => {
    const screen = renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-safe-mode'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.SafeMode);
  });
});
