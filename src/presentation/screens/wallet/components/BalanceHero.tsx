import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

const SATS_PER_BTC = 100_000_000;
const HIDDEN_PLACEHOLDER = '••••••';

export type BalanceHeroProps = {
  confirmedSats: number;
  pendingSats: number;
  hidden: boolean;
  onPress: () => void;
};

export function BalanceHero({ confirmedSats, pendingSats, hidden, onPress }: BalanceHeroProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const btc = (confirmedSats / SATS_PER_BTC).toFixed(8);

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="muted" style={styles.label}>{t('home.balance')}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('transactions.title')}
        onPress={onPress}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
      >
        <AppText variant="display" style={styles.sats}>
          {hidden ? HIDDEN_PLACEHOLDER : confirmedSats.toLocaleString()}
        </AppText>
        {!hidden && (
          <AppText variant="subtitle" color="muted" style={styles.unit}>{t('common.sats')}</AppText>
        )}
        <AppIcon name="chevronRight" size={26} color={theme.colors.textMuted} />
      </Pressable>
      <AppText variant="body" color="muted" style={styles.btc}>
        {hidden ? HIDDEN_PLACEHOLDER : `≈ ${btc} BTC`}
      </AppText>
      {pendingSats > 0 && (
        <View style={styles.pendingRow}>
          <View style={[styles.pendingDot, { backgroundColor: theme.colors.warning }]} />
          <AppText variant="caption" color="warning">{t('home.pending')}</AppText>
          <AppText variant="caption" color="warning">
            +{pendingSats.toLocaleString()} sats
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  label: {
    letterSpacing: 2,
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  sats: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
  },
  unit: {
    marginBottom: 8,
  },
  btc: {
    letterSpacing: 0.5,
  },
  pendingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  pendingDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
});
