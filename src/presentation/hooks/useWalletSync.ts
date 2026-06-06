import { useCallback, useState } from 'react';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
import { AppError } from '../../core/application/errors/AppError';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';

export type WalletSyncState = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncResult: SyncResult | null;
  syncError: string | null;
  sync: () => Promise<void>;
};

export function useWalletSync(): WalletSyncState {
  const { selectedWallet, syncWallet } = useWallet();
  const { isOnline } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!selectedWallet || isSyncing) return;
    if (!isOnline) {
      setSyncError('No internet connection');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await syncWallet(selectedWallet.id);
      setSyncResult(result);
      setLastSyncAt(result.syncedAt);
    } catch (err) {
      setSyncError(err instanceof AppError ? err.message : 'Sync failed. Try again.');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedWallet, syncWallet, isOnline, isSyncing]);

  return { isSyncing, lastSyncAt, syncResult, syncError, sync };
}
