import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useAccountSummaries } from '../../hooks/useAccountSummaries';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AccountSummary } from '../../../core/domain/services/AccountSummaryService';

type OriginItemProps = {
  origin: AccountSummary;
  onPress: () => void;
};

function OriginItem({ origin, onPress }: OriginItemProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDefault = origin.type === 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Receive to ${origin.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: isDefault ? theme.colors.borderHighlight : theme.colors.border,
          borderRadius: theme.radii.lg,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppIcon name={isDefault ? "wallet" : "accounts"} size={22} color={isDefault ? theme.colors.accent : theme.colors.textMuted} />
      </View>

      <View style={styles.itemBody}>
        <View style={styles.nameRow}>
          <AppText variant="body" style={styles.originName}>{origin.name}</AppText>
          {isDefault && (
            <View
              style={[
                styles.defaultBadge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" color="accent">{t('common.default')}</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">{t('common.account', { accountIndex: origin.accountIndex })}</AppText>
        <AppText variant="subtitle" style={styles.balanceText}>
          {origin.confirmedBalanceSats.toLocaleString()} {t('common.sats')}
        </AppText>
      </View>

      <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export function SelectOriginReceiveScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { summaries: origins, isLoading } = useAccountSummaries();

  const handleSelect = useCallback((originId: string) => {
    navigation.navigate(AppRoutes.Receive, { originId });
  }, [navigation]);

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
        <View style={styles.headerTitle}>
          <AppText variant="subtitle" style={styles.titleText}>{t('receive.title')}</AppText>
          <AppText variant="caption" color="muted">{t('receive.selectAccount')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading label={t('common.loadingAccounts')} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.intro}>
            <AppText variant="body" color="muted" style={styles.introText}>
              {t('receive.selectAccountDesc')}
            </AppText>
          </View>

          <View style={styles.list}>
            {origins.map(origin => (
              <OriginItem
                key={origin.id}
                origin={origin}
                onPress={() => handleSelect(origin.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 12,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  intro: {
    paddingHorizontal: 4,
  },
  introText: {
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  item: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: {
    fontSize: 20,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '600',
  },
  balanceText: {
    fontWeight: '700',
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chevron: {
    fontSize: 22,
  },
});
