import { useEffect, useRef } from 'react';
import { useNetwork } from '../../presentation/hooks/useNetwork';
import { useWallet } from '../../presentation/hooks/useWallet';

/**
 * Bridges WalletProvider → NetworkProvider.
 * Whenever the selected wallet changes, updates the global networkConfig.network
 * to match the wallet's network so all UI and adapters stay in sync.
 *
 * Uses a ref for syncNetworkToWallet to always call the latest version without
 * including it in deps (which would cause a loop since it's recreated each time
 * networkConfig changes).
 */
export function WalletNetworkSync(): null {
  const { selectedWallet } = useWallet();
  const { networkConfig, syncNetworkToWallet } = useNetwork();

  const syncRef = useRef(syncNetworkToWallet);
  syncRef.current = syncNetworkToWallet;

  useEffect(() => {
    if (!selectedWallet) return;
    if (networkConfig.network === selectedWallet.network) return;
    syncRef.current(selectedWallet.network).catch(() => undefined);
  // selectedWallet?.id and selectedWallet?.network cover all meaningful changes to selectedWallet
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet?.id, selectedWallet?.network, networkConfig.network]);

  return null;
}
