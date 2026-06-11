import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomDock } from '../../components/base/AppBottomDock';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import type { IconName } from '../../../shared/icons/iconNames';
import { NetworkBadge } from '../../components/wallet/NetworkBadge';
import { BalanceEyeButton } from '../../components/security/BalanceEyeButton';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAccountSummaries } from '../../hooks/useAccountSummaries';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { useWalletSync } from '../../hooks/useWalletSync';
import { useTemporaryRevealBalance } from '../../hooks/useTemporaryRevealBalance';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AccountSummary } from '../../../core/domain/services/AccountSummaryService';

const SATS_PER_BTC = 100_000_000;
const HIDDEN_PLACEHOLDER = '••••••';

// ─── Header ──────────────────────────────────────────────────────────────────

type HomeHeaderProps = {
  walletName: string;
  networkConfig: ReturnType<typeof useHomeWallet>['networkConfig'];
  isSafeMode: boolean;
  hideBalanceEnabled: boolean;
  hidden: boolean;
  onToggleReveal: () => void;
};

function HomeHeader({ walletName, networkConfig, isSafeMode, hideBalanceEnabled, hidden, onToggleReveal }: HomeHeaderProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View style={styles.header}>
      <AppText variant="subtitle" style={styles.headerName} numberOfLines={1}>{walletName}</AppText>
      <View style={styles.headerRight}>
        {isSafeMode && (
          <View style={[styles.safeModeBadge, { backgroundColor: theme.colors.dangerMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="warning">{t('home.safeMode')}</AppText>
          </View>
        )}
        {hideBalanceEnabled && (
          <BalanceEyeButton hidden={hidden} onPress={onToggleReveal} testID="home-eye-btn" />
        )}
        <NetworkBadge config={networkConfig} />
      </View>
    </View>
  );
}

// ─── Balance hero ─────────────────────────────────────────────────────────────

type BalanceHeroProps = {
  confirmedSats: number;
  pendingSats: number;
  hidden: boolean;
  onPress: () => void;
};

function BalanceHero({ confirmedSats, pendingSats, hidden, onPress }: BalanceHeroProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const btc = (confirmedSats / SATS_PER_BTC).toFixed(8);

  return (
    <View style={styles.heroWrap}>
      <AppText variant="label" color="muted" style={styles.heroLabel}>{t('home.balance')}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('transactions.title')}
        onPress={onPress}
        style={({ pressed }) => [styles.heroRow, { opacity: pressed ? 0.72 : 1 }]}
      >
        <AppText variant="display" style={styles.heroSats}>
          {hidden ? HIDDEN_PLACEHOLDER : confirmedSats.toLocaleString()}
        </AppText>
        {!hidden && (
          <AppText variant="subtitle" color="muted" style={styles.heroUnit}>{t('common.sats')}</AppText>
        )}
        <AppIcon name="chevronRight" size={26} color={theme.colors.textMuted} />
      </Pressable>
      <AppText variant="body" color="muted" style={styles.heroBtc}>
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

// ─── Sync pill ────────────────────────────────────────────────────────────────

type SyncPillProps = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  onSync: () => void;
};

function SyncPill({ isSyncing, lastSyncAt, syncError, onSync }: SyncPillProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const label = isSyncing
    ? t('home.syncing')
    : syncError
      ? syncError
      : lastSyncAt
        ? t('home.lastSync', { time: new Date(lastSyncAt).toLocaleTimeString() })
        : t('home.tapToSync');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.tapToSync')}
      onPress={onSync}
      disabled={isSyncing}
      style={({ pressed }) => [
        styles.syncPill,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: syncError ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radii.xl,
          opacity: pressed || isSyncing ? 0.72 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={syncError ? 'danger' : 'muted'} numberOfLines={1}>
        {label}
      </AppText>
      {!isSyncing && <AppIcon name="sync" size={16} color={theme.colors.textMuted} />}
    </Pressable>
  );
}

// ─── Quick action buttons ─────────────────────────────────────────────────────

type QuickActionProps = {
  icon: IconName;
  label: string;
  a11yLabel?: string;
  onPress: () => void;
  accentColor?: string;
};

function QuickAction({ icon, label, a11yLabel, onPress, accentColor }: QuickActionProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.quickCircle,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.borderHighlight,
          },
        ]}
      >
        <AppIcon name={icon} size={28} color={accentColor ?? theme.colors.text} />
      </View>
      <AppText variant="caption" color="muted" style={styles.quickLabel}>{label}</AppText>
    </Pressable>
  );
}

