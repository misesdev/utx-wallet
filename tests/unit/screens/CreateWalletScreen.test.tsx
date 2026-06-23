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

let mockRouteParams: { network?: 'mainnet' | 'testnet' | 'testnet4' } | undefined;

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
    expect(screen.getByPlaceholderText('createWallet.namePlaceholder')).toBeTruthy();
  });

  it('shows network badge for testnet by default (no route params)', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByText('createWallet.networkBadge')).toBeTruthy();
  });

  it('shows network badge for mainnet when route param is mainnet', () => {
    mockRouteParams = { network: 'mainnet' };
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByText('createWallet.networkBadge')).toBeTruthy();
  });

  it('shows an error when name is empty', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(screen.getByText('createWallet.errorNameRequired')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('calls initiate with testnet4 and navigates to BackupSeed with a valid name', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', undefined, 'testnet4');
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.BackupSeed);
  });

  it('calls initiate with mainnet when route param is mainnet', () => {
    mockRouteParams = { network: 'mainnet' };
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', undefined, 'mainnet');
  });

  it('trims the wallet name before calling initiate', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), '  Padded  ');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(mockInitiate).toHaveBeenCalledWith('Padded', undefined, 'testnet4');
  });

  it('shows an error when name exceeds 48 characters', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'a'.repeat(49));
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(screen.getByText('createWallet.errorNameTooLong')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('shows passphrase section when toggle is pressed', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('createWallet.passphraseSection'));
    expect(screen.getByLabelText('createWallet.passphraseLabel')).toBeTruthy();
    expect(screen.getByLabelText('createWallet.confirmPassphraseLabel')).toBeTruthy();
  });

  it('shows error when passphrase is enabled but empty', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('createWallet.passphraseSection'));
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(screen.getByText('createWallet.errorPassphraseEmpty')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('shows error when passphrases do not match', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('createWallet.passphraseSection'));
    fireEvent.changeText(screen.getByLabelText('createWallet.passphraseLabel'), 'secret');
    fireEvent.changeText(screen.getByLabelText('createWallet.confirmPassphraseLabel'), 'different');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(screen.getByText('createWallet.errorPassphraseMismatch')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('calls initiate with passphrase and network when passphrase is enabled and valid', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('createWallet.namePlaceholder'), 'My Wallet');
    fireEvent.press(screen.getByLabelText('createWallet.passphraseSection'));
    fireEvent.changeText(screen.getByLabelText('createWallet.passphraseLabel'), 'mysecret');
    fireEvent.changeText(screen.getByLabelText('createWallet.confirmPassphraseLabel'), 'mysecret');
    fireEvent.press(screen.getByLabelText('createWallet.generateSeed'));
    expect(mockInitiate).toHaveBeenCalledWith('My Wallet', 'mysecret', 'testnet4');
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.BackupSeed);
  });

  it('renders the info button', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    expect(screen.getByLabelText('common.info')).toBeTruthy();
  });

  it('navigates to WalletPolicy when info button is pressed', () => {
    const screen = renderWithTheme(<CreateWalletScreen />);
    fireEvent.press(screen.getByLabelText('common.info'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.WalletPolicy);
  });
});
