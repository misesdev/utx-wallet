import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineMode } from '../../../src/presentation/hooks/useOfflineMode';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { OfflineTransaction } from '../../../src/core/domain/entities/OfflineTransaction';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-06T00:00:00.000Z',
};

const UTXO_CONFIRMED: Utxo = { txid: 'tx1', vout: 0, valueSats: 200_000, address: 'tb1qtest', isConfirmed: true };
const UTXO_PENDING: Utxo = { txid: 'tx2', vout: 0, valueSats: 50_000, address: 'tb1qtest', isConfirmed: false };

const TX: Transaction = {
  id: 'tx-1',
  txid: 'aabb',
  amountSats: 100_000,
  direction: 'incoming',
  status: 'confirmed',
  createdAt: '2026-06-06T00:00:00.000Z',
};

const OFFLINE_TX: OfflineTransaction = {
  id: 'offline-1',
  walletId: WALLET.id,
  rawHex: 'deadbeef',
  txid: 'abcd',
  amountSats: 100_000,
  feeSats: 500,
  toAddress: 'tb1qrecipient',
  createdAt: '2026-06-06T00:00:00.000Z',
};

const ONLINE_CONFIG: NetworkConfig = { connectivityMode: 'online', personalNodes: [], allowPublicFallback: false };
const OFFLINE_CONFIG: NetworkConfig = { connectivityMode: 'offline', personalNodes: [], allowPublicFallback: false };

const mockListTransactions = jest.fn<Promise<Transaction[]>, [string]>();
const mockListUtxos = jest.fn<Promise<Utxo[]>, [string]>();

// Stable service object — same reference across renders to avoid infinite useEffect loop.
// (Every render calls useOfflineModeService(); returning a new {} each time would cause
// offlineService → load → useEffect to fire on every render.)
const mockOfflineService = {
  prepareTransaction: jest.fn<Promise<OfflineTransaction>, [any]>(),
  importRawHex: jest.fn<Promise<OfflineTransaction>, [string, string, any?]>(),
  listTransactions: jest.fn<Promise<OfflineTransaction[]>, [string]>(),
  deleteTransaction: jest.fn<Promise<void>, [string]>(),
  broadcastTransaction: jest.fn<Promise<string>, [OfflineTransaction]>(),
};

let mockSelectedWallet: Wallet | null = WALLET;
let mockNetworkConfig: NetworkConfig = ONLINE_CONFIG;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
    listTransactions: mockListTransactions,
    listUtxos: mockListUtxos,
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
    isOnline: mockNetworkConfig.connectivityMode === 'online',
  }),
}));

jest.mock('../../../src/app/providers/OfflineModeProvider', () => ({
  useOfflineModeService: () => mockOfflineService,
}));

