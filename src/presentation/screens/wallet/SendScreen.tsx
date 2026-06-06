import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppInput } from '../../components/base/AppInput';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { FeeSelector } from '../../components/wallet/FeeSelector';
import { useSendBitcoin } from '../../hooks/useSendBitcoin';
import { TransactionReviewModal } from './TransactionReviewModal';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type SendNavProp = NativeStackNavigationProp<AppStackParamList, 'Send'>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

function truncateAddress(addr: string, chars = 10): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function SendScreen() {
  const navigation = useNavigation<SendNavProp>();
  const {
    toAddress,
    amountSats,
    feeTier,
    customFeeRate,
    availableBalanceSats,
    feeRates,
    isLoadingFeeRates,
    addressError,
    amountError,
    preview,
    isPreviewing,
    previewError,
    isReviewVisible,
    isSending,
    sendError,
    sentResult,
    setToAddress,
    setAmountSats,
    setFeeTier,
    setCustomFeeRate,
    reviewTransaction,
    openReview,
    closeReview,
    sendTransaction,
    resetSend,
  } = useSendBitcoin();

  useEffect(() => {
    if (!sentResult) return;
    navigation.replace(AppRoutes.TransactionSuccess, {
      txid: sentResult.txid,
      amountSats: sentResult.transaction.amountSats,
      feeSats: sentResult.transaction.feeSats ?? 0,
    });
    resetSend();
  }, [sentResult, navigation, resetSend]);

  const btcAmount = amountSats.trim()
    ? (parseInt(amountSats, 10) / 1e8).toFixed(8).replace(/\.?0+$/, '')
    : null;

  const canReview =
    toAddress.trim().length > 0 &&
    addressError === null &&
    amountSats.trim().length > 0 &&
    !isPreviewing;

  return (
    <AppScreen title="Send">
      <AppCard>
        <View style={styles.row}>
          <AppText variant="label" color="muted">
            Available balance
          </AppText>
          <AppText variant="subtitle" testID="available-balance">
            {`${formatSats(availableBalanceSats)} sats`}
          </AppText>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="label" color="muted">
          Recipient address
        </AppText>
        <AppInput
          value={toAddress}
          onChangeText={setToAddress}
          placeholder="bc1q… or tb1q…"
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-address"
        />
        {addressError && (
          <AppText variant="caption" color="danger" testID="address-error">
            {addressError}
          </AppText>
        )}
      </AppCard>

      <AppCard>
        <AppText variant="label" color="muted">
          Amount (sats)
        </AppText>
        <AppInput
          value={amountSats}
          onChangeText={setAmountSats}
          placeholder="Ex: 100000"
          keyboardType="numeric"
          testID="input-amount"
        />
        {btcAmount && (
          <AppText variant="caption" color="muted" testID="btc-conversion">
            ≈ {btcAmount} BTC
          </AppText>
        )}
        {amountError && (
          <AppText variant="caption" color="danger" testID="amount-error">
            {amountError}
          </AppText>
        )}
      </AppCard>

      <FeeSelector
        selected={feeTier}
        feeRates={feeRates}
        customFeeRate={customFeeRate}
        onSelect={setFeeTier}
        onCustomFeeRateChange={setCustomFeeRate}
      />

      {previewError && (
        <AppText variant="caption" color="danger" style={styles.center} testID="preview-error">
          {previewError}
        </AppText>
      )}

      <AppButton
        title={isPreviewing ? 'Calculating…' : 'Review transaction'}
        disabled={!canReview}
        onPress={reviewTransaction}
        testID="btn-review"
      />

      {preview && (
        <AppCard accent testID="preview-card">
          <AppText variant="subtitle">Preview</AppText>

          <View style={styles.row}>
            <AppText color="muted">Amount</AppText>
            <AppText testID="preview-amount">{`${formatSats(preview.amountSats)} sats`}</AppText>
          </View>
          <View style={styles.row}>
            <AppText color="muted">Estimated fee</AppText>
            <AppText testID="preview-fee">{`${formatSats(preview.feeSats)} sats`}</AppText>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <AppText color="muted">Total</AppText>
            <AppText variant="subtitle" testID="preview-total">
              {`${formatSats(preview.totalSats)} sats`}
            </AppText>
          </View>
          {preview.changeSats > 0 && (
            <View style={styles.row}>
              <AppText color="muted">Change</AppText>
              <AppText testID="preview-change">{`${formatSats(preview.changeSats)} sats`}</AppText>
            </View>
          )}
          <View style={styles.row}>
            <AppText color="muted">Recipient</AppText>
            <AppText style={styles.address} testID="preview-address">
              {truncateAddress(preview.toAddress)}
            </AppText>
          </View>
          <View style={styles.row}>
            <AppText color="muted">Fee rate</AppText>
            <AppText testID="preview-fee-rate">{`${preview.feeRateSatsPerVByte} sat/vB`}</AppText>
          </View>

          <AppButton
            title="Confirm & send"
            size="md"
            onPress={openReview}
            testID="btn-open-review"
          />
        </AppCard>
      )}

      {isLoadingFeeRates && (
        <AppText variant="caption" color="muted" style={styles.center}>
          Loading fee rates…
        </AppText>
      )}

      <TransactionReviewModal
        visible={isReviewVisible}
        preview={preview}
        isSending={isSending}
        sendError={sendError}
        onConfirm={sendTransaction}
        onCancel={closeReview}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  address: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    maxWidth: '60%',
    textAlign: 'right',
  },
  center: {
    textAlign: 'center',
  },
});
