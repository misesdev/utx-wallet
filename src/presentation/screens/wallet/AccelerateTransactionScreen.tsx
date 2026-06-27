import React, { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { DUST_THRESHOLD_SATS } from '../../../core/domain/usecases/transaction/BuildTransactionUseCase';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useAccelerateTransaction } from '../../hooks/useAccelerateTransaction';
import { useReauthenticate } from '../../hooks/useReauthenticate';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type RouteParams = RouteProp<AppStackParamList, 'AccelerateTransaction'>;

function formatSats(sats: number): string {
  return sats.toLocaleString('pt-BR');
}

function truncateAddr(addr: string, chars = 8): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function AccelerateTransactionScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<RouteParams>();
  const { txid, toAddress, amountSats, feeSats, isConfirmed } = route.params;

  const {
    rbfInfo,
    isLoadingInfo,
    infoError,
    newFeeRateSatsPerVByte,
    newFeeSats,
    newRecipientSats,
    isAccelerating,
    accelerateError,
    acceleratedTxid,
    setNewFeeRate,
    accelerate,
  } = useAccelerateTransaction({ txid, toAddress, isConfirmed });

  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();

  const handleConfirmAccelerate = useCallback(async () => {
    const ok = await requireAuth();
    if (!ok) return;
    await accelerate();
  }, [requireAuth, accelerate]);

  const feeIncrease = newFeeSats - (rbfInfo?.currentFeeSats ?? feeSats);
  const isValidRate =
    rbfInfo != null &&
    rbfInfo.isRbfEligible &&
    newFeeRateSatsPerVByte > rbfInfo.currentFeeRate &&
    newRecipientSats >= DUST_THRESHOLD_SATS;

  useEffect(() => {
    if (!acceleratedTxid) return;
    navigation.reset({
      index: 2,
      routes: [
        { name: AppRoutes.Home },
        { name: AppRoutes.Wallet },
        {
          name: AppRoutes.TransactionSuccess,
          params: { txid: acceleratedTxid, amountSats: newRecipientSats, feeSats: newFeeSats },
        },
      ],
    });
  }, [acceleratedTxid, navigation, newRecipientSats, newFeeSats]);

  return (
    <View
      testID="accelerate-transaction-screen"
      style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
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
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t('rbf.title')}
        </AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Loading */}
      {isLoadingInfo && <AppLoading testID="rbf-loading" />}

      {/* Info error */}
      {infoError && (
        <AppText color="danger" variant="caption" style={styles.center} testID="rbf-info-error">
          {infoError}
        </AppText>
      )}

      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />

      {!isLoadingInfo && rbfInfo && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        >
          {/* Original tx info card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.xl,
              },
            ]}
            testID="rbf-original-card"
          >
            <AppText variant="label" color="muted">{t('fees.recipient')}</AppText>
            <AppText variant="body" style={styles.mono}>{truncateAddr(toAddress)}</AppText>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.row}>
              <AppText variant="caption" color="muted">{t('fees.amount')}</AppText>
              <AppText variant="caption">{formatSats(amountSats)} {t('common.sats')}</AppText>
            </View>
            <View style={styles.row}>
              <AppText variant="caption" color="muted">{t('rbf.currentFee')}</AppText>
              <AppText variant="caption">{formatSats(feeSats)} {t('common.sats')}</AppText>
            </View>
          </View>

          {/* Ineligibility state */}
          {!rbfInfo.isRbfEligible && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.dangerMuted,
                  borderColor: theme.colors.danger,
                  borderRadius: theme.radii.xl,
                },
              ]}
              testID="rbf-ineligible-banner"
            >
              <View style={styles.row}>
                <AppIcon name="warning" size={20} color={theme.colors.danger} />
                <AppText variant="body" style={[styles.flex1, { color: theme.colors.danger }]}>
                  {t('rbf.notEligible')}
                </AppText>
              </View>
              <AppText variant="caption" color="muted" style={styles.marginTop8} testID="rbf-ineligibility-reason">
                {rbfInfo.ineligibilityReason === 'already-confirmed' && t('rbf.alreadyConfirmed')}
                {rbfInfo.ineligibilityReason === 'no-rbf-signal' && t('rbf.noRbfSignal')}
                {rbfInfo.ineligibilityReason === 'watch-only' && t('rbf.watchOnly')}
                {rbfInfo.ineligibilityReason === 'recipient-not-identified' && t('rbf.recipientNotIdentified')}
              </AppText>
              <AppButton
                title={t('rbf.close')}
                variant="secondary"
                size="md"
                onPress={() => navigation.goBack()}
                testID="btn-close-ineligible"
                style={styles.marginTop12}
              />
            </View>
          )}

          {/* Eligible: fee selector + preview */}
          {rbfInfo.isRbfEligible && (
            <>
              {/* Warning banner */}
              <View
                style={[
                  styles.warningBanner,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <AppIcon name="warning" size={16} color={theme.colors.textMuted} />
                <AppText variant="caption" color="muted" style={styles.flex1}>
                  {t('rbf.replacing')}
                </AppText>
              </View>

              {/* Description */}
              <AppText variant="caption" color="muted" style={styles.center}>
                {t('rbf.description')}
              </AppText>

              {/* Fee rate input */}
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
                <AppText variant="label" color="muted">{t('fees.networkFee')}</AppText>
                <AppText variant="caption" color="muted" style={styles.marginTop4}>
                  {t('rbf.currentFee')}: {rbfInfo.currentFeeRate} {t('common.satPerVbyte')}
                </AppText>

                {/* Simple numeric fee rate input */}
                <View style={[styles.feeInput, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
                  <AppText variant="caption" color="muted">{t('fees.feeRate')}</AppText>
                  <View style={styles.feeRateRow}>
                    <Pressable
                      testID="btn-fee-decrease"
                      onPress={() => setNewFeeRate(Math.max(rbfInfo.currentFeeRate + 1, newFeeRateSatsPerVByte - 1))}
                      style={({ pressed }) => [styles.feeStepBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <AppText variant="body" color="muted">−</AppText>
                    </Pressable>
                    <AppText
                      variant="subtitle"
                      style={styles.feeRateValue}
                      testID="fee-rate-display"
                    >
                      {newFeeRateSatsPerVByte}
                    </AppText>
                    <Pressable
                      testID="btn-fee-increase"
                      onPress={() => setNewFeeRate(newFeeRateSatsPerVByte + 1)}
                      style={({ pressed }) => [styles.feeStepBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <AppText variant="body" color="muted">+</AppText>
                    </Pressable>
                    <AppText variant="caption" color="muted">{t('common.satPerVbyte')}</AppText>
                  </View>
                </View>
              </View>

              {/* Preview card */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surfaceRaised,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.xl,
                  },
                ]}
                testID="rbf-preview-card"
              >
                <View style={styles.row}>
                  <AppText variant="caption" color="muted">{t('rbf.newFee')}</AppText>
                  <AppText variant="caption" testID="rbf-new-fee">
                    {formatSats(newFeeSats)} {t('common.sats')}
                  </AppText>
                </View>
                <View style={styles.row}>
                  <AppText variant="caption" color="muted">{t('rbf.feeIncrease')}</AppText>
                  <AppText
                    variant="caption"
                    style={{ color: feeIncrease > 0 ? theme.colors.warning : theme.colors.textMuted }}
                    testID="rbf-fee-increase"
                  >
                    +{formatSats(Math.max(0, feeIncrease))} {t('common.sats')}
                  </AppText>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.row}>
                  <AppText variant="caption" color="muted">{t('rbf.newRecipient')}</AppText>
                  <AppText
                    variant="caption"
                    style={{ color: newRecipientSats < DUST_THRESHOLD_SATS ? theme.colors.danger : theme.colors.text }}
                    testID="rbf-new-recipient"
                  >
                    {formatSats(Math.max(0, newRecipientSats))} {t('common.sats')}
                  </AppText>
                </View>
              </View>

              {/* Accelerate error */}
              {accelerateError && (
                <AppText color="danger" variant="caption" style={styles.center} testID="rbf-accelerate-error">
                  {accelerateError}
                </AppText>
              )}

              {/* Confirm button */}
              <AppButton
                title={t('rbf.confirmButton')}
                variant="primary"
                loading={isAccelerating}
                disabled={!isValidRate || isAccelerating}
                onPress={handleConfirmAccelerate}
                testID="btn-confirm-accelerate"
                style={styles.ctaButton}
              />
            </>
          )}
        </ScrollView>
      )}
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
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  warningBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  center: {
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  feeInput: {
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
    gap: 8,
  },
  feeRateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 4,
  },
  feeStepBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  ctaButton: {
    marginTop: 8,
  },
  flex1: {
    flex: 1,
  },
  marginTop4: {
    marginTop: 4,
  },
  marginTop8: {
    marginTop: 8,
  },
  marginTop12: {
    marginTop: 12,
  },
  feeRateValue: {
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },
});
