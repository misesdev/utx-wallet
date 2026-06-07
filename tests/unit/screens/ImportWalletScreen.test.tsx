import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ImportWalletScreen } from '../../../src/presentation/screens/auth/ImportWalletScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();
const mockSubmit = jest.fn();
const mockSetWalletName = jest.fn();
const mockSetSeed = jest.fn();
const mockSetPassphrase = jest.fn();
const mockSetConfirmPassphrase = jest.fn();
const mockSetSelectedNetwork = jest.fn();
const mockClearError = jest.fn();

let mockError = '';
let mockIsLoading = false;
let mockSelectedNetwork = 'testnet';
let mockWalletName = '';
let mockSeed = '';

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useImportWallet', () => ({
  useImportWallet: () => ({
    walletName: mockWalletName,
    setWalletName: mockSetWalletName,
    seed: mockSeed,
    setSeed: mockSetSeed,
    passphrase: '',
    setPassphrase: mockSetPassphrase,
    confirmPassphrase: '',
    setConfirmPassphrase: mockSetConfirmPassphrase,
    selectedNetwork: mockSelectedNetwork,
    setSelectedNetwork: mockSetSelectedNetwork,
    isLoading: mockIsLoading,
    error: mockError,
    clearError: mockClearError,
    submit: mockSubmit,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockRouteParams: { network?: 'mainnet' | 'testnet' } | undefined;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
}));

describe('ImportWalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockError = '';
    mockIsLoading = false;
    mockSelectedNetwork = 'testnet';
    mockWalletName = '';
    mockSeed = '';
    mockRouteParams = undefined;
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('importWallet.title')).toBeTruthy();
  });

  it('renders wallet name input with placeholder', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByPlaceholderText('importWallet.namePlaceholder')).toBeTruthy();
  });

  it('renders seed phrase input with placeholder', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByPlaceholderText('importWallet.seedPlaceholder')).toBeTruthy();
  });

  it('renders Mainnet and Testnet network options only', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('Mainnet')).toBeTruthy();
    expect(screen.getByText('Testnet')).toBeTruthy();
    expect(screen.queryByText('Testnet3')).toBeNull();
    expect(screen.queryByText('Testnet4')).toBeNull();
  });

  it('renders the import button', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByLabelText('importWallet.importAction')).toBeTruthy();
  });

  it('calls setWalletName when name input changes', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('importWallet.namePlaceholder'), 'Savings');
    expect(mockSetWalletName).toHaveBeenCalledWith('Savings');
  });

  it('calls setSeed when seed input changes', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    fireEvent.changeText(
      screen.getByPlaceholderText('importWallet.seedPlaceholder'),
      mnemonic,
    );
    expect(mockSetSeed).toHaveBeenCalledWith(mnemonic);
  });

  it('calls setSelectedNetwork with mainnet when Mainnet chip is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByText('Mainnet'));
    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('mainnet');
  });

  it('calls setSelectedNetwork with testnet when Testnet chip is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByText('Testnet'));
    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('testnet');
  });

  it('calls submit when import button is pressed', async () => {
    mockSubmit.mockResolvedValue(null);
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  });

  it('navigates back when submit returns a wallet', async () => {
    mockSubmit.mockResolvedValue({
      id: '1',
      name: 'Savings',
      network: 'testnet',
      status: 'locked',
      createdAt: new Date().toISOString(),
    });
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });

  it('does not navigate back when submit returns null', async () => {
    mockSubmit.mockResolvedValue(null);
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('displays error message when error is set', () => {
    mockError = 'Invalid seed phrase. Please check your words and try again.';
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(
      screen.getByText('Invalid seed phrase. Please check your words and try again.'),
    ).toBeTruthy();
  });

  it('displays duplicate wallet error message', () => {
    mockError = 'A wallet named "Savings" already exists.';
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('A wallet named "Savings" already exists.')).toBeTruthy();
  });

  it('calls clearError when name input changes while error is visible', () => {
    mockError = 'Some error';
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('importWallet.namePlaceholder'), 'New name');
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('calls clearError when seed input changes while error is visible', () => {
    mockError = 'Some error';
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('importWallet.seedPlaceholder'),
      'new seed',
    );
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('shows passphrase fields when toggle is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.passphraseSection'));
    expect(screen.getByLabelText('importWallet.passphraseLabel')).toBeTruthy();
    expect(screen.getByLabelText('importWallet.confirmPassphraseLabel')).toBeTruthy();
  });
});
