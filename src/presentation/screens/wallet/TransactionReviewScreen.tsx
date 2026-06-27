import React, { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useReauthenticate } from '../../hooks/useReauthenticate';
import { useConfirmTransaction } from '../../hooks/useConfirmTransaction';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';
import type { TransactionPreview } from '../../../core/domain/entities/TransactionPreview';

type ReviewNavProp = NativeStackNavigationProp<AppStackParamList, 'TransactionReview'>;
type ReviewRouteProp = RouteProp<AppStackParamList, 'TransactionReview'>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

function truncateAddress(addr: string, chars = 10): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

function SectionDivider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

type DetailRowProps = {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
  testID?: string;
};

function DetailRow({ label, value, accent, mono, testID }: DetailRowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color="muted" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText
        variant={accent ? 'subtitle' : 'body'}
        style={[
          styles.detailValue,
          mono && styles.monoText,
          accent && { color: theme.colors.text },
        ]}
        testID={testID}
      >
        {value}
      </AppText>
    </View>
  );
}

export function TransactionReviewScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ReviewNavProp>();

  let originId: string | undefined;
  let originName: string | undefined;
  let toAddress = '';
  let amountSats = '';
  let selectedFeeRate = 1;
  let payFee = false;
  let preview: TransactionPreview | null = null;

  try {
    const route = useRoute<ReviewRouteProp>();
    originId = route.params?.originId;
    originName = route.params?.originName;
    toAddress = route.params?.toAddress ?? '';
    amountSats = route.params?.amountSats ?? '';
    selectedFeeRate = route.params?.selectedFeeRate ?? 1;
    payFee = route.params?.payFee ?? false;
    const raw = route.params?.previewJson;
    if (raw) preview = JSON.parse(raw) as TransactionPreview;
  } catch {
    // fallback for test environments
  }

  const { isSending, sendError, sentResult, sendTransaction } = useConfirmTransaction({
    originId,
    toAddress,
    amountSats,
    selectedFeeRate,
    payFee,
  });

  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();

  const handleConfirmSend = useCallback(async () => {
    const ok = await requireAuth();
    if (!ok) return;
    await sendTransaction();
  }, [requireAuth, sendTransaction]);

  useEffect(() => {
    if (!sentResult) return;
    navigation.reset({
      index: 2,
      routes: [
        { name: AppRoutes.Home },
        { name: AppRoutes.Wallet },
        {
          name: AppRoutes.TransactionSuccess,
          params: {
            txid: sentResult.txid,
            amountSats: sentResult.transaction.amountSats,
            feeSats: sentResult.transaction.feeSats ?? 0,
          },
        },
      ],
    });
  }, [sentResult, navigation]);

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
          <AppText variant="subtitle" style={styles.headerTitle}>
            {t('txConfirm.title')}
          </AppText>
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
        {preview && (
          <>
            {/* Summary card */}
            <AppCard>
              <DetailRow
                label={t('txConfirm.recipient')}
                value={truncateAddress(preview.toAddress)}
                mono
                testID="review-address"
              />
              <SectionDivider color={theme.colors.border} />
              <DetailRow
                label={t('txConfirm.amount')}
                value={`${formatSats(preview.amountSats)} sats`}
                testID="review-amount"
              />
              <DetailRow
                label={t('txConfirm.recipientReceives')}
                value={`${formatSats(preview.recipientAmountSats)} sats`}
                testID="review-recipient-amount"
              />
              <DetailRow
                label={t('txConfirm.fee')}
                value={`${formatSats(preview.feeSats)} sats`}
                testID="review-fee"
              />
              <DetailRow
                label={t('txConfirm.feeRate')}
                value={`${preview.feeRateSatsPerVByte} sat/vB`}
                testID="review-fee-rate"
              />
              <SectionDivider color={theme.colors.borderHighlight} />
              <DetailRow
                label={t('txConfirm.total')}
                value={`${formatSats(preview.totalSats)} sats`}
                accent
                testID="review-total"
              />
            </AppCard>

            {/* Inputs (UTXOs) */}
            {preview.inputs.length > 0 && (
              <View style={styles.section}>
                <AppText variant="label" color="muted" style={styles.sectionTitle}>
                  {t('txConfirm.inputs')}
                </AppText>
                <AppCard>
                  {preview.inputs.map((inp, i) => (
                    <View key={i} style={[styles.ioRow, i > 0 && styles.ioRowSpaced]}>
                      <AppText
                        variant="caption"
                        style={[styles.ioAddress, { color: theme.colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {truncateAddress(inp.address, 8)}
                      </AppText>
                      <AppText variant="caption" style={styles.ioAmount}>
                        {`${formatSats(inp.valueSats)} sats`}
                      </AppText>
                    </View>
                  ))}
                </AppCard>
              </View>
            )}

            {/* Outputs */}
            {preview.outputs.length > 0 && (
              <View style={styles.section}>
                <AppText variant="label" color="muted" style={styles.sectionTitle}>
                  {t('txConfirm.outputs')}
                </AppText>
                <AppCard>
                  {preview.outputs.map((out, i) => (
                    <View key={i} style={[styles.ioRow, i > 0 && styles.ioRowSpaced]}>
                      <AppText
                        variant="caption"
                        style={[
                          styles.ioAddress,
                          { color: out.isChange ? theme.colors.textMuted : theme.colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {out.isChange ? t('txConfirm.changeOutput') : truncateAddress(out.address, 8)}
                      </AppText>
                      <AppText
                        variant="caption"
                        style={[styles.ioAmount, out.isChange && { color: theme.colors.textMuted }]}
                      >
                        {`${formatSats(out.amountSats)} sats`}
                      </AppText>
                    </View>
                  ))}
                </AppCard>
              </View>
            )}

            {sendError && (
              <AppText variant="caption" color="danger" style={styles.errorText} testID="review-send-error">
                {sendError}
              </AppText>
            )}
          </>
        )}
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
          title={isSending ? t('txConfirm.sending') : t('txConfirm.confirmSend')}
          onPress={handleConfirmSend}
          loading={isSending}
          disabled={isSending || !preview}
          testID="btn-confirm-send"
        />
      </View>

      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />
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
  scrollContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    maxWidth: '60%',
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  ioRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ioRowSpaced: {
    marginTop: 8,
  },
  ioAddress: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  ioAmount: {
    fontVariant: ['tabular-nums'],
    fontSize: 12,
  },
  errorText: {
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
