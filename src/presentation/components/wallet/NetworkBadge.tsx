import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NetworkConfig } from '../../../core/domain/entities/Network';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../base/AppText';

type NetworkBadgeProps = {
  config: NetworkConfig;
};

function dotColor(config: NetworkConfig): string {
  if (config.connectivityMode === 'offline') return '#6B7280';
  return config.network === 'mainnet' ? '#F59E0B' : '#60A5FA';
}

export function NetworkBadge({ config }: NetworkBadgeProps) {
  const { theme } = useTheme();
  const dot = dotColor(config);
  const isOffline = config.connectivityMode === 'offline';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <AppText variant="label" color="muted">{config.network}</AppText>
      {isOffline && (
        <AppText variant="label" color="faint">{` · ${config.connectivityMode}`}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
});
