import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../base/AppIcon';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type Props = {
  hidden: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * Small pill button that shows an eye icon to toggle balance visibility.
 * Only render this when the global "Hide Balance" setting is enabled.
 */
export function BalanceEyeButton({ hidden, onPress, testID }: Props) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? t('common.revealBalance') : t('common.hideBalance')}
      testID={testID ?? 'balance-eye-btn'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: hidden
            ? theme.colors.surfaceRaised
            : (theme.colors.successMuted ?? theme.colors.surfaceMuted),
          borderColor: hidden
            ? theme.colors.borderHighlight
            : theme.colors.success + '55',
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <AppIcon
        name={hidden ? 'eyeOff' : 'eye'}
        size={18}
        color={hidden ? theme.colors.textMuted : theme.colors.success}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
});
