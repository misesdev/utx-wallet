import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { CreateWalletScreen } from '../../../src/presentation/screens/auth/CreateWalletScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AuthRoutes } from '../../../src/app/navigation/routes';

const mockNavigate = jest.fn();
const mockInitiate = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: () => ({
    initiate: mockInitiate,
    isLoading: false,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('CreateWalletScreen', () => {
  beforeEach(() => {
    mockInitiate.mockClear();
    mockNavigate.mockClear();
  });

  it('renders the wallet name input', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByPlaceholderText('e.g. Main wallet')).toBeTruthy();
  });

  it('shows an error when name is empty', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByText('Generate seed phrase'));
    expect(screen.getByText('Wallet name is required')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('calls initiate and navigates to BackupSeed with a valid name', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet');
    expect(mockNavigate).toHaveBeenCalledWith(AuthRoutes.BackupSeed);
  });

  it('trims the wallet name before calling initiate', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), '  Padded  ');
    fireEvent.press(screen.getByText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('Padded');
  });

  it('shows an error when name exceeds 48 characters', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'a'.repeat(49));
    fireEvent.press(screen.getByText('Generate seed phrase'));
    expect(screen.getByText('Name must be 48 characters or fewer')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });
});
