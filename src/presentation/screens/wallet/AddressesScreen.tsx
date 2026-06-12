import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppRoutes } from '../../../app/navigation/routes';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import type { AddressStatus, WalletAddress } from '../../../core/domain/entities/WalletAddress';

const STATUS_COLOR: Record<AddressStatus, 'muted' | 'success' | 'warning' | 'danger' | 'accent'> = {
  fresh: 'muted',
  reserved: 'accent',
  received: 'success',
  spent_once: 'warning',
  change: 'warning',
  archived: 'muted',
  inconsistent: 'danger',
};

// Addresses that are permanently spent/used — syncing them serves no purpose.
const USED_STATUSES = new Set<AddressStatus>(['spent_once', 'change', 'archived']);

function truncate(addr: string): string {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
}

type AddressRowProps = {
  address: WalletAddress;
  onSync: (address: string) => void;
  isSyncing: boolean;
};

const AddressRow = React.memo(function AddressRowMemo({ address, onSync, isSyncing }: AddressRowProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const statusColor = STATUS_COLOR[address.status];
  const isUsed = USED_STATUSES.has(address.status);
  const STATUS_TRANSLATIONS: Record<AddressStatus, string> = {
    fresh: t('addresses.statusFresh'),
    reserved: t('addresses.statusReserved'),
    received: t('addresses.statusReceived'),
    spent_once: t('addresses.statusSpent'),
    change: t('addresses.statusSpent'),
    archived: t('addresses.statusArchived'),
    inconsistent: t('addresses.statusInconsistent'),
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isUsed ? STATUS_TRANSLATIONS[address.status] : t('addresses.syncAddress')}
      onPress={isUsed ? undefined : () => onSync(address.address)}
      disabled={isSyncing || isUsed}
      testID={`address-row-${address.address}`}
      style={({ pressed }) => [{ opacity: isSyncing ? 0.5 : (!isUsed && pressed) ? 0.75 : 1 }]}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <View style={styles.rowLeft}>
          <AppText variant="body" style={styles.address}>{truncate(address.address)}</AppText>
          <View style={styles.meta}>
            <AppText variant="caption" color={statusColor}>{STATUS_TRANSLATIONS[address.status]}</AppText>
            <AppText variant="caption" color="faint">·</AppText>
            <AppText variant="caption" color="muted">{address.chain === 'change' ? t('addresses.chainChange') : t('addresses.chainReceive')}</AppText>
            <AppText variant="caption" color="faint">·</AppText>
            <AppText variant="caption" color="muted">#{address.index}</AppText>
          </View>
        </View>
        <View style={styles.rowRight}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : address.txCount > 0 ? (
            <>
              <AppText variant="caption" color="muted">{t('addresses.txCount', { count: address.txCount })}</AppText>
              {address.totalReceivedSats > 0 ? (
                <AppText variant="caption" color="muted">
                  {address.totalReceivedSats.toLocaleString()} sats
                </AppText>
              ) : null}
            </>
          ) : (
            <AppIcon name="sync" size={16} color={theme.colors.textFaint} />
          )}
        </View>
      </View>
    </Pressable>
  );
});

type GroupedAddresses = {
  originId: string;
  originName: string;
  accountIndex: number;
  receive: WalletAddress[];
  change: WalletAddress[];
};

function groupByOrigin(addresses: WalletAddress[]): GroupedAddresses[] {
  const map = new Map<string, GroupedAddresses>();
  for (const addr of addresses) {
    if (!map.has(addr.originId)) {
      map.set(addr.originId, {
        originId: addr.originId,
        originName: addr.originName,
        accountIndex: addr.accountIndex,
        receive: [],
        change: [],
      });
    }
    const group = map.get(addr.originId)!;
    if (addr.chain === 'receive') group.receive.push(addr);
    else group.change.push(addr);
  }
  return [...map.values()].sort((a, b) => a.accountIndex - b.accountIndex);
}

type SectionProps = {
  group: GroupedAddresses;
  onSync: (address: string) => void;
  syncingAddress: string | null;
};

const OriginSection = React.memo(function OriginSectionMemo({ group, onSync, syncingAddress }: SectionProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="subtitle" style={styles.sectionTitle}>{group.originName}</AppText>
        <View
          style={[
            styles.accountBadge,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm },
          ]}
        >
          <AppText variant="caption" color="muted">{t('common.account', { accountIndex: group.accountIndex })}</AppText>
        </View>
      </View>

      {group.receive.length > 0 && (
        <View style={styles.chainGroup}>
          <AppText variant="label" color="muted" style={styles.chainLabel}>{t('addresses.chainReceive')}</AppText>
          <View style={styles.addressList}>
            {group.receive.map(a => (
              <AddressRow
                key={a.id}
                address={a}
                onSync={onSync}
                isSyncing={syncingAddress === a.address}
              />
            ))}
          </View>
        </View>
      )}

      {group.change.length > 0 && (
        <View style={styles.chainGroup}>
          <AppText variant="label" color="muted" style={styles.chainLabel}>{t('addresses.chainChange')}</AppText>
          <View style={styles.addressList}>
            {group.change.map(a => (
              <AddressRow
                key={a.id}
                address={a}
                onSync={onSync}
                isSyncing={syncingAddress === a.address}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

export function AddressesScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { listAddresses } = useAddressManager();
  const { selectedWallet, syncAddress } = useWallet();

  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingAddress, setSyncingAddress] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    try {
      const list = await listAddresses(selectedWallet.id);
      setAddresses(list);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, listAddresses]);

  // Refresh without showing the loading spinner — prevents list flicker after per-address sync
  const silentLoad = useCallback(async () => {
    if (!selectedWallet) return;
    try {
      const list = await listAddresses(selectedWallet.id);
      setAddresses(list);
    } catch {
      // silent
    }
  }, [selectedWallet, listAddresses]);

  const handleSyncAddress = useCallback(async (address: string) => {
    if (!selectedWallet || syncingAddress) return;
    setSyncingAddress(address);
    // Yield to the React scheduler so the loader appears before async work begins.
    await new Promise<void>(resolve => InteractionManager.runAfterInteractions(() => resolve()));
    try {
      await syncAddress(selectedWallet.id, address);
      await silentLoad();
    } catch {
      // silent — address sync errors are not critical
    } finally {
      setSyncingAddress(null);
    }
  }, [selectedWallet, syncAddress, syncingAddress, silentLoad]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const groups = groupByOrigin(addresses);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.addrHeader}>
        <View style={styles.addrHeaderText}>
          <AppText variant="title">{t('addresses.title')}</AppText>
          <AppText variant="caption" color="muted">{t('addresses.total', { count: addresses.length })}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.info')}
          onPress={() => navigation.navigate(AppRoutes.AddressPolicy)}
          style={({ pressed }) => [styles.infoBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="info" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading label={t('addresses.loading')} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <AppEmptyState
            icon="addresses"
            title={t('addresses.empty')}
            description={t('addresses.emptyDesc')}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        >
          {groups.map(g => (
            <OriginSection
              key={g.originId}
              group={g}
              onSync={handleSyncAddress}
              syncingAddress={syncingAddress}
            />
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
  addrHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  addrHeaderText: {
    flex: 1,
    gap: 2,
  },
  infoBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scroll: {
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chainGroup: {
    gap: 8,
  },
  chainLabel: {
    paddingLeft: 2,
  },
  addressList: {
    gap: 6,
  },
  row: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  rowLeft: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  address: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '500',
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
