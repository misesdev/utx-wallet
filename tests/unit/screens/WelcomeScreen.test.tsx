import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { WelcomeScreen } from '../../../src/presentation/screens/auth/WelcomeScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AuthRoutes } from '../../../src/app/navigation/routes';

const mockNavigate = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' },
    isOnline: true,
    setNetworkConfig: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('WelcomeScreen', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders the create wallet button', () => {
    const screen = renderWithTheme(<WelcomeScreen />);
    expect(screen.getByText('welcome.createWallet')).toBeTruthy();
  });

  it('renders the import wallet button', () => {
    const screen = renderWithTheme(<WelcomeScreen />);
    expect(screen.getByText('welcome.importWallet')).toBeTruthy();
  });

  it('navigates to CreateWallet when "Create new wallet" is pressed', () => {
    const screen = renderWithTheme(<WelcomeScreen />);
    fireEvent.press(screen.getByText('welcome.createWallet'));
    expect(mockNavigate).toHaveBeenCalledWith(AuthRoutes.CreateWallet);
  });

  it('navigates to ImportWallet when "Import wallet" is pressed', () => {
    const screen = renderWithTheme(<WelcomeScreen />);
    fireEvent.press(screen.getByText('welcome.importWallet'));
    expect(mockNavigate).toHaveBeenCalledWith(AuthRoutes.ImportWallet);
  });
});
