import { useCallback, useEffect, useState } from 'react';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Utxo } from '../../core/domain/entities/Utxo';
import type { OfflineTransaction } from '../../core/domain/entities/OfflineTransaction';
import type { PrepareOfflineTxParams } from '../../core/application/services/OfflineModeService';
import { AppError } from '../../core/application/errors/AppError';
import { useOfflineModeService } from '../../app/providers/OfflineModeProvider';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';

export type PrepareParams = Omit<PrepareOfflineTxParams, 'walletId' | 'walletNetwork'>;

export type UseOfflineModeState = {
  isOnline: boolean;
  confirmedBalanceSats: number;
  pendingBalanceSats: number;
  hasLocalUtxos: boolean;
  transactions: Transaction[];
  offlineTransactions: OfflineTransaction[];
  isLoadingData: boolean;
  dataError: string | null;
  prepareTransaction: (params: PrepareParams) => Promise<OfflineTransaction>;
  importRawHex: (rawHex: string) => Promise<OfflineTransaction>;
  deleteOfflineTransaction: (id: string) => Promise<void>;
  broadcastOfflineTransaction: (tx: OfflineTransaction) => Promise<string>;
  refresh: () => Promise<void>;
};

export function useOfflineMode(): UseOfflineModeState {
  const { selectedWallet, listTransactions, listUtxos } = useWallet();
  const { isOnline } = useNetwork();
  const offlineService = useOfflineModeService();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [offlineTransactions, setOfflineTransactions] = useState<OfflineTransaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedWallet) {
      setTransactions([]);
      setUtxos([]);
      setOfflineTransactions([]);
      return;
    }
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [txs, localUtxos, offlineTxs] = await Promise.all([
        listTransactions(selectedWallet.id),
        listUtxos(selectedWallet.id),
        offlineService.listTransactions(selectedWallet.id),
      ]);
      setTransactions(txs);
      setUtxos(localUtxos);
      setOfflineTransactions(offlineTxs);
    } catch (err) {
      setDataError(err instanceof AppError ? err.message : 'Erro ao carregar dados locais');
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedWallet, listTransactions, listUtxos, offlineService]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmedBalanceSats = utxos
    .filter(u => u.isConfirmed && !u.isFrozen)
    .reduce((sum, u) => sum + u.valueSats, 0);

  const pendingBalanceSats = utxos
    .filter(u => !u.isConfirmed)
    .reduce((sum, u) => sum + u.valueSats, 0);

  const hasLocalUtxos = utxos.some(u => u.isConfirmed && !u.isFrozen);

  const prepareTransaction = useCallback(
    async (params: PrepareParams): Promise<OfflineTransaction> => {
      if (!selectedWallet) throw new AppError('Nenhuma carteira selecionada', 'NO_WALLET');
      const offlineTx = await offlineService.prepareTransaction({
        ...params,
        walletId: selectedWallet.id,
        walletNetwork: selectedWallet.network,
      });
      setOfflineTransactions(prev => [offlineTx, ...prev]);
      return offlineTx;
    },
    [selectedWallet, offlineService],
  );

  const importRawHex = useCallback(
    async (rawHex: string): Promise<OfflineTransaction> => {
      if (!selectedWallet) throw new AppError('Nenhuma carteira selecionada', 'NO_WALLET');
      const offlineTx = await offlineService.importRawHex(selectedWallet.id, rawHex);
      setOfflineTransactions(prev => [offlineTx, ...prev]);
      return offlineTx;
    },
    [selectedWallet, offlineService],
  );

  const deleteOfflineTransaction = useCallback(
    async (id: string): Promise<void> => {
      await offlineService.deleteTransaction(id);
      setOfflineTransactions(prev => prev.filter(tx => tx.id !== id));
    },
    [offlineService],
  );

  const broadcastOfflineTransaction = useCallback(
    async (tx: OfflineTransaction): Promise<string> => {
      const txid = await offlineService.broadcastTransaction(tx);
      setOfflineTransactions(prev => prev.filter(t => t.id !== tx.id));
      return txid;
    },
    [offlineService],
  );

  return {
    isOnline,
    confirmedBalanceSats,
    pendingBalanceSats,
    hasLocalUtxos,
    transactions,
    offlineTransactions,
    isLoadingData,
    dataError,
    prepareTransaction,
    importRawHex,
    deleteOfflineTransaction,
    broadcastOfflineTransaction,
    refresh: load,
  };
}
