import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NetworkConfig } from '../../../core/domain/entities/Network';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../base/AppText';

type NetworkBadgeProps = {
  config: NetworkConfig;
};

function dotColor(config: NetworkConfig): string {
  if (config.connectivityMode === 'offline') return '#4B5563';
  return config.network === 'mainnet' ? '#F5C418' : '#60A5FA';
}

export function NetworkBadge({ config }: NetworkBadgeProps) {
  const { theme } = useTheme();
  const dot = dotColor(config);

  return (
    <View
      style={[
        styles.badge,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <AppText variant="caption" color="muted">
        {config.network}
      </AppText>
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
      <AppText variant="caption" color="faint">
        {config.connectivityMode}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  separator: {
    width: 1,
    height: 10,
  },
});
