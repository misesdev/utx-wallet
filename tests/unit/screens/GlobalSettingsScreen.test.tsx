import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GlobalSettingsScreen } from '../../../src/presentation/screens/settings/GlobalSettingsScreen';
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

describe('GlobalSettingsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders global settings title and current network', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    expect(screen.getByText('globalSettings.title')).toBeTruthy();
    expect(screen.getByText('globalSettings.scope')).toBeTruthy();
    expect(screen.getByText('testnet4')).toBeTruthy();
  });

  it('renders global setting section buttons', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    expect(screen.getByTestId('global-settings-donation')).toBeTruthy();
    expect(screen.getByTestId('global-settings-language')).toBeTruthy();
    expect(screen.getByTestId('global-settings-security')).toBeTruthy();
    expect(screen.getByTestId('global-settings-network')).toBeTruthy();
    expect(screen.getByTestId('global-settings-node')).toBeTruthy();
    expect(screen.getByTestId('global-settings-offline')).toBeTruthy();
    expect(screen.getByTestId('global-settings-safe-mode')).toBeTruthy();
  });

  it('navigates to donation screen', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    fireEvent.press(screen.getByTestId('global-settings-donation'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Donation);
  });

  it('navigates to global language settings', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    fireEvent.press(screen.getByTestId('global-settings-language'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.LanguageSettings);
  });

  it('navigates to global security settings', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    fireEvent.press(screen.getByTestId('global-settings-security'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.SecuritySettings);
  });

  it('navigates to node settings', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    fireEvent.press(screen.getByTestId('global-settings-node'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.NodeSettings);
  });

  it('navigates to network settings', () => {
    const screen = renderWithTheme(<GlobalSettingsScreen />);
    fireEvent.press(screen.getByTestId('global-settings-network'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.NetworkSettings);
  });
});
