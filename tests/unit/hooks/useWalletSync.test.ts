import { renderHook, act } from '@testing-library/react-native';
import { useWalletSync } from '../../../src/presentation/hooks/useWalletSync';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { SyncResult } from '../../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { useActiveWalletStore } from '../../../src/presentation/store/activeWalletStore';

const mockSyncWallet = jest.fn<Promise<SyncResult>, [string]>();

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

const SYNC_RESULT: SyncResult = {
  newUtxos: 2,
  spentUtxos: 1,
  newTransactions: 3,
  syncedAt: '2026-06-05T12:00:00.000Z',
};

let mockSelectedWallet: Wallet | null = WALLET;
let mockIsOnline = true;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
    syncWallet: mockSyncWallet,
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    isOnline: mockIsOnline,
  }),
}));

describe('useWalletSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockIsOnline = true;
    mockSyncWallet.mockResolvedValue(SYNC_RESULT);
    // Reset the Zustand store between tests so state doesn't leak
    useActiveWalletStore.getState().clear();
  });

  describe('initial state', () => {
    it('starts with isSyncing=false', () => {
      const { result } = renderHook(() => useWalletSync());
      expect(result.current.isSyncing).toBe(false);
    });

    it('starts with null lastSyncAt', () => {
      const { result } = renderHook(() => useWalletSync());
      expect(result.current.lastSyncAt).toBeNull();
    });

    it('starts with null syncError', () => {
      const { result } = renderHook(() => useWalletSync());
      expect(result.current.syncError).toBeNull();
    });
  });

  describe('successful sync', () => {
    it('calls syncWallet with the selected wallet id', async () => {
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(mockSyncWallet).toHaveBeenCalledWith(WALLET.id, expect.any(Function));
    });

    it('sets lastSyncAt to syncedAt from result', async () => {
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.lastSyncAt).toBe(SYNC_RESULT.syncedAt);
    });

    it('sets syncResult on success', async () => {
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.syncResult).toEqual(SYNC_RESULT);
    });

    it('resets isSyncing to false after sync completes', async () => {
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.isSyncing).toBe(false);
    });

    it('clears previous syncError on new sync attempt', async () => {
      mockSyncWallet.mockRejectedValueOnce(new AppError('old error', 'HTTP_ERROR'));
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.syncError).toBeTruthy();
      mockSyncWallet.mockResolvedValueOnce(SYNC_RESULT);
      await act(async () => { await result.current.sync(); });
      expect(result.current.syncError).toBeNull();
    });
  });

  describe('sync without internet', () => {
    it('sets syncError and does not call syncWallet when offline', async () => {
      mockIsOnline = false;
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(mockSyncWallet).not.toHaveBeenCalled();
      expect(result.current.syncError).toMatch(/internet/i);
    });

    it('does not change lastSyncAt when offline', async () => {
      mockIsOnline = false;
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.lastSyncAt).toBeNull();
    });
  });

  describe('sync with provider error', () => {
    it('sets syncError with AppError message on failure', async () => {
      mockSyncWallet.mockRejectedValue(new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'));
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.syncError).toBe('HTTP 503: Service Unavailable');
    });

    it('sets generic error message for non-AppError failures', async () => {
      mockSyncWallet.mockRejectedValue(new Error('network failure'));
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.syncError).toBe('home.errorSyncFailed');
    });

    it('resets isSyncing to false even when sync throws', async () => {
      mockSyncWallet.mockRejectedValue(new AppError('timeout', 'TIMEOUT'));
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('no wallet selected', () => {
    it('does not call syncWallet when no wallet is selected', async () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useWalletSync());
      await act(async () => { await result.current.sync(); });
      expect(mockSyncWallet).not.toHaveBeenCalled();
    });
  });

  describe('concurrent sync prevention', () => {
    it('does not start a second sync while one is in progress', async () => {
      let resolveSync!: (v: SyncResult) => void;
      mockSyncWallet.mockImplementationOnce(
        () => new Promise(resolve => { resolveSync = resolve; }),
      );
      const { result } = renderHook(() => useWalletSync());

      // Start first sync (does not await)
      act(() => { result.current.sync().catch(() => undefined); });

      // Try to start second sync immediately
      await act(async () => { await result.current.sync(); });

      expect(mockSyncWallet).toHaveBeenCalledTimes(1);
      resolveSync(SYNC_RESULT);
    });
  });
});
