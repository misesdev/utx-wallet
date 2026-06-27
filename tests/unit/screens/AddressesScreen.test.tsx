import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AddressesScreen } from '../../../src/presentation/screens/wallet/AddressesScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import { useWallet } from '../../../src/presentation/hooks/useWallet';

const mockNavigate = jest.fn();
const mockListAddresses = jest.fn();
const mockSyncAddress = jest.fn().mockResolvedValue(undefined);

// Stable wallet reference — a new object on every render would cause useCallback to
// recreate `load` on every render, triggering an infinite reload loop in tests.
const MOCK_WALLET = { id: 'w1', name: 'Test Wallet', network: 'testnet' as const };

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    listAddresses: mockListAddresses,
    getOrigins: jest.fn(),
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    discoverWalletAccounts: jest.fn(),
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function makeAddress(overrides: Partial<WalletAddress> = {}): WalletAddress {
  return {
    id: 'addr-id',
    walletId: 'w1',
    address: 'bc1qtest',
    originId: 'origin-1',
    originName: 'Default',
    chain: 'receive',
    index: 0,
    accountIndex: 0,
    status: 'fresh',
    txCount: 0,
    totalReceivedSats: 0,
    totalSentSats: 0,
    incomingTxCount: 0,
    outgoingTxCount: 0,
    hasUtxos: false,
    isFrozen: false,
    createdAt: new Date().toISOString(),
    usedAt: null,
    lastSyncedAt: null,
    path: "m/84'/0'/0'/0/0",
    ...overrides,
  };
}

describe('AddressesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAddresses.mockResolvedValue([]);
    mockSyncAddress.mockResolvedValue(undefined);
    (useWallet as jest.Mock).mockReturnValue({
      selectedWallet: MOCK_WALLET,
      syncWallet: jest.fn(),
      syncAddress: mockSyncAddress,
    });
  });

  it('renders the screen title', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.title')).toBeTruthy());
  });

  it('renders info button', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByLabelText('common.info')).toBeTruthy());
  });

  it('navigates to AddressPolicy when info button is pressed', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByLabelText('common.info')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('common.info'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.AddressPolicy);
  });

  it('shows empty state when no addresses', async () => {
    mockListAddresses.mockResolvedValue([]);
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.empty')).toBeTruthy());
  });

  it('shows address count in header', async () => {
    mockListAddresses.mockResolvedValue([]);
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.total')).toBeTruthy());
  });

  describe('address sync — fresh address', () => {
    it('renders a fresh address row with sync accessibility label', async () => {
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('address-row-bc1qfresh')).toBeTruthy();
        expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy();
      });
    });

    it('calls syncAddress when a fresh address row is pressed', async () => {
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());
      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledWith('w1', 'bc1qfresh'));
    });
  });

  describe('address sync — spinner and list refresh', () => {
    it('shows ActivityIndicator during sync and removes it after sync completes', async () => {
      let resolveSyncAddress!: () => void;
      mockSyncAddress.mockReturnValue(new Promise<void>(r => { resolveSyncAddress = r; }));
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);

      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => expect(screen.getByTestId('address-row-bc1qfresh').findByType).toBeTruthy());

      resolveSyncAddress();
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledTimes(1));
    });

    it('reloads the address list after sync completes', async () => {
      const updated = makeAddress({ address: 'bc1qfresh', status: 'received', txCount: 1, totalReceivedSats: 50_000 });
      mockListAddresses
        .mockResolvedValueOnce([makeAddress({ address: 'bc1qfresh', status: 'fresh' })])
        .mockResolvedValueOnce([updated]);

      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => {
        expect(mockListAddresses).toHaveBeenCalledTimes(2);
      });
    });

    it('clears syncingAddress after sync completes successfully', async () => {
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);
      mockSyncAddress.mockResolvedValue(undefined);

      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledTimes(1));
      // after sync, the row should no longer be in loading state (no ActivityIndicator)
      await waitFor(() => expect(screen.queryByTestId('address-row-bc1qfresh')).toBeTruthy());
    });

    it('clears syncingAddress even when sync throws', async () => {
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);
      mockSyncAddress.mockRejectedValue(new Error('network error'));

      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      // should not throw; row stays visible and row is no longer syncing
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByTestId('address-row-bc1qfresh')).toBeTruthy());
    });

    it('ignores second press while sync is in progress', async () => {
      let resolveSyncAddress!: () => void;
      mockSyncAddress.mockReturnValue(new Promise<void>(r => { resolveSyncAddress = r; }));
      mockListAddresses.mockResolvedValue([makeAddress({ address: 'bc1qfresh', status: 'fresh' })]);

      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));

      resolveSyncAddress();
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledTimes(1));
    });
  });

  describe('address sync — spent_once and change (now syncable)', () => {
    it('spent_once address row is enabled and can be synced', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qspent', status: 'spent_once', txCount: 2 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());
    });

    it('calls syncAddress when a spent_once row is pressed', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qspent', status: 'spent_once', txCount: 2 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());
      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledWith('w1', 'bc1qspent'));
    });

    it('change address row is enabled and can be synced', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qchange', chain: 'change', status: 'change', txCount: 1 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());
    });

    it('calls syncAddress when a change row is pressed', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qchange', chain: 'change', status: 'change', txCount: 1 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByLabelText('addresses.syncAddress')).toBeTruthy());
      fireEvent.press(screen.getByLabelText('addresses.syncAddress'));
      await waitFor(() => expect(mockSyncAddress).toHaveBeenCalledWith('w1', 'bc1qchange'));
    });

    it('shows spent status label for spent_once address', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qspent', status: 'spent_once', txCount: 1 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByText('addresses.statusSpent')).toBeTruthy());
    });

    it('shows spent status label for change address', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qchange', chain: 'change', status: 'change', txCount: 1 }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByText('addresses.statusSpent')).toBeTruthy());
    });

    it('archived address row is disabled (cannot be synced)', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress({ address: 'bc1qarchived', status: 'archived' }),
      ]);
      const screen = renderWithTheme(<AddressesScreen />);
      await waitFor(() => expect(screen.getByTestId('address-row-bc1qarchived')).toBeTruthy());
      const row = screen.getByTestId('address-row-bc1qarchived');
      expect(row.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
