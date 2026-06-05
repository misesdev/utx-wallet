import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type AppCardProps = PropsWithChildren<ViewProps & {
  accent?: boolean;
}>;

export function AppCard({ children, accent, style, ...props }: AppCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: accent ? theme.colors.accent : theme.colors.border,
          borderTopColor: accent ? theme.colors.accent : theme.colors.borderHighlight,
          borderRadius: theme.radii.lg,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderTopWidth: 1,
    gap: 12,
    padding: 18,
  },
});
