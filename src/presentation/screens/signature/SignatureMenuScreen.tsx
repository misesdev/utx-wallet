import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';

export function SignatureMenuScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { selectedWallet } = useWallet();
  const isWatchOnly = selectedWallet?.status === 'watch-only';

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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('signature.menuTitle')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Subtitle */}
        <AppText variant="body" color="muted" style={styles.subtitle}>
          {t('signature.menuSubtitle')}
        </AppText>

        {/* Options card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          {/* Sign option */}
          <Pressable
            accessibilityRole="button"
            testID="btn-sign-content"
            disabled={isWatchOnly}
            onPress={() => navigation.navigate(AppRoutes.SignContent)}
            style={({ pressed }) => [styles.optionRow, { opacity: isWatchOnly ? 0.4 : pressed ? 0.72 : 1 }]}
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.md },
              ]}
            >
              <AppIcon name="sign" size={22} color={theme.colors.accent} />
            </View>
            <View style={styles.optionBody}>
              <AppText variant="body" style={styles.optionTitle}>{t('signature.signOption')}</AppText>
              <AppText variant="caption" color="muted" numberOfLines={2}>
                {isWatchOnly ? t('settings.watchOnlyDisabled' as any) : t('signature.signOptionDesc')}
              </AppText>
            </View>
            <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Verify option */}
          <Pressable
            accessibilityRole="button"
            testID="btn-verify-signature"
            onPress={() => navigation.navigate(AppRoutes.VerifySignature)}
            style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.successMuted ?? theme.colors.surfaceMuted, borderRadius: theme.radii.md },
              ]}
            >
              <AppIcon name="check" size={22} color={theme.colors.success} />
            </View>
            <View style={styles.optionBody}>
              <AppText variant="body" style={styles.optionTitle}>{t('signature.verifyOption')}</AppText>
              <AppText variant="caption" color="muted" numberOfLines={2}>{t('signature.verifyOptionDesc')}</AppText>
            </View>
            <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
          </Pressable>
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
  subtitle: {
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  optionBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  optionTitle: {
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
});
