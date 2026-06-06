import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppInput } from '../../components/base/AppInput';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { useReceiveBitcoin } from '../../hooks/useReceiveBitcoin';

export function ReceiveScreen() {
  const {
    address,
    isLoading,
    error,
    amountSats,
    bitcoinUri,
    setAmountSats,
    copyAddress,
    shareAddress,
    generateNewAddress,
  } = useReceiveBitcoin();

  if (isLoading && !address) {
    return (
      <AppScreen title="Receive">
        <AppLoading />
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Receive">
      {error && (
        <AppText color="danger" variant="caption" style={styles.center}>
          {error}
        </AppText>
      )}

      {address && (
        <>
          <QrCodeView value={bitcoinUri || address.value} testID="receive-qr" />

          <AppCard>
            <AppText variant="label" color="muted">
              Receiving address
            </AppText>
            <AppText style={styles.addressText} testID="receive-address">
              {address.value}
            </AppText>
          </AppCard>

          <View style={styles.row}>
            <AppButton
              title="Copy"
              variant="secondary"
              size="md"
              style={styles.flex}
              onPress={copyAddress}
              testID="btn-copy"
            />
            <AppButton
              title="Share"
              variant="secondary"
              size="md"
              style={styles.flex}
              onPress={shareAddress}
              testID="btn-share"
            />
          </View>

          <AppCard>
            <AppText variant="label" color="muted">
              Amount (optional, sats)
            </AppText>
            <AppInput
              value={amountSats}
              onChangeText={setAmountSats}
              placeholder="Ex: 100000"
              keyboardType="numeric"
              testID="input-amount"
            />
            {amountSats.trim().length > 0 && (
              <AppText variant="caption" color="muted" testID="bitcoin-uri">
                {bitcoinUri}
              </AppText>
            )}
          </AppCard>

          <AppButton
            title="Generate new address"
            variant="ghost"
            size="md"
            onPress={generateNewAddress}
            disabled={isLoading}
            testID="btn-new-address"
          />
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  addressText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: { flex: 1 },
});
