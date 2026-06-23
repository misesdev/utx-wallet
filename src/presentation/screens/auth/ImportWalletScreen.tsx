import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { popSensitiveData } from '../../../core/infrastructure/adapters/SensitiveDataStore';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { FormInput } from '../../components/forms/FormInput';
import { WalletSetupProgressModal } from '../../components/wallet/WalletSetupProgressModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useImportWallet } from '../../hooks/useImportWallet';
import { usePostImportSync } from '../../hooks/usePostImportSync';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type ImportWalletRoute = RouteProp<AppStackParamList, typeof AppRoutes.ImportWallet>;

const NETWORK_ACCENT: Record<string, string> = {
  mainnet: '#F7931A',
  testnet: '#8E6FE8',
};

const NETWORK_LABEL: Record<string, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
};

export function ImportWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<ImportWalletRoute>();
  const routeNetwork = route.params?.network ?? 'testnet';
  const routeSeedRef = route.params?.seedRef;
  const accent = NETWORK_ACCENT[routeNetwork] ?? NETWORK_ACCENT.testnet;
  const {
    walletName,
    setWalletName,
    seed,
    setSeed,
    passphrase,
    setPassphrase,
    isLoading,
    error,
    clearError,
    submit,
  } = useImportWallet(routeNetwork);
  const { setupStep, setupVisible, setupError, subMessage, showImportingStep, hideProgress, runSync, handleDone, handleRetry } = usePostImportSync();

  // Pre-fill seed when arriving via QR scanner (pop-on-read: clears from store immediately)
  useEffect(() => {
    if (routeSeedRef) {
      const scannedSeed = popSensitiveData(routeSeedRef);
      if (scannedSeed) setSeed(scannedSeed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { t } = useAppTranslation();
  const [passphraseEnabled, setPassphraseEnabled] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  async function handleImport() {
    showImportingStep(t('walletSetup.generatingKeys'));
    // Yield to JS event loop so React renders the modal before CPU-intensive key derivation.
    await new Promise<void>(resolve => setTimeout(resolve, 32));

    const wallet = await submit();
    if (!wallet) {
      hideProgress();
      return;
    }

    await runSync(wallet.id, wallet.network);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <WalletSetupProgressModal
        visible={setupVisible}
        currentStep={setupStep}
        subMessage={subMessage}
        error={setupError}
        onDone={handleDone}
        onRetry={handleRetry}
      />
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('importWallet.title')}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.info')}
          onPress={() => navigation.navigate(AppRoutes.WalletPolicy)}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="info" size={22} color={theme.colors.textMuted} />
        </Pressable>
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
            {NETWORK_LABEL[routeNetwork] ?? routeNetwork}
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
            label={t('importWallet.nameLabel')}
            placeholder={t('importWallet.namePlaceholder')}
            value={walletName}
            onChangeText={v => {
              setWalletName(v);
              if (error) clearError();
            }}
            autoFocus
            returnKeyType="next"
            maxLength={48}
            accessibilityLabel={t('importWallet.nameLabel')}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <FormInput
            label={t('importWallet.seedLabel')}
            placeholder={t('importWallet.seedPlaceholder')}
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
            accessibilityLabel={t('importWallet.seedLabel')}
          />

        </View>

        {/* Passphrase toggle */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: passphraseEnabled }}
          accessibilityLabel={t('importWallet.passphraseSection')}
          onPress={() => {
            setPassphraseEnabled(prev => !prev);
            setPassphrase('');
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
            <AppIcon name="key" size={22} color={theme.colors.textMuted} />
            <View style={styles.toggleText}>
              <AppText variant="body" style={styles.toggleLabel}>{t('importWallet.passphraseSection')}</AppText>
              <AppText variant="caption" color="muted">{t('importWallet.passphraseDesc')}</AppText>
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
              label={t('importWallet.passphraseLabel')}
              placeholder={t('importWallet.passphrasePlaceholder')}
              value={passphrase}
              onChangeText={v => {
                setPassphrase(v);
                if (error) clearError();
              }}
              secureTextEntry={!showPassphrase}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={handleImport}
              accessibilityLabel={t('importWallet.passphraseLabel')}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassphrase ? t('importWallet.hidePassphrase') : t('importWallet.showPassphrase')}
              onPress={() => setShowPassphrase(v => !v)}
              style={styles.revealRow}
            >
              <AppText variant="caption" style={{ color: theme.colors.accent }}>
                {showPassphrase ? t('importWallet.hidePassphrase') : t('importWallet.showPassphrase')}
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
      </ScrollView>

      {/* Sticky footer dock — two-button layout matching AppBottomDock style */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View
          style={[
            styles.dock,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderHighlight,
              borderRadius: theme.radii.xl,
              ...theme.shadows.elevated,
            },
          ]}
        >
          {/* Left: Scan QR */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('importWallet.scanQr')}
            testID="import-scan-qr-btn"
            onPress={() => navigation.navigate(AppRoutes.ScanWalletQr, { network: routeNetwork })}
            style={({ pressed }) => [
              styles.dockBtn,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radii.lg,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <AppIcon name="scan" size={22} color={theme.colors.text} />
            <AppText variant="body" style={[styles.dockBtnLabel, { color: theme.colors.text }]}>
              {t('importWallet.scanQr')}
            </AppText>
          </Pressable>

          {/* Right: Import wallet */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('importWallet.importAction')}
            onPress={handleImport}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.dockBtn,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radii.lg,
                opacity: pressed || isLoading ? 0.75 : 1,
              },
            ]}
          >
            <AppText variant="subtitle" style={[styles.ctaText, { color: theme.colors.primaryText }]}>
              {t('importWallet.importAction')}
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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

  // Network badge
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
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  dock: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  dockBtn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  dockBtnLabel: {
    fontWeight: '700',
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

  ctaText: {
    fontWeight: '700',
  },
});
