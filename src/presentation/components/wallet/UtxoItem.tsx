import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Utxo } from '../../../core/domain/entities/Utxo';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { AppText } from '../base/AppText';
import { AppIcon } from '../base/AppIcon';

type UtxoItemProps = {
  utxo: Utxo;
  onFreeze: (txid: string, vout: number) => void;
  onUnfreeze: (txid: string, vout: number) => void;
};

const STATUS_KEYS = {
  frozen: 'utxos.frozen',
  confirmed: 'utxos.confirmed',
  pending: 'utxos.pending',
} as const;

function shortTxid(txid: string): string {
  return `${txid.slice(0, 10)}…${txid.slice(-8)}`;
}

export function UtxoItem({ utxo, onFreeze, onUnfreeze }: UtxoItemProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const frozen = utxo.isFrozen ?? false;
  const statusKey = frozen ? 'frozen' : utxo.isConfirmed ? 'confirmed' : 'pending';

  const dotBg =
    statusKey === 'frozen'
      ? theme.colors.textMuted
      : statusKey === 'confirmed'
        ? theme.colors.success
        : theme.colors.warning;

  const dotPillBg =
    statusKey === 'frozen'
      ? theme.colors.surfaceMuted
      : statusKey === 'confirmed'
        ? theme.colors.successMuted ?? theme.colors.surfaceMuted
        : theme.colors.warningMuted ?? theme.colors.surfaceMuted;

  const dotPillColor =
    statusKey === 'frozen'
      ? theme.colors.textMuted
      : statusKey === 'confirmed'
        ? theme.colors.success
        : theme.colors.warning;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: frozen ? theme.colors.textMuted + '44' : theme.colors.border,
          borderRadius: theme.radii.lg,
        },
        frozen ? styles.cardFrozen : null,
      ]}
    >
      <View style={styles.topRow}>
        {/* Amount */}
        <View style={styles.amountBlock}>
          <AppText variant="subtitle" style={frozen ? styles.amountFrozen : styles.amount}>
            {utxo.valueSats.toLocaleString()}
          </AppText>
          <AppText variant="caption" color="muted"> {t('common.sats')}</AppText>
        </View>

        {/* Freeze / unfreeze button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={frozen ? t('utxos.unfreeze') : t('utxos.freeze')}
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
          <AppIcon name={frozen ? 'unfreeze' : 'freeze'} size={16} color={frozen ? theme.colors.accent : theme.colors.textMuted} />
          <AppText variant="label" color={frozen ? 'accent' : 'muted'}>
            {frozen ? t('utxos.unfreeze') : t('utxos.freeze')}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        {/* Txid */}
        <AppText variant="caption" color="muted" style={styles.txid}>
          {shortTxid(utxo.txid)}:{utxo.vout}
        </AppText>

        {/* Status pill */}
        <View
          style={[
            styles.statusPill,
            { backgroundColor: dotPillBg, borderRadius: theme.radii.xl },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: dotBg }]} />
          <AppText variant="label" style={[styles.statusText, { color: dotPillColor }]}>
            {t(STATUS_KEYS[statusKey] as any)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardFrozen: {
    opacity: 0.7,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  amountBlock: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  amount: {
    fontWeight: '700',
  },
  amountFrozen: {
    fontWeight: '700',
    opacity: 0.5,
  },
  freezeBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  txid: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  statusPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  statusText: {
    fontSize: 11,
  },
});
