import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../../src/presentation/screens/home/HomeScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { HomeWalletState } from '../../../src/presentation/hooks/useHomeWallet';
import type { WalletSyncState } from '../../../src/presentation/hooks/useWalletSync';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockNavigate = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockSync = jest.fn().mockResolvedValue(undefined);

const DEFAULT_NETWORK: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

const WALLET_STATE: HomeWalletState = {
  wallet: { id: 'w1', name: 'Primary', network: 'testnet4', status: 'locked', createdAt: '' },
  confirmedBalanceSats: 500_000,
  pendingBalanceSats: 0,
  networkConfig: DEFAULT_NETWORK,
  isOnline: true,
  isSafeMode: false,
  transactions: [],
  isLoading: false,
  error: null,
  refresh: mockRefresh,
};

const SYNC_STATE: WalletSyncState = {
  isSyncing: false,
  lastSyncAt: null,
  syncResult: null,
  syncError: null,
  sync: mockSync,
};

let mockHomeState: HomeWalletState = WALLET_STATE;
let mockSyncState: WalletSyncState = SYNC_STATE;

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useHomeWallet', () => ({
  useHomeWallet: () => mockHomeState,
}));

jest.mock('../../../src/presentation/hooks/useWalletSync', () => ({
  useWalletSync: () => mockSyncState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockAddressManagerStable = {
  getOrigins: jest.fn().mockResolvedValue([]),
  createAddressOrigin: jest.fn(),
  getReceiveAddress: jest.fn(),
  getChangeAddress: jest.fn(),
  ensureAddressPool: jest.fn(),
  listAddresses: jest.fn().mockResolvedValue([]),
};

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => mockAddressManagerStable,
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomeState = { ...WALLET_STATE };
    mockSyncState = { ...SYNC_STATE };
    mockRefresh.mockResolvedValue(undefined);
    mockSync.mockResolvedValue(undefined);
  });

  describe('Wallet name and balance rendering', () => {
    it('renders the wallet name as screen title', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Primary')).toBeTruthy();
    });

    it('renders confirmed balance', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('500,000')).toBeTruthy();
    });

    it('renders zero confirmed balance', () => {
      mockHomeState = { ...WALLET_STATE, confirmedBalanceSats: 0 };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('does not show pending section when pendingBalanceSats is zero', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.queryByText('Pending')).toBeNull();
    });

    it('renders pending balance when pendingBalanceSats is positive', () => {
      mockHomeState = { ...WALLET_STATE, pendingBalanceSats: 12_000 };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Pending')).toBeTruthy();
      expect(screen.getByText('+12,000 sats')).toBeTruthy();
    });
  });

  describe('Network and status indicators', () => {
    it('renders the network badge with network name', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('testnet4')).toBeTruthy();
    });

    it('renders online status in network badge', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('online')).toBeTruthy();
    });

    it('does not show safe mode badge when isSafeMode is false', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.queryByText('Safe mode')).toBeNull();
    });

    it('shows safe mode badge when isSafeMode is true', () => {
      mockHomeState = { ...WALLET_STATE, isSafeMode: true };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Safe mode')).toBeTruthy();
    });
  });

  describe('Action buttons navigation', () => {
    it('navigates to Receive screen when Receive is pressed', () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByText('Receive'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Receive);
    });

    it('navigates to Send screen when Send is pressed', () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByText('Send'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Send);
    });

    it('navigates to Transactions screen when balance is tapped', () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByLabelText('View transactions'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Transactions);
    });

    it('navigates to Utxos screen when UTXOs is pressed', () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByLabelText('UTXOs'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Utxos);
    });

    it('navigates to Settings screen when Settings is pressed', () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByLabelText('Settings'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Settings);
    });
  });

  describe('Sync button', () => {
    it('renders the Tap to sync button when idle with no prior sync', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Tap to sync')).toBeTruthy();
    });

    it('calls sync and refresh when Tap to sync is pressed', async () => {
      const screen = renderWithTheme(<HomeScreen />);
      fireEvent.press(screen.getByText('Tap to sync'));
      await waitFor(() => {
        expect(mockSync).toHaveBeenCalledTimes(1);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('shows Syncing… text while isSyncing is true', () => {
      mockSyncState = { ...SYNC_STATE, isSyncing: true };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Syncing…')).toBeTruthy();
    });

    it('shows last sync time when lastSyncAt is set', () => {
      mockSyncState = {
        ...SYNC_STATE,
        lastSyncAt: '2026-06-05T12:00:00.000Z',
      };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText(/Last sync:/i)).toBeTruthy();
    });

    it('shows sync error message when syncError is set', () => {
      mockSyncState = {
        ...SYNC_STATE,
        syncError: 'No internet connection',
      };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('No internet connection')).toBeTruthy();
    });
  });

  describe('No wallet state', () => {
    it('renders empty state when wallet is null', () => {
      mockHomeState = { ...WALLET_STATE, wallet: null };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('No wallet selected')).toBeTruthy();
    });

    it('does not render action buttons when wallet is null', () => {
      mockHomeState = { ...WALLET_STATE, wallet: null };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.queryByText('Receive')).toBeNull();
      expect(screen.queryByText('Send')).toBeNull();
    });
  });

  describe('No transactions state', () => {
    it('renders empty activity state when transactions list is empty', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('No transactions yet')).toBeTruthy();
    });
  });

  describe('Transactions list', () => {
    it('renders transaction items when transactions exist', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          amountSats: 10_000,
          direction: 'incoming',
          status: 'confirmed',
          createdAt: '2026-06-05T00:00:00.000Z',
        },
        {
          id: 'tx-2',
          amountSats: 5_000,
          direction: 'outgoing',
          status: 'pending',
          createdAt: '2026-06-05T01:00:00.000Z',
        },
      ];
      mockHomeState = { ...WALLET_STATE, transactions: txs };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Received')).toBeTruthy();
      expect(screen.getByText('Sent')).toBeTruthy();
    });

    it('opens transaction details when a transaction is pressed', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          txid: 'abc123',
          amountSats: 10_000,
          direction: 'incoming',
          status: 'confirmed',
          createdAt: '2026-06-05T00:00:00.000Z',
        },
      ];
      mockHomeState = { ...WALLET_STATE, transactions: txs };
      const screen = renderWithTheme(<HomeScreen />);

      fireEvent.press(screen.getByTestId('transaction-tx-1'));

      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.TransactionDetails, { txid: 'abc123' });
    });

    it('shows all recent transactions', () => {
      const txs: Transaction[] = Array.from({ length: 8 }, (_, i) => ({
        id: `tx-${i}`,
        amountSats: 1_000 * (i + 1),
        direction: 'incoming' as const,
        status: 'confirmed' as const,
        createdAt: '2026-06-05T00:00:00.000Z',
      }));
      mockHomeState = { ...WALLET_STATE, transactions: txs };
      const screen = renderWithTheme(<HomeScreen />);
      const receivedItems = screen.getAllByText('Received');
      expect(receivedItems.length).toBe(8);
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      mockHomeState = { ...WALLET_STATE, isLoading: true };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Loading…')).toBeTruthy();
    });

    it('does not show empty state while loading', () => {
      mockHomeState = { ...WALLET_STATE, isLoading: true, transactions: [] };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.queryByText('No transactions yet')).toBeNull();
    });
  });

  describe('Error state', () => {
    it('shows error message when error is set', () => {
      mockHomeState = {
        ...WALLET_STATE,
        error: 'Failed to load wallet data. Pull to refresh.',
      };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Failed to load wallet data. Pull to refresh.')).toBeTruthy();
    });

    it('does not show empty state when there is an error', () => {
      mockHomeState = {
        ...WALLET_STATE,
        error: 'Failed to load wallet data. Pull to refresh.',
        transactions: [],
      };
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.queryByText('No transactions yet')).toBeNull();
    });
  });

  describe('Recent Activity section', () => {
    it('renders the Recent Activity header', () => {
      const screen = renderWithTheme(<HomeScreen />);
      expect(screen.getByText('Recent Activity')).toBeTruthy();
    });
  });
});
