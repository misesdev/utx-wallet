import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FeeRates } from '../../../core/domain/repositories/BlockchainProvider';
import type { FeeRateTier } from '../../../core/domain/entities/TransactionPreview';
import { AppInput } from '../base/AppInput';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type PresetTile = {
  tier: Exclude<FeeRateTier, 'custom'>;
  labelKey: string;
  speedKey: string;
  rate: (r: FeeRates) => number;
};

const PRESET_TILES: PresetTile[] = [
  { tier: 'economy', labelKey: 'fees.tierEconomy', speedKey: 'fees.speedEconomy', rate: r => r.economySatsPerVByte },
  { tier: 'normal',  labelKey: 'fees.tierNormal',  speedKey: 'fees.speedNormal',  rate: r => r.halfHourSatsPerVByte },
  { tier: 'fast',    labelKey: 'fees.tierFast',    speedKey: 'fees.speedFast',    rate: r => r.fastSatsPerVByte },
];

type FeeSelectorProps = {
  selected: FeeRateTier;
  feeRates: FeeRates | null;
  customFeeRate: string;
  customFeeError: string | null;
  onSelect: (tier: FeeRateTier) => void;
  onCustomFeeRateChange: (v: string) => void;
};

export function FeeSelector({
  selected,
  feeRates,
  customFeeRate,
  customFeeError,
  onSelect,
  onCustomFeeRateChange,
}: FeeSelectorProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="muted" style={styles.sectionLabel}>
        {t('fees.networkFee')}
      </AppText>

      {/* Preset tiles row */}
      <View style={styles.presetsRow}>
        {PRESET_TILES.map(tile => {
          const isActive = selected === tile.tier;
          const rateLabel = feeRates ? `${tile.rate(feeRates)} sat/vB` : '—';

          return (
            <Pressable
              key={tile.tier}
              accessibilityRole="button"
              testID={`fee-tile-${tile.tier}`}
              onPress={() => onSelect(tile.tier)}
              style={({ pressed }) => [
                styles.presetTile,
                {
                  backgroundColor: isActive ? theme.colors.accentMuted : theme.colors.surface,
                  borderColor: isActive ? theme.colors.accent : theme.colors.border,
                  borderRadius: theme.radii.lg,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={[styles.tileName, { color: isActive ? theme.colors.accent : theme.colors.text }]}
              >
                {t(tile.labelKey as any)}
              </AppText>
              <View
                style={[
                  styles.speedBadge,
                  { backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.speedText,
                    { color: isActive ? theme.colors.primaryText : theme.colors.textMuted },
                  ]}
                >
                  {t(tile.speedKey as any)}
                </AppText>
              </View>
              <AppText
                variant="caption"
                style={[styles.rateText, { color: isActive ? theme.colors.text : theme.colors.textMuted }]}
              >
                {rateLabel}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Custom tier row */}
      <Pressable
        accessibilityRole="button"
        testID="fee-tile-custom"
        onPress={() => onSelect('custom')}
        style={({ pressed }) => [
          styles.customRow,
          {
            backgroundColor: selected === 'custom' ? theme.colors.accentMuted : theme.colors.surface,
            borderColor: selected === 'custom' ? theme.colors.accent : theme.colors.border,
            borderRadius: theme.radii.lg,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <View style={styles.customRowDot}>
          <View
            style={[
              styles.radioOuter,
              { borderColor: selected === 'custom' ? theme.colors.accent : theme.colors.border },
            ]}
          >
            {selected === 'custom' && (
              <View style={[styles.radioInner, { backgroundColor: theme.colors.accent }]} />
            )}
          </View>
        </View>
        <AppText
          variant="body"
          style={[styles.customLabel, { color: selected === 'custom' ? theme.colors.accent : theme.colors.text }]}
        >
          {t('fees.tierCustom')}
        </AppText>
        <AppText variant="caption" color="muted" style={styles.customHint}>
          {t('fees.speedCustom')}
        </AppText>
      </Pressable>

      {/* Custom fee input */}
      {selected === 'custom' && (
        <View style={styles.customInputWrapper}>
          <AppInput
            value={customFeeRate}
            onChangeText={onCustomFeeRateChange}
            placeholder={t('fees.customFeePlaceholder')}
            keyboardType="numeric"
            testID="input-custom-fee"
          />
          {customFeeError && (
            <AppText variant="caption" color="danger" testID="custom-fee-error">
              {customFeeError}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetTile: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  tileName: {
    fontWeight: '700',
    fontSize: 13,
  },
  speedBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  speedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rateText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  customRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  customRowDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioInner: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  customLabel: {
    fontWeight: '500',
  },
  customHint: {
    marginLeft: 'auto',
  },
  customInputWrapper: {
    gap: 6,
  },
});
