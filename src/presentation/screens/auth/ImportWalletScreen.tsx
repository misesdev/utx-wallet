import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';
import { AppRoutes, AppStackParamList } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { AppLoading } from '../../components/base/AppLoading';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useImportWallet } from '../../hooks/useImportWallet';
import { useTheme } from '../../hooks/useTheme';

type ImportWalletRoute = RouteProp<AppStackParamList, typeof AppRoutes.ImportWallet>;

const IMPORT_NETWORKS: { key: BitcoinNetwork; label: string }[] = [
  { key: 'mainnet', label: 'Mainnet' },
  { key: 'testnet', label: 'Testnet' },
];

export function ImportWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<ImportWalletRoute>();
  const routeNetwork = route.params?.network ?? 'testnet';
  const {
    walletName,
    setWalletName,
    seed,
    setSeed,
    passphrase,
    setPassphrase,
    confirmPassphrase,
    setConfirmPassphrase,
    selectedNetwork,
    setSelectedNetwork,
    isLoading,
    error,
    clearError,
    submit,
  } = useImportWallet(routeNetwork);

  const [passphraseEnabled, setPassphraseEnabled] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  async function handleImport() {
    const wallet = await submit();
    if (wallet) {
      navigation.goBack();
    }
  }

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
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>Import wallet</AppText>
          <AppText variant="caption" color="muted">Restore from seed phrase</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        {/* Main form card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <FormInput
            label="Wallet name"
            placeholder="e.g. Savings"
            value={walletName}
            onChangeText={v => {
              setWalletName(v);
              if (error) clearError();
            }}
            autoFocus
            returnKeyType="next"
            maxLength={48}
            accessibilityLabel="Wallet name"
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <FormInput
            label="Seed phrase"
            placeholder="Enter your 12 or 24 word seed phrase"
            value={seed}
            onChangeText={v => {
              setSeed(v);
              if (error) clearError();
            }}
            multiline
            numberOfLines={4}
            style={styles.seedInput}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            accessibilityLabel="Seed phrase"
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Network selector */}
          <View style={styles.networkSection}>
            <AppText variant="label" color="muted">Network</AppText>
            <View style={styles.networkRow}>
              {IMPORT_NETWORKS.map(net => {
                const active = selectedNetwork === net.key;
                return (
                  <Pressable
                    key={net.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedNetwork(net.key)}
                    style={({ pressed }) => [
                      styles.networkChip,
                      {
                        backgroundColor: active ? theme.colors.accentMuted : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        borderRadius: theme.radii.md,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      style={active ? [styles.networkChipText, { color: theme.colors.accent }] : styles.networkChipTextMuted}
                    >
                      {net.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Passphrase toggle */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: passphraseEnabled }}
          accessibilityLabel="Use passphrase"
          onPress={() => {
            setPassphraseEnabled(prev => !prev);
            setPassphrase('');
            setConfirmPassphrase('');
          }}
          style={({ pressed }) => [
            styles.toggleRow,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: passphraseEnabled ? theme.colors.accent : theme.colors.border,
              borderRadius: theme.radii.xl,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={styles.toggleLeft}>
            <AppText style={styles.toggleIcon}>🔐</AppText>
            <View style={styles.toggleText}>
              <AppText variant="body" style={styles.toggleLabel}>Passphrase (25th word)</AppText>
              <AppText variant="caption" color="muted">If your wallet uses one</AppText>
            </View>
          </View>
          <View
            style={[
              styles.togglePill,
              {
                backgroundColor: passphraseEnabled ? theme.colors.accent : theme.colors.surfaceMuted,
                borderRadius: theme.radii.xl,
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                passphraseEnabled ? styles.toggleThumbOn : styles.toggleThumbOff,
              ]}
            />
          </View>
        </Pressable>

        {/* Passphrase fields */}
        {passphraseEnabled && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.accent + '55',
                borderRadius: theme.radii.xl,
              },
            ]}
          >
            <FormInput
              label="Passphrase"
              placeholder="Enter your passphrase"
              value={passphrase}
              onChangeText={v => {
                setPassphrase(v);
                if (error) clearError();
              }}
              secureTextEntry={!showPassphrase}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              accessibilityLabel="Passphrase"
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <FormInput
              label="Confirm passphrase"
              placeholder="Repeat your passphrase"
              value={confirmPassphrase}
              onChangeText={v => {
                setConfirmPassphrase(v);
                if (error) clearError();
              }}
              secureTextEntry={!showPassphrase}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={handleImport}
              accessibilityLabel="Confirm passphrase"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
              onPress={() => setShowPassphrase(v => !v)}
              style={styles.revealRow}
            >
              <AppText variant="caption" style={{ color: theme.colors.accent }}>
                {showPassphrase ? '● Hide passphrase' : '○ Show passphrase'}
              </AppText>
            </Pressable>
          </View>
        )}

        {/* Error */}
        {error ? (
          <AppText variant="caption" color="danger" style={styles.error}>
            {error}
          </AppText>
        ) : null}

        {/* CTA */}
        {isLoading ? (
          <AppLoading label="Importing wallet…" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import wallet"
            onPress={handleImport}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radii.lg,
                opacity: pressed || isLoading ? 0.75 : 1,
              },
            ]}
          >
            <AppText variant="subtitle" style={styles.ctaText}>
              Import wallet →
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },

  // Content
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Card
  card: {
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },

  // Seed input
  seedInput: {
    height: undefined,
    minHeight: 110,
    paddingBottom: 14,
    paddingTop: 14,
    textAlignVertical: 'top',
  },

  // Network
  networkSection: {
    gap: 10,
  },
  networkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkChip: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  networkChipText: {
    fontWeight: '600',
  },
  networkChipTextMuted: {
    opacity: 0.55,
  },

  // Toggle
  toggleRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  toggleLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  toggleIcon: {
    fontSize: 22,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontWeight: '600',
  },
  togglePill: {
    height: 26,
    justifyContent: 'center',
    width: 44,
  },
  toggleThumb: {
    borderRadius: 99,
    height: 22,
    width: 22,
  },
  toggleThumbOn: {
    backgroundColor: '#fff',
    transform: [{ translateX: 18 }],
  },
  toggleThumbOff: {
    backgroundColor: '#fff',
    transform: [{ translateX: 2 }],
  },

  // Reveal
  revealRow: {
    alignSelf: 'flex-start',
  },

  // Error
  error: {
    textAlign: 'center',
  },

  // CTA
  cta: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
  },
});
