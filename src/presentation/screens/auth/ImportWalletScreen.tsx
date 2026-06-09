import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { FormInput } from '../../components/forms/FormInput';
import { WalletSetupProgressModal } from '../../components/wallet/WalletSetupProgressModal';
import type { WalletSetupStep } from '../../components/wallet/WalletSetupProgressModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useImportWallet } from '../../hooks/useImportWallet';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useWallet } from '../../hooks/useWallet';

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
  const accent = NETWORK_ACCENT[routeNetwork] ?? NETWORK_ACCENT.testnet;
  const {
    walletName,
    setWalletName,
    seed,
    setSeed,
    passphrase,
    setPassphrase,
    confirmPassphrase,
    setConfirmPassphrase,
    isLoading,
    error,
    clearError,
    submit,
  } = useImportWallet(routeNetwork);
  const { discoverWalletAccounts } = useAddressManager();
  const { syncWallet } = useWallet();

  const { t } = useAppTranslation();
  const [passphraseEnabled, setPassphraseEnabled] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [setupStep, setSetupStep] = useState<WalletSetupStep>('importing');
  const [setupVisible, setSetupVisible] = useState(false);
  const [setupError, setSetupError] = useState<string | undefined>();
  const [subMessage, setSubMessage] = useState<string | undefined>();

  async function handleImport() {
    setSetupStep('importing');
    setSetupError(undefined);
    setSubMessage(t('walletSetup.generatingKeys'));
    setSetupVisible(true);
    // Yield to the JS event loop so React flushes state and renders the modal
    // before CPU-intensive key derivation blocks the thread.
    await new Promise<void>(resolve => setTimeout(resolve, 32));

    const wallet = await submit();
    if (!wallet) {
      setSetupVisible(false);
      return;
    }

    setSetupStep('discovering');
    setSubMessage(undefined);
    try {
      await discoverWalletAccounts(wallet.id, wallet.network, (progress) => {
        if (progress.txFound) {
          setSubMessage(
            t('walletSetup.foundActivity', {
              account: progress.accountIndex,
            }),
          );
        } else {
          setSubMessage(
            t('walletSetup.checkingAddress', {
              account: progress.accountIndex,
              index: progress.addressIndex + 1,
            }),
          );
        }
      });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : undefined);
      setSetupStep('error');
      return;
    }

    setSetupStep('syncing');
    setSubMessage(t('walletSetup.syncingChain'));
    try {
      await syncWallet(wallet.id);
    } catch {
      // Sync errors are non-fatal: wallet is created, just no data yet
    }

    setSubMessage(undefined);
    setSetupStep('done');
  }

  function handleSetupDone() {
    setSetupVisible(false);
    navigation.goBack();
  }

  function handleSetupRetry() {
    setSetupVisible(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <WalletSetupProgressModal
        visible={setupVisible}
        currentStep={setupStep}
        subMessage={subMessage}
        error={setupError}
        onDone={handleSetupDone}
        onRetry={handleSetupRetry}
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
              returnKeyType="next"
              accessibilityLabel={t('importWallet.passphraseLabel')}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <FormInput
              label={t('importWallet.confirmPassphraseLabel')}
              placeholder={t('importWallet.confirmPassphrasePlaceholder')}
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
              accessibilityLabel={t('importWallet.confirmPassphraseLabel')}
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

      {/* Sticky footer CTA */}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('importWallet.importAction')}
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
            {t('importWallet.importAction')}
          </AppText>
        </Pressable>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
