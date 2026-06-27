import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

const NETWORK_ACCENT: Record<'mainnet' | 'testnet4', string> = {
  mainnet: '#F7931A',
  testnet4: '#178a54',
};

export type WalletListEmptyStateProps = {
  network: 'mainnet' | 'testnet4';
  onCreateWallet: () => void;
  onImportWallet: () => void;
};

export function WalletListEmptyState({ network, onCreateWallet, onImportWallet }: WalletListEmptyStateProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = NETWORK_ACCENT[network];

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: accent + '18', borderRadius: theme.radii.xl }]}>
        <AppIcon name="wallet" size={42} color={accent} />
      </View>
      <AppText variant="subtitle" style={styles.title}>{t('walletList.noWallets', { network })}</AppText>
      <AppText variant="body" color="muted" style={styles.desc}>
        {t('walletList.noWalletsDesc')}
      </AppText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCreateWallet}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText variant="label" style={[styles.primaryBtnText, { color: theme.colors.primaryText }]}>
            {t('walletList.createWallet')}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onImportWallet}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AppText variant="label" color="muted">{t('walletList.importWallet')}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 60,
  },
  icon: {
    alignItems: 'center',
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    maxWidth: 280,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  btn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontWeight: '700',
  },
});
