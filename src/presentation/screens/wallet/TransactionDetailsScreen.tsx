import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useTransactionDetails } from '../../hooks/useTransactionDetails';
import type { TransactionDetail } from '../../../core/domain/entities/TransactionDetail';

function formatSats(sats: number): string {
  return sats.toLocaleString('pt-BR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateTxid(txid: string, chars = 8): string {
  if (txid.length <= chars * 2 + 3) return txid;
  return `${txid.slice(0, chars)}…${txid.slice(-chars)}`;
}

function directionLabel(direction: TransactionDetail['direction']): string {
  switch (direction) {
    case 'incoming': return 'Recebido';
    case 'outgoing': return 'Enviado';
    default: return 'Interno';
  }
}

function directionArrow(direction: TransactionDetail['direction']): string {
  switch (direction) {
    case 'incoming': return '↙';
    case 'outgoing': return '↗';
    default: return '↔';
  }
}

type TransactionItemProps = {
  tx: TransactionDetail;
};

function TransactionHistoryItem({ tx }: TransactionItemProps) {
  const { theme } = useTheme();

  const isIncoming = tx.direction === 'incoming';
  const amountColor = isIncoming ? theme.colors.success : theme.colors.text;
  const amountPrefix = isIncoming ? '+' : '−';

  const statusColor: Record<string, string> = {
    confirmed: theme.colors.success,
    pending: theme.colors.warning,
    failed: theme.colors.danger,
  };

  function copyTxid() {
    if (tx.txid) Clipboard.setString(tx.txid);
  }

  function openExplorer() {
    if (tx.explorerUrl) Linking.openURL(tx.explorerUrl);
  }

  return (
    <AppCard testID={`tx-item-${tx.id}`}>
      <View style={styles.row}>
        <View style={styles.left}>
          <AppText style={[styles.arrow, { color: isIncoming ? theme.colors.success : theme.colors.textMuted }]}>
            {directionArrow(tx.direction)}
          </AppText>
          <View>
            <AppText variant="body" style={styles.bold} testID={`tx-direction-${tx.id}`}>
              {directionLabel(tx.direction)}
            </AppText>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: statusColor[tx.status] ?? theme.colors.textMuted }]} />
              <AppText variant="caption" color="muted" testID={`tx-status-${tx.id}`}>
                {tx.isConfirmed ? 'Confirmado' : 'Pendente'}
              </AppText>
            </View>
          </View>
        </View>
        <AppText variant="subtitle" style={{ color: amountColor }} testID={`tx-amount-${tx.id}`}>
          {amountPrefix}{formatSats(tx.amountSats)}
          <AppText variant="caption" color="muted"> sats</AppText>
        </AppText>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.meta}>
        {tx.feeSats !== undefined && tx.feeSats > 0 && (
          <View style={styles.metaRow}>
            <AppText color="muted" variant="caption">Taxa</AppText>
            <AppText variant="caption" testID={`tx-fee-${tx.id}`}>{formatSats(tx.feeSats)} sats</AppText>
          </View>
        )}
        <View style={styles.metaRow}>
          <AppText color="muted" variant="caption">Data</AppText>
          <AppText variant="caption" testID={`tx-date-${tx.id}`}>{formatDate(tx.createdAt)}</AppText>
        </View>
        {tx.blockHeight !== undefined && (
          <View style={styles.metaRow}>
            <AppText color="muted" variant="caption">Bloco</AppText>
            <AppText variant="caption" testID={`tx-block-${tx.id}`}>{tx.blockHeight.toLocaleString('pt-BR')}</AppText>
          </View>
        )}
        {tx.confirmations !== undefined && (
          <View style={styles.metaRow}>
            <AppText color="muted" variant="caption">Confirmações</AppText>
            <AppText variant="caption" testID={`tx-confirmations-${tx.id}`}>{tx.confirmations}</AppText>
          </View>
        )}
        {tx.txid && (
          <View style={styles.metaRow}>
            <AppText color="muted" variant="caption">TxID</AppText>
            <Pressable onPress={copyTxid} testID={`tx-copy-txid-${tx.id}`} accessibilityRole="button">
              <AppText variant="caption" color="accent" style={styles.txid}>
                {truncateTxid(tx.txid)}
              </AppText>
            </Pressable>
          </View>
        )}
      </View>

      {tx.explorerUrl ? (
        <AppButton
          title="Ver no Explorer"
          variant="ghost"
          size="sm"
          onPress={openExplorer}
          testID={`tx-explorer-${tx.id}`}
        />
      ) : null}
    </AppCard>
  );
}

export function TransactionDetailsScreen() {
  const { transactions, isLoading, error, refresh } = useTransactionDetails();

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <AppScreen title="Histórico" testID="transaction-details-screen">
      {isLoading && transactions.length === 0 && <AppLoading testID="app-loading" />}

      {error && (
        <AppText color="danger" variant="caption" style={styles.center} testID="tx-error">
          {error}
        </AppText>
      )}

      {!isLoading && !error && sorted.length === 0 && (
        <AppEmptyState
          icon="↔"
          title="Sem transações"
          description="Suas transações aparecerão aqui após sincronizar."
          testID="tx-empty"
        />
      )}

      {sorted.map(tx => (
        <TransactionHistoryItem key={tx.id} tx={tx} />
      ))}

      {sorted.length > 0 && (
        <AppButton
          title="Atualizar"
          variant="ghost"
          size="md"
          onPress={refresh}
          disabled={isLoading}
          testID="btn-refresh"
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrow: {
    fontSize: 20,
  },
  bold: {
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  meta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txid: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  center: {
    textAlign: 'center',
  },
});
