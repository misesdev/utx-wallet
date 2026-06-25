import { useCallback, useMemo } from 'react';
import type { BitcoinNetwork, NodeConnectionStatus } from '../../core/domain/entities/Network';
import { normalizeTestnet } from '../../shared/constants/networks';
import { useNetwork } from './useNetwork';

export type UseSafeModeState = {
  isSafeModeEnabled: boolean;
  totalNodeCount: number;
  status: NodeConnectionStatus;
  statusLabel: string;
  isWalletBlocked: (network: BitcoinNetwork) => boolean;
  activateSafeMode: () => Promise<void>;
  deactivateSafeMode: () => Promise<void>;
};

const STATUS_LABELS: Record<NodeConnectionStatus, string> = {
  connected: 'conectado',
  disconnected: 'desconectado',
  'network-incompatible': 'rede incompatível',
  'authentication-error': 'erro de autenticação',
};

export function useSafeMode(): UseSafeModeState {
  const { networkConfig, setPublicFallback } = useNetwork();

  const isSafeModeEnabled = !networkConfig.allowPublicFallback;
  const nodes = networkConfig.personalNodes;
  const totalNodeCount = nodes.length;

  const status: NodeConnectionStatus =
    isSafeModeEnabled && totalNodeCount > 0 ? 'connected' : 'disconnected';

  const isWalletBlocked = useCallback((network: BitcoinNetwork): boolean => {
    if (!isSafeModeEnabled) return false;
    return !nodes.some(n => normalizeTestnet(n.network) === normalizeTestnet(network));
  }, [isSafeModeEnabled, nodes]);

  const activateSafeMode = useCallback(async (): Promise<void> => {
    await setPublicFallback(false);
  }, [setPublicFallback]);

  const deactivateSafeMode = useCallback(async (): Promise<void> => {
    await setPublicFallback(true);
  }, [setPublicFallback]);

  return useMemo(() => ({
    isSafeModeEnabled,
    totalNodeCount,
    status,
    statusLabel: STATUS_LABELS[status],
    isWalletBlocked,
    activateSafeMode,
    deactivateSafeMode,
  }), [
    isSafeModeEnabled,
    totalNodeCount,
    status,
    isWalletBlocked,
    activateSafeMode,
    deactivateSafeMode,
  ]);
}
