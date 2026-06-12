import { useCallback, useState } from 'react';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
import type { SyncProgress } from '../../core/domain/usecases/wallet/SyncProgress';
import { AppError } from '../../core/application/errors/AppError';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const sync = useCallback(async () => {
    if (!selectedWallet || isSyncing) return;
    if (!isOnline) {
      setSyncError(t('networkSettings.errorNoInternet'));
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress(null);
    try {
      const result = await syncWallet(selectedWallet.id, setSyncProgress);
      setSyncResult(result);
      setLastSyncAt(result.syncedAt);
    } catch (err) {
      setSyncError(err instanceof AppError ? err.message : t('home.errorSyncFailed'));
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [selectedWallet, syncWallet, isOnline, isSyncing, t]);

  return { isSyncing, lastSyncAt, syncResult, syncError, syncProgress, sync };
}
