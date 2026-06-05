import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppCard } from '../base/AppCard';
import { AppText } from '../base/AppText';

type BalanceCardProps = {
  balanceSats: number;
  label?: string;
};

const SATS_PER_BTC = 100_000_000;

export function BalanceCard({ balanceSats, label = 'Total balance' }: BalanceCardProps) {
  const btc = (balanceSats / SATS_PER_BTC).toFixed(8);

  return (
    <AppCard>
      <AppText variant="label" color="muted">{label}</AppText>
      <View style={styles.row}>
        <AppText variant="display" style={styles.amount}>
          {balanceSats.toLocaleString()}
        </AppText>
        <AppText variant="body" color="muted" style={styles.unit}>sats</AppText>
      </View>
      <AppText variant="caption" color="muted">≈ {btc} BTC</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    lineHeight: 42,
  },
  unit: {
    marginBottom: 4,
  },
});
