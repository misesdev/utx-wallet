import { useCallback, useRef, useState } from 'react';
import { useSecurity } from '../../app/providers/SecurityProvider';
import { AppError } from '../../core/application/errors/AppError';

export type UseReauthenticateState = {
  pinModalVisible: boolean;
  pinError: string | null;
  requireAuth: () => Promise<boolean>;
  submitPin: (pin: string) => Promise<void>;
  cancelAuth: () => void;
};

export function useReauthenticate(): UseReauthenticateState {
  const { settings, biometricAvailable, reauthenticate } = useSecurity();
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const pendingResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const requireAuth = useCallback(async (): Promise<boolean> => {
    const { pinEnabled, biometricEnabled } = settings;
    if (!pinEnabled && !biometricEnabled) return true;

    if (biometricEnabled && biometricAvailable) {
      try {
        const ok = await reauthenticate('biometric');
        if (ok) return true;
      } catch {
        // fall through to PIN if biometric fails
      }
    }

    if (pinEnabled) {
      return new Promise<boolean>(resolve => {
        pendingResolveRef.current = resolve;
        setPinError(null);
        setPinModalVisible(true);
      });
    }

    return false;
  }, [settings, biometricAvailable, reauthenticate]);

  const submitPin = useCallback(
    async (pin: string) => {
      setPinError(null);
      try {
        await reauthenticate('pin', pin);
        setPinModalVisible(false);
        pendingResolveRef.current?.(true);
        pendingResolveRef.current = null;
      } catch (err) {
        setPinError(err instanceof AppError ? err.message : 'PIN incorreto');
      }
    },
    [reauthenticate],
  );

  const cancelAuth = useCallback(() => {
    setPinModalVisible(false);
    setPinError(null);
    pendingResolveRef.current?.(false);
    pendingResolveRef.current = null;
  }, []);

  return { pinModalVisible, pinError, requireAuth, submitPin, cancelAuth };
}
