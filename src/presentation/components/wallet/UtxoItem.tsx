import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Utxo } from '../../../core/domain/entities/Utxo';
import { useTheme } from '../../hooks/useTheme';
import { AppCard } from '../base/AppCard';
import { AppText } from '../base/AppText';

type UtxoItemProps = {
  utxo: Utxo;
  onFreeze: (txid: string, vout: number) => void;
  onUnfreeze: (txid: string, vout: number) => void;
};

function shortTxid(txid: string): string {
  return `${txid.slice(0, 8)}…${txid.slice(-6)}`;
}

export function UtxoItem({ utxo, onFreeze, onUnfreeze }: UtxoItemProps) {
  const { theme } = useTheme();
  const frozen = utxo.isFrozen ?? false;

  const statusColor = frozen
    ? theme.colors.textMuted
    : utxo.isConfirmed
      ? theme.colors.success
      : theme.colors.warning;

  const statusLabel = frozen ? 'frozen' : utxo.isConfirmed ? 'confirmed' : 'pending';

  return (
    <AppCard>
      <View style={styles.row}>
        <View style={styles.info}>
          <AppText variant="subtitle" style={frozen ? styles.frozenAmount : undefined}>
            {utxo.valueSats.toLocaleString()}
            <AppText variant="caption" color="muted"> sats</AppText>
          </AppText>
          <AppText variant="caption" color="muted" style={styles.txid}>
            {shortTxid(utxo.txid)}:{utxo.vout}
          </AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <AppText variant="caption" style={{ color: statusColor }}>
              {statusLabel}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={frozen ? 'Descongelar UTXO' : 'Congelar UTXO'}
          onPress={() =>
            frozen ? onUnfreeze(utxo.txid, utxo.vout) : onFreeze(utxo.txid, utxo.vout)
          }
          style={({ pressed }) => [
            styles.freezeBtn,
            {
              borderColor: frozen ? theme.colors.accent : theme.colors.border,
              backgroundColor: frozen ? theme.colors.accentMuted : theme.colors.surface,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="caption" color={frozen ? 'accent' : 'muted'}>
            {frozen ? '⊘ Unfreeze' : '❄ Freeze'}
          </AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  txid: {
    fontVariant: ['tabular-nums'],
  },
  frozenAmount: {
    opacity: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  freezeBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
