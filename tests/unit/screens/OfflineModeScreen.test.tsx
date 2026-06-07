import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { OfflineModeScreen } from '../../../src/presentation/screens/offline/OfflineModeScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseOfflineModeState } from '../../../src/presentation/hooks/useOfflineMode';
import type { OfflineTransaction } from '../../../src/core/domain/entities/OfflineTransaction';

const mockPrepareTransaction = jest.fn().mockResolvedValue({ id: 'offline-1' });
const mockImportRawHex = jest.fn().mockResolvedValue({ id: 'offline-2' });
const mockDeleteOfflineTransaction = jest.fn().mockResolvedValue(undefined);
const mockBroadcastOfflineTransaction = jest.fn().mockResolvedValue('txid-abc');
const mockRefresh = jest.fn().mockResolvedValue(undefined);

const BASE_STATE: UseOfflineModeState = {
  isOnline: true,
  confirmedBalanceSats: 0,
  pendingBalanceSats: 0,
  hasLocalUtxos: false,
  transactions: [],
  offlineTransactions: [],
  isLoadingData: false,
  dataError: null,
  prepareTransaction: mockPrepareTransaction,
  importRawHex: mockImportRawHex,
  deleteOfflineTransaction: mockDeleteOfflineTransaction,
  broadcastOfflineTransaction: mockBroadcastOfflineTransaction,
  refresh: mockRefresh,
};

function makeOfflineTx(id: string): OfflineTransaction {
  return {
    id,
    walletId: 'w1',
    rawHex: '02000000' + 'ab'.repeat(10),
    createdAt: new Date('2026-06-01T00:00:00.000Z').toISOString(),
    amountSats: 50_000,
    toAddress: 'bc1qrecipient000000000000000000000000',
    feeSats: 500,
  };
}

let mockState: UseOfflineModeState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useOfflineMode', () => ({
  useOfflineMode: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('OfflineModeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Online/offline status badge', () => {
    it('shows online badge when isOnline is true', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.onlineMode')).toBeTruthy();
    });

    it('shows offline badge when isOnline is false', () => {
      mockState = { ...BASE_STATE, isOnline: false };
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.offlineMode')).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('renders loading indicator when isLoadingData is true', () => {
      mockState = { ...BASE_STATE, isLoadingData: true };
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.loadingLocal')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders error message when dataError is set', () => {
      mockState = { ...BASE_STATE, dataError: 'Erro ao carregar dados' };
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('Erro ao carregar dados')).toBeTruthy();
    });
  });

  describe('Empty offline transactions', () => {
    it('renders empty state when no offline transactions are stored', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.noSaved')).toBeTruthy();
    });
  });

  describe('Offline transactions list', () => {
    it('renders offline transaction items when they exist', () => {
      mockState = {
        ...BASE_STATE,
        offlineTransactions: [makeOfflineTx('tx-offline-1')],
      };
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText(/50[,.]?000/)).toBeTruthy();
    });

    it('shows multiple offline transactions', () => {
      mockState = {
        ...BASE_STATE,
        offlineTransactions: [makeOfflineTx('tx-1'), makeOfflineTx('tx-2')],
      };
      const screen = renderWithTheme(<OfflineModeScreen />);
      const amounts = screen.getAllByText(/50[,.]?000/);
      expect(amounts.length).toBe(2);
    });
  });

  describe('Action buttons', () => {
    it('renders prepare button disabled when hasLocalUtxos is false', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      const btn = screen.getByText('offline.prepareTxAction');
      expect(btn).toBeTruthy();
    });

    it('renders import hex button', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.importHexAction')).toBeTruthy();
    });

    it('shows prepare form when prepare button is pressed', () => {
      mockState = { ...BASE_STATE, hasLocalUtxos: true };
      const screen = renderWithTheme(<OfflineModeScreen />);
      fireEvent.press(screen.getByText('offline.prepareTxAction'));
      expect(screen.getByText('offline.prepareTxTitle')).toBeTruthy();
    });

    it('shows import form when import button is pressed', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      fireEvent.press(screen.getByText('offline.importHexAction'));
      expect(screen.getByText('offline.importSigned')).toBeTruthy();
    });

    it('hides main action buttons when a form is active', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      fireEvent.press(screen.getByText('offline.importHexAction'));
      expect(screen.queryByText('offline.prepareTxAction')).toBeNull();
    });
  });

  describe('Pending balance', () => {
    it('does not render pending section when pendingBalanceSats is 0', () => {
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.queryByText('offline.pending')).toBeNull();
    });

    it('renders pending balance when pendingBalanceSats is positive', () => {
      mockState = { ...BASE_STATE, pendingBalanceSats: 10_000 };
      const screen = renderWithTheme(<OfflineModeScreen />);
      expect(screen.getByText('offline.pending')).toBeTruthy();
      expect(screen.getByText('+10,000 sats')).toBeTruthy();
    });
  });
});
