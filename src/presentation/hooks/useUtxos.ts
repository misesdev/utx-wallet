import { useCallback, useEffect, useState } from 'react';
import type { Utxo } from '../../core/domain/entities/Utxo';
import { AppError } from '../../core/application/errors/AppError';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type UtxoFilter =
  | 'all'
  | 'highest-value'
  | 'lowest-value'
  | 'confirmed'
  | 'pending'
  | 'frozen';

export type UseUtxosState = {
  utxos: Utxo[];
  isLoading: boolean;
  error: string | null;
  filter: UtxoFilter;
  setFilter: (filter: UtxoFilter) => void;
  freeze: (txid: string, vout: number) => Promise<void>;
  unfreeze: (txid: string, vout: number) => Promise<void>;
  refresh: () => Promise<void>;
};

function applyFilter(utxos: Utxo[], filter: UtxoFilter): Utxo[] {
  switch (filter) {
    case 'highest-value':
      return [...utxos].sort((a, b) => b.valueSats - a.valueSats);
    case 'lowest-value':
      return [...utxos].sort((a, b) => a.valueSats - b.valueSats);
    case 'confirmed':
      return utxos.filter(u => u.isConfirmed && !u.isFrozen);
    case 'pending':
      return utxos.filter(u => !u.isConfirmed);
    case 'frozen':
      return utxos.filter(u => u.isFrozen);
    default:
      return utxos;
  }
}

export function useUtxos(): UseUtxosState {
  const { selectedWallet, listUtxos, freezeUtxo, unfreezeUtxo } = useWallet();
  const { t } = useAppTranslation();

  const [allUtxos, setAllUtxos] = useState<Utxo[]>([]);
  const [filter, setFilter] = useState<UtxoFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedWallet) {
      setAllUtxos([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const utxos = await listUtxos(selectedWallet.id);
      setAllUtxos(utxos);
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('utxos.errorLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, listUtxos, t]);

  useEffect(() => {
    load();
  }, [load]);

  const freeze = useCallback(
    async (txid: string, vout: number) => {
      if (!selectedWallet) return;
      await freezeUtxo(selectedWallet.id, txid, vout);
      setAllUtxos(prev =>
        prev.map(u => (u.txid === txid && u.vout === vout ? { ...u, isFrozen: true } : u)),
      );
    },
    [selectedWallet, freezeUtxo],
  );

  const unfreeze = useCallback(
    async (txid: string, vout: number) => {
      if (!selectedWallet) return;
      await unfreezeUtxo(selectedWallet.id, txid, vout);
      setAllUtxos(prev =>
        prev.map(u => (u.txid === txid && u.vout === vout ? { ...u, isFrozen: false } : u)),
      );
    },
    [selectedWallet, unfreezeUtxo],
  );

  const utxos = applyFilter(allUtxos, filter);

  return { utxos, isLoading, error, filter, setFilter, freeze, unfreeze, refresh: load };
}
