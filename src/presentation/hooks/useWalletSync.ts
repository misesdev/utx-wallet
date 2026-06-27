import { useCallback } from 'react';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
import type { SyncProgress } from '../../core/domain/usecases/wallet/SyncProgress';
import { AppError } from '../../core/application/errors/AppError';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';
import { useActiveWalletStore } from '../store/activeWalletStore';

export type WalletSyncState = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncResult: SyncResult | null;
  syncError: string | null;
  syncProgress: SyncProgress | null;
  sync: () => Promise<void>;
};

export function useWalletSync(): WalletSyncState {
  const { selectedWallet, syncWallet } = useWallet();
  const { t } = useAppTranslation();
  const { isOnline } = useNetwork();

  const {
    isSyncing,
    lastSyncAt,
    syncResult,
    syncError,
    syncProgress,
    setSyncState,
  } = useActiveWalletStore();

  const sync = useCallback(async () => {
    if (!selectedWallet || isSyncing) return;
    if (!isOnline) {
      setSyncState({ syncError: t('networkSettings.errorNoInternet') });
      return;
    }
    setSyncState({ isSyncing: true, syncError: null, syncProgress: null });
    try {
      const result = await syncWallet(
        selectedWallet.id,
        (progress: SyncProgress) => setSyncState({ syncProgress: progress }),
      );
      setSyncState({ syncResult: result, lastSyncAt: result.syncedAt });
    } catch (err) {
      setSyncState({
        syncError: err instanceof AppError ? err.message : t('home.errorSyncFailed'),
      });
    } finally {
      setSyncState({ isSyncing: false, syncProgress: null });
    }
  }, [selectedWallet, syncWallet, isOnline, isSyncing, t, setSyncState]);

  return { isSyncing, lastSyncAt, syncResult, syncError, syncProgress, sync };
}
