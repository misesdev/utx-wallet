import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppCard } from '../../components/base/AppCard';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { BalanceCard } from '../../components/wallet/BalanceCard';
import { NetworkBadge } from '../../components/wallet/NetworkBadge';
import { TransactionItem } from '../../components/wallet/TransactionItem';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { useWalletSync } from '../../hooks/useWalletSync';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';

const MAX_RECENT_TRANSACTIONS = 5;

type ActionButtonProps = {
  symbol: string;
  label: string;
  onPress: () => void;
};

function ActionButton({ symbol, label, onPress }: ActionButtonProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppText style={styles.actionSymbol}>{symbol}</AppText>
      </View>
      <AppText variant="caption" color="muted" style={styles.actionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useAppNavigation();
  const { theme } = useTheme();
  const {
    wallet,
    confirmedBalanceSats,
    pendingBalanceSats,
    networkConfig,
    isSafeMode,
    transactions,
    isLoading,
    error,
    refresh,
  } = useHomeWallet();

  const { isSyncing, lastSyncAt, syncError, sync } = useWalletSync();

  const handleSync = useCallback(async () => {
    await sync();
    await refresh();
  }, [sync, refresh]);

  if (!wallet) {
    return (
      <AppScreen title="Wallet" scrollable={false}>
        <AppEmptyState
          icon="◌"
          title="No wallet selected"
          description="Create or import a wallet to get started."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen title={wallet.name}>
      <View style={styles.statusRow}>
        <NetworkBadge config={networkConfig} />
        {isSafeMode && (
          <View
            style={[
              styles.safeModeBadge,
              {
                borderColor: theme.colors.warning,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.xl,
              },
            ]}
          >
            <AppText variant="caption" color="warning">⊕ Safe mode</AppText>
          </View>
        )}
      </View>

      <BalanceCard balanceSats={confirmedBalanceSats} />

      {pendingBalanceSats > 0 && (
        <AppCard>
          <View style={styles.pendingRow}>
            <AppText variant="caption" color="muted">Pending</AppText>
            <AppText variant="body" color="warning">
              +{pendingBalanceSats.toLocaleString()} sats
            </AppText>
          </View>
        </AppCard>
      )}

      <View style={styles.actionsRow}>
        <ActionButton
          symbol="↙"
          label="Receive"
          onPress={() => navigation.navigate(AppRoutes.Receive)}
        />
        <ActionButton
          symbol="↗"
          label="Send"
          onPress={() => navigation.navigate(AppRoutes.Send)}
        />
        <ActionButton
          symbol="≡"
          label="History"
          onPress={() => navigation.navigate(AppRoutes.WalletDetails)}
        />
        <ActionButton
          symbol="⊞"
          label="UTXOs"
          onPress={() => navigation.navigate(AppRoutes.Utxos)}
        />
        <ActionButton
          symbol="⚙"
          label="Settings"
          onPress={() => navigation.navigate(AppRoutes.Settings)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync wallet"
        onPress={handleSync}
        disabled={isSyncing}
        style={({ pressed }) => [
          styles.syncBtn,
          {
            backgroundColor: theme.colors.surface,
            borderColor: syncError ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.md,
            opacity: pressed || isSyncing ? 0.7 : 1,
          },
        ]}
      >
        <AppText variant="caption" color={syncError ? 'danger' : 'muted'}>
          {isSyncing
            ? 'Syncing…'
            : syncError
              ? syncError
              : lastSyncAt
                ? `Last sync: ${new Date(lastSyncAt).toLocaleTimeString()}`
                : 'Atualizar'}
        </AppText>
        {!isSyncing && (
          <AppText variant="caption" color="muted"> ↺</AppText>
        )}
      </Pressable>

      <AppCard>
        <AppText variant="subtitle">Recent Activity</AppText>
        {isLoading ? (
          <AppLoading label="Loading transactions…" />
        ) : error ? (
          <AppText variant="caption" color="danger">{error}</AppText>
        ) : transactions.length === 0 ? (
          <AppEmptyState
            icon="◌"
            title="No transactions yet"
            description="Transactions will appear here once you send or receive bitcoin."
          />
        ) : (
          transactions.slice(0, MAX_RECENT_TRANSACTIONS).map(tx => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))
        )}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  safeModeBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSymbol: {
    fontSize: 20,
  },
  actionLabel: {
    textAlign: 'center',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    gap: 4,
  },
});
