import { useCallback } from 'react';
import { useSyncSettingsContext } from '../../app/providers/SyncSettingsProvider';
import { usePersonalNodes } from './usePersonalNodes';
import type { SyncSettings } from '../../core/domain/entities/SyncSettings';
import { MAX_REQUESTS_PER_SECOND, MIN_REQUESTS_PER_SECOND } from '../../core/domain/entities/SyncSettings';

export type UseSyncSettingsState = {
  settings: SyncSettings;
  isLoading: boolean;
  hasPersonalNode: boolean;
  canEnableParallelSync: boolean;
  setMaxRequestsPerSecond: (rps: number) => Promise<void>;
  toggleParallelSync: () => Promise<void>;
};

export function useSyncSettings(): UseSyncSettingsState {
  const { settings, isLoading, save } = useSyncSettingsContext();
  const { nodes } = usePersonalNodes();

  const hasPersonalNode = nodes.length > 0;
  const canEnableParallelSync = hasPersonalNode;

  const setMaxRequestsPerSecond = useCallback(
    async (rps: number) => {
      const clamped = Math.max(MIN_REQUESTS_PER_SECOND, Math.min(MAX_REQUESTS_PER_SECOND, Math.round(rps)));
      await save({ ...settings, maxRequestsPerSecond: clamped });
    },
    [settings, save],
  );

  const toggleParallelSync = useCallback(async () => {
    const next = !settings.parallelSync;
    if (next && !canEnableParallelSync) return;
    await save({ ...settings, parallelSync: next });
  }, [settings, save, canEnableParallelSync]);

  return {
    settings,
    isLoading,
    hasPersonalNode,
    canEnableParallelSync,
    setMaxRequestsPerSecond,
    toggleParallelSync,
  };
}
