import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Wallet } from '../../../core/domain/entities/Wallet';
import { TESTNET_NETWORKS } from '../../../shared/constants/networks';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { AppBottomDock } from '../../components/base/AppBottomDock';
import { AppLoading } from '../../components/base/AppLoading';
import { AppLogo } from '../../components/base/AppLogo';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { BalanceEyeButton } from '../../components/security/BalanceEyeButton';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTemporaryRevealBalance } from '../../hooks/useTemporaryRevealBalance';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NetworkTab = 'mainnet' | 'testnet';

type WalletSummary = {
  balanceSats: number;
  utxoCount: number;
  accountCount: number;
  isLoaded: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesTab(wallet: Wallet, tab: NetworkTab): boolean {
  if (tab === 'mainnet') return wallet.network === 'mainnet';
  return TESTNET_NETWORKS.includes(wallet.network);
}

const NETWORK_ACCENT: Record<NetworkTab, string> = {
  mainnet: '#F7931A',
  testnet: '#8E6FE8',
};

function walletAccent(wallet: Wallet): string {
  return wallet.network === 'mainnet' ? NETWORK_ACCENT.mainnet : NETWORK_ACCENT.testnet;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatBalance(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

// ---------------------------------------------------------------------------
// StatPill — centered stat with value above label
// ---------------------------------------------------------------------------

type StatPillProps = {
  label: string;
  value: string;
  accent?: string;
  testID?: string;
  wide?: boolean;
};

function StatPill({ label, value, accent, testID, wide }: StatPillProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statPillBase, wide ? styles.statPillWide : styles.statPillNarrow]} testID={testID}>
      <AppText
        variant="subtitle"
        style={[styles.statValue, { color: accent ?? theme.colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </AppText>
      <AppText variant="caption" color="muted" style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// WalletCard
// ---------------------------------------------------------------------------

const HIDDEN_PLACEHOLDER = '••••••';

type WalletCardProps = {
  wallet: Wallet;
  summary: WalletSummary | undefined;
  hidden: boolean;
  onOpen: () => void;
};

function WalletCard({ wallet, summary, hidden, onOpen }: WalletCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = walletAccent(wallet);

  const rawBalance = summary?.isLoaded ? formatBalance(summary.balanceSats) : '—';
  const balanceLabel = hidden ? HIDDEN_PLACEHOLDER : rawBalance;
  const accountLabel = summary?.isLoaded ? String(summary.accountCount) : '—';
  const utxoLabel = summary?.isLoaded ? String(summary.utxoCount) : '—';
  const hasBalance = !hidden && summary?.isLoaded && summary.balanceSats > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open wallet ${wallet.name}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.cardBody}>
        {/* Identity row */}
        <View style={styles.identityRow}>
          <View
            style={[
              styles.walletIconWrap,
              { backgroundColor: accent + '18', borderRadius: theme.radii.md },
            ]}
          >
            <AppIcon name="wallet" size={20} color={accent} />
          </View>

          <View style={styles.identityText}>
            <AppText variant="subtitle" style={styles.walletName} numberOfLines={1}>
              {wallet.name}
            </AppText>
            <View style={styles.metaRow}>
              <View style={[styles.networkDot, { backgroundColor: accent }]} />
              <AppText variant="caption" style={[styles.networkLabel, { color: accent }]}>
                {wallet.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </AppText>
              {wallet.createdAt ? (
                <>
                  <AppText variant="caption" color="faint"> · </AppText>
                  <AppText variant="caption" color="muted">{formatDate(wallet.createdAt)}</AppText>
                </>
              ) : null}
            </View>
          </View>

          <AppIcon name="chevronRight" size={18} color={theme.colors.textMuted} />
        </View>

        {/* Stats box — muted background, centered columns */}
        <View style={[styles.statsBox, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <View style={styles.statsRow}>
            <StatPill
              wide
              label={t('walletList.statBalance')}
              value={balanceLabel}
              accent={hasBalance ? accent : undefined}
              testID={`wallet-stat-balance-${wallet.id}`}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <StatPill
              label={t('walletList.statAccounts')}
              value={accountLabel}
              testID={`wallet-stat-accounts-${wallet.id}`}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <StatPill
              label={t('walletList.statUtxos')}
              value={utxoLabel}
              testID={`wallet-stat-utxos-${wallet.id}`}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// NetworkTabChip
// ---------------------------------------------------------------------------

type NetworkTabChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function NetworkTabChip({ label, active, onPress }: NetworkTabChipProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabChip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surfaceRaised,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radii.md,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText
        variant="label"
        style={[
          active ? styles.tabChipTextActive : styles.tabChipTextInactive,
          active ? { color: theme.colors.primaryText } : undefined,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

type EmptyStateProps = {
  network: NetworkTab;
  onCreateWallet: () => void;
  onImportWallet: () => void;
};

function EmptyState({ network, onCreateWallet, onImportWallet }: EmptyStateProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = NETWORK_ACCENT[network];
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: accent + '18', borderRadius: theme.radii.xl }]}>
        <AppIcon name="wallet" size={42} color={accent} />
      </View>
      <AppText variant="subtitle" style={styles.emptyTitle}>{t('walletList.noWallets', { network })}</AppText>
      <AppText variant="body" color="muted" style={styles.emptyDesc}>
        {t('walletList.noWalletsDesc')}
      </AppText>
      <View style={styles.emptyActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCreateWallet}
          style={({ pressed }) => [
            styles.emptyBtn,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText variant="label" style={[styles.emptyBtnPrimaryText, { color: theme.colors.primaryText }]}>
            {t('walletList.createWallet')}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onImportWallet}
          style={({ pressed }) => [
            styles.emptyBtn,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AppText variant="label" color="muted">{t('walletList.importWallet')}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// WalletListScreen
// ---------------------------------------------------------------------------

export function WalletListScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { wallets, isLoading, selectWallet, listUtxos } = useWallet();
  const { getOrigins } = useAddressManager();
  const { hidden, hideBalanceEnabled, toggleReveal, pinModalVisible, pinError, submitPin, cancelAuth } =
    useTemporaryRevealBalance();

  const NETWORK_TABS: { key: NetworkTab; label: string }[] = [
    { key: 'mainnet', label: t('walletList.mainnet') },
    { key: 'testnet', label: t('walletList.testnet') },
  ];

  const [activeTab, setActiveTab] = useState<NetworkTab>('mainnet');
  const [summaries, setSummaries] = useState<Record<string, WalletSummary>>({});

  const filtered = wallets.filter(w => matchesTab(w, activeTab));

  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  const loadSummaries = useCallback(async (walletList: Wallet[]) => {
    if (walletList.length === 0) return;
    const entries = await Promise.all(
      walletList.map(async (w) => {
        try {
          const [utxos, origins] = await Promise.all([
            listUtxos(w.id),
            getOrigins(w.id),
          ]);
          const balanceSats = utxos.reduce((sum, u) => sum + u.valueSats, 0);
          return [w.id, {
            balanceSats,
            utxoCount: utxos.length,
            accountCount: origins.filter(o => !o.archivedAt).length,
            isLoaded: true,
          }] as const;
        } catch {
          return [w.id, { balanceSats: 0, utxoCount: 0, accountCount: 0, isLoaded: true }] as const;
        }
      }),
    );
    setSummaries(Object.fromEntries(entries));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when wallets context changes (e.g. after a wallet is added)
  useEffect(() => {
    loadSummaries(wallets).catch(() => undefined);
  }, [wallets, loadSummaries]);

  // Reload every time this screen gains focus (e.g. returning after sync)
  useFocusEffect(
    useCallback(() => {
      loadSummaries(walletsRef.current).catch(() => undefined);
    }, [loadSummaries]),
  );

  function handleOpenWallet(wallet: Wallet) {
    selectWallet(wallet.id);
    navigation.navigate(AppRoutes.Home);
  }

  function handleNavigateCreate() {
    navigation.navigate(AppRoutes.CreateWallet, { network: activeTab });
  }

  function handleNavigateImport() {
    navigation.navigate(AppRoutes.ImportWallet, { network: activeTab });
  }

  function handleOpenGlobalSettings() {
    navigation.navigate(AppRoutes.GlobalSettings);
  }

  function handleScanImportQr() {
    navigation.navigate(AppRoutes.ScanWalletQr, { network: activeTab });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />
      {/* Header */}
      <View style={styles.header}>
        <AppLogo size="sm" showName={false} />
        <AppText variant="subtitle" style={styles.headerTitle}>{t('walletList.title')}</AppText>
        <View style={styles.headerActions}>
          {hideBalanceEnabled && (
            <BalanceEyeButton hidden={hidden} onPress={toggleReveal} testID="wallet-list-eye-btn" />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('walletList.importWallet')}
            onPress={handleNavigateImport}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <AppIcon name="import" size={20} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('walletList.createWallet')}
            onPress={handleNavigateCreate}
            style={({ pressed }) => [
              styles.headerBtn,
              styles.headerBtnPrimary,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radii.md, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <AppText variant="label" style={[styles.headerBtnPrimaryText, { color: theme.colors.primaryText }]}>+</AppText>
          </Pressable>
        </View>
      </View>

      {/* Network tabs */}
      <View style={styles.tabsRow}>
        {NETWORK_TABS.map(tab => (
          <NetworkTabChip
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
          />
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 16) + 112 },
          ]}
        >
          {filtered.length === 0 ? (
            <EmptyState
              network={activeTab}
              onCreateWallet={handleNavigateCreate}
              onImportWallet={handleNavigateImport}
            />
          ) : (
            filtered.map(wallet => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                summary={summaries[wallet.id]}
                hidden={hidden}
                onOpen={() => handleOpenWallet(wallet)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Floating bottom dock */}
      <AppBottomDock
        leftButton={{
          icon: 'settings',
          label: t('walletList.globalSettings'),
          onPress: handleOpenGlobalSettings,
          testID: 'wallet-list-global-settings',
        }}
        rightButton={{
          icon: 'scan',
          label: t('walletList.scanImport'),
          onPress: handleScanImportQr,
          backgroundColor: theme.colors.primary,
          iconColor: theme.colors.primaryText,
          labelColor: theme.colors.primaryText,
          testID: 'wallet-list-scan-import',
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerBtnPrimary: {},
  headerBtnPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabChip: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabChipTextActive: {
    fontWeight: '700',
  },
  tabChipTextInactive: {
    opacity: 0.55,
  },

  // Center state
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  // List
  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Wallet card
  card: {
    borderWidth: 1,
  },
  cardBody: {
    gap: 12,
    padding: 16,
  },

  // Identity row
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  walletIconWrap: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  identityText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  walletName: {
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  networkDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  networkLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Stats box
  statsBox: {},
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Base shared between all stat pills; flex is added via statPillWide / statPillNarrow
  statPillBase: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  // Balance column — double width so long values (e.g. "99,999,999 sats") never crowd the edges
  statPillWide: {
    flex: 2,
  },
  // Accounts / UTXOs — single-digit or small numbers always fit
  statPillNarrow: {
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  statDivider: {
    alignSelf: 'stretch',
    width: StyleSheet.hairlineWidth,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 60,
  },
  emptyIcon: {
    alignItems: 'center',
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    maxWidth: 280,
    textAlign: 'center',
  },
  emptyActions: {
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  emptyBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyBtnPrimaryText: {
    fontWeight: '700',
  },
});
