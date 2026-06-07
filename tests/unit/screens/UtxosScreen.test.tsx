import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { UtxosScreen } from '../../../src/presentation/screens/wallet/UtxosScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseUtxosState } from '../../../src/presentation/hooks/useUtxos';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';

const mockFreeze = jest.fn().mockResolvedValue(undefined);
const mockUnfreeze = jest.fn().mockResolvedValue(undefined);
const mockSetFilter = jest.fn();
const mockListAddresses = jest.fn().mockResolvedValue([]);
const mockGoBack = jest.fn();

const MOCK_WALLET = { id: 'w1', name: 'Test Wallet', network: 'testnet4', status: 'unlocked', createdAt: '' };

const BASE_STATE: UseUtxosState = {
  utxos: [],
  isLoading: false,
  error: null,
  filter: 'all',
  setFilter: mockSetFilter,
  freeze: mockFreeze,
  unfreeze: mockUnfreeze,
  refresh: jest.fn().mockResolvedValue(undefined),
};

function makeUtxo(txid: string, valueSats: number, isConfirmed = true, isFrozen = false): Utxo {
  return { txid, vout: 0, valueSats, address: 'bc1qtest', isConfirmed, isFrozen };
}

function makeAddress(address: string, originId: string, originName: string, accountIndex = 0): WalletAddress {
  return {
    id: `addr-${address}`,
    walletId: 'w1',
    originId,
    originName,
    address,
    path: `m/84'/0'/${accountIndex}'/0/0`,
    accountIndex,
    chain: 'receive',
    index: 0,
    status: 'received',
    totalReceivedSats: 0,
    totalSentSats: 0,
    txCount: 0,
    incomingTxCount: 0,
    outgoingTxCount: 0,
    hasUtxos: true,
    isFrozen: false,
    createdAt: '',
    usedAt: null,
    lastSyncedAt: null,
  };
}

let mockState: UseUtxosState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useUtxos', () => ({
  useUtxos: () => mockState,
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: MOCK_WALLET,
    wallets: [MOCK_WALLET],
    listUtxos: jest.fn().mockResolvedValue([]),
    listTransactions: jest.fn().mockResolvedValue([]),
    freezeUtxo: jest.fn(),
    unfreezeUtxo: jest.fn(),
    syncWallet: jest.fn(),
    createWallet: jest.fn(),
    importWallet: jest.fn(),
    deleteWallet: jest.fn(),
    selectWallet: jest.fn(),
    generateReceiveAddress: jest.fn(),
  }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    getOrigins: jest.fn().mockResolvedValue([]),
    createAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: mockListAddresses,
  }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('UtxosScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
    mockListAddresses.mockResolvedValue([]);
  });

  describe('Loading state', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.loading')).toBeTruthy();
    });

    it('does not render empty state while loading', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.queryByText('utxos.empty')).toBeNull();
    });
  });

  describe('Error state', () => {
    it('renders error message when error is set', () => {
      mockState = { ...BASE_STATE, error: 'Failed to load UTXOs' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('Failed to load UTXOs')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('renders default empty state when no UTXOs', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.empty')).toBeTruthy();
      expect(screen.getByText('utxos.syncToLoad')).toBeTruthy();
    });

    it('renders frozen-specific empty state for frozen filter', () => {
      mockState = { ...BASE_STATE, filter: 'frozen' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.noFrozen')).toBeTruthy();
    });

    it('renders pending-specific empty state for pending filter', () => {
      mockState = { ...BASE_STATE, filter: 'pending' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.noPending')).toBeTruthy();
    });
  });

  describe('UTXO list', () => {
    it('shows summary row when UTXOs exist', () => {
      mockState = {
        ...BASE_STATE,
        utxos: [makeUtxo('a'.repeat(64), 100_000), makeUtxo('b'.repeat(64), 200_000)],
      };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.count')).toBeTruthy();
      expect(screen.getByText('utxos.total')).toBeTruthy();
    });

    it('shows singular UTXO count when there is exactly 1', () => {
      mockState = { ...BASE_STATE, utxos: [makeUtxo('a'.repeat(64), 50_000)] };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.count')).toBeTruthy();
    });

    it('does not show summary row when there are no UTXOs', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.queryByText('utxos.total')).toBeNull();
    });
  });

  describe('Filter chips', () => {
    it('renders all filter chip labels', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.all')).toBeTruthy();
      expect(screen.getByText('utxos.confirmed')).toBeTruthy();
      expect(screen.getByText('utxos.pending')).toBeTruthy();
    });

    it('calls setFilter when a filter chip is pressed', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      fireEvent.press(screen.getByText('utxos.confirmed'));
      expect(mockSetFilter).toHaveBeenCalledWith('confirmed');
    });
  });

  describe('Screen title', () => {
    it('renders UTXOs as screen title', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.title')).toBeTruthy();
    });
  });

  describe('Origin grouping', () => {
    it('groups UTXOs under origin name when address map is available', async () => {
      mockListAddresses.mockResolvedValue([
        makeAddress('bc1qtest', 'origin-1', 'Savings', 1),
      ]);
      mockState = {
        ...BASE_STATE,
        utxos: [makeUtxo('a'.repeat(64), 50_000)],
      };
      const screen = renderWithTheme(<UtxosScreen />);
      // Origin header appears after addresses load — wait for async
      const header = await screen.findByText('Savings');
      expect(header).toBeTruthy();
    });

    it('shows "Other" group for UTXOs with unrecognised addresses', () => {
      mockListAddresses.mockResolvedValue([]);
      mockState = {
        ...BASE_STATE,
        utxos: [makeUtxo('a'.repeat(64), 50_000)],
      };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('utxos.otherOrigin')).toBeTruthy();
    });
  });
});
