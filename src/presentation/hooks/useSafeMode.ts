import { useCallback, useMemo } from 'react';
import type { NodeConnectionStatus } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';

export type UseSafeModeState = {
  isSafeModeEnabled: boolean;
  activeNodeCount: number;
  activeNetworkNodeCount: number;
  status: NodeConnectionStatus;
  statusLabel: string;
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
  const { networkConfig, setNetworkConfig } = useNetwork();

  const isSafeModeEnabled = networkConfig.nodeMode === 'personal-node';
  const nodes = networkConfig.personalNodes ?? [];
  const activeNodeCount = nodes.length;
  const activeNetworkNodeCount = nodes.filter(n => n.network === networkConfig.network).length;

  const status: NodeConnectionStatus =
    isSafeModeEnabled && activeNetworkNodeCount > 0 ? 'connected' : 'disconnected';

  const activateSafeMode = useCallback(async (): Promise<void> => {
    await setNetworkConfig({ ...networkConfig, nodeMode: 'personal-node' });
  }, [networkConfig, setNetworkConfig]);

  const deactivateSafeMode = useCallback(async (): Promise<void> => {
    await setNetworkConfig({ ...networkConfig, nodeMode: 'public-api' });
  }, [networkConfig, setNetworkConfig]);

  return useMemo(() => ({
    isSafeModeEnabled,
    activeNodeCount,
    activeNetworkNodeCount,
    status,
    statusLabel: STATUS_LABELS[status],
    activateSafeMode,
    deactivateSafeMode,
  }), [
    isSafeModeEnabled,
    activeNodeCount,
    activeNetworkNodeCount,
    status,
    activateSafeMode,
    deactivateSafeMode,
  ]);
}
