import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRoutes, AppStackParamList } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { useTheme } from '../../hooks/useTheme';

type CreateWalletRoute = RouteProp<AppStackParamList, typeof AppRoutes.CreateWallet>;

const NETWORK_ACCENT: Record<'mainnet' | 'testnet', string> = {
  mainnet: '#F7931A',
  testnet: '#8E6FE8',
};

const NETWORK_LABEL: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
};

export function CreateWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { initiate, isLoading } = useCreateWallet();
  const route = useRoute<CreateWalletRoute>();

  const routeNetwork = route.params?.network ?? 'testnet';
  const accent = NETWORK_ACCENT[routeNetwork];

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [passphraseEnabled, setPassphraseEnabled] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Wallet name is required');
      return;
    }
    if (trimmed.length > 48) {
      setNameError('Name must be 48 characters or fewer');
      return;
    }
    setNameError('');

    if (passphraseEnabled) {
      if (!passphrase) {
        setPassphraseError('Passphrase cannot be empty when enabled');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setPassphraseError('Passphrases do not match');
        return;
      }
    }
    setPassphraseError('');

    initiate(trimmed, passphraseEnabled ? passphrase : undefined, routeNetwork);
    navigation.navigate(AppRoutes.BackupSeed);
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
        <AppText variant="subtitle" style={styles.headerTitle}>New wallet</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Network badge */}
      <View style={styles.networkBannerWrap}>
        <View
          style={[
            styles.networkBanner,
            { backgroundColor: accent + '18', borderColor: accent + '44', borderRadius: theme.radii.lg },
          ]}
        >
          <View style={[styles.networkDot, { backgroundColor: accent }]} />
          <AppText variant="label" style={[styles.networkBannerText, { color: accent }]}>
            Creating on {NETWORK_LABEL[routeNetwork]}
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        {/* Name card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.radii.xl }]}>
          <View style={styles.cardHeader}>
            <AppText style={styles.cardIcon}>₿</AppText>
            <View style={styles.cardHeaderText}>
              <AppText variant="subtitle" style={styles.cardTitle}>Wallet details</AppText>
              <AppText variant="caption" color="muted">Give your wallet a recognisable name</AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <FormInput
            label="Wallet name"
            placeholder="e.g. Main wallet"
            value={name}
            onChangeText={text => {
              setName(text);
              if (nameError) setNameError('');
            }}
            error={nameError}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            maxLength={48}
          />
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
            setPassphraseError('');
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
              <AppText variant="caption" color="muted">Optional — adds an extra layer of security</AppText>
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

        {/* Passphrase section */}
        {passphraseEnabled && (
          <>
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.accent + '55', borderRadius: theme.radii.xl }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.warningDot, { backgroundColor: theme.colors.warning }]} />
                <AppText variant="caption" color="warning" style={styles.warningText}>
                  Your passphrase is NOT part of the seed words. You must back it up separately. Losing it means losing access to your funds.
                </AppText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <FormInput
                label="Passphrase"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChangeText={v => {
                  setPassphrase(v);
                  if (passphraseError) setPassphraseError('');
                }}
                secureTextEntry={!showPassphrase}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="next"
                accessibilityLabel="Passphrase"
              />

              <FormInput
                label="Confirm passphrase"
                placeholder="Repeat your passphrase"
                value={confirmPassphrase}
                onChangeText={v => {
                  setConfirmPassphrase(v);
                  if (passphraseError) setPassphraseError('');
                }}
                secureTextEntry={!showPassphrase}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
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

              {passphraseError ? (
                <AppText variant="caption" color="danger">{passphraseError}</AppText>
              ) : null}
            </View>
          </>
        )}

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate seed phrase"
          onPress={handleCreate}
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
            Generate seed phrase →
          </AppText>
        </Pressable>
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
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Network banner
  networkBannerWrap: {
    alignItems: 'center',
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  networkBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  networkDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  networkBannerText: {
    fontWeight: '600',
  },

  // Scroll
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Card
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
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

  // Warning
  warningDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 2,
    width: 6,
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },

  // Reveal
  revealRow: {
    alignSelf: 'flex-start',
  },

  // CTA
  cta: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 16,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
  },
});
