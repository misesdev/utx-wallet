import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError } from '../../core/application/errors/AppError';
import { AppIcon } from '../../presentation/components/base/AppIcon';
import { AppLogo } from '../../presentation/components/base/AppLogo';
import { AppText } from '../../presentation/components/base/AppText';
import { PinInputModal } from '../../presentation/components/security/PinInputModal';
import { useAppTranslation } from '../../presentation/hooks/useAppTranslation';
import { useTheme } from '../../presentation/hooks/useTheme';
import { useSecurity } from './SecurityProvider';
import type { IconName } from '../../shared/icons/iconNames';

export function AppAuthGate() {
  const { settings, biometricAvailable, biometricType, isLoading, reauthenticate } = useSecurity();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();

  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricPending, setIsBiometricPending] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const pendingPinResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const initializedRef = useRef(false);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  const biometricIconName: IconName = biometricType === 'face-id' ? 'faceId' : 'fingerprint';

  const unlock = useCallback(() => {
    setIsLocked(false);
    setPinModalVisible(false);
    setPinError(null);
  }, []);

  const submitPin = useCallback(
    async (pin: string) => {
      setPinError(null);
      try {
        const ok = await reauthenticate('pin', pin);
        if (ok) {
          pendingPinResolveRef.current?.(true);
          pendingPinResolveRef.current = null;
          unlock();
        }
      } catch (err) {
        setPinError(err instanceof AppError ? err.message : t('security.errorPinIncorrect' as any));
      }
    },
    [reauthenticate, unlock, t],
  );

  const tryBiometric = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) return false;
    setIsBiometricPending(true);
    try {
      const ok = await reauthenticate('biometric');
      if (ok) {
        unlock();
        return true;
      }
    } catch {
      // biometric failed or cancelled — user can retry or use PIN
    } finally {
      setIsBiometricPending(false);
    }
    return false;
  }, [biometricAvailable, reauthenticate, unlock]);

  const triggerAuth = useCallback(async () => {
    setIsLocked(true);
    setPinModalVisible(false);

    if (biometricAvailable && (settings.pinEnabled || settings.biometricEnabled)) {
      await tryBiometric();
      // After biometric attempt, stay on lock screen — user chooses next action
    } else if (settings.pinEnabled) {
      // No biometric → go straight to PIN modal
      setPinError(null);
      setPinModalVisible(true);
    }
  }, [biometricAvailable, settings, tryBiometric]);

  const handleEnterPin = useCallback(() => {
    setPinError(null);
    setPinModalVisible(true);
  }, []);

  // Authenticate on first load once settings are ready
  useEffect(() => {
    if (isLoading || initializedRef.current) return;
    initializedRef.current = true;
    if (settings.pinEnabled || settings.biometricEnabled) {
      triggerAuth();
    }
  }, [isLoading, settings.pinEnabled, settings.biometricEnabled, triggerAuth]);

  // Re-lock after autoLockSeconds in background
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackgroundTimeRef.current = Date.now();
      } else if (nextState === 'active' && lastBackgroundTimeRef.current !== null) {
        const elapsed = (Date.now() - lastBackgroundTimeRef.current) / 1000;
        lastBackgroundTimeRef.current = null;
        const needsRelock =
          (settings.pinEnabled || settings.biometricEnabled) &&
          settings.autoLockSeconds > 0 &&
          elapsed >= settings.autoLockSeconds;
        if (needsRelock) {
          triggerAuth();
        }
      }
    });
    return () => sub.remove();
  }, [settings, triggerAuth]);

  if (!isLocked && !pinModalVisible) return null;

  return (
    <>
      {isLocked && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
          testID="app-lock-overlay"
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <AppLogo size="sm" showName />
          </View>

          {/* Lock icon + message */}
          <View style={styles.centerContent}>
            <View
              style={[
                styles.lockIconWrap,
                styles.lockIconWrapRadius,
                { backgroundColor: theme.colors.accentMuted },
              ]}
            >
              <AppIcon name="security" size={48} color={theme.colors.accent} />
            </View>
            <AppText variant="title" style={styles.lockTitle}>{t('appLock.title' as any)}</AppText>
            <AppText variant="body" color="muted" style={styles.lockSubtitle}>
              {t('appLock.subtitle' as any)}
            </AppText>
          </View>

          {/* Auth actions */}
          <View style={styles.actionsArea}>
            {biometricAvailable && (settings.pinEnabled || settings.biometricEnabled) && (
              <Pressable
                testID="btn-biometric-unlock"
                accessibilityRole="button"
                accessibilityLabel={t('appLock.biometricButton' as any)}
                disabled={isBiometricPending}
                onPress={tryBiometric}
                style={({ pressed }) => [
                  styles.biometricBtn,
                  {
                    backgroundColor: theme.colors.accentMuted,
                    borderColor: theme.colors.accent + '44',
                    borderRadius: theme.radii.xl,
                    opacity: isBiometricPending ? 0.6 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <AppIcon name={biometricIconName} size={28} color={theme.colors.accent} />
                <AppText variant="body" style={[styles.biometricBtnLabel, { color: theme.colors.accent }]}>
                  {isBiometricPending
                    ? t('appLock.biometricPending' as any)
                    : t('appLock.biometricButton' as any)}
                </AppText>
              </Pressable>
            )}

            {settings.pinEnabled && (
              <Pressable
                testID="btn-pin-fallback"
                accessibilityRole="button"
                onPress={handleEnterPin}
                style={({ pressed }) => [styles.pinFallbackBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <AppText variant="body" color="muted">
                  {t('appLock.pinFallback' as any)}
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    elevation: 9999,
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 24,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  lockIconWrap: {
    alignItems: 'center',
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  lockIconWrapRadius: {
    borderRadius: 48,
  },
  lockTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  lockSubtitle: {
    maxWidth: 280,
    textAlign: 'center',
  },
  actionsArea: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 32,
    width: '100%',
  },
  biometricBtn: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
  },
  biometricBtnLabel: {
    fontWeight: '600',
  },
  pinFallbackBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
