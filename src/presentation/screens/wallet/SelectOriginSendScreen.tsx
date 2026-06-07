import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';
import type { WalletAddress } from '../../../core/domain/entities/WalletAddress';

type OriginWithBalance = AddressOrigin & { hasBalance: boolean };

type OriginItemProps = {
  item: OriginWithBalance;
  noBalanceId: string | null;
  onPress: () => void;
};

function OriginItem({ item, noBalanceId, onPress }: OriginItemProps) {
  const { theme } = useTheme();
  const isDefault = item.type === 'default';
  const showNoBalance = noBalanceId === item.id && !item.hasBalance;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Send from ${item.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: showNoBalance
            ? theme.colors.danger
            : isDefault
              ? theme.colors.borderHighlight
              : theme.colors.border,
          borderRadius: theme.radii.lg,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppText style={styles.iconText}>{isDefault ? '◎' : '⊡'}</AppText>
      </View>

      <View style={styles.itemBody}>
        <View style={styles.nameRow}>
          <AppText variant="body" style={styles.originName}>{item.name}</AppText>
          {isDefault && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" color="accent">Default</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">Account {item.accountIndex}</AppText>
        {showNoBalance && (
          <AppText variant="caption" color="danger" style={styles.noBalanceMsg}>
            Conta sem saldo
          </AppText>
        )}
      </View>

      <AppText variant="subtitle" color={item.hasBalance ? 'muted' : 'faint'} style={styles.chevron}>›</AppText>
    </Pressable>
  );
}

export function SelectOriginSendScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { getOrigins, listAddresses } = useAddressManager();
  const { selectedWallet, listUtxos } = useWallet();

  const [items, setItems] = useState<OriginWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noBalanceId, setNoBalanceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    try {
      const [origins, addresses, utxos] = await Promise.all([
        getOrigins(selectedWallet.id),
        listAddresses(selectedWallet.id),
        listUtxos(selectedWallet.id),
      ]);

      const utxoAddressSet = new Set(utxos.filter(u => u.isConfirmed).map(u => u.address));

      const withBalance: OriginWithBalance[] = origins.map(origin => {
        const originAddresses = (addresses as WalletAddress[]).filter(
          a => a.accountIndex === origin.accountIndex,
        );
        const hasBalance = originAddresses.some(a => utxoAddressSet.has(a.address));
        return { ...origin, hasBalance };
      });

      setItems(withBalance);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getOrigins, listAddresses, listUtxos]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const handleSelect = useCallback(
    (item: OriginWithBalance) => {
      if (!item.hasBalance) {
        setNoBalanceId(item.id);
        return;
      }
      setNoBalanceId(null);
      navigation.navigate(AppRoutes.Send, { originId: item.id });
    },
    [navigation],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>
        <View style={styles.headerTitle}>
          <AppText variant="subtitle" style={styles.titleText}>Send</AppText>
          <AppText variant="caption" color="muted">Select account</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <AppLoading label="Loading accounts…" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        >
          <AppText variant="body" color="muted" style={styles.intro}>
            Choose which account you want to send from.
          </AppText>

          <View style={styles.list}>
            {items.map(item => (
              <OriginItem
                key={item.id}
                item={item}
                noBalanceId={noBalanceId}
                onPress={() => handleSelect(item)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  intro: {
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  list: {
    gap: 10,
  },
  item: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: {
    fontSize: 20,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  noBalanceMsg: {
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
  },
});
