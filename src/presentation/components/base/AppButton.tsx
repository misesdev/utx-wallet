import React from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: AppButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  title,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

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
  const textStyle = {
    color: textColorMap[variant],
    letterSpacing: variant === 'primary' ? 0.2 : 0,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          borderWidth: variant === 'primary' ? 0 : 1,
          borderRadius: theme.radii.lg,
          opacity: isDisabled ? 0.38 : pressed ? 0.72 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColorMap[variant]}
          accessibilityLabel={title}
        />
      ) : (
        <AppText
          style={[styles.text, size === 'sm' ? styles.smallText : styles.defaultText, textStyle]}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 13,
  },
  defaultText: {
    fontSize: 15,
  },
});
