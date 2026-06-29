import { useCallback, useEffect, useState } from 'react';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { NetworkConfig } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';
import { useActiveWalletStore } from '../store/activeWalletStore';

export type HomeWalletState = {
  wallet: Wallet | null;
  confirmedBalanceSats: number;
  pendingBalanceSats: number;
  networkConfig: NetworkConfig;
  isOnline: boolean;
  isSafeMode: boolean;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useHomeWallet(): HomeWalletState {
  const { selectedWallet, listTransactions, listUtxos } = useWallet();
  const { t } = useAppTranslation();
  const { networkConfig, isOnline } = useNetwork();
  const isSafeMode = !networkConfig.allowPublicFallback && networkConfig.personalNodes.length > 0;

  const {
    transactions,
    confirmedBalanceSats,
    pendingBalanceSats,
    isDataLoading,
    setWalletData,
    setWalletId,
  } = useActiveWalletStore();

  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedWallet) {
      setWalletData({
        transactions: [],
        utxos: [],
        confirmedBalanceSats: 0,
        pendingBalanceSats: 0,
        isDataLoading: false,
      });
      return;
    }

    setWalletData({ isDataLoading: true });
    setError(null);
    try {
      const [txs, utxos] = await Promise.all([
        listTransactions(selectedWallet.id),
        listUtxos(selectedWallet.id),
      ]);
      // Pending transactions appear above confirmed ones regardless of timestamp.
      // Replaced transactions are excluded from the home list — the full history
      // screen still shows them with the appropriate "replaced" badge.
      const statusPriority = (s: string) => (s === 'pending' ? 0 : 1);
      const sorted = txs
        .filter(tx => tx.status !== 'replaced')
        .sort((a, b) => {
          const statusDiff = statusPriority(a.status) - statusPriority(b.status);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      setWalletData({
        transactions: sorted,
        utxos,
        confirmedBalanceSats: utxos.filter(u => u.isConfirmed).reduce((acc, u) => acc + u.valueSats, 0),
        pendingBalanceSats: utxos.filter(u => !u.isConfirmed).reduce((acc, u) => acc + u.valueSats, 0),
        isDataLoading: false,
      });
    } catch {
      setError(t('home.errorLoadWalletData'));
      setWalletData({ isDataLoading: false });
    }
  }, [selectedWallet, listTransactions, listUtxos, t, setWalletData]);

  const currentWalletId = selectedWallet?.id ?? null;
  useEffect(() => {
    setWalletId(currentWalletId);
  }, [currentWalletId, setWalletId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    wallet: selectedWallet,
    confirmedBalanceSats,
    pendingBalanceSats,
    networkConfig,
    isOnline,
    isSafeMode,
    transactions,
    isLoading: isDataLoading,
    error,
    refresh,
  };
}
