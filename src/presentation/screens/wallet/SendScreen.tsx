import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../../components/base/AppText';
import { AddressInput } from '../../components/wallet/AddressInput';
import { useSendBitcoin } from '../../hooks/useSendBitcoin';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type SendNavProp = NativeStackNavigationProp<AppStackParamList, 'Send'>;
type SendRouteProps = RouteProp<AppStackParamList, 'Send'>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

export function SendScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SendNavProp>();

  let originId: string | undefined;
  try {
    const route = useRoute<SendRouteProps>();
    originId = route.params?.originId;
  } catch {
    originId = undefined;
  }

  const {
    toAddress,
    amountSats,
    availableBalanceSats,
    addressError,
    amountError,
    setToAddress,
    setAmountSats,
  } = useSendBitcoin({ originId });

  const btcAmount =
    amountSats.trim() && !isNaN(parseInt(amountSats, 10))
      ? (parseInt(amountSats, 10) / 1e8).toFixed(8).replace(/\.?0+$/, '')
      : null;

  const canNext =
    toAddress.trim().length > 0 &&
    addressError === null &&
    amountSats.trim().length > 0 &&
    parseInt(amountSats.trim(), 10) > 0;

  const handleNext = () => {
    if (!canNext) return;
    navigation.navigate(AppRoutes.SendFees, {
      originId,
      toAddress: toAddress.trim(),
      amountSats: amountSats.trim(),
    });
  };

  const handleMax = () => {
    setAmountSats(String(availableBalanceSats));
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>Send</AppText>
          {originId && (
            <View
              style={[
                styles.originBadge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" color="accent">Account selected</AppText>
            </View>
          )}
        </View>

        <View style={styles.backBtn} />
      </View>

      {/* Available balance */}
      <View style={styles.balanceRow}>
        <AppText variant="caption" color="muted">Available</AppText>
        <AppText variant="body" testID="available-balance">{formatSats(availableBalanceSats)} sats</AppText>
      </View>

      {/* Big amount field (Nubank-style) */}
      <View style={styles.amountSection}>
        <TextInput
          value={amountSats}
          onChangeText={setAmountSats}
          placeholder="0"
          placeholderTextColor={theme.colors.textFaint}
          keyboardType="numeric"
          style={[styles.bigAmount, { color: amountSats ? theme.colors.text : theme.colors.textFaint }]}
          testID="input-amount"
        />
        <AppText variant="body" color="muted" style={styles.unitLabel}>sats</AppText>
        {btcAmount && (
          <AppText variant="caption" color="muted" style={styles.btcConversion} testID="btc-conversion">
            ≈ {btcAmount} BTC
          </AppText>
        )}
        {amountError && (
          <AppText variant="caption" color="danger" testID="amount-error">{amountError}</AppText>
        )}
      </View>

      {/* Address section */}
      <View style={styles.addressSection}>
        <View style={styles.addressHeader}>
          <AppText variant="label" color="muted">Recipient address</AppText>
          <Pressable
            onPress={handleMax}
            accessibilityRole="button"
            accessibilityLabel="Send max"
            testID="btn-max"
            style={({ pressed }) => [
              styles.maxBtn,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.sm,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="label" color="accent">MAX</AppText>
          </Pressable>
        </View>

        <AddressInput
          value={toAddress}
          onChangeText={setToAddress}
          testID="input-address"
          error={addressError}
        />
      </View>

      {/* Next button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          onPress={handleNext}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canNext }}
          testID="btn-next"
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: canNext ? theme.colors.primary : theme.colors.surfaceRaised,
              borderRadius: theme.radii.lg,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <AppText
            variant="subtitle"
            style={[styles.nextBtnLabel, { color: canNext ? theme.colors.primaryText : theme.colors.textMuted }]}
          >
            Next →
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

  // Balance
  balanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },

  // Big amount
  amountSection: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bigAmount: {
    fontFamily: 'System',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    width: '100%',
  },
  unitLabel: {
    letterSpacing: 2,
    marginTop: -8,
  },
  btcConversion: {
    letterSpacing: 0.3,
  },

  // Address
  addressSection: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  addressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  maxBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  nextBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  nextBtnLabel: {
    fontWeight: '700',
  },
});
