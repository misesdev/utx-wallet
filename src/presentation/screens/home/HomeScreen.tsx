import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { NetworkBadge } from '../../components/wallet/NetworkBadge';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { useWalletSync } from '../../hooks/useWalletSync';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';

const SATS_PER_BTC = 100_000_000;
const HIDDEN_PLACEHOLDER = '••••••';

// ─── Header ──────────────────────────────────────────────────────────────────

type HomeHeaderProps = {
  walletName: string;
  networkConfig: ReturnType<typeof useHomeWallet>['networkConfig'];
  isSafeMode: boolean;
};

function HomeHeader({ walletName, networkConfig, isSafeMode }: HomeHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.header}>
      <AppText variant="subtitle" style={styles.headerName} numberOfLines={1}>{walletName}</AppText>
      <View style={styles.headerRight}>
        {isSafeMode && (
          <View style={[styles.safeModeBadge, { backgroundColor: theme.colors.dangerMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="warning">Safe mode</AppText>
          </View>
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
  const btc = (confirmedSats / SATS_PER_BTC).toFixed(8);

  return (
    <View style={styles.heroWrap}>
      <AppText variant="label" color="muted" style={styles.heroLabel}>Balance</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View transactions"
        onPress={onPress}
        style={({ pressed }) => [styles.heroRow, { opacity: pressed ? 0.72 : 1 }]}
      >
        <AppText variant="display" style={styles.heroSats}>
          {hidden ? HIDDEN_PLACEHOLDER : confirmedSats.toLocaleString()}
        </AppText>
        {!hidden && (
          <AppText variant="subtitle" color="muted" style={styles.heroUnit}>sats</AppText>
        )}
        <AppText variant="title" color="muted" style={styles.heroChevron}>›</AppText>
      </Pressable>
      <AppText variant="body" color="muted" style={styles.heroBtc}>
        {hidden ? HIDDEN_PLACEHOLDER : `≈ ${btc} BTC`}
      </AppText>
      {pendingSats > 0 && (
        <View style={styles.pendingRow}>
          <View style={[styles.pendingDot, { backgroundColor: theme.colors.warning }]} />
          <AppText variant="caption" color="warning">Pending</AppText>
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
  const label = isSyncing
    ? 'Syncing…'
    : syncError
      ? syncError
      : lastSyncAt
        ? `Last sync: ${new Date(lastSyncAt).toLocaleTimeString()}`
        : 'Tap to sync';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sync wallet"
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
      {!isSyncing && <AppText variant="caption" color="muted">↺</AppText>}
    </Pressable>
  );
}

// ─── Quick action buttons ─────────────────────────────────────────────────────

type QuickActionProps = {
  icon: string;
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
        <AppText style={[styles.quickIcon, { color: accentColor ?? theme.colors.text }]}>
          {icon}
        </AppText>
      </View>
      <AppText variant="caption" color="muted" style={styles.quickLabel}>{label}</AppText>
    </Pressable>
  );
}

// ─── Origins list (accounts) ──────────────────────────────────────────────────

type OriginCardProps = {
  origin: AddressOrigin;
  isOnly: boolean;
};

function OriginCard({ origin, isOnly }: OriginCardProps) {
  const { theme } = useTheme();
  const isDefault = origin.type === 'default';

  return (
    <View
      style={[
        styles.originCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: isDefault ? theme.colors.borderHighlight : theme.colors.border,
          borderRadius: theme.radii.lg,
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
        <AppText style={styles.originIconText}>{isDefault ? '◎' : '⊡'}</AppText>
      </View>
      <View style={styles.originBody}>
        <View style={styles.originNameRow}>
          <AppText variant="body" style={styles.originName}>{origin.name}</AppText>
          {isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm }]}>
              <AppText variant="label" color="accent">Default</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">
          Account {origin.accountIndex}
        </AppText>
      </View>
      {!isOnly && (
        <AppText variant="body" color="faint" style={styles.originChevron}>›</AppText>
      )}
    </View>
  );
}

// ─── Bottom dock ──────────────────────────────────────────────────────────────

type BottomDockProps = {
  onReceive: () => void;
  onSend: () => void;
};

function BottomDock({ onReceive, onSend }: BottomDockProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View
        style={[
          styles.bottomDock,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderHighlight,
            borderRadius: theme.radii.xl,
          },
          theme.shadows.elevated,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Receive bitcoin"
          onPress={onReceive}
          style={({ pressed }) => [
            styles.dockBtn,
            { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.lg, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <AppText variant="subtitle" style={{ color: theme.colors.success }}>↙</AppText>
          <AppText variant="body" style={[styles.dockBtnLabel, { color: theme.colors.text }]}>Receive</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send bitcoin"
          onPress={onSend}
          style={({ pressed }) => [
            styles.dockBtn,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <AppText variant="subtitle" style={{ color: theme.colors.primaryText }}>↗</AppText>
          <AppText variant="body" style={[styles.dockBtnLabel, { color: theme.colors.primaryText }]}>Send</AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { getOrigins } = useAddressManager();

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
  const [origins, setOrigins] = useState<AddressOrigin[]>([]);

  const handleSync = useCallback(async () => {
    await sync();
    await refresh();
  }, [sync, refresh]);

  const loadOrigins = useCallback(async () => {
    if (!wallet) return;
    try {
      const list = await getOrigins(wallet.id);
      setOrigins(list);
    } catch {
      // silent — origins show empty
    }
  }, [wallet, getOrigins]);

  useEffect(() => {
    loadOrigins().catch(() => undefined);
  }, [loadOrigins]);

  if (!wallet) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <AppEmptyState
          icon="◌"
          title="No wallet selected"
          description="Create or import a wallet to get started."
        />
      </View>
    );
  }

  return (
    <View
      testID="home-screen"
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
      >
        {/* Header: wallet name left, network + safe mode right */}
        <HomeHeader walletName={wallet.name} networkConfig={networkConfig} isSafeMode={isSafeMode} />

        {/* Balance hero */}
        <BalanceHero
          confirmedSats={confirmedBalanceSats}
          pendingSats={pendingBalanceSats}
          hidden={false}
          onPress={() => navigation.navigate(AppRoutes.Transactions)}
        />

        {/* Sync pill */}
        <SyncPill
          isSyncing={isSyncing}
          lastSyncAt={lastSyncAt}
          syncError={syncError}
          onSync={handleSync}
        />

        {/* Quick action buttons */}
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="⊞"
            label="Segregação"
            a11yLabel="Segregation"
            onPress={() => navigation.navigate(AppRoutes.Segregation)}
            accentColor={theme.colors.accent}
          />
          <QuickAction
            icon="⚙"
            label="Configurações"
            a11yLabel="Settings"
            onPress={() => navigation.navigate(AppRoutes.Settings)}
          />
          <QuickAction
            icon="◈"
            label="UTXOs"
            a11yLabel="UTXOs"
            onPress={() => navigation.navigate(AppRoutes.Utxos)}
          />
          <QuickAction
            icon="◉"
            label="Endereços"
            a11yLabel="Addresses"
            onPress={() => navigation.navigate(AppRoutes.Addresses)}
          />
        </View>

        {/* Accounts / origins list */}
        {origins.length > 0 && (
          <View style={styles.originsSection}>
            <View style={styles.sectionHeader}>
              <AppText variant="subtitle">Accounts</AppText>
              <Pressable onPress={() => navigation.navigate(AppRoutes.Segregation)}>
                <AppText variant="caption" color="accent">Manage</AppText>
              </Pressable>
            </View>
            <View style={styles.originList}>
              {origins.map(o => (
                <OriginCard key={o.id} origin={o} isOnly={origins.length === 1} />
              ))}
            </View>
          </View>
        )}

        {/* Recent activity preview */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">Recent Activity</AppText>
            {transactions.length > 0 && (
              <Pressable onPress={() => navigation.navigate(AppRoutes.Transactions)}>
                <AppText variant="caption" color="accent">See all</AppText>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <AppLoading label="Loading…" />
          ) : error ? (
            <AppText variant="caption" color="danger">{error}</AppText>
          ) : transactions.length === 0 ? (
            <AppEmptyState
              icon="◌"
              title="No transactions yet"
              description="Transactions appear here once you send or receive."
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
                      <AppText style={[styles.activityIconText, { color: isIn ? theme.colors.success : theme.colors.textMuted }]}>
                        {isIn ? '↙' : '↗'}
                      </AppText>
                    </View>
                    <View style={styles.activityInfo}>
                      <AppText variant="body" style={styles.activityTitle}>
                        {isIn ? 'Received' : 'Sent'}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {tx.status} · {new Date(tx.createdAt).toLocaleDateString()}
                      </AppText>
                    </View>
                    <AppText
                      variant="subtitle"
                      style={[styles.activityAmount, { color: isIn ? theme.colors.success : theme.colors.text }]}
                    >
                      {isIn ? '+' : '−'}{tx.amountSats.toLocaleString()}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomDock
        onReceive={() => {
          if (origins.length > 1) {
            navigation.navigate(AppRoutes.SelectOriginReceive);
          } else {
            navigation.navigate(AppRoutes.Receive);
          }
        }}
        onSend={() => {
          if (origins.length > 1) {
            navigation.navigate(AppRoutes.SelectOriginSend);
          } else {
            navigation.navigate(AppRoutes.Send);
          }
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
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
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
  // Bottom dock
  dockWrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  bottomDock: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  dockBtn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  dockBtnLabel: {
    fontWeight: '700',
  },
});
