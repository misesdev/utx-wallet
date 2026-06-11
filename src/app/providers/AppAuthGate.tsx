import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { AppError } from '../../core/application/errors/AppError';
import { AppIcon } from '../../presentation/components/base/AppIcon';
import { AppText } from '../../presentation/components/base/AppText';
import { PinInputModal } from '../../presentation/components/security/PinInputModal';
import { useAppTranslation } from '../../presentation/hooks/useAppTranslation';
import { useTheme } from '../../presentation/hooks/useTheme';
import { useSecurity } from './SecurityProvider';

export function AppAuthGate() {
  const { settings, biometricAvailable, isLoading, reauthenticate } = useSecurity();
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const [isLocked, setIsLocked] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const pendingResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const initializedRef = useRef(false);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  const submitPin = useCallback(
    async (pin: string) => {
      setPinError(null);
      try {
        const ok = await reauthenticate('pin', pin);
        if (ok) {
          setPinModalVisible(false);
          pendingResolveRef.current?.(true);
          pendingResolveRef.current = null;
        }
      } catch (err) {
        setPinError(err instanceof AppError ? err.message : 'PIN incorreto');
      }
    },
    [reauthenticate],
  );

  const triggerAuth = useCallback(async () => {
    setIsLocked(true);
    let ok = false;

    // On app open: try biometric first if the device supports it.
    // This applies when PIN is enabled so the user doesn't need to type the PIN
    // every time; PIN remains the fallback and is used for in-flow sensitive ops.
    if (biometricAvailable && (settings.pinEnabled || settings.biometricEnabled)) {
      try {
        ok = await reauthenticate('biometric');
      } catch {
        // biometric unavailable / cancelled — fall through to PIN
      }
    }

    if (!ok && settings.pinEnabled) {
      ok = await new Promise<boolean>(resolve => {
        pendingResolveRef.current = resolve;
        setPinError(null);
        setPinModalVisible(true);
      });
    }

    if (ok) {
      setIsLocked(false);
    }
  }, [biometricAvailable, settings, reauthenticate]);

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
            styles.lockOverlay,
            { backgroundColor: theme.colors.background },
          ]}
          testID="app-lock-overlay"
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.xl },
            ]}
          >
            <AppIcon name="security" size={48} color={theme.colors.accent} />
          </View>
          <AppText variant="title" style={styles.lockTitle}>{t('appLock.title')}</AppText>
          <AppText variant="body" color="muted" style={styles.lockSubtitle}>
            {t('appLock.subtitle')}
          </AppText>
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
  lockOverlay: {
    alignItems: 'center',
    elevation: 9999,
    gap: 20,
    justifyContent: 'center',
    zIndex: 9999,
  },
  iconWrap: {
    alignItems: 'center',
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  lockTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  lockSubtitle: {
    textAlign: 'center',
  },
});
