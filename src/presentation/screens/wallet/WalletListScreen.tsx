import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Wallet } from '../../../core/domain/entities/Wallet';
import { TESTNET_NETWORKS } from '../../../shared/constants/networks';
import { AppConfirmModal } from '../../components/base/AppConfirmModal';
import { AppLoading } from '../../components/base/AppLoading';
import { AppLogo } from '../../components/base/AppLogo';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NetworkTab = 'mainnet' | 'testnet';

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

// ---------------------------------------------------------------------------
// Sub-components
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
          backgroundColor: active ? theme.colors.accent : theme.colors.surfaceRaised,
          borderColor: active ? theme.colors.accent : theme.colors.border,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText
        variant="label"
        style={active ? styles.tabChipTextActive : styles.tabChipTextInactive}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type WalletCardProps = {
  wallet: Wallet;
  onOpen: () => void;
  onDeleteRequest: () => void;
};

function WalletCard({ wallet, onOpen, onDeleteRequest }: WalletCardProps) {
  const { theme } = useTheme();
  const accent = walletAccent(wallet);
  const accentBg = accent + '18';
  const accentBorder = accent + '44';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open wallet ${wallet.name}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: pressed ? accent + '80' : accentBorder,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* Colour strip */}
      <View style={[styles.cardStrip, { backgroundColor: accent }]} />

      <View style={styles.cardBody}>
        {/* Top row: icon + name + delete */}
        <View style={styles.cardTopRow}>
          <View style={[styles.cardIcon, { backgroundColor: accentBg, borderRadius: theme.radii.md }]}>
            <AppIcon name="wallet" size={22} color={accent} />
          </View>
          <View style={styles.cardNameBlock}>
            <AppText variant="subtitle" style={styles.cardName} numberOfLines={1}>
              {wallet.name}
            </AppText>
            {wallet.createdAt ? (
              <AppText variant="caption" color="muted">
                {formatDate(wallet.createdAt)}
              </AppText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete wallet ${wallet.name}`}
            hitSlop={12}
            onPress={onDeleteRequest}
            style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.5 : 0.65 }]}
          >
            <AppIcon name="close" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {/* Bottom row: network badge + status + chevron */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.networkBadge, { backgroundColor: accentBg, borderColor: accentBorder, borderRadius: theme.radii.sm }]}>
            <View style={[styles.networkDot, { backgroundColor: accent }]} />
            <AppText variant="label" style={[styles.networkBadgeText, { color: accent }]}>
              {wallet.network === 'mainnet' ? 'mainnet' : 'testnet'}
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="muted">{wallet.status}</AppText>
          </View>
          <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty state
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
            styles.emptyBtnPrimary,
            { backgroundColor: theme.colors.accent, borderRadius: theme.radii.lg, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText variant="label" style={styles.emptyBtnPrimaryText}>{t('walletList.createWallet')}</AppText>
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
// Main screen
// ---------------------------------------------------------------------------

export function WalletListScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { wallets, isLoading, selectWallet, deleteWallet } = useWallet();

  const NETWORK_TABS: { key: NetworkTab; label: string }[] = [
    { key: 'mainnet', label: t('walletList.mainnet') },
    { key: 'testnet', label: t('walletList.testnet') },
  ];

  const [activeTab, setActiveTab] = useState<NetworkTab>('mainnet');
  const [pendingDelete, setPendingDelete] = useState<Wallet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = wallets.filter(w => matchesTab(w, activeTab));

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

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteWallet(pendingDelete.id);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppLogo size="sm" showName={false} />
        <AppText variant="subtitle" style={styles.headerTitle}>{t('walletList.title')}</AppText>
        <View style={styles.headerActions}>
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
              styles.headerBtnAccent,
              { backgroundColor: theme.colors.accent, borderRadius: theme.radii.md, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <AppText variant="label" style={styles.headerBtnAccentText}>+</AppText>
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
            { paddingBottom: Math.max(insets.bottom, 16) + 32 },
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
                onOpen={() => handleOpenWallet(wallet)}
                onDeleteRequest={() => setPendingDelete(wallet)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Delete confirmation */}
      <AppConfirmModal
        visible={!!pendingDelete}
        title={t('walletList.deleteTitle')}
        message={t('walletList.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

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
  headerBtnAccent: {},
  headerBtnAccentText: {
    color: '#fff',
    fontSize: 18,
  },

  // Tabs — horizontal pills in a row (not scrollable since only 2)
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabChip: {
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabChipTextInactive: {
    opacity: 0.65,
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
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardStrip: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    gap: 14,
    padding: 16,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardNameBlock: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontWeight: '700',
  },
  deleteBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cardBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  networkBadge: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  networkDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardArrow: {
    marginLeft: 'auto',
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
  emptyBtnPrimary: {},
  emptyBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
