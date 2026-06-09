import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ImportWalletScreen } from '../../../src/presentation/screens/auth/ImportWalletScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSubmit = jest.fn();
const mockDiscoverWalletAccounts = jest.fn();
const mockSyncWallet = jest.fn();
const mockSetWalletName = jest.fn();
const mockSetSeed = jest.fn();
const mockSetPassphrase = jest.fn();
const mockSetConfirmPassphrase = jest.fn();
const mockClearError = jest.fn();

let mockError = '';
let mockIsLoading = false;
let mockWalletName = '';
let mockSeed = '';

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
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
    isLoading: mockIsLoading,
    error: mockError,
    clearError: mockClearError,
    submit: mockSubmit,
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    syncWallet: mockSyncWallet,
  }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    discoverWalletAccounts: mockDiscoverWalletAccounts,
    getOrigins: jest.fn(),
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: jest.fn(),
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
    mockWalletName = '';
    mockSeed = '';
    mockRouteParams = undefined;
    mockDiscoverWalletAccounts.mockResolvedValue([]);
    mockSyncWallet.mockResolvedValue({ newUtxos: 0, spentUtxos: 0, newTransactions: 0, syncedAt: new Date().toISOString() });
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

  it('shows Testnet network badge when no route params provided', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('Testnet')).toBeTruthy();
  });

  it('shows Mainnet network badge when route params specify mainnet', () => {
    mockRouteParams = { network: 'mainnet' };
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByText('Mainnet')).toBeTruthy();
  });

  it('does not show interactive network selector chips', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    // The badge is purely informational — no radio buttons
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
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

  it('calls submit when import button is pressed', async () => {
    mockSubmit.mockResolvedValue(null);
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  });

  it('shows progress modal then navigates back when import, discovery and sync succeed', async () => {
    const wallet = { id: '1', name: 'Savings', network: 'testnet', status: 'locked', createdAt: new Date().toISOString() };
    mockSubmit.mockResolvedValue(wallet);
    mockDiscoverWalletAccounts.mockResolvedValue([]);

    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));

    await waitFor(() => expect(screen.getByText('walletSetup.done')).toBeTruthy());
    fireEvent.press(screen.getByTestId('wallet-setup-done-btn'));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });

  it('calls discoverWalletAccounts with wallet id and network after successful import', async () => {
    const wallet = { id: 'wid-1', name: 'Test', network: 'mainnet', status: 'locked', createdAt: new Date().toISOString() };
    mockSubmit.mockResolvedValue(wallet);
    mockDiscoverWalletAccounts.mockResolvedValue([]);

    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));

    await waitFor(() => expect(mockDiscoverWalletAccounts).toHaveBeenCalledWith('wid-1', 'mainnet', expect.any(Function)));
  });

  it('calls syncWallet with wallet id after discovery completes', async () => {
    const wallet = { id: 'wid-1', name: 'Test', network: 'testnet', status: 'locked', createdAt: new Date().toISOString() };
    mockSubmit.mockResolvedValue(wallet);
    mockDiscoverWalletAccounts.mockResolvedValue([]);

    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('importWallet.importAction'));

    await waitFor(() => expect(mockSyncWallet).toHaveBeenCalledWith('wid-1'));
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

  it('renders the info button', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    expect(screen.getByLabelText('common.info')).toBeTruthy();
  });

  it('navigates to WalletPolicy when info button is pressed', () => {
    const screen = renderWithTheme(<ImportWalletScreen />);
    fireEvent.press(screen.getByLabelText('common.info'));
    expect(mockNavigate).toHaveBeenCalledWith('WalletPolicy');
  });
});
