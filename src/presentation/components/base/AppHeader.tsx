import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <AppText variant="title">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color="muted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 2,
  },
  subtitle: {
    marginTop: 2,
  },
});
