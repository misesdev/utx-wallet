import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppLogo } from '../../components/base/AppLogo';
import { AppText } from '../../components/base/AppText';
import { NetworkBadge } from '../../components/wallet/NetworkBadge';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';

export function WelcomeScreen() {
  const { networkConfig } = useNetwork();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Hero */}
      <View style={styles.hero}>
        <AppLogo size="lg" showName />
        <AppText variant="body" color="muted" style={styles.tagline}>
          Your keys. Your Bitcoin.
        </AppText>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton title="Create new wallet" onPress={() => undefined} />
        <AppButton
          title="Import wallet"
          variant="secondary"
          onPress={() => undefined}
        />
      </View>

      {/* Network indicator */}
      <View style={styles.footer}>
        <NetworkBadge config={networkConfig} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  tagline: {
    letterSpacing: 0.2,
    marginTop: 4,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  footer: {
    alignItems: 'center',
  },
});
