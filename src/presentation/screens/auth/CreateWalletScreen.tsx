import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type CreateWalletRoute = RouteProp<AppStackParamList, typeof AppRoutes.CreateWallet>;

const NETWORK_ACCENT: Record<string, string> = {
  mainnet: '#F7931A',
  testnet4: '#8E6FE8',
  testnet: '#8E6FE8',
};

const NETWORK_LABEL: Record<string, string> = {
  mainnet: 'Mainnet',
  testnet4: 'Testnet4',
  testnet: 'Testnet4',
};

export function CreateWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { initiate, isLoading } = useCreateWallet();
  const { t } = useAppTranslation();
  const route = useRoute<CreateWalletRoute>();

  const routeNetwork = route.params?.network ?? 'testnet4';
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
      setNameError(t('createWallet.errorNameRequired'));
      return;
    }
    if (trimmed.length > 48) {
      setNameError(t('createWallet.errorNameTooLong'));
      return;
    }
    setNameError('');

    if (passphraseEnabled) {
      if (!passphrase) {
        setPassphraseError(t('createWallet.errorPassphraseEmpty'));
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setPassphraseError(t('createWallet.errorPassphraseMismatch'));
        return;
      }
    }
    setPassphraseError('');

    initiate(trimmed, passphraseEnabled ? passphrase : undefined, routeNetwork);
    navigation.navigate(AppRoutes.BackupSeed);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('createWallet.title')}</AppText>
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
            {t('createWallet.networkBadge', { network: NETWORK_LABEL[routeNetwork] })}
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Name card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.radii.xl }]}>
          <View style={styles.cardHeader}>
            <AppIcon name="wallet" size={30} color={theme.colors.accent} />
            <View style={styles.cardHeaderText}>
              <AppText variant="subtitle" style={styles.cardTitle}>{t('createWallet.detailsTitle')}</AppText>
              <AppText variant="caption" color="muted">{t('createWallet.detailsDesc')}</AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <FormInput
            label={t('createWallet.nameLabel')}
            placeholder={t('createWallet.namePlaceholder')}
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
          accessibilityLabel={t('createWallet.passphraseSection')}
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
            <AppIcon name="key" size={22} color={theme.colors.textMuted} />
            <View style={styles.toggleText}>
              <AppText variant="body" style={styles.toggleLabel}>{t('createWallet.passphraseSection')}</AppText>
              <AppText variant="caption" color="muted">{t('createWallet.passphraseDesc')}</AppText>
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
                  {t('createWallet.passphraseWarning')}
                </AppText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <FormInput
                label={t('createWallet.passphraseLabel')}
                placeholder={t('createWallet.passphrasePlaceholder')}
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
                accessibilityLabel={t('createWallet.passphraseLabel')}
              />

              <FormInput
                label={t('createWallet.confirmPassphraseLabel')}
                placeholder={t('createWallet.confirmPassphrasePlaceholder')}
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
                accessibilityLabel={t('createWallet.confirmPassphraseLabel')}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassphrase ? t('createWallet.hidePassphrase') : t('createWallet.showPassphrase')}
                onPress={() => setShowPassphrase(v => !v)}
                style={styles.revealRow}
              >
                <AppText variant="caption" style={{ color: theme.colors.accent }}>
                  {showPassphrase ? t('createWallet.hidePassphrase') : t('createWallet.showPassphrase')}
                </AppText>
              </Pressable>

              {passphraseError ? (
                <AppText variant="caption" color="danger">{passphraseError}</AppText>
              ) : null}
            </View>
          </>
        )}

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
          accessibilityLabel={t('createWallet.generateSeed')}
          onPress={handleCreate}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.lg,
              opacity: pressed || isLoading ? 0.75 : 1,
            },
          ]}
        >
          <AppText variant="subtitle" style={[styles.ctaText, { color: theme.colors.primaryText }]}>
            {t('createWallet.generateSeed')}
          </AppText>
        </Pressable>
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
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    overflow: 'hidden',
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
    paddingVertical: 16,
  },
  ctaText: {
    fontWeight: '700',
  },
});
