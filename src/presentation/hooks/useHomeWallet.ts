import { useCallback, useEffect, useState } from 'react';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { NetworkConfig } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [confirmedBalanceSats, setConfirmedBalanceSats] = useState(0);
  const [pendingBalanceSats, setPendingBalanceSats] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedWallet) {
      setTransactions([]);
      setConfirmedBalanceSats(0);
      setPendingBalanceSats(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [txs, utxos] = await Promise.all([
        listTransactions(selectedWallet.id),
        listUtxos(selectedWallet.id),
      ]);
      const sorted = [...txs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setTransactions(sorted);
      setConfirmedBalanceSats(
        utxos.filter(u => u.isConfirmed).reduce((acc, u) => acc + u.valueSats, 0),
      );
      setPendingBalanceSats(
        utxos.filter(u => !u.isConfirmed).reduce((acc, u) => acc + u.valueSats, 0),
      );
    } catch {
      setError(t('home.errorLoadWalletData'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, listTransactions, listUtxos, t]);

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
    isLoading,
    error,
    refresh,
  };
}
