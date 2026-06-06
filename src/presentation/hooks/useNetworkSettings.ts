import { useCallback, useMemo, useState } from 'react';
import { AppError } from '../../core/application/errors/AppError';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';

export const SELECTABLE_NETWORKS: BitcoinNetwork[] = ['mainnet', 'testnet3', 'testnet4'];

export type NetworkSettingsOption = {
  network: BitcoinNetwork;
  isActive: boolean;
  isWalletCompatible: boolean;
};

export type UseNetworkSettingsState = {
  activeNetwork: BitcoinNetwork;
  pendingNetwork: BitcoinNetwork;
  options: NetworkSettingsOption[];
  warning: string | null;
  error: string | null;
  isSaving: boolean;
  selectNetwork: (network: BitcoinNetwork) => void;
  confirmNetworkChange: () => Promise<void>;
};

function buildWarning(activeNetwork: BitcoinNetwork, pendingNetwork: BitcoinNetwork): string | null {
  if (activeNetwork === pendingNetwork) return null;
  return `Ao trocar de ${activeNetwork} para ${pendingNetwork}, os providers serão atualizados para consultar somente endpoints da nova rede.`;
}

export function useNetworkSettings(): UseNetworkSettingsState {
  const { networkConfig, changeNetwork } = useNetwork();
  const { selectedWallet } = useWallet();
  const [pendingNetwork, setPendingNetwork] = useState<BitcoinNetwork>(networkConfig.network);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeNetwork = networkConfig.network;

  const options = useMemo<NetworkSettingsOption[]>(
    () => SELECTABLE_NETWORKS.map(network => ({
      network,
      isActive: activeNetwork === network,
      isWalletCompatible: !selectedWallet || selectedWallet.network === network,
    })),
    [activeNetwork, selectedWallet],
  );

  const selectNetwork = useCallback((network: BitcoinNetwork) => {
    setPendingNetwork(network);
    setError(null);
  }, []);

  const confirmNetworkChange = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      await changeNetwork(pendingNetwork, selectedWallet?.network);
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Não foi possível trocar a rede');
    } finally {
      setIsSaving(false);
    }
  }, [changeNetwork, pendingNetwork, selectedWallet]);

  return {
    activeNetwork,
    pendingNetwork,
    options,
    warning: buildWarning(activeNetwork, pendingNetwork),
    error,
    isSaving,
    selectNetwork,
    confirmNetworkChange,
  };
}
