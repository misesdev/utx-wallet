import React, { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomDock } from '../../components/base/AppBottomDock';
import { useActiveWalletStore } from '../../store/activeWalletStore';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAccountSummaries } from '../../hooks/useAccountSummaries';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { useWalletSync } from '../../hooks/useWalletSync';
import { useTemporaryRevealBalance } from '../../hooks/useTemporaryRevealBalance';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import { TESTNET_NETWORKS } from '../../../shared/constants/networks';
import type { Transaction } from '../../../core/domain/entities/Transaction';
import { TestnetBanner } from './components/TestnetBanner';
import { WalletHeader } from './components/WalletHeader';
import { BalanceHero } from './components/BalanceHero';
import { SyncPill } from './components/SyncPill';
import { QuickAction } from './components/QuickAction';
import { AccountSummaryCard } from './components/AccountSummaryCard';

export { addressSyncFormat, accountSyncFormat } from './components/SyncPill';

const HIDDEN_PLACEHOLDER = '••••••';

// ---------------------------------------------------------------------------
// WalletScreen
// ---------------------------------------------------------------------------

export function WalletScreen() {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { hidden, hideBalanceEnabled, toggleReveal, pinModalVisible, pinError, submitPin, cancelAuth } =
    useTemporaryRevealBalance();
  const { summaries, reload: reloadAccounts } = useAccountSummaries();
  const { clear: clearActiveWallet } = useActiveWalletStore();

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

  const { isSyncing, lastSyncAt, syncError, syncProgress, sync } = useWalletSync();

  useFocusEffect(
    useCallback(() => {
      reloadAccounts();
      refresh().catch(() => undefined);
    }, [reloadAccounts, refresh]),
  );

  // Clear sensitive wallet data from memory when leaving the wallet entirely.
  // useEffect cleanup runs on unmount (navigating back to the wallet list),
  // not on focus loss (navigating to child screens).
  useEffect(() => {
    return () => { clearActiveWallet(); };
  }, [clearActiveWallet]);

  const handleSync = useCallback(async () => {
    await sync();
    await refresh();
    await reloadAccounts();
  }, [sync, refresh, reloadAccounts]);

  if (!wallet) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <AppEmptyState
          icon="wallet"
          title={t('home.noWallet')}
          description={t('home.noWalletDesc')}
        />
      </View>
    );
  }

  return (
    <View
      testID="home-screen"
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
      >
        <WalletHeader
          walletName={wallet.name}
          walletNetwork={wallet.network}
          connectivityMode={networkConfig.connectivityMode}
          isSafeMode={isSafeMode}
          isWatchOnly={wallet.status === 'watch-only'}
          hideBalanceEnabled={hideBalanceEnabled}
          hidden={hidden}
          onToggleReveal={toggleReveal}
        />

        {TESTNET_NETWORKS.includes(wallet.network) && <TestnetBanner />}

        <BalanceHero
          confirmedSats={confirmedBalanceSats}
          pendingSats={pendingBalanceSats}
          hidden={hidden}
          onPress={() => navigation.navigate(AppRoutes.Transactions)}
        />

        <SyncPill
          isSyncing={isSyncing}
          lastSyncAt={lastSyncAt}
          syncError={syncError}
          syncProgress={syncProgress}
          onSync={handleSync}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          <QuickAction
            icon="accounts"
            label={t('home.segregation')}
            a11yLabel={t('home.segregation')}
            onPress={() => navigation.navigate(AppRoutes.Segregation)}
            accentColor={theme.colors.accent}
          />
          <QuickAction
            icon="settings"
            label={t('common.settings')}
            a11yLabel={t('common.settings')}
            onPress={() => navigation.navigate(AppRoutes.Settings)}
          />
          <QuickAction
            icon="wallet"
            label={t('home.utxos')}
            a11yLabel={t('home.utxos')}
            onPress={() => navigation.navigate(AppRoutes.Utxos)}
          />
          <QuickAction
            icon="addresses"
            label={t('home.addresses')}
            a11yLabel={t('home.addresses')}
            onPress={() => navigation.navigate(AppRoutes.Addresses)}
          />
          <QuickAction
            icon="sign"
            label={t('home.signature')}
            a11yLabel={t('home.signature')}
            onPress={() => navigation.navigate(AppRoutes.SignatureMenu)}
          />
        </ScrollView>

        {summaries.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.sectionHeader}>
              <AppText variant="subtitle">{t('home.accounts')}</AppText>
              <Pressable onPress={() => navigation.navigate(AppRoutes.Segregation)}>
                <AppText variant="caption" color="accent">{t('home.manage')}</AppText>
              </Pressable>
            </View>
            <View style={styles.accountList}>
              {summaries.map(s => (
                <AccountSummaryCard
                  key={s.id}
                  summary={s}
                  hidden={hidden}
                  onPress={() => navigation.navigate(AppRoutes.AccountDetails, { originId: s.id })}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">{t('home.recentActivity')}</AppText>
            {transactions.length > 0 && (
              <Pressable onPress={() => navigation.navigate(AppRoutes.Transactions)}>
                <AppText variant="caption" color="accent">{t('home.seeAll')}</AppText>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <AppLoading label={t('home.loading')} />
          ) : error ? (
            <AppText variant="caption" color="danger">{error}</AppText>
          ) : transactions.length === 0 ? (
            <AppEmptyState
              icon="transactions"
              title={t('home.noTransactions')}
              description={t('home.noTransactionsDesc')}
            />
          ) : (
            <View style={styles.activityList}>
              {transactions.map((tx: Transaction) => {
                const isIn = tx.direction === 'incoming';
                return (
                  <Pressable
                    key={tx.id}
                    testID={`transaction-${tx.id}`}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate(AppRoutes.TransactionDetails, { txid: tx.txid ?? tx.id })}
                    style={({ pressed }) => [
                      styles.activityRow,
                      {
                        backgroundColor: theme.colors.surfaceRaised,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radii.md,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        {
                          backgroundColor: isIn ? theme.colors.successMuted : theme.colors.surfaceMuted,
                          borderRadius: theme.radii.md,
                        },
                      ]}
                    >
                      <AppIcon name={isIn ? 'receive' : 'send'} size={22} color={isIn ? theme.colors.success : theme.colors.textMuted} />
                    </View>
                    <View style={styles.activityInfo}>
                      <AppText variant="body" style={styles.activityTitle}>
                        {isIn ? t('home.received') : t('home.sent')}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {tx.status} · {new Date(tx.createdAt).toLocaleDateString()}
                      </AppText>
                    </View>
                    <AppText
                      variant="subtitle"
                      style={[styles.activityAmount, { color: isIn ? theme.colors.success : theme.colors.text }]}
                    >
                      {hidden ? HIDDEN_PLACEHOLDER : `${isIn ? '+' : '−'}${tx.amountSats.toLocaleString()}`}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <AppBottomDock
        leftButton={{
          icon: 'receive',
          label: t('receive.title'),
          onPress: () => {
            if (summaries.length > 1) {
              navigation.navigate(AppRoutes.SelectOriginReceive);
            } else {
              navigation.navigate(AppRoutes.Receive);
            }
          },
          iconColor: theme.colors.success,
        }}
        rightButton={{
          icon: 'send',
          label: t('send.title'),
          onPress: () => {
            if (summaries.length > 1) {
              navigation.navigate(AppRoutes.SelectOriginSend);
            } else {
              navigation.navigate(AppRoutes.Send);
            }
          },
          backgroundColor: theme.colors.primary,
          iconColor: theme.colors.primaryText,
          labelColor: theme.colors.primaryText,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    gap: 28,
    paddingHorizontal: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  accountsSection: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountList: {
    gap: 8,
  },
  activitySection: {
    gap: 12,
  },
  activityList: {
    gap: 8,
  },
  activityRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  activityIcon: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  activityInfo: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontWeight: '600',
  },
  activityAmount: {
    fontWeight: '700',
  },
});
