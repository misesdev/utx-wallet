import React, { useEffect } from 'react';
import { AppCard } from '../../components/base/AppCard';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { FeeSelector } from '../../components/wallet/FeeSelector';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useSendBitcoin } from '../../hooks/useSendBitcoin';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type SendFeesNavProp = NativeStackNavigationProp<AppStackParamList, 'SendFees'>;
type SendFeesRouteProps = RouteProp<AppStackParamList, 'SendFees'>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

function truncateAddress(addr: string, chars = 10): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function SendFeesScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SendFeesNavProp>();

  let originId: string | undefined;
  let originName: string | undefined;
  let initialAddress = '';
  let initialAmount = '';
  try {
    const route = useRoute<SendFeesRouteProps>();
    originId = route.params?.originId;
    originName = route.params?.originName;
    initialAddress = route.params?.toAddress ?? '';
    initialAmount = route.params?.amountSats ?? '';
  } catch {
    // noop — fallback for test environments
  }

  const {
    toAddress,
    amountSats,
    feeTier,
    customFeeRate,
    customFeeError,
    feeRates,
    isLoadingFeeRates,
    preview,
    isPreviewing,
    previewError,
    payFee,
    selectedFeeRate,
    isWatchOnly,
    setToAddress,
    setAmountSats,
    setFeeTier,
    setCustomFeeRate,
    reviewTransaction,
    clearPreview,
    setPayFee,
  } = useSendBitcoin({ originId, initialAddress, initialAmount });

  // Sync params into hook state if hook initialized before params resolved
  useEffect(() => {
    if (initialAddress && !toAddress) setToAddress(initialAddress);
  }, [initialAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialAmount && !amountSats) setAmountSats(initialAmount);
  }, [initialAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to review screen when preview is ready
  useEffect(() => {
    if (!preview) return;
    navigation.navigate(AppRoutes.TransactionReview, {
      originId,
      originName,
      toAddress: toAddress || initialAddress,
      amountSats: amountSats || initialAmount,
      selectedFeeRate,
      payFee,
      previewJson: JSON.stringify(preview),
    });
    clearPreview();
  }, [preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAddress = toAddress || initialAddress;
  const effectiveAmount = amountSats || initialAmount;
  const parsedAmount = parseInt(effectiveAmount, 10);

  const canReview =
    effectiveAddress.length > 0 &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    !isPreviewing &&
    !customFeeError;

  if (isWatchOnly) {
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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('fees.title')}</AppText>
          <View style={styles.backBtn} />
        </View>
        <View style={[styles.watchOnlyBanner, { backgroundColor: theme.colors.dangerMuted, borderColor: theme.colors.danger, borderRadius: theme.radii.md }]}>
          <AppIcon name="warning" size={20} color={theme.colors.danger} />
          <AppText variant="body" style={[styles.watchOnlyText, { color: theme.colors.danger }]}>
            {t('send.errorWatchOnly')}
          </AppText>
        </View>
      </View>
    );
  }

  const footerHeight = Math.max(insets.bottom, 20) + 54 + 24;

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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('fees.title')}</AppText>
          {originName && (
            <View style={[styles.originBadge, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm }]}>
              <AppText variant="label" color="accent">{originName}</AppText>
            </View>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerHeight }]}
      >
        {/* Summary card */}
        <AppCard>
          <View style={styles.summaryRow}>
            <AppText variant="caption" color="muted">{t('fees.to')}</AppText>
            <AppText style={styles.summaryAddress} numberOfLines={1}>
              {truncateAddress(effectiveAddress)}
            </AppText>
          </View>
          <View style={styles.summaryAmountRow}>
            <AppText variant="caption" color="muted">{t('fees.amount')}</AppText>
            <AppText variant="subtitle" testID="summary-amount">
              {!isNaN(parsedAmount) ? `${formatSats(parsedAmount)} sats` : '—'}
            </AppText>
          </View>
        </AppCard>

        {/* Fee selector */}
        <FeeSelector
          selected={feeTier}
          feeRates={feeRates}
          customFeeRate={customFeeRate}
          customFeeError={customFeeError}
          onSelect={setFeeTier}
          onCustomFeeRateChange={setCustomFeeRate}
        />

        {isLoadingFeeRates && (
          <AppText variant="caption" color="muted" style={styles.center}>
            {t('fees.loadingRates')}
          </AppText>
        )}

        {previewError && (
          <AppText variant="caption" color="danger" style={styles.center} testID="preview-error">
            {previewError}
          </AppText>
        )}

        {/* Pay fee toggle */}
        <AppCard>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <AppText variant="body" style={styles.toggleTitle}>{t('fees.payFeeTitle')}</AppText>
              <AppText variant="caption" color="muted">
                {t('fees.payFeeSubtitle')}
              </AppText>
            </View>
            <Switch
              value={payFee}
              onValueChange={setPayFee}
              testID="toggle-pay-fee"
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              accessibilityLabel={t('fees.payFeeTitle')}
            />
          </View>
        </AppCard>
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <AppButton
          title={isPreviewing ? t('fees.calculating') : t('fees.previewTitle')}
          disabled={!canReview}
          onPress={reviewTransaction}
          testID="btn-review"
        />
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  originBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  // Scroll
  scrollContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Summary
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryAddress: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.3,
    maxWidth: '65%',
    textAlign: 'right',
  },

  // Toggle
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontWeight: '600',
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Misc
  center: {
    textAlign: 'center',
  },
  watchOnlyBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    margin: 20,
    padding: 16,
  },
  watchOnlyText: {
    flex: 1,
  },
});
