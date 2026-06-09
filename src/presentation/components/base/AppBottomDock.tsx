import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '../../../shared/icons/iconNames';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';

export type AppBottomDockButton = {
  icon: IconName;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  iconColor?: string;
  labelColor?: string;
  testID?: string;
  accessibilityLabel?: string;
};

type Props = {
  leftButton: AppBottomDockButton;
  rightButton: AppBottomDockButton;
};

export function AppBottomDock({ leftButton, rightButton }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  function renderButton(btn: AppBottomDockButton) {
    const bgColor = btn.backgroundColor ?? theme.colors.surfaceRaised;
    const iconColor = btn.iconColor ?? theme.colors.text;
    const labelColor = btn.labelColor ?? theme.colors.text;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={btn.accessibilityLabel ?? btn.label}
        testID={btn.testID}
        onPress={btn.onPress}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: bgColor,
            borderRadius: theme.radii.lg,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <AppIcon name={btn.icon} size={26} color={iconColor} />
        <AppText variant="body" style={[styles.btnLabel, { color: labelColor }]}>
          {btn.label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderHighlight,
            borderRadius: theme.radii.xl,
          },
          theme.shadows.elevated,
        ]}
      >
        {renderButton(leftButton)}
        {renderButton(rightButton)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  dock: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  btn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  btnLabel: {
    fontWeight: '700',
  },
});
