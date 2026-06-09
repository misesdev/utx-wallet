import { useCallback, useEffect, useState } from 'react';
import type { AccountSummary } from '../../core/domain/services/AccountSummaryService';
import { calculateAccountSummaries } from '../../core/domain/services/AccountSummaryService';
import { useAddressManager } from '../../app/providers/AddressManagerProvider';
import { useWallet } from './useWallet';

export function useAccountSummaries() {
  const { selectedWallet, listUtxos } = useWallet();
  const { getOrigins, listAddresses } = useAddressManager();
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!selectedWallet) {
      setSummaries([]);
      return;
    }
    setIsLoading(true);
    try {
      const [origins, addresses, utxos] = await Promise.all([
        getOrigins(selectedWallet.id),
        listAddresses(selectedWallet.id),
        listUtxos(selectedWallet.id),
      ]);
      setSummaries(calculateAccountSummaries(origins, addresses, utxos));
    } catch {
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getOrigins, listAddresses, listUtxos]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return { summaries, isLoading, reload };
}
