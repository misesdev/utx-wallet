import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ImportWalletScreen } from '../../../src/presentation/screens/auth/ImportWalletScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();
const mockSubmit = jest.fn();
const mockSetWalletName = jest.fn();
const mockSetSeed = jest.fn();
const mockSetSelectedNetwork = jest.fn();
const mockClearError = jest.fn();

let mockError = '';
let mockIsLoading = false;
let mockSelectedNetwork = 'testnet4';
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

describe('ImportWalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockError = '';
    mockIsLoading = false;
    mockSelectedNetwork = 'testnet4';
    mockWalletName = '';
    mockSeed = '';
  });

  it('renders the screen title and subtitle', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('Enter your seed phrase to restore a wallet')).toBeTruthy();
  });

  it('renders wallet name input with placeholder', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByPlaceholderText('e.g. Savings')).toBeTruthy();
  });

  it('renders seed phrase input with placeholder', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByPlaceholderText('Enter your 12 or 24 word seed phrase')).toBeTruthy();
  });

  it('renders all three network options', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('mainnet')).toBeTruthy();
    expect(screen.getByText('testnet3')).toBeTruthy();
    expect(screen.getByText('testnet4')).toBeTruthy();
  });

  it('renders the import button', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getAllByText('Import wallet').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setWalletName when name input changes', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Savings'), 'Savings');
    expect(mockSetWalletName).toHaveBeenCalledWith('Savings');
  });

  it('calls setSeed when seed input changes', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter your 12 or 24 word seed phrase'),
      mnemonic,
    );
    expect(mockSetSeed).toHaveBeenCalledWith(mnemonic);
  });

  it('calls setSelectedNetwork when mainnet chip is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByText('mainnet'));
    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('mainnet');
  });

  it('calls setSelectedNetwork when testnet3 chip is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByText('testnet3'));
    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('testnet3');
  });

  it('calls submit when import button is pressed', async () => {
    mockSubmit.mockResolvedValue(null);
    const screen = renderWithTheme(<ImportWalletScreen />);
    const buttons = screen.getAllByText('Import wallet');
    fireEvent.press(buttons[buttons.length - 1]);
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  });

  it('navigates back when submit returns a wallet', async () => {
    mockSubmit.mockResolvedValue({
      id: '1',
      name: 'Savings',
      network: 'testnet4',
      status: 'locked',
      createdAt: new Date().toISOString(),
    });
    const screen = renderWithTheme(<ImportWalletScreen />);
    const buttons = screen.getAllByText('Import wallet');
    fireEvent.press(buttons[buttons.length - 1]);
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });

  it('does not navigate back when submit returns null', async () => {
    mockSubmit.mockResolvedValue(null);
    const screen = renderWithTheme(<ImportWalletScreen />);
    const buttons = screen.getAllByText('Import wallet');
    fireEvent.press(buttons[buttons.length - 1]);
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
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Savings'), 'New name');
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('calls clearError when seed input changes while error is visible', () => {
    mockError = 'Some error';
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter your 12 or 24 word seed phrase'),
      'new seed',
    );
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });
});
