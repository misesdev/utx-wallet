import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppCard } from '../base/AppCard';
import { AppIcon } from '../base/AppIcon';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type BalanceCardProps = {
  balanceSats: number;
  label?: string;
  hidden?: boolean;
};

const SATS_PER_BTC = 100_000_000;
const HIDDEN_PLACEHOLDER = '••••••';

export function BalanceCard({ balanceSats, label, hidden = false }: BalanceCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const btc = (balanceSats / SATS_PER_BTC).toFixed(8);

  return (
    <AppCard
      accent
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.borderHighlight,
          borderRadius: theme.radii.xl,
        },
        theme.shadows.card,
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <AppText variant="label" color="muted">{label ?? t('wallet.balanceTotal')}</AppText>
          <AppText variant="caption" color="muted">{t('wallet.availableToSend')}</AppText>
        </View>
        <View
          style={[
            styles.balanceMark,
            {
              backgroundColor: theme.colors.accentMuted,
              borderColor: theme.colors.accent,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppIcon name="wallet" size={24} color={theme.colors.accent} />
        </View>
      </View>

      <View style={styles.amountRow}>
        <AppText variant="display" style={styles.amount} testID="balance-amount">
          {hidden ? HIDDEN_PLACEHOLDER : balanceSats.toLocaleString()}
        </AppText>
        {!hidden ? (
          <AppText variant="body" color="muted" style={styles.unit}>{t('common.sats')}</AppText>
        ) : null}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <AppText variant="caption" color="muted" testID="balance-btc">
          {hidden ? HIDDEN_PLACEHOLDER : `≈ ${btc} BTC`}
        </AppText>
        <AppText variant="caption" color="muted">{t('wallet.secured')}</AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
    padding: 20,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  balanceMark: {
    alignItems: 'center',
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  amountRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  amount: {
    lineHeight: 42,
  },
  unit: {
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    gap: 12,
  },
});
