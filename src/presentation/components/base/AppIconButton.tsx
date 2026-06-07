import React from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppIcon } from './AppIcon';
import type { IconName } from '../../../shared/icons/iconNames';

type AppIconButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  icon: IconName;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function AppIconButton({ label, icon, size = 'md', style, ...props }: AppIconButtonProps) {
  const { theme } = useTheme();
  const dimension = size === 'sm' ? 36 : 44;
  const iconSize = size === 'sm' ? 20 : 24;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      {...props}
    >
      <AppIcon name={icon} size={iconSize} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
