import React from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: AppButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  title,
  variant = 'primary',
  size = 'lg',
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const { theme } = useTheme();

  const heights = { sm: 40, md: 46, lg: 54 };
  const height = heights[size];

  const bgMap: Record<AppButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: 'transparent',
    ghost: 'transparent',
    danger: theme.colors.dangerMuted,
  };

  const borderMap: Record<AppButtonVariant, string> = {
    primary: 'transparent',
    secondary: theme.colors.border,
    ghost: 'transparent',
    danger: theme.colors.danger,
  };

  const textColorMap: Record<AppButtonVariant, string> = {
    primary: theme.colors.primaryText,
    secondary: theme.colors.text,
    ghost: theme.colors.textMuted,
    danger: theme.colors.danger,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          borderWidth: variant === 'primary' ? 0 : 1,
          borderRadius: theme.radii.lg,
          opacity: disabled ? 0.38 : pressed ? 0.72 : 1,
        },
        style,
      ]}
      {...props}
    >
      <AppText
        style={{
          color: textColorMap[variant],
          fontSize: size === 'sm' ? 13 : 15,
          fontWeight: '600',
          letterSpacing: variant === 'primary' ? 0.2 : 0,
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
