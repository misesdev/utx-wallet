import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { TransactionItem } from '../../components/wallet/TransactionItem';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import type { Transaction } from '../../../core/domain/entities/Transaction';

function formatSats(n: number): string {
  return n.toLocaleString();
}

export function TransactionListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { transactions, isLoading, error } = useHomeWallet();

  const handleOpen = useCallback((tx: Transaction) => {
    navigation.navigate(AppRoutes.TransactionDetails, { txid: tx.txid ?? tx.id });
  }, [navigation]);

  const received = transactions
    .filter(t => t.direction === 'incoming')
    .reduce((s, t) => s + t.amountSats, 0);
  const sent = transactions
    .filter(t => t.direction === 'outgoing')
    .reduce((s, t) => s + t.amountSats, 0);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>Transactions</AppText>
          <AppText variant="caption" color="muted">{transactions.length} total</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Summary strip */}
      {transactions.length > 0 && (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <View style={styles.summaryItem}>
            <AppText variant="label" color="muted">Received</AppText>
            <AppText variant="body" style={[styles.summaryAmountIn, { color: theme.colors.success }]}>
              +{formatSats(received)}
            </AppText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryItem}>
            <AppText variant="label" color="muted">Sent</AppText>
            <AppText variant="body" style={styles.summaryAmountOut}>
              −{formatSats(sent)}
            </AppText>
          </View>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <AppLoading label="Loading transactions…" />
      ) : error ? (
        <View style={styles.feedback}>
          <AppText variant="caption" color="danger">{error}</AppText>
        </View>
      ) : transactions.length === 0 ? (
        <AppEmptyState
          icon="◌"
          title="No transactions yet"
          description="Your sent and received transactions will appear here."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          {[...transactions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(tx => (
              <TransactionItem key={tx.id} transaction={tx} onPress={() => handleOpen(tx)} />
            ))}
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
  },
  summary: {
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    overflow: 'hidden',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    paddingVertical: 14,
  },
  summaryDivider: {
    width: 1,
  },
  summaryAmountIn: {
    fontWeight: '700',
  },
  summaryAmountOut: {
    fontWeight: '700',
  },
  list: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  feedback: {
    padding: 20,
  },
});
