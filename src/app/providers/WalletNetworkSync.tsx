import { useEffect } from 'react';
import { useNetwork } from '../../presentation/hooks/useNetwork';
import { useWallet } from '../../presentation/hooks/useWallet';

/**
 * Bridges WalletProvider → NetworkProvider.
 * Whenever the selected wallet changes, updates the global networkConfig.network
 * to match the wallet's network so all UI and adapters stay in sync.
 */
export function WalletNetworkSync(): null {
  const { selectedWallet } = useWallet();
  const { networkConfig, syncNetworkToWallet } = useNetwork();

  useEffect(() => {
    if (!selectedWallet) return;
    if (networkConfig.network === selectedWallet.network) return;
    syncNetworkToWallet(selectedWallet.network).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet?.id]);

  return null;
}
