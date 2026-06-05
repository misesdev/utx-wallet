import React, { PropsWithChildren } from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type AppTextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';
type AppTextColor = 'default' | 'muted' | 'faint' | 'accent' | 'primary' | 'success' | 'danger' | 'warning';

type AppTextProps = PropsWithChildren<TextProps & {
  variant?: AppTextVariant;
  color?: AppTextColor;
}>;

export function AppText({
  children,
  variant = 'body',
  color = 'default',
  style,
  ...props
}: AppTextProps) {
  const { theme } = useTheme();

  const colorMap: Record<AppTextColor, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    faint: theme.colors.textFaint,
    accent: theme.colors.accent,
    primary: theme.colors.primary,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
  };

  return (
    <Text style={[theme.text[variant], { color: colorMap[color] }, style]} {...props}>
      {children}
    </Text>
  );
}
