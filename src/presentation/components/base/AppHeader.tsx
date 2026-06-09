import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function AppHeader({ title, subtitle, rightAction }: AppHeaderProps) {
  return (
    <View style={[styles.header, rightAction ? styles.headerRow : undefined]}>
      <View style={styles.headerText}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
