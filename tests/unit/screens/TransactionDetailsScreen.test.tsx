import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { TransactionDetailsScreen } from '../../../src/presentation/screens/wallet/TransactionDetailsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { TransactionDetail } from '../../../src/core/domain/entities/TransactionDetail';
import type { UseTransactionDetailsState } from '../../../src/presentation/hooks/useTransactionDetails';

const TXID_OUT = 'aabbccdd' + '00'.repeat(28);
const TXID_IN  = '11223344' + '00'.repeat(28);

const TX_OUT: TransactionDetail = {
  id: 'tx-out',
  txid: TXID_OUT,
  amountSats: 100_000,
  feeSats: 900,
  direction: 'outgoing',
  status: 'confirmed',
  isConfirmed: true,
  blockHeight: 849_000,
  blockTime: 1_700_000_000,
  confirmations: 11,
  createdAt: '2026-06-01T10:00:00.000Z',
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_OUT}`,
};

const TX_IN: TransactionDetail = {
  id: 'tx-in',
  txid: TXID_IN,
  amountSats: 50_000,
  direction: 'incoming',
  status: 'pending',
  isConfirmed: false,
  createdAt: '2026-06-02T10:00:00.000Z',
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_IN}`,
};

const TXID_OUT_PENDING = 'bbbbcccc' + '00'.repeat(28);
const TX_OUT_PENDING: TransactionDetail = {
  id: 'tx-out-pending',
  txid: TXID_OUT_PENDING,
  amountSats: 75_000,
  feeSats: 500,
  direction: 'outgoing',
  status: 'pending',
  isConfirmed: false,
  address: 'bc1qrecipientaddress000000000000000000000',
  createdAt: '2026-06-03T10:00:00.000Z',
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_OUT_PENDING}`,
};

const TXID_REPLACED = 'ccccdddd' + '00'.repeat(28);
const TXID_REPLACEMENT = 'eeeeffff' + '00'.repeat(28);
const TX_REPLACED: TransactionDetail = {
  id: 'tx-replaced',
  txid: TXID_REPLACED,
  amountSats: 60_000,
  feeSats: 400,
  direction: 'outgoing',
  status: 'replaced',
  isConfirmed: false,
  replacedByTxid: TXID_REPLACEMENT,
  address: 'bc1qrecipient000000000000000000000000000',
  createdAt: '2026-06-04T10:00:00.000Z',
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_REPLACED}`,
};

const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();

const BASE_STATE: UseTransactionDetailsState = {
  transactions: [TX_OUT, TX_IN],
  isLoading: false,
  error: null,
  refresh: mockRefresh,
};

let mockState: UseTransactionDetailsState = BASE_STATE;
let mockRouteParams: { txid?: string } = {};

jest.mock('../../../src/presentation/hooks/useTransactionDetails', () => ({
  useTransactionDetails: () => mockState,
}));

