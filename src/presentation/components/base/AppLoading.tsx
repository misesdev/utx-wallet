import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';

type AppLoadingProps = {
  label?: string;
  testID?: string;
};

export function AppLoading({ label, testID }: AppLoadingProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.root} testID={testID}>
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
