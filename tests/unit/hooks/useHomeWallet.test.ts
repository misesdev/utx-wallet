import { renderHook, act } from '@testing-library/react-native';
import { useHomeWallet } from '../../../src/presentation/hooks/useHomeWallet';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import { useActiveWalletStore } from '../../../src/presentation/store/activeWalletStore';

const mockListTransactions = jest.fn<Promise<Transaction[]>, [string]>();
const mockListUtxos = jest.fn<Promise<Utxo[]>, [string]>();

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
};

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

let mockSelectedWallet: Wallet | null = WALLET;
let mockNetworkConfig: NetworkConfig = DEFAULT_NETWORK_CONFIG;

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

describe('useHomeWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockNetworkConfig = DEFAULT_NETWORK_CONFIG;
    mockListTransactions.mockResolvedValue([]);
    mockListUtxos.mockResolvedValue([]);
    // Reset the Zustand store between tests so state doesn't leak
    useActiveWalletStore.getState().clear();
  });

  it('initializes with loading=false and empty data', async () => {
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.transactions).toEqual([]);
    expect(result.current.confirmedBalanceSats).toBe(0);
    expect(result.current.pendingBalanceSats).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('exposes the selected wallet', async () => {
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.wallet).toEqual(WALLET);
  });

  it('returns null wallet when no wallet is selected', async () => {
    mockSelectedWallet = null;
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.wallet).toBeNull();
    expect(result.current.transactions).toEqual([]);
    expect(result.current.confirmedBalanceSats).toBe(0);
  });

  it('exposes networkConfig and isOnline', async () => {
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.networkConfig).toEqual(DEFAULT_NETWORK_CONFIG);
    expect(result.current.isOnline).toBe(true);
  });

  it('derives isSafeMode from personalNodes and allowPublicFallback', async () => {
    mockNetworkConfig = {
      connectivityMode: 'online',
      personalNodes: [{ id: 'n1', label: 'Node', url: 'http://n.local', network: 'testnet4', priority: 1 }],
      allowPublicFallback: false,
    };
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.isSafeMode).toBe(true);
  });

  it('isSafeMode is false when allowPublicFallback is true', async () => {
    mockNetworkConfig = {
      connectivityMode: 'online',
      personalNodes: [{ id: 'n1', label: 'Node', url: 'http://n.local', network: 'testnet4', priority: 1 }],
      allowPublicFallback: true,
    };
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.isSafeMode).toBe(false);
  });

  it('isSafeMode is false when no personal nodes configured', async () => {
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.isSafeMode).toBe(false);
  });

  it('calculates confirmedBalanceSats from confirmed UTXOs', async () => {
    const utxos: Utxo[] = [
      { txid: 'a', vout: 0, valueSats: 100_000, address: 'tb1q…', isConfirmed: true },
      { txid: 'b', vout: 0, valueSats: 50_000, address: 'tb1q…', isConfirmed: true },
      { txid: 'c', vout: 0, valueSats: 25_000, address: 'tb1q…', isConfirmed: false },
    ];
    mockListUtxos.mockResolvedValue(utxos);
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.confirmedBalanceSats).toBe(150_000);
  });

  it('calculates pendingBalanceSats from unconfirmed UTXOs', async () => {
    const utxos: Utxo[] = [
      { txid: 'a', vout: 0, valueSats: 10_000, address: 'tb1q…', isConfirmed: false },
      { txid: 'b', vout: 1, valueSats: 5_000, address: 'tb1q…', isConfirmed: false },
      { txid: 'c', vout: 0, valueSats: 200_000, address: 'tb1q…', isConfirmed: true },
    ];
    mockListUtxos.mockResolvedValue(utxos);
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.pendingBalanceSats).toBe(15_000);
  });

  it('loads and exposes transactions list', async () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        amountSats: 10_000,
        direction: 'incoming',
        status: 'confirmed',
        createdAt: '2026-06-05T00:00:00.000Z',
      },
    ];
    mockListTransactions.mockResolvedValue(txs);
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.transactions).toEqual(txs);
  });

  it('sets error when data loading fails', async () => {
    mockListTransactions.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.error).toBe('home.errorLoadWalletData');
    expect(result.current.isLoading).toBe(false);
  });

  it('clears error and reloads on refresh call', async () => {
    mockListTransactions.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.error).toBeTruthy();

    mockListTransactions.mockResolvedValue([]);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toBeNull();
  });

  it('skips data loading when no wallet is selected', async () => {
    mockSelectedWallet = null;
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(mockListUtxos).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('calls listTransactions and listUtxos with wallet id', async () => {
    renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(mockListTransactions).toHaveBeenCalledWith(WALLET.id);
    expect(mockListUtxos).toHaveBeenCalledWith(WALLET.id);
  });

  it('exposes a refresh function that reloads data', async () => {
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(mockListTransactions).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.refresh(); });
    expect(mockListTransactions).toHaveBeenCalledTimes(2);
  });

  describe('transaction sorting', () => {
    it('returns transactions sorted by createdAt descending (newest first)', async () => {
      const txs: Transaction[] = [
        { id: 'tx-old', amountSats: 1_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-01T00:00:00.000Z' },
        { id: 'tx-new', amountSats: 2_000, direction: 'outgoing', status: 'pending', createdAt: '2026-06-10T00:00:00.000Z' },
        { id: 'tx-mid', amountSats: 500, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-05T00:00:00.000Z' },
      ];
      mockListTransactions.mockResolvedValue(txs);
      const { result } = renderHook(() => useHomeWallet());
      await act(async () => {});
      const ids = result.current.transactions.map(tx => tx.id);
      expect(ids).toEqual(['tx-new', 'tx-mid', 'tx-old']);
    });

    it('places a pending tx above confirmed txs even when its createdAt is older', async () => {
      // Scenario: user sent tx-pending at 15:00. A previous tx confirmed at block_time=15:02.
      // The pending tx createdAt (15:00) < confirmed createdAt (15:02), but pending must appear first.
      const txs: Transaction[] = [
        { id: 'tx-confirmed-recent', amountSats: 50_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-10T15:02:00.000Z' },
        { id: 'tx-pending-older', amountSats: 10_000, direction: 'outgoing', status: 'pending', createdAt: '2026-06-10T15:00:00.000Z' },
        { id: 'tx-confirmed-old', amountSats: 1_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-09T10:00:00.000Z' },
      ];
      mockListTransactions.mockResolvedValue(txs);
      const { result } = renderHook(() => useHomeWallet());
      await act(async () => {});
      const ids = result.current.transactions.map(tx => tx.id);
      // pending always first, then confirmed by date
      expect(ids).toEqual(['tx-pending-older', 'tx-confirmed-recent', 'tx-confirmed-old']);
    });

    it('does not mutate the original array from listTransactions', async () => {
      const txs: Transaction[] = [
        { id: 'tx-1', amountSats: 1_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-01T00:00:00.000Z' },
        { id: 'tx-2', amountSats: 2_000, direction: 'outgoing', status: 'pending', createdAt: '2026-06-10T00:00:00.000Z' },
      ];
      mockListTransactions.mockResolvedValue(txs);
      const { result } = renderHook(() => useHomeWallet());
      await act(async () => {});
      // The sorted result is different from the original but the original is unchanged
      expect(result.current.transactions[0].id).toBe('tx-2');
      expect(txs[0].id).toBe('tx-1'); // original array order unchanged
    });
  });

  describe('initial loading state', () => {
    it('starts with isLoading=true before effects complete', () => {
      mockListTransactions.mockImplementation(() => new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useHomeWallet());
      expect(result.current.isLoading).toBe(true);
    });

    it('sets isLoading=false and shows empty transactions when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useHomeWallet());
      await act(async () => {});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.transactions).toEqual([]);
    });
  });
});
