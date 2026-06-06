import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppText } from '../../components/base/AppText';
import { useTheme } from '../../hooks/useTheme';
import type { TransactionPreview } from '../../../core/domain/entities/TransactionPreview';

function formatSats(sats: number): string {
  return sats.toLocaleString('pt-BR');
}

function truncateAddress(addr: string, chars = 10): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

type TransactionReviewModalProps = {
  visible: boolean;
  preview: TransactionPreview | null;
  isSending: boolean;
  sendError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TransactionReviewModal({
  visible,
  preview,
  isSending,
  sendError,
  onConfirm,
  onCancel,
}: TransactionReviewModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      testID="transaction-review-modal"
    >
      <Pressable style={styles.backdrop} onPress={onCancel} testID="modal-backdrop" />
      <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <AppText variant="title" style={styles.heading} testID="modal-title">
          Confirmar envio
        </AppText>

        {preview && (
          <AppCard>
            <View style={styles.row}>
              <AppText color="muted">Destino</AppText>
              <AppText style={styles.address} testID="modal-address">
                {truncateAddress(preview.toAddress)}
              </AppText>
            </View>
            <View style={styles.row}>
              <AppText color="muted">Valor enviado</AppText>
              <AppText testID="modal-amount">{`${formatSats(preview.amountSats)} sats`}</AppText>
            </View>
            <View style={styles.row}>
              <AppText color="muted">Taxa estimada</AppText>
              <AppText testID="modal-fee">{`${formatSats(preview.feeSats)} sats`}</AppText>
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <AppText color="muted">Total debitado</AppText>
              <AppText variant="subtitle" testID="modal-total">
                {`${formatSats(preview.totalSats)} sats`}
              </AppText>
            </View>
            <View style={styles.row}>
              <AppText color="muted">Taxa</AppText>
              <AppText testID="modal-fee-rate">{`${preview.feeRateSatsPerVByte} sat/vB`}</AppText>
            </View>
          </AppCard>
        )}

        {sendError && (
          <AppText variant="caption" color="danger" style={styles.error} testID="modal-send-error">
            {sendError}
          </AppText>
        )}

        <View style={styles.actions}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            size="md"
            style={styles.actionBtn}
            onPress={onCancel}
            disabled={isSending}
            testID="btn-cancel"
          />
          <AppButton
            title={isSending ? 'Enviando…' : 'Confirmar e enviar'}
            size="md"
            style={styles.actionBtn}
            onPress={onConfirm}
            disabled={isSending}
            testID="btn-confirm-send"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 16,
  },
  heading: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  address: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    maxWidth: '55%',
    textAlign: 'right',
  },
  error: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
});