describe('useOfflineMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockNetworkConfig = ONLINE_CONFIG;
    mockListTransactions.mockResolvedValue([TX]);
    mockListUtxos.mockResolvedValue([UTXO_CONFIRMED, UTXO_PENDING]);
    mockOfflineService.listTransactions.mockResolvedValue([]);
    mockOfflineService.prepareTransaction.mockResolvedValue(OFFLINE_TX);
    mockOfflineService.importRawHex.mockResolvedValue(OFFLINE_TX);
    mockOfflineService.deleteTransaction.mockResolvedValue(undefined);
    mockOfflineService.broadcastTransaction.mockResolvedValue('txid-broadcast');
  });

  describe('sem internet (offline mode)', () => {
    it('reflects isOnline=false when connectivity is offline', async () => {
      mockNetworkConfig = OFFLINE_CONFIG;
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.isOnline).toBe(false);
    });

    it('still loads local data when offline', async () => {
      mockNetworkConfig = OFFLINE_CONFIG;
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.confirmedBalanceSats).toBe(200_000);
    });
  });

  describe('dados locais disponíveis (local data available)', () => {
    it('loads transactions from local storage', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.transactions).toHaveLength(1);
    });

    it('computes confirmedBalanceSats from local confirmed UTXOs', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.confirmedBalanceSats).toBe(200_000);
    });

    it('computes pendingBalanceSats from local unconfirmed UTXOs', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.pendingBalanceSats).toBe(50_000);
    });

    it('sets hasLocalUtxos=true when confirmed UTXOs exist', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.hasLocalUtxos).toBe(true);
    });

    it('loads offline transactions from service', async () => {
      mockOfflineService.listTransactions.mockResolvedValue([OFFLINE_TX]);
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.offlineTransactions).toHaveLength(1);
    });

    it('calls listTransactions and listUtxos with walletId', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(mockListTransactions).toHaveBeenCalledWith(WALLET.id);
      expect(mockListUtxos).toHaveBeenCalledWith(WALLET.id);
    });
  });

  describe('dados locais indisponíveis (local data unavailable)', () => {
    it('sets dataError when listTransactions throws', async () => {
      mockListTransactions.mockRejectedValue(new AppError('DB error', 'DB_ERROR'));
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.dataError).toBe('DB error');
    });

    it('returns empty arrays when no wallet selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.transactions).toHaveLength(0);
      expect(result.current.offlineTransactions).toHaveLength(0);
      expect(result.current.hasLocalUtxos).toBe(false);
    });

    it('sets hasLocalUtxos=false when all UTXOs are pending', async () => {
      mockListUtxos.mockResolvedValue([UTXO_PENDING]);
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      expect(result.current.hasLocalUtxos).toBe(false);
    });
  });

  describe('criar transação offline (prepareTransaction)', () => {
    it('calls service.prepareTransaction with wallet params', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => {
        await result.current.prepareTransaction({
          toAddress: 'tb1qtest',
          amountSats: 100_000,
          feeRateSatsPerVByte: 5,
        });
      });
      expect(mockOfflineService.prepareTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: WALLET.id,
          walletNetwork: WALLET.network,
          toAddress: 'tb1qtest',
          amountSats: 100_000,
        }),
      );
    });

    it('adds the prepared transaction to offlineTransactions list', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => {
        await result.current.prepareTransaction({
          toAddress: 'tb1qtest',
          amountSats: 100_000,
          feeRateSatsPerVByte: 5,
        });
      });
      expect(result.current.offlineTransactions).toHaveLength(1);
    });

    it('throws NO_WALLET when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await expect(
        act(async () => {
          await result.current.prepareTransaction({
            toAddress: 'tb1qtest',
            amountSats: 100_000,
            feeRateSatsPerVByte: 5,
          });
        }),
      ).rejects.toMatchObject({ code: 'NO_WALLET' });
    });
  });

  describe('importar hex (importRawHex)', () => {
    it('calls service.importRawHex with walletId and hex', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => { await result.current.importRawHex('deadbeef01'); });
      expect(mockOfflineService.importRawHex).toHaveBeenCalledWith(WALLET.id, 'deadbeef01');
    });

    it('adds imported transaction to offlineTransactions', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => { await result.current.importRawHex('deadbeef01'); });
      expect(result.current.offlineTransactions).toHaveLength(1);
    });
  });

  describe('remover e transmitir (delete + broadcast)', () => {
    it('removes offline transaction from list after delete', async () => {
      mockOfflineService.listTransactions.mockResolvedValue([OFFLINE_TX]);
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => { await result.current.deleteOfflineTransaction(OFFLINE_TX.id); });
      expect(result.current.offlineTransactions).toHaveLength(0);
    });

    it('removes offline transaction from list after broadcast', async () => {
      mockOfflineService.listTransactions.mockResolvedValue([OFFLINE_TX]);
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      await act(async () => { await result.current.broadcastOfflineTransaction(OFFLINE_TX); });
      expect(result.current.offlineTransactions).toHaveLength(0);
    });

    it('returns txid after broadcast', async () => {
      const { result } = renderHook(() => useOfflineMode());
      await waitFor(() => expect(result.current.isLoadingData).toBe(false));
      let txid: string | undefined;
      await act(async () => { txid = await result.current.broadcastOfflineTransaction(OFFLINE_TX); });
      expect(txid).toBe('txid-broadcast');
    });
  });
});
