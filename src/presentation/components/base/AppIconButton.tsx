import React from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';

type AppIconButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  symbol: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function AppIconButton({ label, symbol, size = 'md', style, ...props }: AppIconButtonProps) {
  const { theme } = useTheme();
  const dimension = size === 'sm' ? 36 : 44;
  const textStyle = size === 'sm' ? styles.smallText : styles.defaultText;

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
      <AppText style={textStyle}>{symbol}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  defaultText: {
    fontSize: 17,
  },
});
