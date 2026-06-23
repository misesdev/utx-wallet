import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SyncSettings } from '../../core/domain/entities/SyncSettings';
import { DEFAULT_SYNC_SETTINGS } from '../../core/domain/entities/SyncSettings';
import type { LoadSyncSettingsUseCase } from '../../core/domain/usecases/sync/LoadSyncSettingsUseCase';
import type { SaveSyncSettingsUseCase } from '../../core/domain/usecases/sync/SaveSyncSettingsUseCase';

type SyncSettingsContextValue = {
  settings: SyncSettings;
  isLoading: boolean;
  save: (settings: SyncSettings) => Promise<void>;
};

const SyncSettingsContext = createContext<SyncSettingsContextValue | null>(null);

type SyncSettingsProviderProps = PropsWithChildren<{
  loadUseCase: LoadSyncSettingsUseCase;
  saveUseCase: SaveSyncSettingsUseCase;
}>;

export function SyncSettingsProvider({ children, loadUseCase, saveUseCase }: SyncSettingsProviderProps) {
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUseCase
      .execute()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SYNC_SETTINGS))
      .finally(() => setIsLoading(false));
  }, [loadUseCase]);

  const save = useCallback(
    async (newSettings: SyncSettings) => {
      await saveUseCase.execute(newSettings);
      setSettings(newSettings);
    },
    [saveUseCase],
  );

  const value = useMemo<SyncSettingsContextValue>(
    () => ({ settings, isLoading, save }),
    [settings, isLoading, save],
  );

  return <SyncSettingsContext.Provider value={value}>{children}</SyncSettingsContext.Provider>;
}

export function useSyncSettingsContext(): SyncSettingsContextValue {
  const ctx = useContext(SyncSettingsContext);
  if (!ctx) throw new Error('useSyncSettingsContext must be used inside SyncSettingsProvider');
  return ctx;
}
