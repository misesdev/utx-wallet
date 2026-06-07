import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { AppButton } from '../../components/base/AppButton';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useTheme } from '../../hooks/useTheme';
import { useTransactionDetails } from '../../hooks/useTransactionDetails';
import type { TransactionDetail } from '../../../core/domain/entities/TransactionDetail';
import type { AppStackParamList } from '../../../app/navigation/routes';

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

type TxCardProps = { tx: TransactionDetail };

function TxCard({ tx }: TxCardProps) {
  const { theme } = useTheme();

  const isIncoming = tx.direction === 'incoming';
  const accentColor = isIncoming ? theme.colors.success : theme.colors.text;
  const iconBg = isIncoming ? theme.colors.successMuted : theme.colors.surfaceMuted;
  const iconColor = isIncoming ? theme.colors.success : theme.colors.textMuted;

  const statusColors: Record<string, string> = {
    confirmed: theme.colors.success,
    pending: theme.colors.warning,
    failed: theme.colors.danger,
  };
  const statusColor = statusColors[tx.status] ?? theme.colors.textMuted;
  const statusLabel = tx.isConfirmed ? 'Confirmado' : 'Pendente';

  function copyTxid() {
    if (tx.txid) Clipboard.setString(tx.txid);
  }

  function openExplorer() {
    if (tx.explorerUrl) Linking.openURL(tx.explorerUrl);
  }

  return (
    <View
      testID={`tx-item-${tx.id}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xl,
        },
      ]}
    >
      {/* Hero: direction icon + amount */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: iconBg, borderRadius: theme.radii.lg }]}>
          <AppText style={[styles.heroArrow, { color: iconColor }]}>
            {isIncoming ? '↙' : '↗'}
          </AppText>
        </View>

        <AppText
          variant="body"
          style={[styles.heroDirection, { color: isIncoming ? theme.colors.success : theme.colors.textMuted }]}
          testID={`tx-direction-${tx.id}`}
        >
          {isIncoming ? 'Recebido' : 'Enviado'}
        </AppText>

        <AppText
          variant="display"
          style={[styles.heroAmount, { color: accentColor }]}
          testID={`tx-amount-${tx.id}`}
        >
          {isIncoming ? '+' : '−'}{formatSats(tx.amountSats)}
        </AppText>
        <AppText variant="body" color="muted">sats</AppText>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '22', borderColor: statusColor + '44', borderRadius: theme.radii.xl },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <AppText variant="label" style={{ color: statusColor }} testID={`tx-status-${tx.id}`}>
            {statusLabel}
          </AppText>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* Metadata rows */}
      <View style={styles.meta}>
        {tx.feeSats !== undefined && tx.feeSats > 0 && (
          <View style={styles.metaRow}>
            <AppText variant="caption" color="muted">Taxa de rede</AppText>
            <AppText variant="caption" testID={`tx-fee-${tx.id}`}>
              {formatSats(tx.feeSats)} sats
            </AppText>
          </View>
        )}

        <View style={styles.metaRow}>
          <AppText variant="caption" color="muted">Data</AppText>
          <AppText variant="caption" testID={`tx-date-${tx.id}`}>
            {formatDate(tx.createdAt)}
          </AppText>
        </View>

        {tx.blockHeight !== undefined && (
          <View style={styles.metaRow}>
            <AppText variant="caption" color="muted">Bloco</AppText>
            <AppText variant="caption" testID={`tx-block-${tx.id}`}>
              {tx.blockHeight.toLocaleString('pt-BR')}
            </AppText>
          </View>
        )}

        {tx.confirmations !== undefined && (
          <View style={styles.metaRow}>
            <AppText variant="caption" color="muted">Confirmações</AppText>
            <AppText variant="caption" testID={`tx-confirmations-${tx.id}`}>
              {tx.confirmations}
            </AppText>
          </View>
        )}

        {tx.txid && (
          <View style={styles.metaRow}>
            <AppText variant="caption" color="muted">TxID</AppText>
            <Pressable
              onPress={copyTxid}
              testID={`tx-copy-txid-${tx.id}`}
              accessibilityRole="button"
              accessibilityLabel="Copy transaction ID"
              style={({ pressed }) => [styles.txidBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <AppText variant="caption" color="accent" style={styles.txidText}>
                {truncateTxid(tx.txid)}
              </AppText>
              <AppText variant="label" color="accent">⎘</AppText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Explorer link */}
      {tx.explorerUrl ? (
        <Pressable
          onPress={openExplorer}
          testID={`tx-explorer-${tx.id}`}
          accessibilityRole="button"
          accessibilityLabel="View on block explorer"
          style={({ pressed }) => [
            styles.explorerBtn,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="body" color="accent" style={styles.explorerLabel}>
            Ver no Explorer ↗
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TransactionDetailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'TransactionDetails'>>();
  const { transactions, isLoading, error, refresh } = useTransactionDetails();

  const selectedTxid = route.params?.txid;
  const visible = selectedTxid
    ? transactions.filter(tx => tx.txid === selectedTxid || tx.id === selectedTxid)
    : transactions;
  const sorted = [...visible].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const title = selectedTxid ? 'Detalhes' : 'Histórico';

  return (
    <View
      testID="transaction-details-screen"
      style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
    >
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
        <AppText variant="subtitle" style={styles.headerTitle}>{title}</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Loading */}
      {isLoading && sorted.length === 0 && <AppLoading testID="app-loading" />}

      {/* Error */}
      {error && (
        <AppText color="danger" variant="caption" style={styles.center} testID="tx-error">
          {error}
        </AppText>
      )}

      {/* Empty */}
      {!isLoading && !error && sorted.length === 0 && (
        <AppEmptyState
          icon="↔"
          title={selectedTxid ? 'Transação não encontrada' : 'Sem transações'}
          description={
            selectedTxid
              ? 'Sincronize a carteira para atualizar os detalhes.'
              : 'Suas transações aparecerão aqui após sincronizar.'
          }
          testID="tx-empty"
        />
      )}

      {/* Transaction list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        {sorted.map(tx => <TxCard key={tx.id} tx={tx} />)}

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
      </ScrollView>
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
  center: {
    padding: 16,
    textAlign: 'center',
  },
  list: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Card
  card: {
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
    paddingBottom: 16,
  },

  // Hero section
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  heroIcon: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroArrow: {
    fontSize: 26,
  },
  heroDirection: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  statusBadge: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 16,
  },

  // Metadata
  meta: {
    gap: 12,
    paddingHorizontal: 20,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // TxID
  txidBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  txidText: {
    fontFamily: 'monospace',
    letterSpacing: 0.4,
  },

  // Explorer
  explorerBtn: {
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
  },
  explorerLabel: {
    fontWeight: '600',
  },
});
