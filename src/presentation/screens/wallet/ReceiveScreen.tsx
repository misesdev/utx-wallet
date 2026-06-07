import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { AppButton } from '../../components/base/AppButton';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useReceiveBitcoin } from '../../hooks/useReceiveBitcoin';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';

type ReceiveRouteProps = RouteProp<AppStackParamList, 'Receive'>;

export function ReceiveScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  let originId: string | undefined;
  try {
    const route = useRoute<ReceiveRouteProps>();
    originId = route.params?.originId;
  } catch {
    originId = undefined;
  }

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
    generateNewAddress,
  } = useReceiveBitcoin(originId);

  const resolvedAddress = hdAddress?.address ?? address?.value ?? '';
  const originName = hdAddress?.originName;
  const originChain = hdAddress?.chain;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && !address && !hdAddress) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <AppText variant="title" color="muted">←</AppText>
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>Receive</AppText>
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
          accessibilityLabel="Go back"
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>Receive</AppText>
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
                {originName ? `${originName} · Receiving address` : 'Receiving address'}
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
                accessibilityLabel="Copy address"
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
                <AppText style={styles.actionIcon}>⎘</AppText>
                <AppText variant="body" style={styles.actionLabel}>Copy</AppText>
              </Pressable>

              <Pressable
                onPress={shareAddress}
                testID="btn-share"
                accessibilityRole="button"
                accessibilityLabel="Share address"
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
                <AppText style={styles.actionIcon}>↑</AppText>
                <AppText variant="body" style={styles.actionLabel}>Share</AppText>
              </Pressable>
            </View>

            {/* ─── Divider ─────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* ─── Amount section ──────────────────────────────────── */}
            <View style={styles.amountSection}>
              <AppText variant="label" color="muted">Amount (optional)</AppText>
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
                <AppText variant="caption" color="muted" style={styles.inputPrefix}>sats</AppText>
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

            {/* ─── New address ─────────────────────────────────────── */}
            <AppButton
              title="↺  New address"
              variant="ghost"
              size="md"
              onPress={generateNewAddress}
              disabled={isLoading}
              testID="btn-new-address"
            />
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
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
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
