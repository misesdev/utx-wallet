import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../presentation/components/base/AppIcon';
import { AppText } from '../../presentation/components/base/AppText';
import { PinInputModal } from '../../presentation/components/security/PinInputModal';
import { useAppTranslation } from '../../presentation/hooks/useAppTranslation';
import { useReauthenticate } from '../../presentation/hooks/useReauthenticate';
import { useTheme } from '../../presentation/hooks/useTheme';
import { useSecurity } from './SecurityProvider';

export function AppAuthGate() {
  const { settings, isLoading } = useSecurity();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { requireAuth, pinModalVisible, pinError, submitPin } = useReauthenticate();

  const [isLocked, setIsLocked] = useState(false);
  const initializedRef = useRef(false);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  const triggerAuth = useCallback(async () => {
    setIsLocked(true);
    const ok = await requireAuth();
    if (ok) setIsLocked(false);
  }, [requireAuth]);

  // Authenticate on first load when settings are ready
  useEffect(() => {
    if (isLoading || initializedRef.current) return;
    initializedRef.current = true;
    if (settings.pinEnabled || settings.biometricEnabled) {
      triggerAuth();
    }
  }, [isLoading, settings.pinEnabled, settings.biometricEnabled, triggerAuth]);

  // Re-lock when returning from background after autoLockSeconds
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackgroundTimeRef.current = Date.now();
      } else if (nextState === 'active' && lastBackgroundTimeRef.current !== null) {
        const elapsedSeconds = (Date.now() - lastBackgroundTimeRef.current) / 1000;
        lastBackgroundTimeRef.current = null;
        const needsRelock =
          (settings.pinEnabled || settings.biometricEnabled) &&
          settings.autoLockSeconds > 0 &&
          elapsedSeconds >= settings.autoLockSeconds;
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
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.xl }]}>
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
    justifyContent: 'center',
    gap: 20,
    zIndex: 9999,
    elevation: 9999,
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
