import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AccountSummary } from '../../../../core/domain/services/AccountSummaryService';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

const HIDDEN_PLACEHOLDER = '••••••';

export type AccountSummaryCardProps = {
  summary: AccountSummary;
  hidden: boolean;
  onPress: () => void;
};

export function AccountSummaryCard({ summary, hidden, onPress }: AccountSummaryCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDefault = summary.type === 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: isDefault ? theme.colors.borderHighlight : theme.colors.border,
          borderRadius: theme.radii.lg,
          opacity: pressed ? 0.76 : 1,
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
        <AppIcon
          name={isDefault ? 'wallet' : 'accounts'}
          size={24}
          color={isDefault ? theme.colors.accent : theme.colors.textMuted}
        />
      </View>
      <View style={styles.body}>
        <AppText variant="body" style={styles.name}>{summary.name}</AppText>
        <AppText variant="caption" color="muted">
          {hidden ? HIDDEN_PLACEHOLDER : `${summary.confirmedBalanceSats.toLocaleString()} ${t('common.sats')}`}
        </AppText>
      </View>
      <AppIcon name="chevronRight" size={20} color={theme.colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontWeight: '600',
  },
});
