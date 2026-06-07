import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useSafeMode } from '../../hooks/useSafeMode';
import { useTheme } from '../../hooks/useTheme';

export function SafeModeScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const { form, isSafeModeEnabled, statusLabel, activateSafeMode, deactivateSafeMode } = useSafeMode();

  const nodeDisplay = form.url.trim() ? form.url : 'não configurado';
  const statusColor = statusLabel === 'conectado' ? theme.colors.success : theme.colors.textMuted;

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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('safeMode.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Status hero */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isSafeModeEnabled ? theme.colors.accentMuted : theme.colors.surfaceRaised,
              borderColor: isSafeModeEnabled ? theme.colors.accent : theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: isSafeModeEnabled ? theme.colors.accent : theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
            <AppIcon name={isSafeModeEnabled ? "safeMode" : "warning"} size={36} color={isSafeModeEnabled ? theme.colors.success : theme.colors.textMuted} />
          </View>
          <AppText
            variant="subtitle"
            style={[styles.heroTitle, isSafeModeEnabled ? { color: theme.colors.accent } : undefined]}
          >
            {isSafeModeEnabled ? t('safeMode.active') : t('safeMode.inactive')}
          </AppText>
          <AppText variant="caption" color="muted">
            {isSafeModeEnabled
              ? t('safeMode.activeDesc')
              : t('safeMode.inactiveDesc')}
          </AppText>
        </View>

        {/* Node info */}
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
            <AppText variant="caption" color="muted">{t('safeMode.statusLabel')}</AppText>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <AppText variant="body" style={{ color: statusColor }}>{statusLabel}</AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.infoRow}>
            <AppText variant="caption" color="muted">{t('safeMode.nodeLabel')}</AppText>
            <AppText variant="body" numberOfLines={1} style={styles.nodeUrl}>{nodeDisplay}</AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.infoRow}>
            <AppText variant="caption" color="muted">{t('safeMode.networkLabel')}</AppText>
            <AppText variant="body">{form.network}</AppText>
          </View>
        </View>

        {/* Description */}
        <View
          style={[
            styles.descCard,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppText variant="caption" color="muted">
            {t('safeMode.info')}
          </AppText>
        </View>

        {/* Actions */}
        {isSafeModeEnabled ? (
          <AppButton title={t('safeMode.disable')} variant="secondary" onPress={deactivateSafeMode} />
        ) : (
          <AppButton title={t('safeMode.enable')} onPress={activateSafeMode} />
        )}
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

  // Hero
  heroCard: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  heroIcon: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroIconText: {
    fontSize: 24,
  },
  heroTitle: {
    fontWeight: '700',
    textAlign: 'center',
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  nodeUrl: {
    flex: 1,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // Desc
  descCard: {
    borderWidth: 1,
    padding: 14,
  },
});
