import { useCallback, useState } from 'react';
import { AppError } from '../../core/application/errors/AppError';
import { useSecurity } from '../../app/providers/SecurityProvider';
import { useAppTranslation } from './useAppTranslation';
import type { AutoLockSeconds, SecuritySettings } from '../../core/domain/entities/SecuritySettings';

export type PinModalStep = 'none' | 'set-new' | 'confirm-new' | 'verify-to-remove';

export type UseSecuritySettingsState = {
  settings: SecuritySettings;
  biometricAvailable: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  pinModalVisible: boolean;
  pinModalStep: PinModalStep;
  pinError: string | null;
  openPinSetup: () => void;
  openPinRemove: () => void;
  closePinModal: () => void;
  submitPinStep: (pin: string) => Promise<void>;
  toggleBiometric: () => Promise<void>;
  setAutoLock: (seconds: AutoLockSeconds) => Promise<void>;
  toggleHideBalance: () => Promise<void>;
  toggleBlockScreenshots: () => Promise<void>;
};

export function useSecuritySettings(): UseSecuritySettingsState {
  const { settings, biometricAvailable, isLoading, updateSettings, setupPin, validatePin, removePin } = useSecurity();
  const { t } = useAppTranslation();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState<PinModalStep>('none');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const pinModalVisible = pinStep !== 'none';

  const openPinSetup = useCallback(() => {
    setFirstPin('');
    setPinError(null);
    setPinStep('set-new');
  }, []);

  const openPinRemove = useCallback(() => {
    setPinError(null);
    setPinStep('verify-to-remove');
  }, []);

  const closePinModal = useCallback(() => {
    setFirstPin('');
    setPinError(null);
    setPinStep('none');
  }, []);

  const submitPinStep = useCallback(
    async (pin: string) => {
      setPinError(null);

      if (pinStep === 'set-new') {
        setFirstPin(pin);
        setPinStep('confirm-new');
        return;
      }

      if (pinStep === 'confirm-new') {
        if (pin !== firstPin) {
          setPinError(t('security.errorPinMismatch'));
          setFirstPin('');
          setPinStep('set-new');
          return;
        }
        setIsSaving(true);
        try {
          await setupPin(pin);
          await updateSettings({ pinEnabled: true });
          closePinModal();
        } catch (err) {
          setPinError(err instanceof AppError ? err.message : t('security.errorSavePin'));
        } finally {
          setIsSaving(false);
        }
        return;
      }

      if (pinStep === 'verify-to-remove') {
        const ok = await validatePin(pin);
        if (!ok) {
          setPinError(t('security.errorPinIncorrect'));
          return;
        }
        setIsSaving(true);
        try {
          await removePin();
          await updateSettings({ pinEnabled: false, biometricEnabled: false });
          closePinModal();
        } catch (err) {
          setPinError(err instanceof AppError ? err.message : t('security.errorRemovePin'));
        } finally {
          setIsSaving(false);
        }
      }
    },
    [pinStep, firstPin, setupPin, validatePin, removePin, updateSettings, closePinModal, t],
  );

  const toggleBiometric = useCallback(async () => {
    if (!biometricAvailable || !settings.pinEnabled) return;
    setError(null);
    try {
      await updateSettings({ biometricEnabled: !settings.biometricEnabled });
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('security.errorUpdateBiometrics'));
    }
  }, [biometricAvailable, settings.pinEnabled, settings.biometricEnabled, updateSettings, t]);

  const setAutoLock = useCallback(
    async (seconds: AutoLockSeconds) => {
      setError(null);
      try {
        await updateSettings({ autoLockSeconds: seconds });
      } catch (err) {
        setError(err instanceof AppError ? err.message : t('security.errorSave'));
      }
    },
    [updateSettings, t],
  );

  const toggleHideBalance = useCallback(async () => {
    setError(null);
    try {
      await updateSettings({ hideBalance: !settings.hideBalance });
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('security.errorUpdate'));
    }
  }, [settings.hideBalance, updateSettings, t]);

  const toggleBlockScreenshots = useCallback(async () => {
    setError(null);
    try {
      await updateSettings({ blockScreenshots: !settings.blockScreenshots });
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('security.errorUpdate'));
    }
  }, [settings.blockScreenshots, updateSettings, t]);

  return {
    settings,
    biometricAvailable,
    isLoading,
    isSaving,
    error,
    pinModalVisible,
    pinModalStep: pinStep,
    pinError,
    openPinSetup,
    openPinRemove,
    closePinModal,
    submitPinStep,
    toggleBiometric,
    setAutoLock,
    toggleHideBalance,
    toggleBlockScreenshots,
  };
}
