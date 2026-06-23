import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WalletListScreen } from '../../../src/presentation/screens/wallet/WalletListScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

// Provide a stable window width so swipe offset calculations are predictable
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
}));

const mockNavigate = jest.fn();
const mockSelectWallet = jest.fn();
const mockListUtxos = jest.fn().mockResolvedValue([]);
const mockGetOrigins = jest.fn().mockResolvedValue([]);

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
    deleteWallet: jest.fn().mockResolvedValue(undefined),
    reloadWallets: jest.fn(),
    listUtxos: mockListUtxos,
  }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    getOrigins: mockGetOrigins,
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: jest.fn().mockResolvedValue([]),
    discoverWalletAccounts: jest.fn().mockResolvedValue([]),
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
    mockListUtxos.mockResolvedValue([]);
    mockGetOrigins.mockResolvedValue([]);
  });

  describe('Header', () => {
    it('renders Wallets title', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('walletList.title')).toBeTruthy();
    });

    it('navigates to CreateWallet with mainnet param when on Mainnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('walletList.createWallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'mainnet' });
    });

    it('navigates to ImportWallet with mainnet param when on Mainnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('walletList.importWallet'));
      expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', { network: 'mainnet' });
    });

    it('navigates to CreateWallet with testnet4 param after switching to Testnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.testnet'));
      fireEvent.press(screen.getByLabelText('walletList.createWallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'testnet4' });
    });

    it('navigates to ImportWallet with testnet4 param after switching to Testnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.testnet'));
      fireEvent.press(screen.getByLabelText('walletList.importWallet'));
      expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', { network: 'testnet4' });
    });
  });

  describe('Network tabs', () => {
    it('renders Mainnet and Testnet tabs', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('walletList.mainnet')).toBeTruthy();
      expect(screen.getByText('walletList.testnet')).toBeTruthy();
    });

    it('does not render Testnet3, Testnet4 or Node tabs', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.queryByText('Testnet3')).toBeNull();
      expect(screen.queryByText('Testnet4')).toBeNull();
      expect(screen.queryByText('Node')).toBeNull();
    });

    it('shows mainnet tab as active by default', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      const mainnetTab = screen.getByRole('tab', { name: 'walletList.mainnet' });
      expect(mainnetTab.props.accessibilityState?.selected).toBe(true);
    });

    it('switches to testnet tab when pressed', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByRole('tab', { name: 'walletList.testnet' }));
      const testnetTab = screen.getByRole('tab', { name: 'walletList.testnet' });
      expect(testnetTab.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('Empty state', () => {
    it('shows empty state text for mainnet when no wallets on mainnet', () => {
      mockWallets = [makeWallet({ network: 'testnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('walletList.noWallets')).toBeTruthy();
    });

    it('shows empty state text for testnet when no wallets on testnet', () => {
      mockWallets = [makeWallet({ network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.testnet'));
      expect(screen.getByText('walletList.noWallets')).toBeTruthy();
    });

    it('shows Create and Import buttons in empty state', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('walletList.createWallet')).toBeTruthy();
      expect(screen.getByText('walletList.importWallet')).toBeTruthy();
    });

    it('navigates to CreateWallet from empty state CTA with active network', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.createWallet'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateWallet', { network: 'mainnet' });
    });

    it('navigates to ImportWallet from empty state CTA with active network', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.importWallet'));
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
      fireEvent.press(screen.getByText('walletList.testnet'));
      expect(screen.getByText('Testnet Wallet')).toBeTruthy();
    });

    it('shows legacy testnet4 wallet under Testnet tab', () => {
      mockWallets = [makeWallet({ name: 'Legacy Wallet', network: 'testnet4' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.testnet'));
      expect(screen.getByText('Legacy Wallet')).toBeTruthy();
    });

    it('shows legacy testnet3 wallet under Testnet tab', () => {
      mockWallets = [makeWallet({ name: 'Old Testnet3 Wallet', network: 'testnet3' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByText('walletList.testnet'));
      expect(screen.getByText('Old Testnet3 Wallet')).toBeTruthy();
    });

    it('opens wallet and navigates to Home on card press', () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByLabelText('Open wallet My Wallet'));
      expect(mockSelectWallet).toHaveBeenCalledWith('w1');
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });

    it('shows network label on wallet card', () => {
      mockWallets = [makeWallet({ network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('Mainnet')).toBeTruthy();
    });

    it('does not show a delete button on wallet card', () => {
      mockWallets = [makeWallet({ name: 'My Wallet', network: 'mainnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.queryByLabelText('Delete wallet My Wallet')).toBeNull();
    });

    it('shows watch-only badge when wallet status is watch-only', () => {
      mockWallets = [makeWallet({ name: 'Read Only', network: 'mainnet', status: 'watch-only' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('wallet.watchOnly')).toBeTruthy();
    });

    it('does not show watch-only badge for a regular (locked) wallet', () => {
      mockWallets = [makeWallet({ name: 'Regular', network: 'mainnet', status: 'locked' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.queryByText('wallet.watchOnly')).toBeNull();
    });

    it('renders createdAt date on wallet card', () => {
      mockWallets = [makeWallet({ name: 'Dated', network: 'mainnet', createdAt: '2024-09-15T00:00:00.000Z' })];
      const screen = renderWithTheme(<WalletListScreen />);
      // formatDate outputs locale-formatted date — just check it renders without crash
      expect(screen.getByText('Dated')).toBeTruthy();
    });

    it('renders both watch-only badge and date without crash', () => {
      mockWallets = [makeWallet({ name: 'WO Dated', network: 'mainnet', status: 'watch-only', createdAt: '2024-09-15T00:00:00.000Z' })];
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByText('wallet.watchOnly')).toBeTruthy();
      expect(screen.getByText('WO Dated')).toBeTruthy();
    });
  });

  describe('Wallet stats', () => {
    it('shows stat placeholders while summary is loading', () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockReturnValue(new Promise(() => undefined));
      mockGetOrigins.mockReturnValue(new Promise(() => undefined));
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByTestId('wallet-stat-balance-w1')).toBeTruthy();
      expect(screen.getByTestId('wallet-stat-accounts-w1')).toBeTruthy();
      expect(screen.getByTestId('wallet-stat-utxos-w1')).toBeTruthy();
    });

    it('shows balance once summary is loaded', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockResolvedValue([
        { txid: 'abc', vout: 0, valueSats: 100_000, address: 'addr1', isConfirmed: true },
      ]);
      mockGetOrigins.mockResolvedValue([]);
      const screen = renderWithTheme(<WalletListScreen />);
      await waitFor(() =>
        expect(screen.getByText('100,000 sats')).toBeTruthy(),
      );
    });

    it('shows BTC denomination for amounts >= 1 BTC', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockResolvedValue([
        { txid: 'abc', vout: 0, valueSats: 150_000_000, address: 'addr1', isConfirmed: true },
      ]);
      mockGetOrigins.mockResolvedValue([]);
      const screen = renderWithTheme(<WalletListScreen />);
      await waitFor(() =>
        expect(screen.getByText('1.5000 BTC')).toBeTruthy(),
      );
    });

    it('shows account count once summary is loaded', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockResolvedValue([]);
      mockGetOrigins.mockResolvedValue([
        { id: 'o1', walletId: 'w1', name: 'Default', type: 'default', accountIndex: 0, createdAt: '2024-01-01T00:00:00.000Z', archivedAt: undefined },
        { id: 'o2', walletId: 'w1', name: 'Savings', type: 'custom', accountIndex: 1, createdAt: '2024-01-01T00:00:00.000Z', archivedAt: undefined },
      ]);
      const screen = renderWithTheme(<WalletListScreen />);
      await waitFor(() =>
        expect(screen.getByTestId('wallet-stat-accounts-w1')).toBeTruthy(),
      );
      expect(screen.getByTestId('wallet-stat-accounts-w1').findByProps({ children: '2' })).toBeTruthy();
    });

    it('excludes archived origins from account count', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockResolvedValue([]);
      mockGetOrigins.mockResolvedValue([
        { id: 'o1', walletId: 'w1', name: 'Default', type: 'default', accountIndex: 0, createdAt: '2024-01-01T00:00:00.000Z', archivedAt: undefined },
        { id: 'o2', walletId: 'w1', name: 'Archived', type: 'custom', accountIndex: 1, createdAt: '2024-01-01T00:00:00.000Z', archivedAt: '2024-06-01T00:00:00.000Z' },
      ]);
      const screen = renderWithTheme(<WalletListScreen />);
      await waitFor(() =>
        expect(screen.getByTestId('wallet-stat-accounts-w1')).toBeTruthy(),
      );
      expect(screen.getByTestId('wallet-stat-accounts-w1').findByProps({ children: '1' })).toBeTruthy();
    });

    it('shows 0 sats when wallet has no UTXOs', async () => {
      mockWallets = [makeWallet({ id: 'w1', name: 'Test Wallet', network: 'mainnet' })];
      mockListUtxos.mockResolvedValue([]);
      mockGetOrigins.mockResolvedValue([]);
      const screen = renderWithTheme(<WalletListScreen />);
      await waitFor(() =>
        expect(screen.getByText('0 sats')).toBeTruthy(),
      );
    });
  });

  describe('Bottom menu', () => {
    it('renders fixed bottom actions for global settings and QR import', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByTestId('wallet-list-global-settings')).toBeTruthy();
      expect(screen.getByTestId('wallet-list-scan-import')).toBeTruthy();
    });

    it('navigates to GlobalSettings from the bottom menu', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByTestId('wallet-list-global-settings'));
      expect(mockNavigate).toHaveBeenCalledWith('GlobalSettings');
    });

    it('navigates to the QR scanner from the bottom menu', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByTestId('wallet-list-scan-import'));
      expect(mockNavigate).toHaveBeenCalledWith('ScanWalletQr', { network: 'mainnet' });
    });
  });

  describe('Swipe navigation', () => {
    it('renders the wallet pager with testIDs for both pages', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      expect(screen.getByTestId('wallet-pager')).toBeTruthy();
      expect(screen.getByTestId('page-mainnet')).toBeTruthy();
      expect(screen.getByTestId('page-testnet4')).toBeTruthy();
    });

    it('activates the testnet tab after swiping to the second page', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      const pager = screen.getByTestId('wallet-pager');
      // Simulate swipe: contentOffset.x = 375 (one full page width) → index 1
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 375, y: 0 } },
      });
      const testnetTab = screen.getByRole('tab', { name: 'walletList.testnet' });
      expect(testnetTab.props.accessibilityState?.selected).toBe(true);
    });

    it('activates the mainnet tab after swiping back to the first page', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      const pager = screen.getByTestId('wallet-pager');
      // Swipe to testnet
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 375, y: 0 } },
      });
      // Swipe back to mainnet
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 0, y: 0 } },
      });
      const mainnetTab = screen.getByRole('tab', { name: 'walletList.mainnet' });
      expect(mainnetTab.props.accessibilityState?.selected).toBe(true);
    });

    it('lazy-mounts testnet content only after navigating to it', () => {
      mockWallets = [makeWallet({ name: 'Testnet Wallet', network: 'testnet' })];
      const screen = renderWithTheme(<WalletListScreen />);
      // Content of unvisited testnet page is NOT in the DOM yet
      expect(screen.queryByText('Testnet Wallet')).toBeNull();
      // Navigate to testnet tab
      fireEvent(screen.getByTestId('wallet-pager'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 375, y: 0 } },
      });
      // Now the testnet wallet should be visible
      expect(screen.getByText('Testnet Wallet')).toBeTruthy();
    });

    it('keeps both pages rendered once both have been visited', () => {
      mockWallets = [
        makeWallet({ id: 'w-main', name: 'Main Wallet', network: 'mainnet' }),
        makeWallet({ id: 'w-test', name: 'Test Wallet', network: 'testnet' }),
      ];
      const screen = renderWithTheme(<WalletListScreen />);
      // Visit testnet via swipe
      fireEvent(screen.getByTestId('wallet-pager'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 375, y: 0 } },
      });
      // Both wallets should now be in DOM
      expect(screen.getByText('Main Wallet')).toBeTruthy();
      expect(screen.getByText('Test Wallet')).toBeTruthy();
    });

    it('syncs active tab when user taps tab chip while pager shows same page', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      // Already on mainnet — tapping mainnet tab does nothing
      fireEvent.press(screen.getByRole('tab', { name: 'walletList.mainnet' }));
      expect(screen.getByRole('tab', { name: 'walletList.mainnet' }).props.accessibilityState?.selected).toBe(true);
      // Now switch to testnet via tap
      fireEvent.press(screen.getByRole('tab', { name: 'walletList.testnet' }));
      expect(screen.getByRole('tab', { name: 'walletList.testnet' }).props.accessibilityState?.selected).toBe(true);
    });

    it('uses mainnet network for ScanWalletQr when on mainnet tab', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent.press(screen.getByTestId('wallet-list-scan-import'));
      expect(mockNavigate).toHaveBeenCalledWith('ScanWalletQr', { network: 'mainnet' });
    });

    it('uses testnet network for ScanWalletQr after swiping to testnet', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      fireEvent(screen.getByTestId('wallet-pager'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 375, y: 0 } },
      });
      fireEvent.press(screen.getByTestId('wallet-list-scan-import'));
      expect(mockNavigate).toHaveBeenCalledWith('ScanWalletQr', { network: 'testnet4' });
    });

    it('clamps swipe offset to valid tab index range', () => {
      const screen = renderWithTheme(<WalletListScreen />);
      const pager = screen.getByTestId('wallet-pager');
      // Very large offset — should clamp to last tab (testnet = index 1)
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 99999, y: 0 } },
      });
      expect(screen.getByRole('tab', { name: 'walletList.testnet' }).props.accessibilityState?.selected).toBe(true);
      // Negative offset — should clamp to first tab (mainnet = index 0)
      fireEvent(pager, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: -500, y: 0 } },
      });
      expect(screen.getByRole('tab', { name: 'walletList.mainnet' }).props.accessibilityState?.selected).toBe(true);
    });
  });
});
