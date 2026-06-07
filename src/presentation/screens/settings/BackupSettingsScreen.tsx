import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';

export function BackupSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  const networkSummary = `${networkConfig.network} / ${networkConfig.connectivityMode} / ${networkConfig.nodeMode}`;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>Backup settings</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Wallet info card */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>Carteira</AppText>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <AppText variant="caption" color="muted">Rede</AppText>
              <AppText variant="body">{networkSummary}</AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.infoRow}>
              <AppText variant="caption" color="muted">Carteiras</AppText>
              <AppText variant="body">Wallets loaded: {wallets.length}</AppText>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View
          style={[
            styles.warnCard,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppText variant="label" style={styles.warnTitle}>Guarde sua seed em segurança</AppText>
          <AppText variant="caption" color="muted">
            Sua seed phrase é a única forma de recuperar sua carteira. Nunca compartilhe ou armazene digitalmente.
          </AppText>
        </View>

        {/* Actions */}
        <AppButton title="Verify backup" onPress={() => undefined} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Section
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },

  // Info card
  infoCard: {
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // Warning
  warnCard: {
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  warnTitle: {
    fontWeight: '600',
  },
});
