import { useCallback, useMemo } from 'react';
import type { NodeConnectionStatus } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';

export type UseSafeModeState = {
  isSafeModeEnabled: boolean;
  totalNodeCount: number;
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
  const { networkConfig, setPublicFallback } = useNetwork();

  const isSafeModeEnabled = !networkConfig.allowPublicFallback;
  const nodes = networkConfig.personalNodes;
  const totalNodeCount = nodes.length;

  const status: NodeConnectionStatus =
    isSafeModeEnabled && totalNodeCount > 0 ? 'connected' : 'disconnected';

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
    activateSafeMode,
    deactivateSafeMode,
  }), [
    isSafeModeEnabled,
    totalNodeCount,
    status,
    activateSafeMode,
    deactivateSafeMode,
  ]);
}