// ─── Account summary card ─────────────────────────────────────────────────────

type AccountSummaryCardProps = {
  summary: AccountSummary;
  hidden: boolean;
  onPress: () => void;
};

function AccountSummaryCard({ summary, hidden, onPress }: AccountSummaryCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDefault = summary.type === 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.originCard,
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
          styles.originIconWrap,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppIcon name={isDefault ? "wallet" : "accounts"} size={24} color={isDefault ? theme.colors.accent : theme.colors.textMuted} />
      </View>
      <View style={styles.originBody}>
        <AppText variant="body" style={styles.originName}>{summary.name}</AppText>
        <AppText variant="caption" color="muted">
          {hidden ? HIDDEN_PLACEHOLDER : `${summary.confirmedBalanceSats.toLocaleString()} ${t('common.sats')}`}
        </AppText>
      </View>
      <AppIcon name="chevronRight" size={20} color={theme.colors.textFaint} />
    </Pressable>
  );
}


// ─── HomeScreen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { hidden, hideBalanceEnabled, toggleReveal, pinModalVisible, pinError, submitPin, cancelAuth } =
    useTemporaryRevealBalance();
  const { summaries, reload: reloadAccounts } = useAccountSummaries();

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
        {/* Header: wallet name left, network + safe mode right */}
        <HomeHeader
          walletName={wallet.name}
          networkConfig={networkConfig}
          isSafeMode={isSafeMode}
          hideBalanceEnabled={hideBalanceEnabled}
          hidden={hidden}
          onToggleReveal={toggleReveal}
        />

        {/* Balance hero */}
        <BalanceHero
          confirmedSats={confirmedBalanceSats}
          pendingSats={pendingBalanceSats}
          hidden={hidden}
          onPress={() => navigation.navigate(AppRoutes.Transactions)}
        />

        {/* Sync pill */}
        <SyncPill
          isSyncing={isSyncing}
          lastSyncAt={lastSyncAt}
          syncError={syncError}
          onSync={handleSync}
        />

        {/* Quick action buttons — horizontally scrollable */}
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

        {/* Accounts / summaries list */}
        {summaries.length > 0 && (
          <View style={styles.originsSection}>
            <View style={styles.sectionHeader}>
              <AppText variant="subtitle">{t('home.accounts')}</AppText>
              <Pressable onPress={() => navigation.navigate(AppRoutes.Segregation)}>
                <AppText variant="caption" color="accent">{t('home.manage')}</AppText>
              </Pressable>
            </View>
            <View style={styles.originList}>
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

        {/* Recent activity preview */}
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
              {transactions.map(tx => {
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
                      <AppIcon name={isIn ? "receive" : "send"} size={22} color={isIn ? theme.colors.success : theme.colors.textMuted} />
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

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerName: {
    fontWeight: '700',
    flex: 1,
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  safeModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Balance hero
  heroWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  heroLabel: {
    letterSpacing: 2,
  },
  heroRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  heroSats: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroUnit: {
    marginBottom: 8,
  },
  heroChevron: {
    marginBottom: 5,
    opacity: 0.5,
  },
  heroBtc: {
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

  // Sync pill
  syncPill: {
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
    width: 76,
  },
  quickCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    textAlign: 'center',
  },

  // Origins / accounts
  originsSection: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  originList: {
    gap: 8,
  },
  originCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  originIconWrap: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  originIconText: {
    fontSize: 18,
  },
  originBody: {
    flex: 1,
    gap: 3,
  },
  originNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '600',
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  originChevron: {
    fontSize: 20,
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
  activityIconText: {
    fontSize: 16,
  },
  activityTitle: {
    fontWeight: '600',
  },
  activityAmount: {
    fontWeight: '700',
  },
});

