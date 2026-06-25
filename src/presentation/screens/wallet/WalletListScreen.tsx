import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Wallet } from '../../../core/domain/entities/Wallet';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';
import { TESTNET_NETWORKS } from '../../../shared/constants/networks';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { AppBottomDock } from '../../components/base/AppBottomDock';
import { AppButton } from '../../components/base/AppButton';
import { AppLoading } from '../../components/base/AppLoading';
import { AppLogo } from '../../components/base/AppLogo';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { BalanceEyeButton } from '../../components/security/BalanceEyeButton';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useSafeMode } from '../../hooks/useSafeMode';
import { useTemporaryRevealBalance } from '../../hooks/useTemporaryRevealBalance';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NetworkTab = 'mainnet' | 'testnet4';

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
  testnet4: '#178a54',
};

function walletAccent(wallet: Wallet): string {
  return wallet.network === 'mainnet' ? NETWORK_ACCENT.mainnet : NETWORK_ACCENT.testnet4;
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

function networkDisplayName(network: BitcoinNetwork): string {
  if (network === 'mainnet') return 'Mainnet';
  return 'Testnet4';
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
  isBlocked: boolean;
  onOpen: () => void;
};

function WalletCard({ wallet, summary, hidden, isBlocked, onOpen }: WalletCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = walletAccent(wallet);
  const isWatchOnly = wallet.status === 'watch-only';

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
          borderColor: isBlocked ? theme.colors.warning : theme.colors.border,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      testID={`wallet-card-${wallet.id}`}
    >
      {/* Top accent strip */}
      <View style={[
        styles.accentStrip,
        {
          backgroundColor: isBlocked ? theme.colors.warning : accent,
          borderTopLeftRadius: theme.radii.xl,
          borderTopRightRadius: theme.radii.xl,
        },
      ]} />

      <View style={styles.cardBody}>
        {/* Identity row */}
        <View style={styles.identityRow}>
          <View
            style={[
              styles.walletIconWrap,
              { backgroundColor: (isBlocked ? theme.colors.warning : accent) + '22', borderRadius: theme.radii.md },
            ]}
          >
            <AppIcon
              name={isBlocked ? 'safeMode' : 'wallet'}
              size={22}
              color={isBlocked ? theme.colors.warning : accent}
            />
          </View>

          <View style={styles.identityText}>
            <AppText variant="subtitle" style={styles.walletName} numberOfLines={1}>
              {wallet.name}
            </AppText>

            <View style={styles.badgeRow}>
              <View style={[styles.networkBadge, { backgroundColor: accent + '18', borderRadius: theme.radii.sm }]}>
                <View style={[styles.networkDot, { backgroundColor: accent }]} />
                <AppText variant="label" style={[styles.networkLabel, { color: accent }]}>
                  {wallet.network === 'mainnet' ? 'Mainnet' : 'Testnet4'}
                </AppText>
              </View>
              {isWatchOnly && (
                <View style={[styles.watchOnlyBadge, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
                  <AppIcon name="eye" size={11} color={theme.colors.textMuted} />
                  <AppText variant="label" color="muted">{t('wallet.watchOnly')}</AppText>
                </View>
              )}
            </View>

            {wallet.createdAt ? (
              <AppText variant="caption" color="faint" style={styles.dateText}>
                {formatDate(wallet.createdAt)}
              </AppText>
            ) : null}
          </View>

          <AppIcon
            name={isBlocked ? 'safeMode' : 'chevronRight'}
            size={18}
            color={isBlocked ? theme.colors.warning : theme.colors.textMuted}
          />
        </View>

        {/* Stats box */}
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

        {/* Safe mode warning banner */}
        {isBlocked && (
          <View
            style={[
              styles.safeModeWarning,
              {
                backgroundColor: theme.colors.warningMuted,
                borderColor: theme.colors.warning,
                borderRadius: theme.radii.md,
              },
            ]}
            testID={`safe-mode-warning-${wallet.id}`}
          >
            <AppIcon name="warning" size={14} color={theme.colors.warning} />
            <AppText variant="caption" style={[styles.safeModeWarningText, { color: theme.colors.warning }]}>
              {t('safeMode.noNodeForNetwork', { network: networkDisplayName(wallet.network) })}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SafeModeBlockedModal
// ---------------------------------------------------------------------------

type SafeModeBlockedModalProps = {
  visible: boolean;
  walletNetwork: BitcoinNetwork;
  onDisableAndOpen: () => void;
  onManageNodes: () => void;
  onCancel: () => void;
};

function SafeModeBlockedModal({
  visible,
  walletNetwork,
  onDisableAndOpen,
  onManageNodes,
  onCancel,
}: SafeModeBlockedModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const networkName = networkDisplayName(walletNetwork);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.warning,
              borderRadius: theme.radii.xl,
            },
          ]}
          testID="safe-mode-blocked-modal"
        >
          {/* Icon */}
          <View
            style={[
              styles.modalIconWrap,
              { backgroundColor: theme.colors.warningMuted, borderRadius: theme.radii.lg },
            ]}
          >
            <AppIcon name="safeMode" size={32} color={theme.colors.warning} />
          </View>

          {/* Title */}
          <AppText variant="subtitle" style={styles.modalTitle} testID="safe-mode-blocked-title">
            {t('safeMode.walletBlocked')}
          </AppText>

          {/* Description */}
          <AppText variant="body" color="muted" style={styles.modalDesc} testID="safe-mode-blocked-desc">
            {t('safeMode.walletBlockedDesc', { network: networkName })}
          </AppText>

          {/* Actions */}
          <View style={styles.modalActions}>
            <AppButton
              title={t('safeMode.disableSafeModeAndOpen')}
              variant="primary"
              onPress={onDisableAndOpen}
              testID="btn-disable-safe-mode-and-open"
            />
            <AppButton
              title={t('safeMode.manageNodes')}
              variant="secondary"
              onPress={onManageNodes}
              testID="btn-safe-mode-manage-nodes"
            />
            <AppButton
              title={t('common.cancel')}
              variant="ghost"
              onPress={onCancel}
              testID="btn-safe-mode-blocked-cancel"
            />
          </View>
        </View>
      </View>
    </Modal>
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

const NETWORK_TABS: { key: NetworkTab }[] = [
  { key: 'mainnet' },
  { key: 'testnet4' },
];

export function WalletListScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const { wallets, isLoading, selectWallet, listUtxos } = useWallet();
  const { getOrigins } = useAddressManager();
  const { hidden, hideBalanceEnabled, toggleReveal, pinModalVisible, pinError, submitPin, cancelAuth } =
    useTemporaryRevealBalance();
  const { isWalletBlocked, deactivateSafeMode } = useSafeMode();

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(new Set([0]));
  const [summaries, setSummaries] = useState<Record<string, WalletSummary>>({});
  const [blockedWallet, setBlockedWallet] = useState<Wallet | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  // Guard against zero-width in test environments
  const effectiveWidth = Math.max(windowWidth, 1);
  const tabWidth = effectiveWidth / NETWORK_TABS.length;

  const activeTab: NetworkTab = NETWORK_TABS[activeTabIndex].key;

  const updateActiveTab = useCallback(
    (index: number) => {
      setActiveTabIndex(index);
      setVisitedTabs(prev => {
        if (prev.has(index)) return prev;
        return new Set([...prev, index]);
      });
      Animated.timing(indicatorAnim, {
        toValue: index * tabWidth,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [indicatorAnim, tabWidth],
  );

  function handleTabPress(index: number) {
    if (index === activeTabIndex) return;
    pagerRef.current?.scrollTo({ x: index * effectiveWidth, animated: true });
    updateActiveTab(index);
  }

  function handleMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.max(
      0,
      Math.min(
        NETWORK_TABS.length - 1,
        Math.round(e.nativeEvent.contentOffset.x / effectiveWidth),
      ),
    );
    updateActiveTab(index);
  }

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

  useEffect(() => {
    loadSummaries(wallets).catch(() => undefined);
  }, [wallets, loadSummaries]);

  useFocusEffect(
    useCallback(() => {
      loadSummaries(walletsRef.current).catch(() => undefined);
    }, [loadSummaries]),
  );

  function openWalletDirect(wallet: Wallet) {
    selectWallet(wallet.id);
    navigation.navigate(AppRoutes.Home);
  }

  function handleOpenWallet(wallet: Wallet) {
    if (isWalletBlocked(wallet.network)) {
      setBlockedWallet(wallet);
      return;
    }
    openWalletDirect(wallet);
  }

  async function handleDisableSafeModeAndOpen() {
    if (!blockedWallet) return;
    const wallet = blockedWallet;
    setBlockedWallet(null);
    await deactivateSafeMode();
    openWalletDirect(wallet);
  }

  function handleBlockedManageNodes() {
    setBlockedWallet(null);
    navigation.navigate(AppRoutes.ManageNodes);
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

  function renderTabContent(tab: NetworkTab) {
    const filtered = wallets.filter(w => matchesTab(w, tab));
    if (filtered.length === 0) {
      return (
        <EmptyState
          network={tab}
          onCreateWallet={handleNavigateCreate}
          onImportWallet={handleNavigateImport}
        />
      );
    }
    return filtered.map(wallet => (
      <WalletCard
        key={wallet.id}
        wallet={wallet}
        summary={summaries[wallet.id]}
        hidden={hidden}
        isBlocked={isWalletBlocked(wallet.network)}
        onOpen={() => handleOpenWallet(wallet)}
      />
    ));
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

      <SafeModeBlockedModal
        visible={blockedWallet !== null}
        walletNetwork={blockedWallet?.network ?? 'mainnet'}
        onDisableAndOpen={handleDisableSafeModeAndOpen}
        onManageNodes={handleBlockedManageNodes}
        onCancel={() => setBlockedWallet(null)}
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

      {/* Tab bar with sliding underline indicator */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        {NETWORK_TABS.map((tab, index) => {
          const isActive = activeTabIndex === index;
          const accent = NETWORK_ACCENT[tab.key];
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => handleTabPress(index)}
              style={({ pressed }) => [styles.tabItem, { opacity: pressed ? 0.7 : 1 }]}
            >
              <AppText
                variant="label"
                style={[
                  styles.tabLabel,
                  { color: isActive ? accent : theme.colors.textMuted },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.key === 'mainnet' ? t('walletList.mainnet') : t('walletList.testnet')}
              </AppText>
            </Pressable>
          );
        })}

        {/* Animated underline indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor: NETWORK_ACCENT[activeTab],
              width: tabWidth,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
          testID="tab-indicator"
        />
      </View>

      {/* Swipeable pager */}
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading />
        </View>
      ) : (
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          bounces={false}
          style={styles.pager}
          testID="wallet-pager"
        >
          {NETWORK_TABS.map((tab, i) => (
            <View
              key={tab.key}
              style={[styles.page, { width: effectiveWidth }]}
              testID={`page-${tab.key}`}
            >
              {visitedTabs.has(i) && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.list,
                    { paddingBottom: Math.max(insets.bottom, 16) + 112 },
                  ]}
                >
                  {renderTabContent(tab.key)}
                </ScrollView>
              )}
            </View>
          ))}
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

  // Tab bar
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 13,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    borderRadius: 2,
    bottom: 0,
    height: 2,
    left: 0,
    position: 'absolute',
  },

  // Center loading
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  // Swipeable pager
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },

  // List inside a page
  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Wallet card
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentStrip: {
    height: 3,
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
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  identityText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  walletName: {
    fontWeight: '700',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  networkBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  networkDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  networkLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  watchOnlyBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 11,
  },

  // Stats box
  statsBox: {},
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statPillBase: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  statPillWide: {
    flex: 2,
  },
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

  // Safe mode warning on card
  safeModeWarning: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  safeModeWarningText: {
    flex: 1,
    fontWeight: '600',
  },

  // Safe mode blocked modal
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
    maxWidth: 360,
    padding: 28,
    width: '100%',
  },
  modalIconWrap: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    marginBottom: 4,
    width: 64,
  },
  modalTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDesc: {
    textAlign: 'center',
  },
  modalActions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
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
