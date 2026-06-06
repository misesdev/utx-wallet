import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FeeRates } from '../../../core/domain/repositories/BlockchainProvider';
import type { FeeRateTier } from '../../../core/domain/entities/TransactionPreview';
import { AppInput } from '../base/AppInput';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';

type FeeTile = {
  tier: FeeRateTier;
  label: string;
  speed: string;
  rate: (r: FeeRates) => number;
};

const FEE_TILES: FeeTile[] = [
  { tier: 'economy', label: 'Econômica', speed: '~1h', rate: r => r.economySatsPerVByte },
  { tier: 'normal', label: 'Normal', speed: '~30min', rate: r => r.halfHourSatsPerVByte },
  { tier: 'fast', label: 'Rápida', speed: '~10min', rate: r => r.fastSatsPerVByte },
  { tier: 'custom', label: 'Custom', speed: 'manual', rate: () => 0 },
];

type FeeSelectorProps = {
  selected: FeeRateTier;
  feeRates: FeeRates | null;
  customFeeRate: string;
  onSelect: (tier: FeeRateTier) => void;
  onCustomFeeRateChange: (v: string) => void;
};

export function FeeSelector({
  selected,
  feeRates,
  customFeeRate,
  onSelect,
  onCustomFeeRateChange,
}: FeeSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="muted">
        Taxa de rede
      </AppText>
      <View style={styles.grid}>
        {FEE_TILES.map(tile => {
          const isActive = selected === tile.tier;
          const rateLabel =
            feeRates && tile.tier !== 'custom' ? `${tile.rate(feeRates)} sat/vB` : tile.speed;
          const labelStyle = { color: isActive ? theme.colors.primary : theme.colors.text };

          return (
            <Pressable
              key={tile.tier}
              accessibilityRole="button"
              testID={`fee-tile-${tile.tier}`}
              onPress={() => onSelect(tile.tier)}
              style={({ pressed }) => [
                styles.tile,
                {
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isActive ? theme.colors.accentMuted : theme.colors.surface,
                  borderRadius: theme.radii.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <AppText variant="caption" style={[styles.tileLabel, labelStyle]}>
                {tile.label}
              </AppText>
              <AppText variant="caption" color="muted">
                {rateLabel}
              </AppText>
              {feeRates && tile.tier !== 'custom' && (
                <AppText variant="caption" color="muted">
                  {tile.speed}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      {selected === 'custom' && (
        <AppInput
          value={customFeeRate}
          onChangeText={onCustomFeeRateChange}
          placeholder="sats por vByte"
          keyboardType="numeric"
          testID="input-custom-fee"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: '22%',
    padding: 10,
  },
  tileLabel: {
    fontWeight: '600',
  },
});
