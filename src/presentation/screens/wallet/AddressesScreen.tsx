import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppHeader } from '../../components/base/AppHeader';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import type { AddressStatus, WalletAddress } from '../../../core/domain/entities/WalletAddress';

const STATUS_LABEL: Record<AddressStatus, string> = {
  fresh: 'Fresh',
  reserved: 'Reserved',
  received: 'Received',
  spent_once: 'Spent',
  change: 'Change',
  archived: 'Archived',
  inconsistent: 'Inconsistent',
};

const STATUS_COLOR: Record<AddressStatus, 'muted' | 'success' | 'warning' | 'danger' | 'accent'> = {
  fresh: 'muted',
  reserved: 'accent',
  received: 'success',
  spent_once: 'warning',
  change: 'muted',
  archived: 'muted',
  inconsistent: 'danger',
};

function truncate(addr: string): string {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
}

type AddressRowProps = {
  address: WalletAddress;
};

function AddressRow({ address }: AddressRowProps) {
  const { theme } = useTheme();
  const statusColor = STATUS_COLOR[address.status];

  return (
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
          <AppText variant="caption" color={statusColor}>{STATUS_LABEL[address.status]}</AppText>
          <AppText variant="caption" color="faint">·</AppText>
          <AppText variant="caption" color="muted">{address.chain === 'change' ? 'Change' : 'Receive'}</AppText>
          <AppText variant="caption" color="faint">·</AppText>
          <AppText variant="caption" color="muted">#{address.index}</AppText>
        </View>
      </View>
      <View style={styles.rowRight}>
        {address.txCount > 0 ? (
          <>
            <AppText variant="caption" color="muted">{address.txCount} tx</AppText>
            {address.totalReceivedSats > 0 ? (
              <AppText variant="caption" color="muted">
                {address.totalReceivedSats.toLocaleString()} sats
              </AppText>
            ) : null}
          </>
        ) : (
          <AppText variant="caption" color="faint">—</AppText>
        )}
      </View>
    </View>
  );
}

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
};

function OriginSection({ group }: SectionProps) {
  const { theme } = useTheme();
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
          <AppText variant="caption" color="muted">Account {group.accountIndex}</AppText>
        </View>
      </View>

      {group.receive.length > 0 && (
        <View style={styles.chainGroup}>
          <AppText variant="label" color="muted" style={styles.chainLabel}>Receive</AppText>
          <View style={styles.addressList}>
            {group.receive.map(a => <AddressRow key={a.id} address={a} />)}
          </View>
        </View>
      )}

      {group.change.length > 0 && (
        <View style={styles.chainGroup}>
          <AppText variant="label" color="muted" style={styles.chainLabel}>Change</AppText>
          <View style={styles.addressList}>
            {group.change.map(a => <AddressRow key={a.id} address={a} />)}
          </View>
        </View>
      )}
    </View>
  );
}

export function AddressesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { listAddresses } = useAddressManager();
  const { selectedWallet } = useWallet();

  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const groups = groupByOrigin(addresses);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader title="Addresses" subtitle={`${addresses.length} total`} />
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading label="Loading addresses…" />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <AppEmptyState
            icon="◉"
            title="No addresses yet"
            description="Addresses are generated when you sync or receive bitcoin."
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        >
          {groups.map(g => <OriginSection key={g.originId} group={g} />)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
