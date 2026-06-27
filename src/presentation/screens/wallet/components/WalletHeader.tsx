import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BitcoinNetwork, ConnectivityMode } from '../../../../core/domain/entities/Network';
import { NetworkBadge } from '../../../components/wallet/NetworkBadge';
import { BalanceEyeButton } from '../../../components/security/BalanceEyeButton';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

export type WalletHeaderProps = {
  walletName: string;
  walletNetwork?: BitcoinNetwork;
  connectivityMode?: ConnectivityMode;
  isSafeMode: boolean;
  isWatchOnly: boolean;
  hideBalanceEnabled: boolean;
  hidden: boolean;
  onToggleReveal: () => void;
};

export function WalletHeader({
  walletName,
  walletNetwork,
  connectivityMode,
  isSafeMode,
  isWatchOnly,
  hideBalanceEnabled,
  hidden,
  onToggleReveal,
}: WalletHeaderProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View style={styles.header}>
      <AppText variant="subtitle" style={styles.name} numberOfLines={1}>{walletName}</AppText>
      <View style={styles.right}>
        {isSafeMode && (
          <View style={[styles.safeModeBadge, { backgroundColor: theme.colors.dangerMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="warning">{t('home.safeMode')}</AppText>
          </View>
        )}
        {isWatchOnly && (
          <View style={[styles.watchOnlyBadge, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="muted">{t('wallet.watchOnly' as any)}</AppText>
          </View>
        )}
        {hideBalanceEnabled && (
          <BalanceEyeButton hidden={hidden} onPress={onToggleReveal} testID="home-eye-btn" />
        )}
        <NetworkBadge network={walletNetwork} connectivityMode={connectivityMode} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    fontWeight: '700',
    flex: 1,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  safeModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  watchOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
