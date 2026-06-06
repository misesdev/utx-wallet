import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Transaction } from '../../../core/domain/entities/Transaction';
import { useTheme } from '../../hooks/useTheme';
import { AppCard } from '../base/AppCard';
import { AppText } from '../base/AppText';

type TransactionItemProps = {
  transaction: Transaction;
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const { theme } = useTheme();
  const isIncoming = transaction.direction === 'incoming';
  const amountColor = isIncoming ? theme.colors.success : theme.colors.text;
  const arrow = isIncoming ? '↙' : '↗';
  const prefix = isIncoming ? '+' : '−';
  const amountStyle = { color: amountColor };
  const arrowStyle = { color: isIncoming ? theme.colors.success : theme.colors.textMuted };

  const statusColors: Record<Transaction['status'], string> = {
    confirmed: theme.colors.success,
    pending: theme.colors.warning,
    failed: theme.colors.danger,
  };

  return (
    <AppCard>
      <View style={styles.row}>
        <View style={styles.left}>
          <AppText
            style={[
              styles.arrow,
              arrowStyle,
            ]}
          >
            {arrow}
          </AppText>
          <View>
            <AppText variant="body" style={styles.title}>
              {isIncoming ? 'Received' : 'Sent'}
            </AppText>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[transaction.status] }]} />
              <AppText variant="caption" color="muted">
                {transaction.status}
              </AppText>
            </View>
          </View>
        </View>
        <AppText
          variant="subtitle"
          style={[styles.amount, amountStyle]}
        >
          {prefix}{transaction.amountSats.toLocaleString()}
          <AppText variant="caption" color="muted"> sats</AppText>
        </AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrow: {
    fontSize: 20,
  },
  title: {
    fontWeight: '500',
  },
  amount: {
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
