import { renderHook, act } from '@testing-library/react-native';
import { useHomeWallet } from '../../../src/presentation/hooks/useHomeWallet';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockListTransactions = jest.fn<Promise<Transaction[]>, [string]>();
const mockListUtxos = jest.fn<Promise<Utxo[]>, [string]>();

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
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

  it('derives isSafeMode from nodeMode personal-node', async () => {
    mockNetworkConfig = { ...DEFAULT_NETWORK_CONFIG, nodeMode: 'personal-node' };
    const { result } = renderHook(() => useHomeWallet());
    await act(async () => {});
    expect(result.current.isSafeMode).toBe(true);
  });

  it('isSafeMode is false when nodeMode is public-api', async () => {
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
});
