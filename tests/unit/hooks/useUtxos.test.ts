import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUtxos } from '../../../src/presentation/hooks/useUtxos';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

function makeUtxo(txid: string, vout = 0, valueSats = 100_000, isConfirmed = true, isFrozen = false): Utxo {
  return { txid, vout, valueSats, address: 'tb1qtest', isConfirmed, isFrozen };
}

const UTXO_A = makeUtxo('aaaa', 0, 300_000, true, false);
const UTXO_B = makeUtxo('bbbb', 0, 100_000, false, false);
const UTXO_C = makeUtxo('cccc', 0, 200_000, true, true);

const mockListUtxos = jest.fn<Promise<Utxo[]>, [string]>();
const mockFreezeUtxo = jest.fn<Promise<void>, [string, string, number]>();
const mockUnfreezeUtxo = jest.fn<Promise<void>, [string, string, number]>();

let mockSelectedWallet: Wallet | null = WALLET;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
    listUtxos: mockListUtxos,
    freezeUtxo: mockFreezeUtxo,
    unfreezeUtxo: mockUnfreezeUtxo,
  }),
}));

describe('useUtxos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockListUtxos.mockResolvedValue([UTXO_A, UTXO_B, UTXO_C]);
    mockFreezeUtxo.mockResolvedValue(undefined);
    mockUnfreezeUtxo.mockResolvedValue(undefined);
  });

  describe('listagem (listing)', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useUtxos());
      expect(result.current.isLoading).toBe(true);
    });

    it('loads UTXOs for the selected wallet', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockListUtxos).toHaveBeenCalledWith(WALLET.id);
    });

    it('returns all UTXOs when filter is "all"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.utxos).toHaveLength(3);
    });

    it('returns empty list when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.utxos).toHaveLength(0);
    });

    it('sets error message when listUtxos throws', async () => {
      mockListUtxos.mockRejectedValue(new AppError('DB error', 'DB_ERROR'));
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('DB error');
    });

    it('reloads UTXOs when refresh is called', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.refresh(); });
      expect(mockListUtxos).toHaveBeenCalledTimes(2);
    });
  });

  describe('filtros (filters)', () => {
    it('sorts by highest value when filter is "highest-value"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setFilter('highest-value'));
      expect(result.current.utxos[0].valueSats).toBe(300_000);
      expect(result.current.utxos[1].valueSats).toBe(200_000);
      expect(result.current.utxos[2].valueSats).toBe(100_000);
    });

    it('sorts by lowest value when filter is "lowest-value"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setFilter('lowest-value'));
      expect(result.current.utxos[0].valueSats).toBe(100_000);
      expect(result.current.utxos[1].valueSats).toBe(200_000);
      expect(result.current.utxos[2].valueSats).toBe(300_000);
    });

    it('shows only confirmed non-frozen UTXOs when filter is "confirmed"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setFilter('confirmed'));
      // UTXO_A is confirmed and not frozen; UTXO_B is pending; UTXO_C is confirmed but frozen
      expect(result.current.utxos).toHaveLength(1);
      expect(result.current.utxos[0].txid).toBe('aaaa');
    });

    it('shows only pending UTXOs when filter is "pending"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setFilter('pending'));
      expect(result.current.utxos).toHaveLength(1);
      expect(result.current.utxos[0].txid).toBe('bbbb');
    });

    it('shows only frozen UTXOs when filter is "frozen"', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setFilter('frozen'));
      expect(result.current.utxos).toHaveLength(1);
      expect(result.current.utxos[0].txid).toBe('cccc');
    });
  });

  describe('congelar UTXO (freeze)', () => {
    it('calls freezeUtxo with wallet id, txid and vout', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.freeze('aaaa', 0); });
      expect(mockFreezeUtxo).toHaveBeenCalledWith(WALLET.id, 'aaaa', 0);
    });

    it('sets isFrozen=true on the UTXO after freeze', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.freeze('aaaa', 0); });
      const updated = result.current.utxos.find(u => u.txid === 'aaaa');
      expect(updated?.isFrozen).toBe(true);
    });

    it('does not affect other UTXOs when freezing one', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.freeze('aaaa', 0); });
      const other = result.current.utxos.find(u => u.txid === 'bbbb');
      expect(other?.isFrozen).toBeFalsy();
    });

    it('does not freeze when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.freeze('aaaa', 0); });
      expect(mockFreezeUtxo).not.toHaveBeenCalled();
    });
  });

  describe('descongelar UTXO (unfreeze)', () => {
    it('calls unfreezeUtxo with wallet id, txid and vout', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.unfreeze('cccc', 0); });
      expect(mockUnfreezeUtxo).toHaveBeenCalledWith(WALLET.id, 'cccc', 0);
    });

    it('sets isFrozen=false on the UTXO after unfreeze', async () => {
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.unfreeze('cccc', 0); });
      const updated = result.current.utxos.find(u => u.txid === 'cccc');
      expect(updated?.isFrozen).toBe(false);
    });

    it('does not unfreeze when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useUtxos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.unfreeze('cccc', 0); });
      expect(mockUnfreezeUtxo).not.toHaveBeenCalled();
    });
  });
});
