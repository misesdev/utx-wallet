import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Utxo } from '../../../core/domain/entities/Utxo';
import type { WalletAddress } from '../../../core/domain/entities/WalletAddress';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { UtxoItem } from '../../components/wallet/UtxoItem';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useUtxos, type UtxoFilter } from '../../hooks/useUtxos';
import { useWallet } from '../../hooks/useWallet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTERS: { key: UtxoFilter }[] = [
  { key: 'all' },
  { key: 'highest-value' },
  { key: 'lowest-value' },
  { key: 'confirmed' },
  { key: 'pending' },
  { key: 'frozen' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OriginGroup = {
  originId: string;
  originName: string;
  isDefault: boolean;
  utxos: Utxo[];
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterChip({ label, active, onPress }: FilterChipProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? theme.colors.accent : theme.colors.border,
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surfaceRaised,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText variant="caption" style={active ? [styles.chipText, { color: theme.colors.accent }] : styles.chipTextMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

type OriginHeaderProps = {
  name: string;
  isDefault: boolean;
  count: number;
  totalSats: number;
};

function OriginHeader({ name, isDefault, count, totalSats }: OriginHeaderProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View style={styles.originHeader}>
      <View
        style={[
          styles.originIcon,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.sm,
          },
        ]}
      >
        <AppIcon name={isDefault ? "wallet" : "accounts"} size={22} color={isDefault ? theme.colors.accent : theme.colors.textMuted} />
      </View>
      <View style={styles.originInfo}>
        <View style={styles.originTitleRow}>
          <AppText variant="body" style={styles.originName}>{name}</AppText>
          {isDefault && (
            <View
              style={[
                styles.defaultBadge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" style={{ color: theme.colors.accent }}>{t('common.default')}</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">
          {t('utxos.originSummary', { count, total: totalSats.toLocaleString() })}
        </AppText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function UtxosScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { selectedWallet } = useWallet();
  const { listAddresses } = useAddressManager();
  const { utxos, isLoading, error, filter, setFilter, freeze, unfreeze } = useUtxos();

  const FILTER_LABELS: Record<UtxoFilter, string> = {
    'all': t('utxos.all'),
    'highest-value': t('utxos.sortValueAsc'),
    'lowest-value': t('utxos.sortValueDesc'),
    'confirmed': t('utxos.confirmed'),
    'pending': t('utxos.pending'),
    'frozen': t('utxos.frozen'),
  };

  const [walletAddresses, setWalletAddresses] = useState<WalletAddress[]>([]);

  // Load addresses for origin mapping
  useEffect(() => {
    if (!selectedWallet) return;
    listAddresses(selectedWallet.id)
      .then(setWalletAddresses)
      .catch(() => setWalletAddresses([]));
  }, [selectedWallet, listAddresses]);

  // Build address → origin mapping
  const addressOriginMap = useMemo(() => {
    const map = new Map<string, { originId: string; originName: string; isDefault: boolean }>();
    for (const addr of walletAddresses) {
      map.set(addr.address, {
        originId: addr.originId,
        originName: addr.originName,
        isDefault: addr.accountIndex === 0,
      });
    }
    return map;
  }, [walletAddresses]);

  // Group UTXOs by origin
  const groups = useMemo((): OriginGroup[] => {
    const groupMap = new Map<string, OriginGroup>();
    for (const utxo of utxos) {
      const info = addressOriginMap.get(utxo.address);
      const key = info?.originId ?? '__other__';
      const existing = groupMap.get(key);
      if (existing) {
        existing.utxos.push(utxo);
      } else {
        groupMap.set(key, {
          originId: key,
          originName: info?.originName ?? t('utxos.otherOrigin'),
          isDefault: info?.isDefault ?? false,
          utxos: [utxo],
        });
      }
    }
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.originName.localeCompare(b.originName);
    });
  }, [utxos, addressOriginMap, t]);

  const handleFreeze = useCallback(
    (txid: string, vout: number) => { freeze(txid, vout).catch(() => undefined); },
    [freeze],
  );

  const handleUnfreeze = useCallback(
    (txid: string, vout: number) => { unfreeze(txid, vout).catch(() => undefined); },
    [unfreeze],
  );

  const totalSats = utxos.reduce((sum, u) => sum + u.valueSats, 0);

  const emptyMessage =
    filter === 'frozen'
      ? t('utxos.noFrozen')
      : filter === 'pending'
        ? t('utxos.noPending')
        : t('utxos.syncToLoad');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('utxos.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map(f => (
          <FilterChip
            key={f.key}
            label={FILTER_LABELS[f.key]}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </ScrollView>

      {/* Summary */}
      {utxos.length > 0 && (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" color="muted">
            {t('utxos.count', { count: utxos.length })}
          </AppText>
          <AppText variant="caption" color="muted">
            {t('utxos.total', { total: totalSats.toLocaleString() })}
          </AppText>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <AppText variant="body" color="muted">{t('utxos.loading')}</AppText>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText variant="body" color="danger">{error}</AppText>
        </View>
      ) : utxos.length === 0 ? (
        <View style={styles.center}>
          <AppText variant="subtitle" style={styles.emptyTitle}>{t('utxos.empty')}</AppText>
          <AppText variant="body" color="muted" style={styles.emptyDesc}>{emptyMessage}</AppText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        >
          {groups.map(group => (
            <View key={group.originId} style={styles.group}>
              <OriginHeader
                name={group.originName}
                isDefault={group.isDefault}
                count={group.utxos.length}
                totalSats={group.utxos.reduce((s, u) => s + u.valueSats, 0)}
              />
              <View style={styles.groupItems}>
                {group.utxos.map(utxo => (
                  <UtxoItem
                    key={`${utxo.txid}:${utxo.vout}`}
                    utxo={utxo}
                    onFreeze={handleFreeze}
                    onUnfreeze={handleUnfreeze}
                  />
                ))}
              </View>
            </View>
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

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Filters
  filtersScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontWeight: '600',
  },
  chipTextMuted: {
    opacity: 0.55,
  },

  // Summary
  summary: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  // States
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
  },

  // List
  list: {
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Groups
  group: {
    gap: 10,
  },
  originHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  originIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  originIconText: {
    fontSize: 16,
  },
  originInfo: {
    flex: 1,
    gap: 2,
  },
  originTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '700',
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  groupItems: {
    gap: 8,
  },
});
