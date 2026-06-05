import React, { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export function AppInput({ onFocus, onBlur, style, ...props }: TextInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.colors.textMuted}
      style={[
        styles.input,
        {
          borderColor: focused ? theme.colors.borderFocus : theme.colors.border,
          color: theme.colors.text,
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radii.md,
        },
        style,
      ]}
      onFocus={e => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={e => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
