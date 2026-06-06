import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SecurityService } from '../../core/application/services/SecurityService';
import type { SecuritySettings } from '../../core/domain/entities/SecuritySettings';
import { DEFAULT_SECURITY_SETTINGS } from '../../core/domain/entities/SecuritySettings';
import type { BiometricType } from '../../core/domain/repositories/BiometricAuthProvider';
import type { ReauthMethod } from '../../core/domain/usecases/security/ReauthenticateUseCase';

type SecurityContextValue = {
  settings: SecuritySettings;
  biometricAvailable: boolean;
  biometricType: BiometricType;
  isLoading: boolean;
  updateSettings: (patch: Partial<SecuritySettings>) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<void>;
  reauthenticate: (method: ReauthMethod, pin?: string) => Promise<boolean>;
};

export const SecurityContext = createContext<SecurityContextValue | null>(null);

type SecurityProviderProps = PropsWithChildren<{
  service: SecurityService;
}>;

export function SecurityProvider({ children, service }: SecurityProviderProps) {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([service.getSettings(), service.checkBiometricAvailability()])
      .then(([s, bio]) => {
        setSettings(s);
        setBiometricAvailable(bio.available);
        setBiometricType(bio.type);
      })
      .finally(() => setIsLoading(false));
  }, [service]);

  const updateSettings = useCallback(
    async (patch: Partial<SecuritySettings>) => {
      const updated = { ...settings, ...patch };
      await service.updateSettings(updated);
      setSettings(updated);
    },
    [settings, service],
  );

  const setupPin = useCallback(
    async (pin: string) => {
      await service.setupPin(pin);
    },
    [service],
  );

  const validatePin = useCallback(
    (pin: string) => service.validatePin(pin),
    [service],
  );

  const removePin = useCallback(() => service.removePin(), [service]);

  const reauthenticate = useCallback(
    (method: ReauthMethod, pin?: string) => service.reauthenticate(method, pin),
    [service],
  );

  const value = useMemo<SecurityContextValue>(
    () => ({
      settings,
      biometricAvailable,
      biometricType,
      isLoading,
      updateSettings,
      setupPin,
      validatePin,
      removePin,
      reauthenticate,
    }),
    [settings, biometricAvailable, biometricType, isLoading, updateSettings, setupPin, validatePin, removePin, reauthenticate],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity(): SecurityContextValue {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
}
