import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type SuccessRouteProp = RouteProp<AppStackParamList, 'TransactionSuccess'>;
type SuccessNavProp = NativeStackNavigationProp<AppStackParamList, 'TransactionSuccess'>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

function truncateTxid(txid: string): string {
  if (txid.length <= 20) return txid;
  return `${txid.slice(0, 10)}…${txid.slice(-10)}`;
}

export function TransactionSuccessScreen() {
  const route = useRoute<SuccessRouteProp>();
  const navigation = useNavigation<SuccessNavProp>();
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { txid, amountSats, feeSats } = route.params;
  const [copied, setCopied] = useState(false);

  function copyTxid() {
    Clipboard.setString(txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goHome() {
    navigation.reset({
      index: 1,
      routes: [{ name: AppRoutes.WalletList }, { name: AppRoutes.Home }],
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.iconRing,
              { backgroundColor: theme.colors.successMuted, borderColor: theme.colors.success },
            ]}
            testID="success-icon"
          >
            <AppIcon name="success" size={44} color={theme.colors.success} />
          </View>

          <AppText variant="title" style={styles.heading} testID="success-heading">
            {t('txSuccess.message')}
          </AppText>
          <AppText variant="body" color="muted" style={styles.subtitle}>
            {t('txSuccess.description')}
          </AppText>
        </View>

        {/* Amount card */}
        <AppCard>
          <View style={styles.amountRow}>
            <AppText variant="caption" color="muted" style={styles.amountLabel}>
              {t('txSuccess.amountSent')}
            </AppText>
            <View style={styles.amountValue}>
              <AppText variant="title" style={styles.amountNumber} testID="success-amount">
                {formatSats(amountSats)}
              </AppText>
              <AppText variant="body" color="muted"> sats</AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.row}>
            <AppText color="muted">{t('txSuccess.feePaid')}</AppText>
            <AppText testID="success-fee">{`${formatSats(feeSats)} sats`}</AppText>
          </View>
        </AppCard>

        {/* TXID card */}
        <AppCard>
          <AppText variant="label" color="muted" style={styles.txidLabel}>
            {t('txSuccess.txid')}
          </AppText>
          <View style={styles.txidRow}>
            <AppText style={[styles.txid, { color: theme.colors.textMuted }]} testID="success-txid">
              {truncateTxid(txid)}
            </AppText>
            <Pressable
              onPress={copyTxid}
              accessibilityRole="button"
              accessibilityLabel={t('txSuccess.copyTxid')}
              testID="btn-copy-txid"
              style={({ pressed }) => [
                styles.copyBtn,
                {
                  backgroundColor: copied ? theme.colors.successMuted : theme.colors.surfaceMuted,
                  borderRadius: theme.radii.sm,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppIcon
                name={copied ? 'check' : 'copy'}
                size={16}
                color={copied ? theme.colors.success : theme.colors.textMuted}
              />
              <AppText
                variant="label"
                style={{ color: copied ? theme.colors.success : theme.colors.textMuted }}
              >
                {copied ? t('txSuccess.copied') : t('txSuccess.copyTxid')}
              </AppText>
            </Pressable>
          </View>
          <AppText variant="caption" color="faint" style={styles.txidFull} testID="success-txid-full">
            {txid}
          </AppText>
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
          title={t('txSuccess.goHome')}
          onPress={goHome}
          testID="btn-go-home"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Hero
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  iconRing: {
    alignItems: 'center',
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  heading: {
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 280,
    textAlign: 'center',
  },

  // Amount card
  amountRow: {
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    alignSelf: 'flex-start',
  },
  amountValue: {
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  amountNumber: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // TXID card
  txidLabel: {
    marginBottom: 8,
  },
  txidRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  txid: {
    flex: 1,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  copyBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  txidFull: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    lineHeight: 18,
    marginTop: 8,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
  },
});
