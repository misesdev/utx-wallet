import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppRoutes } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function BackupSeedScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { words, walletName, passphrase, proceedToConfirm } = useCreateWallet();
  const { t } = useAppTranslation();

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  function handleContinue() {
    proceedToConfirm();
    navigation.navigate(AppRoutes.ConfirmSeed);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('backupSeed.title')}</AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>{walletName}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
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
            <AppText variant="caption" color="muted">
              {t('backupSeed.warning')}
            </AppText>
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
          {/* Reveal overlay */}
          {!revealed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('backupSeed.tapReveal')}
              onPress={() => setRevealed(true)}
              style={[
                styles.revealOverlay,
                { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.xl },
              ]}
            >
              <AppIcon name="eye" size={32} color={theme.colors.text} />
              <AppText variant="subtitle" style={styles.revealTitle}>{t('backupSeed.tapReveal')}</AppText>
              <AppText variant="caption" color="muted">{t('backupSeed.noCamera')}</AppText>
            </Pressable>
          ) : (
            <View style={styles.seedGrid}>
              {words.map((word, i) => (
                <View
                  key={i}
                  style={[
                    styles.seedWord,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <AppText variant="caption" color="muted" style={styles.seedIndex}>
                    {i + 1}
                  </AppText>
                  <AppText variant="body" style={styles.seedWordText}>{word}</AppText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Warnings */}
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

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('backupSeed.written')}
          onPress={handleContinue}
          disabled={!revealed}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: revealed ? theme.colors.accent : theme.colors.surfaceMuted,
              borderRadius: theme.radii.lg,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AppText
            variant="subtitle"
            style={revealed ? styles.ctaTextActive : styles.ctaTextInactive}
          >
            {t('backupSeed.written')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
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

  // Content
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Warning
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

  // Passphrase badge
  passphraseBadge: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },

  // Seed card
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
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  seedWord: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: '28%',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  seedIndex: {
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'right',
  },
  seedWordText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Tips
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

  // CTA
  cta: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 16,
  },
  ctaText: {
    fontWeight: '700',
  },
  ctaTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  ctaTextInactive: {
    fontWeight: '700',
  },
});
