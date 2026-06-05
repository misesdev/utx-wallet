import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { BalanceCard } from '../../components/wallet/BalanceCard';
import { NetworkBadge } from '../../components/wallet/NetworkBadge';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function HomeScreen() {
  const { networkConfig } = useNetwork();
  const { selectedWallet } = useWallet();

  return (
    <AppScreen title={selectedWallet?.name ?? 'Wallet'}>
      <View style={styles.networkRow}>
        <NetworkBadge config={networkConfig} />
      </View>

      <BalanceCard balanceSats={0} />

      <View style={styles.actions}>
        <AppButton
          title="Receive"
          variant="secondary"
          style={styles.actionButton}
          onPress={() => undefined}
        />
        <AppButton
          title="Send"
          style={styles.actionButton}
          onPress={() => undefined}
        />
      </View>

      <AppCard>
        <AppText variant="subtitle">Activity</AppText>
        <AppEmptyState
          icon="◌"
          title="No transactions yet"
          description="Transactions will appear here once you send or receive bitcoin."
        />
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  networkRow: {
    flexDirection: 'row',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
