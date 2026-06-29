import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useReceiveBitcoin } from '../../hooks/useReceiveBitcoin';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes, type AppStackParamList } from '../../../app/navigation/routes';

type ReceiveRouteProps = RouteProp<AppStackParamList, 'Receive'>;

export function ReceiveScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  let originId: string | undefined;
  try {
    const route = useRoute<ReceiveRouteProps>();
    originId = route.params?.originId;
  } catch {
    originId = undefined;
  }

  const { selectedWallet } = useWallet();

  const {
    address,
    hdAddress,
    isLoading,
    error,
    amountSats,
    bitcoinUri,
    setAmountSats,
    copyAddress,
    shareAddress,
  } = useReceiveBitcoin(originId);

  const resolvedAddress = hdAddress?.address ?? address?.value ?? '';
  const originName = hdAddress?.originName;
  const originChain = hdAddress?.chain;
  const isTestnet4 = selectedWallet?.network === 'testnet4';

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && !address && !hdAddress) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <AppIcon name="back" size={24} color={theme.colors.textMuted} />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>{t('receive.title')}</AppText>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <AppLoading />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>{t('receive.title')}</AppText>
          {originName && originChain !== 'change' && (
            <View
              style={[
                styles.originBadge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" color="accent">{originName}</AppText>
            </View>
          )}
        </View>

        <View style={styles.backBtn} />
      </View>

      {/* ─── Scrollable content ──────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        {/* Error banner */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.dangerMuted, borderRadius: theme.radii.md }]}>
            <AppText variant="caption" color="danger" style={styles.errorText}>{error}</AppText>
          </View>
        )}

        {resolvedAddress ? (
          <>
            {/* ─── QR section ─────────────────────────────────────── */}
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
                <QrCodeView value={bitcoinUri || resolvedAddress} size={220} testID="receive-qr" />
              </View>
            </View>

            {/* ─── Address card ────────────────────────────────────── */}
            <View
              style={[
                styles.addressCard,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <AppText variant="label" color="muted" style={styles.addressLabel}>
                {originName ? `${originName} · ${t('receive.receivingAddress')}` : t('receive.receivingAddress')}
              </AppText>
              <AppText style={styles.addressText} testID="receive-address">
                {resolvedAddress}
              </AppText>
              {hdAddress && (
                <AppText variant="caption" color="faint" style={styles.pathText}>
                  {hdAddress.path}
                </AppText>
              )}
            </View>

            {/* ─── Action buttons ──────────────────────────────────── */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={copyAddress}
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
                <AppText variant="body" style={styles.actionLabel}>{t('common.copy')}</AppText>
              </Pressable>

              <Pressable
                onPress={shareAddress}
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
                <AppIcon name="share" size={24} color={theme.colors.text} />
                <AppText variant="body" style={styles.actionLabel}>{t('common.share')}</AppText>
              </Pressable>
            </View>

            {/* ─── Testnet4 faucet shortcut ────────────────────────── */}
            {isTestnet4 && (
              <Pressable
                testID="btn-faucets"
                accessibilityRole="button"
                accessibilityLabel={t('faucet.button')}
                onPress={() => navigation.navigate(AppRoutes.Testnet4Faucets)}
                style={({ pressed }) => [
                  styles.faucetBtn,
                  {
                    backgroundColor: theme.colors.accentMuted,
                    borderColor: theme.colors.accent + '44',
                    borderRadius: theme.radii.lg,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
              >
                <AppIcon name="faucet" size={20} color={theme.colors.accent} />
                <AppText variant="body" style={[styles.faucetBtnLabel, { color: theme.colors.accent }]}>
                  {t('faucet.button')}
                </AppText>
                <AppIcon name="chevronRight" size={18} color={theme.colors.accent} />
              </Pressable>
            )}

            {/* ─── Divider ─────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* ─── Amount section ──────────────────────────────────── */}
            <View style={styles.amountSection}>
              <AppText variant="label" color="muted">{t('receive.amountOptional')}</AppText>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <AppText variant="caption" color="muted" style={styles.inputPrefix}>{t('common.sats')}</AppText>
                <TextInput
                  value={amountSats}
                  onChangeText={setAmountSats}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textFaint}
                  keyboardType="numeric"
                  style={[styles.amountInput, { color: theme.colors.text }]}
                  testID="input-amount"
                />
              </View>

              {amountSats.trim().length > 0 && (
                <AppText variant="caption" color="muted" style={styles.uriPreview} testID="bitcoin-uri">
                  {bitcoinUri}
                </AppText>
              )}
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
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
    gap: 6,
  },
  headerTitle: {
    fontWeight: '700',
  },
  originBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  // Scroll
  scroll: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Error
  errorBanner: {
    padding: 12,
  },
  errorText: {
    textAlign: 'center',
  },

  // QR section
  qrSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrContainer: {
    borderWidth: 1,
    padding: 20,
  },

  // Address card
  addressCard: {
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  addressLabel: {
    letterSpacing: 1.5,
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  pathText: {
    letterSpacing: 0.2,
    marginTop: -2,
  },

  // Action buttons
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

  // Faucet button
  faucetBtn: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  faucetBtnLabel: {
    flex: 1,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 4,
  },

  // Amount
  amountSection: {
    gap: 10,
  },
  inputWrap: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputPrefix: {
    letterSpacing: 1,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  uriPreview: {
    letterSpacing: 0.2,
    lineHeight: 18,
  },
});
