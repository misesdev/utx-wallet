import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTransactionDetails } from '../../../src/presentation/hooks/useTransactionDetails';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { TransactionDetail } from '../../../src/core/domain/entities/TransactionDetail';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

const TXID_OUT = 'aabbccdd' + '00'.repeat(28);
const TXID_IN  = '11223344' + '00'.repeat(28);

const TX_OUTGOING: Transaction = {
  id: 'tx-out',
  txid: TXID_OUT,
  amountSats: 100_000,
  feeSats: 900,
  direction: 'outgoing',
  status: 'confirmed',
  createdAt: '2026-06-01T10:00:00.000Z',
};

const TX_INCOMING: Transaction = {
  id: 'tx-in',
  txid: TXID_IN,
  amountSats: 50_000,
  direction: 'incoming',
  status: 'pending',
  createdAt: '2026-06-02T10:00:00.000Z',
};

const DETAIL_OUT: TransactionDetail = {
  ...TX_OUTGOING,
  blockHeight: 849_000,
  blockTime: 1_700_000_000,
  confirmations: 11,
  isConfirmed: true,
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_OUT}`,
};

const DETAIL_IN: TransactionDetail = {
  ...TX_INCOMING,
  isConfirmed: false,
  explorerUrl: `https://mempool.space/testnet4/tx/${TXID_IN}`,
};

const mockListTransactions = jest.fn<Promise<Transaction[]>, [string]>();
const mockGetDetail = jest.fn<Promise<TransactionDetail>, [Transaction, string]>();

let mockSelectedWallet: Wallet | null = WALLET;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
    listTransactions: mockListTransactions,
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({ networkConfig: { network: 'testnet4' } }),
}));

jest.mock('../../../src/app/providers/TransactionHistoryProvider', () => ({
  useTransactionHistory: () => ({ getDetail: mockGetDetail }),
}));

describe('useTransactionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockListTransactions.mockResolvedValue([TX_OUTGOING, TX_INCOMING]);
    mockGetDetail.mockImplementation((tx: Transaction) => {
      if (tx.id === 'tx-out') return Promise.resolve(DETAIL_OUT);
      return Promise.resolve(DETAIL_IN);
    });
  });

  describe('initial load', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useTransactionDetails());
      expect(result.current.isLoading).toBe(true);
    });

    it('loads transactions from the wallet', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockListTransactions).toHaveBeenCalledWith(WALLET.id);
    });

    it('enriches each transaction with remote detail', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGetDetail).toHaveBeenCalledTimes(2);
    });

    it('returns empty list when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.transactions).toHaveLength(0);
    });
  });

  describe('outgoing transaction (enviada)', () => {
    it('returns outgoing transaction with correct direction', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const outTx = result.current.transactions.find(t => t.id === 'tx-out');
      expect(outTx?.direction).toBe('outgoing');
    });

    it('returns confirmations for confirmed outgoing transaction', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const outTx = result.current.transactions.find(t => t.id === 'tx-out');
      expect(outTx?.confirmations).toBe(11);
    });

    it('returns explorer URL for outgoing transaction', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const outTx = result.current.transactions.find(t => t.id === 'tx-out');
      expect(outTx?.explorerUrl).toContain(TXID_OUT);
    });
  });

  describe('incoming transaction (recebida)', () => {
    it('returns incoming transaction with correct direction', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const inTx = result.current.transactions.find(t => t.id === 'tx-in');
      expect(inTx?.direction).toBe('incoming');
    });

    it('marks pending transaction as not confirmed', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const inTx = result.current.transactions.find(t => t.id === 'tx-in');
      expect(inTx?.isConfirmed).toBe(false);
    });
  });

  describe('confirmed transaction', () => {
    it('marks confirmed transaction as isConfirmed=true', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const outTx = result.current.transactions.find(t => t.id === 'tx-out');
      expect(outTx?.isConfirmed).toBe(true);
    });
  });

  describe('pending transaction', () => {
    it('marks pending transaction as isConfirmed=false', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const inTx = result.current.transactions.find(t => t.id === 'tx-in');
      expect(inTx?.isConfirmed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('sets error message when listTransactions throws', async () => {
      mockListTransactions.mockRejectedValue(new AppError('DB error', 'DB_ERROR'));
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('DB error');
    });

    it('falls back to local detail when getDetail throws for a specific tx', async () => {
      mockGetDetail.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // Still returns both transactions (with local fallback)
      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh', () => {
    it('reloads transactions when refresh is called', async () => {
      const { result } = renderHook(() => useTransactionDetails());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => { await result.current.refresh(); });

      expect(mockListTransactions).toHaveBeenCalledTimes(2);
    });
  });
});
