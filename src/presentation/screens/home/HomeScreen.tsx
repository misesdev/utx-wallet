import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { useSafeMode } from '../../hooks/useSafeMode';
import { useTemporaryRevealBalance } from '../../hooks/useTemporaryRevealBalance';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';
import { WalletCard } from './components/WalletCard';
import { SafeModeBlockedModal } from './components/SafeModeBlockedModal';
import { WalletListEmptyState } from './components/WalletListEmptyState';
import type { WalletSummary } from './components/WalletCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NetworkTab = 'mainnet' | 'testnet4';

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

const NETWORK_TABS: { key: NetworkTab }[] = [
  { key: 'mainnet' },
  { key: 'testnet4' },
];

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export function HomeScreen() {
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
    navigation.navigate(AppRoutes.Wallet);
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
        <WalletListEmptyState
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
  root: { flex: 1 },

  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { flex: 1, fontWeight: '700' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  headerBtn: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  headerBtnPrimary: {},
  headerBtnPrimaryText: { fontSize: 18, fontWeight: '700' },

  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tabItem: { alignItems: 'center', flex: 1, paddingVertical: 13 },
  tabLabel: { fontSize: 13, letterSpacing: 0.3 },
  tabLabelActive: { fontWeight: '700' },
  tabIndicator: { borderRadius: 2, bottom: 0, height: 2, left: 0, position: 'absolute' },

  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },

  pager: { flex: 1 },
  page: { flex: 1 },
  list: { gap: 12, paddingHorizontal: 20, paddingTop: 8 },
});
