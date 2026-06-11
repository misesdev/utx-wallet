import React, { useCallback } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useSignature } from '../../../app/providers/SignatureProvider';
import type { AppStackParamList } from '../../../app/navigation/routes';

type SignatureResultRouteProps = RouteProp<AppStackParamList, 'SignatureResult'>;

export function SignatureResultScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<SignatureResultRouteProps>();
  const { decodeSignedMessage } = useSignature();

  const encoded = route.params.encoded;
  const signed = decodeSignedMessage(encoded);

  const handleCopy = useCallback(() => {
    Clipboard.setString(encoded);
  }, [encoded]);

  const handleShare = useCallback(async () => {
    await Share.share({ message: encoded });
  }, [encoded]);

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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('signature.resultTitle')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* QR section */}
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
            <QrCodeView value={encoded} size={220} testID="signature-qr" />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCopy}
            testID="btn-copy-signature"
            accessibilityRole="button"
            accessibilityLabel={t('signature.copyAction')}
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
            <AppText variant="body" style={styles.actionLabel}>{t('signature.copyAction')}</AppText>
          </Pressable>

          <Pressable
            onPress={handleShare}
            testID="btn-share-signature"
            accessibilityRole="button"
            accessibilityLabel={t('signature.shareAction')}
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
            <AppText variant="body" style={styles.actionLabel}>{t('signature.shareAction')}</AppText>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Signed content */}
        {signed && (
          <>
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
              <AppText variant="label" color="muted" style={styles.infoLabel}>
                {t('signature.resultContentLabel')}
              </AppText>
              <AppText style={styles.infoValue} testID="signature-content">{signed.content}</AppText>
            </View>

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
              <AppText variant="label" color="muted" style={styles.infoLabel}>
                {t('signature.resultPubkeyLabel')}
              </AppText>
              <AppText style={styles.monoValue} testID="signature-pubkey" numberOfLines={2}>
                {signed.pubkey}
              </AppText>
            </View>
          </>
        )}
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
  },
  headerTitle: {
    fontWeight: '700',
  },
  scroll: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrContainer: {
    borderWidth: 1,
    padding: 20,
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
  divider: {
    height: 1,
    marginHorizontal: 4,
  },
  infoCard: {
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  infoLabel: {
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  monoValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 18,
  },
});
