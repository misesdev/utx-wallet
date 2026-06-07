import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { WalletListScreen } from '../../../src/presentation/screens/wallet/WalletListScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockNavigate = jest.fn();
const mockSelectWallet = jest.fn();
const mockDeleteWallet = jest.fn().mockResolvedValue(undefined);

function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'w1',
    name: 'Test Wallet',
    network: 'mainnet',
    status: 'unlocked',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

let mockWallets: Wallet[] = [];

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    wallets: mockWallets,
    isLoading: false,
    selectedWallet: null,
    selectWallet: mockSelectWallet,
    deleteWallet: mockDeleteWallet,
    reloadWallets: jest.fn(),
  }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/shared/assets', () => ({
  AppAssets: { icon: { uri: 'icon' } },
}));

describe('WalletListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWallets = [];
  });

  describe('Header', () => {
    it('renders Wallets title', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('Wallets')).toBeTruthy();
    });

    it('navigates to CreateWallet with mainnet param when on Mainnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Create wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'mainnet' });
    });

    it('navigates to ImportWallet with mainnet param when on Mainnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Import wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', { network: 'mainnet' });
    });

    it('navigates to CreateWallet with testnet param after switching to Testnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      fireEvent.press(screen.getByLabelText('Create wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'testnet' });
    });

    it('navigates to ImportWallet with testnet param after switching to Testnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      fireEvent.press(screen.getByLabelText('Import wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', { network: 'testnet' });
    });
  });

  describe('Network tabs', () => {
    it('renders Mainnet and Testnet tabs', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('Mainnet')).toBeTruthy();
      expect(screen.getByText('Testnet')).toBeTruthy();
    });

    it('does not render Testnet3, Testnet4 or Node tabs', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.queryByText('Testnet3')).toBeNull();
      expect(screen.queryByText('Testnet4')).toBeNull();
      expect(screen.queryByText('Node')).toBeNull();
    });

    it('shows mainnet tab as active by default', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      const mainnetTab = screen.getByRole('tab', { name: 'Mainnet' });
      expect(mainnetTab.props.accessibilityState?.selected).toBe(true);
    });

    it('switches to testnet tab when pressed', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByRole('tab', { name: 'Testnet' }));
      const testnetTab = screen.getByRole('tab', { name: 'Testnet' });
      expect(testnetTab.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('Empty state', () => {
    it('shows empty state text for mainnet when no wallets on mainnet', () => {
      mockWallets = [makeWallet({ network: 'testnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('No mainnet wallets')).toBeTruthy();
    });

    it('shows empty state text for testnet when no wallets on testnet', () => {
      mockWallets = [makeWallet({ network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      expect(screen.getByText('No testnet wallets')).toBeTruthy();
    });

    it('shows Create and Import buttons in empty state', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('+ Create wallet')).toBeTruthy();
      expect(screen.getByText('↓ Import wallet')).toBeTruthy();
    });

    it('navigates to CreateWallet from empty state CTA with active network', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('+ Create wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'mainnet' });
    });

    it('navigates to ImportWallet from empty state CTA with active network', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('↓ Import wallet'));
      expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', { network: 'mainnet' });
    });
  });

  describe('Wallet list', () => {
    it('shows wallet card for matching network', () => {
      mockWallets = [makeWallet({ name: 'My Mainnet Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('My Mainnet Wallet')).toBeTruthy();
    });

    it('hides wallet when it belongs to a different network tab', () => {
      mockWallets = [makeWallet({ name: 'Testnet Wallet', network: 'testnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.queryByText('Testnet Wallet')).toBeNull();
    });

    it('shows testnet wallet under Testnet tab', () => {
      mockWallets = [makeWallet({ name: 'Testnet Wallet', network: 'testnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      expect(screen.getByText('Testnet Wallet')).toBeTruthy();
    });

    it('shows legacy testnet4 wallet under Testnet tab', () => {
      mockWallets = [makeWallet({ name: 'Legacy Wallet', network: 'testnet4' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      expect(screen.getByText('Legacy Wallet')).toBeTruthy();
    });

    it('shows legacy testnet3 wallet under Testnet tab', () => {
      mockWallets = [makeWallet({ name: 'Old Testnet3 Wallet', network: 'testnet3' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('Testnet'));
      expect(screen.getByText('Old Testnet3 Wallet')).toBeTruthy();
    });

    it('opens wallet and navigates to Home on card press', () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Open wallet My Wallet'));
      expect(mockSelectWallet).toHaveBeenCalledWith('w1');
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });

    it('shows network badge on wallet card', () => {
      mockWallets = [makeWallet({ network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('mainnet')).toBeTruthy();
    });
  });

  describe('Delete wallet', () => {
    it('shows confirm modal when delete button is pressed', () => {
      mockWallets = [makeWallet({ name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Delete wallet My Wallet'));
      expect(screen.getByTestId('confirm-modal-title')).toBeTruthy();
    });

    it('calls deleteWallet when confirm is pressed', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Delete wallet My Wallet'));
      fireEvent.press(screen.getByTestId('confirm-modal-confirm'));
      expect(mockDeleteWallet).toHaveBeenCalledWith('w1');
    });

    it('dismisses modal on cancel', () => {
      mockWallets = [makeWallet({ name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Delete wallet My Wallet'));
      fireEvent.press(screen.getByTestId('confirm-modal-cancel'));
      expect(screen.queryByTestId('confirm-modal-title')).toBeNull();
    });
  });
});
