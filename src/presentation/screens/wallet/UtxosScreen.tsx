import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { UtxoItem } from '../../components/wallet/UtxoItem';
import { useTheme } from '../../hooks/useTheme';
import { useUtxos, type UtxoFilter } from '../../hooks/useUtxos';

const FILTERS: { key: UtxoFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'highest-value', label: '↑ Value' },
  { key: 'lowest-value', label: '↓ Value' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending', label: 'Pending' },
  { key: 'frozen', label: '❄ Frozen' },
];

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
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surface,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? 'accent' : 'muted'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function UtxosScreen() {
  const { theme } = useTheme();
  const { utxos, isLoading, error, filter, setFilter, freeze, unfreeze } = useUtxos();

  const handleFreeze = useCallback(
    (txid: string, vout: number) => {
      freeze(txid, vout).catch(() => undefined);
    },
    [freeze],
  );

  const handleUnfreeze = useCallback(
    (txid: string, vout: number) => {
      unfreeze(txid, vout).catch(() => undefined);
    },
    [unfreeze],
  );

  const totalSats = utxos.reduce((sum, u) => sum + u.valueSats, 0);

  return (
    <AppScreen title="UTXOs" scrollable={false}>
      <View style={styles.flex}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map(f => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        {utxos.length > 0 && (
          <View
            style={[
              styles.summary,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppText variant="caption" color="muted">
              {utxos.length} UTXO{utxos.length !== 1 ? 's' : ''}
            </AppText>
            <AppText variant="caption" color="muted">
              {totalSats.toLocaleString()} sats total
            </AppText>
          </View>
        )}

        {isLoading ? (
          <AppLoading label="Loading UTXOs…" />
        ) : error ? (
          <AppEmptyState icon="⚠" title="Erro" description={error} />
        ) : utxos.length === 0 ? (
          <AppEmptyState
            icon="◌"
            title="No UTXOs"
            description={
              filter === 'frozen'
                ? 'No frozen UTXOs.'
                : filter === 'pending'
                  ? 'No pending UTXOs.'
                  : 'Sync the wallet to load UTXOs.'
            }
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {utxos.map(utxo => (
              <UtxoItem
                key={`${utxo.txid}:${utxo.vout}`}
                utxo={utxo}
                onFreeze={handleFreeze}
                onUnfreeze={handleUnfreeze}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
