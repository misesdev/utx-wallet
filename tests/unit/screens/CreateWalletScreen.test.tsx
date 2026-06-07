import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { CreateWalletScreen } from '../../../src/presentation/screens/auth/CreateWalletScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';

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

let mockRouteParams: { network?: 'mainnet' | 'testnet' } | undefined;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
}));

describe('CreateWalletScreen', () => {
  beforeEach(() => {
    mockInitiate.mockClear();
    mockNavigate.mockClear();
    mockRouteParams = undefined;
  });

  it('renders the wallet name input', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByPlaceholderText('e.g. Main wallet')).toBeTruthy();
  });

  it('shows network badge for testnet by default (no route params)', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByText('Creating on Testnet')).toBeTruthy();
  });

  it('shows network badge for mainnet when route param is mainnet', () => {
    mockRouteParams = { network: 'mainnet' };
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByText('Creating on Mainnet')).toBeTruthy();
  });

  it('shows an error when name is empty', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(screen.getByText('Wallet name is required')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('calls initiate with testnet and navigates to BackupSeed with a valid name', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', undefined, 'testnet');
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.BackupSeed);
  });

  it('calls initiate with mainnet when route param is mainnet', () => {
    mockRouteParams = { network: 'mainnet' };
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', undefined, 'mainnet');
  });

  it('trims the wallet name before calling initiate', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), '  Padded  ');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('Padded', undefined, 'testnet');
  });

  it('shows an error when name exceeds 48 characters', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'a'.repeat(49));
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(screen.getByText('Name must be 48 characters or fewer')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('shows passphrase section when toggle is pressed', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('Use passphrase'));
    expect(screen.getByLabelText('Passphrase')).toBeTruthy();
    expect(screen.getByLabelText('Confirm passphrase')).toBeTruthy();
  });

  it('shows error when passphrase is enabled but empty', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('Use passphrase'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(screen.getByText('Passphrase cannot be empty when enabled')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('shows error when passphrases do not match', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('Use passphrase'));
    fireEvent.changeText(screen.getByLabelText('Passphrase'), 'secret');
    fireEvent.changeText(screen.getByLabelText('Confirm passphrase'), 'different');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(screen.getByText('Passphrases do not match')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('calls initiate with passphrase and network when passphrase is enabled and valid', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main wallet'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('Use passphrase'));
    fireEvent.changeText(screen.getByLabelText('Passphrase'), 'mysecret');
    fireEvent.changeText(screen.getByLabelText('Confirm passphrase'), 'mysecret');
    fireEvent.press(screen.getByLabelText('Generate seed phrase'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', 'mysecret', 'testnet');
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.BackupSeed);
  });
});
