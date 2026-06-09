import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { SeedWordGrid } from '../../components/wallet/SeedWordGrid';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useReauthenticate } from '../../hooks/useReauthenticate';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function ViewSeedScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { selectedWallet, getWalletSeed } = useWallet();
  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();

  const [revealed, setRevealed] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [passphrase, setPassphrase] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  useEffect(() => {
    requireAuth().then(ok => {
      if (!ok) navigation.goBack();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    try {
      const seed = await getWalletSeed(selectedWallet.id);
      if (seed) {
        setWords(seed.mnemonic.split(' '));
        setPassphrase(seed.passphrase);
        setRevealed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getWalletSeed]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>{t('viewSeed.title')}</AppText>
          {selectedWallet && (
            <AppText variant="caption" color="muted" numberOfLines={1}>{selectedWallet.name}</AppText>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Security warning */}
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
              borderColor: theme.colors.danger + '55',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <AppIcon name="warning" size={22} color={theme.colors.danger} />
          <View style={styles.warningBody}>
            <AppText variant="label" color="danger" style={styles.warningTitle}>{t('backupSeed.keepPrivate')}</AppText>
            <AppText variant="caption" color="muted">{t('backupSeed.warning')}</AppText>
          </View>
        </View>

        {/* Passphrase badge */}
        {passphrase ? (
          <View
            style={[
              styles.passphraseBadge,
              {
                backgroundColor: theme.colors.accentMuted,
                borderColor: theme.colors.accent + '55',
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <AppIcon name="key" size={20} color={theme.colors.accent} />
            <AppText variant="caption" style={{ color: theme.colors.accent }}>
              {t('backupSeed.passphraseActive')}
            </AppText>
          </View>
        ) : null}

        {/* Seed grid card */}
        <View
          style={[
            styles.seedCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {!revealed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('backupSeed.tapReveal')}
              onPress={handleReveal}
              disabled={isLoading}
              style={[
                styles.revealOverlay,
                { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.xl },
              ]}
            >
              <AppIcon name="eye" size={32} color={isLoading ? theme.colors.textMuted : theme.colors.text} />
              <AppText variant="subtitle" style={styles.revealTitle}>
                {isLoading ? t('common.loading') : t('backupSeed.tapReveal')}
              </AppText>
              <AppText variant="caption" color="muted">{t('backupSeed.noCamera')}</AppText>
            </Pressable>
          ) : (
            <SeedWordGrid words={words} testID="seed-grid" />
          )}
        </View>

        {/* Security tips */}
        <View
          style={[
            styles.tipsCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {[
            t('backupSeed.neverShare'),
            t('backupSeed.noDigital'),
            t('backupSeed.noRecovery'),
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: theme.colors.textMuted }]} />
              <AppText variant="caption" color="muted" style={styles.tipText}>{tip}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  warningCard: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  warningBody: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontWeight: '700',
  },
  passphraseBadge: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  seedCard: {
    borderWidth: 1,
    minHeight: 200,
    overflow: 'hidden',
  },
  revealOverlay: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    minHeight: 200,
    padding: 32,
  },
  revealTitle: {
    fontWeight: '700',
  },
  tipsCard: {
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  tipRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  tipDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 5,
    width: 6,
  },
  tipText: {
    flex: 1,
    lineHeight: 18,
  },
});
