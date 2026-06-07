import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Transaction } from '../../../core/domain/entities/Transaction';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { AppText } from '../base/AppText';
import { AppIcon } from '../base/AppIcon';

type TransactionItemProps = {
  transaction: Transaction;
  onPress?: () => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function formatSats(n: number): string {
  return n.toLocaleString();
}

const STATUS_KEY: Record<Transaction['status'], string> = {
  confirmed: 'transactions.confirmed',
  pending: 'transactions.pending',
  failed: 'transactions.failed',
};

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isIncoming = transaction.direction === 'incoming';

  const accentColor = isIncoming ? theme.colors.success : theme.colors.text;
  const iconBg = isIncoming ? theme.colors.successMuted : theme.colors.surfaceMuted;
  const iconColor = isIncoming ? theme.colors.success : theme.colors.textMuted;

  const statusColor: Record<Transaction['status'], string> = {
    confirmed: theme.colors.success,
    pending: theme.colors.warning,
    failed: theme.colors.danger,
  };

  const card = (
    <View
      testID={`transaction-${transaction.id}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: iconBg, borderRadius: theme.radii.md }]}>
        <AppIcon name={isIncoming ? "receive" : "send"} size={22} color={iconColor} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <AppText variant="body" style={styles.title}>
          {isIncoming ? t('transactions.received') : t('transactions.sent')}
        </AppText>

        <View style={styles.metaRow}>
          <View style={[styles.statusPill, { backgroundColor: statusColor[transaction.status] + '22', borderRadius: theme.radii.sm }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor[transaction.status] }]} />
            <AppText variant="label" style={{ color: statusColor[transaction.status] }}>
              {t(STATUS_KEY[transaction.status] as any)}
            </AppText>
          </View>
          <AppText variant="label" color="faint">·</AppText>
          <AppText variant="label" color="muted">{formatDate(transaction.createdAt)}</AppText>
        </View>

        {!isIncoming && transaction.feeSats !== undefined && transaction.feeSats > 0 && (
          <AppText variant="label" color="faint" style={styles.feeLabel}>
            + {formatSats(transaction.feeSats)} sats fee
          </AppText>
        )}
      </View>

      {/* Amount */}
      <View style={styles.amountGroup}>
        <AppText variant="subtitle" style={[styles.amount, { color: accentColor }]}>
          {isIncoming ? '+' : '−'}{formatSats(transaction.amountSats)}
        </AppText>
        <AppText variant="label" color="muted">{t('common.sats')}</AppText>
      </View>
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isIncoming ? t('transactions.received') : t('transactions.sent')}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.76 : 1 }]}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {},
  card: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconText: {
    fontSize: 19,
  },
  body: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  title: {
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  feeLabel: {
    marginTop: -2,
  },
  amountGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontWeight: '700',
  },
});