jest.mock('../../../src/app/providers/TransactionHistoryProvider', () => ({
  useTransactionHistory: () => ({
    getDetail: jest.fn(),
    getRawTransaction: jest.fn().mockResolvedValue({ inputs: [], outputs: [] }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

describe('TransactionDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
    mockRouteParams = {};
  });

  describe('loading state', () => {
    it('shows loading indicator when loading with no data', () => {
      mockState = { ...BASE_STATE, transactions: [], isLoading: true };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('app-loading')).toBeTruthy();
    });

    it('does not show loading indicator when transactions are present', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('app-loading')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no transactions', () => {
      mockState = { ...BASE_STATE, transactions: [] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-empty')).toBeTruthy();
    });

    it('does not show empty state when transactions are present', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-empty')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error message when error is set', () => {
      mockState = { ...BASE_STATE, error: 'Erro ao carregar' };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-error')).toBeTruthy();
      expect(screen.getByText('Erro ao carregar')).toBeTruthy();
    });
  });

  describe('route transaction filter', () => {
    it('shows only the selected transaction when txid route param is present', () => {
      mockRouteParams = { txid: TXID_OUT };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-item-tx-out')).toBeTruthy();
      expect(screen.queryByTestId('tx-item-tx-in')).toBeNull();
    });
  });

  describe('outgoing transaction (enviada)', () => {
    it('renders the outgoing transaction card', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-item-tx-out')).toBeTruthy();
    });

    it('shows "Enviado" label for outgoing transactions', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-direction-tx-out').props.children).toBe('transactions.sent');
    });

    it('shows the amount for outgoing transactions', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-amount-tx-out')).toBeTruthy();
    });

    it('shows confirmations for confirmed outgoing transaction', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-confirmations-tx-out').props.children).toBe(11);
    });

    it('shows block height for confirmed outgoing transaction', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-block-tx-out')).toBeTruthy();
    });

    it('shows fee for outgoing transaction', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-fee-tx-out')).toBeTruthy();
    });
  });

  describe('incoming transaction (recebida)', () => {
    it('renders the incoming transaction card', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-item-tx-in')).toBeTruthy();
    });

    it('shows "Recebido" label for incoming transactions', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-direction-tx-in').props.children).toBe('transactions.received');
    });
  });

  describe('confirmed transaction', () => {
    it('shows "Confirmado" status label', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-status-tx-out').props.children).toBe('transactions.confirmed');
    });
  });

  describe('pending transaction', () => {
    it('shows "Pendente" status label for pending transaction', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-status-tx-in').props.children).toBe('transactions.pending');
    });

    it('does not show confirmations for pending transaction', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-confirmations-tx-in')).toBeNull();
    });
  });

  describe('copy txid', () => {
    it('copies txid to clipboard when pressed', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      fireEvent.press(screen.getByTestId(`tx-copy-txid-tx-out`));
      expect(Clipboard.setString).toHaveBeenCalledWith(TXID_OUT);
    });
  });

  describe('explorer by network', () => {
    it('shows explorer button when explorerUrl is set', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-explorer-tx-out')).toBeTruthy();
    });

    it('opens explorer URL when explorer button is pressed', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      fireEvent.press(screen.getByTestId('tx-explorer-tx-out'));
      expect(Linking.openURL).toHaveBeenCalledWith(TX_OUT.explorerUrl);
    });

    it('does not show explorer button when explorerUrl is empty', () => {
      const txNoExplorer: TransactionDetail = { ...TX_IN, explorerUrl: '' };
      mockState = { ...BASE_STATE, transactions: [txNoExplorer] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-explorer-tx-in')).toBeNull();
    });
  });

  describe('refresh', () => {
    it('shows refresh button when transactions are present', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('btn-refresh')).toBeTruthy();
    });

    it('calls refresh when refresh button is pressed', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      fireEvent.press(screen.getByTestId('btn-refresh'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('accelerate button (RBF)', () => {
    it('shows accelerate button for pending outgoing transactions', () => {
      mockState = { ...BASE_STATE, transactions: [TX_OUT_PENDING] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-accelerate-tx-out-pending')).toBeTruthy();
    });

    it('does not show accelerate button for confirmed outgoing transactions', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-accelerate-tx-out')).toBeNull();
    });

    it('does not show accelerate button for incoming transactions', () => {
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-accelerate-tx-in')).toBeNull();
    });

    it('does not show accelerate button for replaced transactions', () => {
      mockState = { ...BASE_STATE, transactions: [TX_REPLACED] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.queryByTestId('tx-accelerate-tx-replaced')).toBeNull();
    });

    it('navigates to AccelerateTransaction when accelerate button is pressed', () => {
      mockState = { ...BASE_STATE, transactions: [TX_OUT_PENDING] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      fireEvent.press(screen.getByTestId('tx-accelerate-tx-out-pending'));
      expect(mockNavigate).toHaveBeenCalledWith('AccelerateTransaction', {
        txid: TXID_OUT_PENDING,
        toAddress: TX_OUT_PENDING.address,
        amountSats: TX_OUT_PENDING.amountSats,
        feeSats: TX_OUT_PENDING.feeSats,
        isConfirmed: false,
      });
    });
  });

  describe('replaced transaction', () => {
    it('shows replaced status badge for replaced transactions', () => {
      mockState = { ...BASE_STATE, transactions: [TX_REPLACED] };
      const screen = renderWithTheme(<TransactionDetailsScreen />);
      expect(screen.getByTestId('tx-status-tx-replaced').props.children).toBe('transactions.replaced');
    });
  });
});
