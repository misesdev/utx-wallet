import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';

type AppLoadingProps = {
  label?: string;
};

export function AppLoading({ label }: AppLoadingProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.root}>
      <ActivityIndicator color={theme.colors.accent} size="small" />
      {label ? (
        <AppText variant="caption" color="muted">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
});
