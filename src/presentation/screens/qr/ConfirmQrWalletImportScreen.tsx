import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError } from '../../../core/application/errors/AppError';
import { AppRoutes, type AppStackParamList } from '../../../app/navigation/routes';
import type { WalletImportFormat } from '../../../core/domain/services/WalletImportFormatDetector';
import { AppButton } from '../../components/base/AppButton';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';

type ConfirmRoute = RouteProp<AppStackParamList, typeof AppRoutes.ConfirmQrWalletImport>;

const FORMAT_LABEL_KEYS: Record<WalletImportFormat,
  | 'qrImport.formats.mnemonic'
  | 'qrImport.formats.wif'
  | 'qrImport.formats.private-key'
  | 'qrImport.formats.xpub'
  | 'qrImport.formats.xpriv'
  | 'qrImport.formats.watch-only'
> = {
  mnemonic: 'qrImport.formats.mnemonic',
  wif: 'qrImport.formats.wif',
  'private-key': 'qrImport.formats.private-key',
  xpub: 'qrImport.formats.xpub',
  xpriv: 'qrImport.formats.xpriv',
  'watch-only': 'qrImport.formats.watch-only',
};

export function ConfirmQrWalletImportScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<ConfirmRoute>();
  const { importWallet } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatLabel = useMemo(
    () => t(FORMAT_LABEL_KEYS[route.params.format]),
    [route.params.format, t],
  );

  async function handleImport() {
    const trimmedName = walletName.trim();
    if (!trimmedName) {
      setError(t('createWallet.errorNameRequired'));
      return;
    }
    if (trimmedName.length > 48) {
      setError(t('createWallet.errorNameTooLong'));
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await importWallet(trimmedName, route.params.secret, route.params.network);
      navigation.navigate(AppRoutes.WalletList);
    } catch (err) {
      if (err instanceof AppError && err.code === 'WALLET_EXISTS') {
        setError(t('importWallet.errorWalletExists', { name: trimmedName }));
      } else if (err instanceof AppError && err.code === 'INVALID_SECRET') {
        setError(t('qrImport.invalidFormat'));
      } else {
        setError(t('qrImport.importFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>{t('qrImport.nameTitle')}</AppText>
          <AppText variant="caption" color="muted">{t('qrImport.nameSubtitle')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={[styles.iconBubble, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.xl }]}> 
            <AppIcon name={route.params.isWatchOnly ? 'eye' : 'key'} size={30} color={theme.colors.accent} />
          </View>
          <View style={styles.summaryText}>
            <AppText variant="subtitle" style={styles.summaryTitle}>{formatLabel}</AppText>
            <AppText variant="caption" color="muted">
              {route.params.isWatchOnly ? t('qrImport.watchOnlyDesc') : t('qrImport.signingDesc')}
            </AppText>
          </View>
          <View style={[styles.networkPill, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}> 
            <AppText variant="label" color="muted">{route.params.network}</AppText>
          </View>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <FormInput
            label={t('qrImport.nameLabel')}
            placeholder={t('qrImport.namePlaceholder')}
            value={walletName}
            onChangeText={value => {
              setWalletName(value);
              if (error) setError('');
            }}
            autoFocus
            maxLength={48}
            returnKeyType="done"
            onSubmitEditing={handleImport}
            testID="qr-wallet-name-input"
            error={error}
          />
        </View>
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
        <AppButton
          title={t('qrImport.importAction')}
          onPress={handleImport}
          loading={isLoading}
          disabled={isLoading}
          testID="qr-import-submit"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    gap: 4,
  },
  headerTitle: { fontWeight: '700' },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  summaryCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconBubble: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: { fontWeight: '700' },
  networkPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formCard: {
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
});
