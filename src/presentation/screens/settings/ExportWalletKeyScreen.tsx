import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWalletExport } from '../../hooks/useWalletExport';
import type { AppStackParamList } from '../../../app/navigation/routes';
import type { WalletExportFormat } from '../../../core/domain/usecases/wallet/ExportWalletKeyUseCase';

type ExportKeyRouteProps = RouteProp<AppStackParamList, 'ExportWalletKey'>;

const screenCaptureGuard = new NoopScreenCaptureAdapter();

const FORMAT_TITLE_KEYS: Record<WalletExportFormat, string> = {
  mnemonic: 'walletExport.formatMnemonic',
  xpriv: 'walletExport.formatXpriv',
  xpub: 'walletExport.formatXpub',
  wif: 'walletExport.formatWif',
};

export function ExportWalletKeyScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<ExportKeyRouteProps>();
  const { format, accountIndex } = route.params;
  const { exportKey } = useWalletExport();

  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  useEffect(() => {
    exportKey(format, accountIndex)
      .then(setKeyValue)
      .catch(e => setError(e instanceof Error ? e.message : t('walletExport.loadError')))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = useCallback(() => {
    if (!keyValue) return;
    Clipboard.setString(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [keyValue]);

  const handleShare = useCallback(async () => {
    if (!keyValue) return;
    await Share.share({ message: keyValue });
  }, [keyValue]);

  const formatTitleKey = FORMAT_TITLE_KEYS[format] ?? 'walletExport.exportedKey';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
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
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>{t('walletExport.exportedKey')}</AppText>
          <AppText variant="caption" color="muted">{t(formatTitleKey as any)}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Security warning */}
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
              borderColor: theme.colors.danger + '55',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <AppIcon name="warning" size={22} color={theme.colors.danger} />
          <View style={styles.warningBody}>
            <AppText variant="label" color="danger" style={styles.warningTitle}>
              {t('walletExport.warningTitle')}
            </AppText>
            <AppText variant="caption" color="muted">{t('walletExport.warningBody')}</AppText>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <AppLoading />
          </View>
        ) : error ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
                borderColor: theme.colors.danger + '44',
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <AppText variant="caption" color="danger" testID="export-error">{error}</AppText>
          </View>
        ) : keyValue ? (
          <>
            {/* QR code */}
            <View style={styles.qrSection}>
              <View
                style={[
                  styles.qrContainer,
                  {
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: theme.colors.borderHighlight,
                    borderRadius: theme.radii.xl,
                  },
                ]}
              >
                <QrCodeView value={keyValue} size={220} testID="export-qr" />
              </View>
            </View>

            {/* Key value card */}
            <View
              style={[
                styles.keyCard,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <AppText variant="label" color="muted" style={styles.keyLabel}>
                {t(formatTitleKey as any)}
              </AppText>
              <AppText style={styles.keyText} testID="export-key-value" selectable>
                {keyValue}
              </AppText>
            </View>

            {/* Copy / Share */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleCopy}
                testID="btn-copy"
                accessibilityRole="button"
                accessibilityLabel={t('common.copy')}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppIcon name="copy" size={22} color={theme.colors.text} />
                <AppText variant="body" style={styles.actionLabel}>
                  {copied ? t('walletExport.copied') : t('common.copy')}
                </AppText>
              </Pressable>

              <Pressable
                onPress={handleShare}
                testID="btn-share"
                accessibilityRole="button"
                accessibilityLabel={t('common.share')}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppIcon name="share" size={22} color={theme.colors.text} />
                <AppText variant="body" style={styles.actionLabel}>{t('common.share')}</AppText>
              </Pressable>
            </View>
          </>
        ) : null}
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  warningCard: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  warningBody: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorCard: {
    borderWidth: 1,
    padding: 14,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrContainer: {
    borderWidth: 1,
    padding: 20,
  },
  keyCard: {
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  keyLabel: {
    letterSpacing: 1.5,
  },
  keyText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionLabel: {
    fontWeight: '600',
  },
});
