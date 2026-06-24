import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';

export function BackupSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  const networkSummary = `${networkConfig.connectivityMode} / ${networkConfig.allowPublicFallback ? 'public-fallback' : 'nodes-only'}`;

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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('backup.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Wallet info card */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>{t('walletList.title')}</AppText>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <AppText variant="caption" color="muted">{t('common.network')}</AppText>
              <AppText variant="body">{networkSummary}</AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.infoRow}>
              <AppText variant="caption" color="muted">{t('backup.walletsLabel')}</AppText>
              <AppText variant="body">{t('backup.walletsLoaded', { count: wallets.length })}</AppText>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View
          style={[
            styles.warnCard,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppText variant="label" style={styles.warnTitle}>{t('backup.keepSafe')}</AppText>
          <AppText variant="caption" color="muted">
            {t('backup.seedWarning')}
          </AppText>
        </View>

        {/* Actions */}
        <AppButton title={t('backup.verifyBackup')} onPress={() => undefined} />
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
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Section
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },

  // Info card
  infoCard: {
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // Warning
  warnCard: {
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  warnTitle: {
    fontWeight: '600',
  },
});
