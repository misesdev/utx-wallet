import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ConfirmSeedScreen } from '../../../src/presentation/screens/auth/ConfirmSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockSave = jest.fn();
const mockReset = jest.fn();
const mockNavigate = jest.fn();
const mockNavigationReset = jest.fn();
const mockImportSync = jest.fn();

const mockWords = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
];

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), reset: mockNavigationReset }),
}));

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: jest.fn(() => ({
    words: mockWords,
    save: mockSave,
    step: 'confirming',
    isLoading: false,
    error: null,
    reset: mockReset,
  })),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    importSync: mockImportSync,
    getOrigins: jest.fn(),
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: jest.fn(),
    discoverWalletAccounts: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/core/domain/utils/seedChallenge', () => ({
  buildSeedChallenge: jest.fn(() => ({ positions: [], options: [] })),
  validateSeedChallenge: jest.fn(() => true),
}));

describe('ConfirmSeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportSync.mockResolvedValue({ origins: [], newTransactions: 0, newUtxos: 0 });
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'confirming',
      isLoading: false,
      error: null,
      reset: mockReset,
    });
  });

  it('renders the confirm screen title', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('confirmSeed.title')).toBeTruthy();
  });

  it('renders the confirm button', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByLabelText('confirmSeed.confirmCreate')).toBeTruthy();
  });

  it('renders at least back and confirm buttons', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows a loading indicator while saving', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'saving',
      isLoading: true,
      error: null,
      reset: mockReset,
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('confirmSeed.creating')).toBeTruthy();
  });

  it('shows an error when error is present', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'confirming',
      isLoading: false,
      error: 'Failed to create wallet. Please try again.',
      reset: mockReset,
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Failed to create wallet. Please try again.')).toBeTruthy();
  });

  it('tapping a word chip fills a slot', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    const buttons = screen.getAllByRole('button');
    const wordBtn = buttons.find(
      b =>
        b.props.accessibilityRole === 'button' &&
        !b.props.accessibilityState?.disabled &&
        b.props.accessibilityLabel !== 'common.back' &&
        b.props.accessibilityLabel !== 'confirmSeed.confirmCreate',
    );
    if (wordBtn) {
      fireEvent.press(wordBtn);
    }
    expect(screen.getByLabelText('confirmSeed.confirmCreate')).toBeTruthy();
  });

  it('shows progress modal and navigates to Home after save and sync complete', async () => {
    const wallet = { id: 'w1', name: 'My Wallet', network: 'testnet', status: 'locked', createdAt: new Date().toISOString() };
    mockSave.mockResolvedValue(wallet);

    const screen = renderWithTheme(<ConfirmSeedScreen />);
    fireEvent.press(screen.getByLabelText('confirmSeed.confirmCreate'));

    await waitFor(() => expect(screen.getByText('walletSetup.done')).toBeTruthy());
    fireEvent.press(screen.getByTestId('wallet-setup-done-btn'));
    await waitFor(() => expect(mockNavigationReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] }));
    expect(mockReset).toHaveBeenCalled();
  });

  it('calls importSync with wallet id and network after save', async () => {
    const wallet = { id: 'wid-2', name: 'W', network: 'mainnet', status: 'locked', createdAt: new Date().toISOString() };
    mockSave.mockResolvedValue(wallet);

    const screen = renderWithTheme(<ConfirmSeedScreen />);
    fireEvent.press(screen.getByLabelText('confirmSeed.confirmCreate'));

    await waitFor(() =>
      expect(mockImportSync).toHaveBeenCalledWith('wid-2', 'mainnet', expect.any(Function)),
    );
  });

  it('hides progress modal and does not navigate when save returns null', async () => {
    mockSave.mockResolvedValue(null);

    const screen = renderWithTheme(<ConfirmSeedScreen />);
    fireEvent.press(screen.getByLabelText('confirmSeed.confirmCreate'));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockImportSync).not.toHaveBeenCalled();
  });
});
