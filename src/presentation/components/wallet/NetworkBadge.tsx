import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BitcoinNetwork, ConnectivityMode } from '../../../core/domain/entities/Network';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../base/AppText';

type NetworkBadgeProps = {
  network?: BitcoinNetwork;
  connectivityMode?: ConnectivityMode;
};

function dotColor(network?: BitcoinNetwork, connectivityMode?: ConnectivityMode): string {
  if (connectivityMode === 'offline') return '#6B7280';
  return network === 'mainnet' ? '#F59E0B' : '#60A5FA';
}

export function NetworkBadge({ network, connectivityMode }: NetworkBadgeProps) {
  const { theme } = useTheme();
  const dot = dotColor(network, connectivityMode);
  const isOffline = connectivityMode === 'offline';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      {network && <AppText variant="label" color="muted">{network}</AppText>}
      {isOffline && (
        <AppText variant="label" color="faint">{` · ${connectivityMode}`}</AppText>
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
