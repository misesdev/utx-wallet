import { useCallback, useEffect, useState } from 'react';
import type { TransactionDetail } from '../../core/domain/entities/TransactionDetail';
import { AppError } from '../../core/application/errors/AppError';
import { useTransactionHistory } from '../../app/providers/TransactionHistoryProvider';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type UseTransactionDetailsState = {
  transactions: TransactionDetail[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useTransactionDetails(): UseTransactionDetailsState {
  const { selectedWallet, listTransactions } = useWallet();
  const { t } = useAppTranslation();
  const { networkConfig } = useNetwork();
  const { getDetail } = useTransactionHistory();

  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedWallet) {
      setTransactions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rawTxs = await listTransactions(selectedWallet.id);

      // Show local data immediately before enrichment
      setTransactions(
        rawTxs.map(tx => ({
          ...tx,
          isConfirmed: tx.status === 'confirmed',
          explorerUrl: '',
        })),
      );

      const results = await Promise.allSettled(
        rawTxs.map(tx => getDetail(tx, networkConfig.network)),
      );

      setTransactions(
        results.map((result, i) =>
          result.status === 'fulfilled'
            ? result.value
            : { ...rawTxs[i], isConfirmed: rawTxs[i].status === 'confirmed', explorerUrl: '' },
        ),
      );
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('transactions.errorLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, listTransactions, networkConfig.network, getDetail, t]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, isLoading, error, refresh: load };
}
