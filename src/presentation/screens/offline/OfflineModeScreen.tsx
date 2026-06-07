import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OfflineTransaction } from '../../../core/domain/entities/OfflineTransaction';
import { AppButton } from '../../components/base/AppButton';
import { AppInput } from '../../components/base/AppInput';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { useTheme } from '../../hooks/useTheme';
import { AppError } from '../../../core/application/errors/AppError';

// ---------------------------------------------------------------------------
// Offline tx item
// ---------------------------------------------------------------------------

type OfflineTxItemProps = {
  tx: OfflineTransaction;
  isOnline: boolean;
  onDelete: (id: string) => void;
  onBroadcast: (tx: OfflineTransaction) => Promise<void>;
};

function OfflineTxItem({ tx, isOnline, onDelete, onBroadcast }: OfflineTxItemProps) {
  const { theme } = useTheme();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: tx.rawHex });
    } catch {
      // user dismissed
    }
  }, [tx.rawHex]);

  const handleBroadcast = useCallback(async () => {
    setIsBroadcasting(true);
    setBroadcastError(null);
    try {
      await onBroadcast(tx);
    } catch (err) {
      setBroadcastError(err instanceof AppError ? err.message : 'Falha ao transmitir');
    } finally {
      setIsBroadcasting(false);
    }
  }, [tx, onBroadcast]);

  const handleDelete = useCallback(() => {
    Alert.alert('Remover', 'Remover esta transação salva?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => onDelete(tx.id) },
    ]);
  }, [tx.id, onDelete]);

  const shortDate = new Date(tx.createdAt).toLocaleString();

  return (
    <View
      style={[
        styles.txCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={styles.txRow}>
        <View style={styles.txInfo}>
          {tx.amountSats !== undefined && (
            <AppText variant="subtitle">
              {tx.amountSats.toLocaleString()}
              <AppText variant="caption" color="muted"> sats</AppText>
            </AppText>
          )}
          {tx.toAddress && (
            <AppText variant="caption" color="muted">
              → {tx.toAddress.slice(0, 14)}…{tx.toAddress.slice(-6)}
            </AppText>
          )}
          {tx.feeSats !== undefined && (
            <AppText variant="caption" color="muted">
              Fee: {tx.feeSats.toLocaleString()} sats
            </AppText>
          )}
          <AppText variant="caption" color="muted">{shortDate}</AppText>
        </View>
      </View>

      {broadcastError ? (
        <AppText variant="caption" color="danger">{broadcastError}</AppText>
      ) : null}

      <View style={styles.txActions}>
        <Pressable
          accessibilityRole="button"
          onPress={handleShare}
          style={({ pressed }) => [
            styles.actionChip,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="caption" color="muted">↑ Exportar</AppText>
        </Pressable>

        {isOnline && (
          <Pressable
            accessibilityRole="button"
            onPress={handleBroadcast}
            disabled={isBroadcasting}
            style={({ pressed }) => [
              styles.actionChip,
              {
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.accentMuted,
                borderRadius: theme.radii.md,
                opacity: pressed || isBroadcasting ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="caption" color="accent">
              {isBroadcasting ? '…' : '⇡ Transmitir'}
            </AppText>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.actionChip,
            {
              borderColor: theme.colors.danger,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="caption" color="danger">✕ Remover</AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Prepare form
// ---------------------------------------------------------------------------

type PrepareFormProps = {
  onSubmit: (toAddress: string, amountSats: number, feeRate: number) => Promise<void>;
  onCancel: () => void;
};

function PrepareForm({ onSubmit, onCancel }: PrepareFormProps) {
  const { theme } = useTheme();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseInt(amount, 10);
    const parsedFee = parseFloat(feeRate);
    if (!toAddress.trim()) { setError('Informe o endereço de destino'); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Valor inválido'); return; }
    if (isNaN(parsedFee) || parsedFee <= 0) { setError('Taxa inválida'); return; }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(toAddress.trim(), parsedAmount, parsedFee);
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Falha ao preparar transação');
    } finally {
      setIsLoading(false);
    }
  }, [toAddress, amount, feeRate, onSubmit]);

  return (
    <View
      style={[
        styles.formCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <AppText variant="subtitle" style={styles.formTitle}>Preparar transação offline</AppText>
      <AppInput
        placeholder="Endereço de destino"
        value={toAddress}
        onChangeText={setToAddress}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AppInput
        placeholder="Valor (sats)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      <AppInput
        placeholder="Taxa (sat/vB)"
        value={feeRate}
        onChangeText={setFeeRate}
        keyboardType="decimal-pad"
      />
      {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      <View style={styles.formActions}>
        <AppButton title="Cancelar" variant="ghost" size="sm" onPress={onCancel} style={styles.flex} />
        <AppButton
          title={isLoading ? 'Preparando…' : 'Preparar'}
          size="sm"
          disabled={isLoading}
          onPress={handleSubmit}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Import form
// ---------------------------------------------------------------------------

type ImportFormProps = {
  onSubmit: (rawHex: string) => Promise<void>;
  onCancel: () => void;
};

function ImportForm({ onSubmit, onCancel }: ImportFormProps) {
  const { theme } = useTheme();
  const [rawHex, setRawHex] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!rawHex.trim()) { setError('Cole o hex da transação'); return; }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(rawHex.trim());
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Hex inválido');
    } finally {
      setIsLoading(false);
    }
  }, [rawHex, onSubmit]);

  return (
    <View
      style={[
        styles.formCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <AppText variant="subtitle" style={styles.formTitle}>Importar transação assinada</AppText>
      <TextInput
        placeholder="Cole o hex da transação aqui…"
        placeholderTextColor={theme.colors.textMuted}
        value={rawHex}
        onChangeText={setRawHex}
        multiline
        numberOfLines={4}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.hexInput,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      />
      {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      <View style={styles.formActions}>
        <AppButton title="Cancelar" variant="ghost" size="sm" onPress={onCancel} style={styles.flex} />
        <AppButton
          title={isLoading ? 'Salvando…' : 'Salvar'}
          size="sm"
          disabled={isLoading}
          onPress={handleSubmit}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ActiveForm = 'prepare' | 'import' | null;

export function OfflineModeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const {
    isOnline,
    confirmedBalanceSats,
    pendingBalanceSats,
    hasLocalUtxos,
    transactions,
    offlineTransactions,
    isLoadingData,
    dataError,
    prepareTransaction,
    importRawHex,
    deleteOfflineTransaction,
    broadcastOfflineTransaction,
  } = useOfflineMode();

  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const handlePrepareSubmit = useCallback(
    async (toAddress: string, amountSats: number, feeRateSatsPerVByte: number) => {
      await prepareTransaction({ toAddress, amountSats, feeRateSatsPerVByte });
      setActiveForm(null);
    },
    [prepareTransaction],
  );

  const handleImportSubmit = useCallback(
    async (rawHex: string) => {
      await importRawHex(rawHex);
      setActiveForm(null);
    },
    [importRawHex],
  );

  const handleBroadcast = useCallback(
    async (tx: OfflineTransaction): Promise<void> => {
      await broadcastOfflineTransaction(tx);
    },
    [broadcastOfflineTransaction],
  );

  const handleDelete = useCallback(
    (id: string) => { deleteOfflineTransaction(id).catch(() => undefined); },
    [deleteOfflineTransaction],
  );

  const statusColor = isOnline ? theme.colors.success : theme.colors.warning ?? theme.colors.textMuted;

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
        <AppText variant="subtitle" style={styles.headerTitle}>Modo offline</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              borderColor: statusColor,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <AppText variant="caption" style={{ color: statusColor }}>
            {isOnline ? 'Online — dados locais + blockchain' : 'Offline — apenas dados locais'}
          </AppText>
        </View>

        {/* Balance */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <View style={styles.balanceRow}>
            <AppText variant="caption" color="muted">Saldo local confirmado</AppText>
            <AppText variant="subtitle" style={styles.balanceAmount}>
              {confirmedBalanceSats.toLocaleString()} sats
            </AppText>
          </View>
          {pendingBalanceSats > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.balanceRow}>
                <AppText variant="caption" color="muted">Pendente</AppText>
                <AppText variant="body" style={{ color: statusColor }}>
                  +{pendingBalanceSats.toLocaleString()} sats
                </AppText>
              </View>
            </>
          )}
        </View>

        {/* Loading */}
        {isLoadingData ? (
          <AppText variant="caption" color="muted" style={styles.center}>Carregando dados locais…</AppText>
        ) : null}

        {/* Error */}
        {dataError ? (
          <AppText variant="caption" color="danger" style={styles.center}>{dataError}</AppText>
        ) : null}

        {/* Local tx summary */}
        {transactions.length > 0 && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <AppText variant="body" style={styles.summaryTitle}>Histórico local</AppText>
            <AppText variant="caption" color="muted">
              {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''} armazenada{transactions.length !== 1 ? 's' : ''}
            </AppText>
          </View>
        )}

        {/* Offline tx list */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>Transações salvas</AppText>
          {offlineTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <AppText variant="body" color="muted" style={styles.center}>Nenhuma transação salva</AppText>
              <AppText variant="caption" color="muted" style={styles.center}>
                Prepare ou importe uma transação para transmiti-la depois.
              </AppText>
            </View>
          ) : (
            offlineTransactions.map(tx => (
              <OfflineTxItem
                key={tx.id}
                tx={tx}
                isOnline={isOnline}
                onDelete={handleDelete}
                onBroadcast={handleBroadcast}
              />
            ))
          )}
        </View>

        {/* Forms */}
        {activeForm === 'prepare' && (
          <PrepareForm
            onSubmit={handlePrepareSubmit}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeForm === 'import' && (
          <ImportForm
            onSubmit={handleImportSubmit}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {/* Main action buttons */}
        {activeForm === null && (
          <View style={styles.actions}>
            <AppButton
              title="◈ Preparar transação offline"
              variant="secondary"
              disabled={!hasLocalUtxos}
              onPress={() => setActiveForm('prepare')}
            />
            <AppButton
              title="↓ Importar hex assinado"
              variant="secondary"
              onPress={() => setActiveForm('import')}
            />
          </View>
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
  scroll: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Status
  statusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },

  // Balance
  balanceCard: {
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  balanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  balanceAmount: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // Summary
  summaryCard: {
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  summaryTitle: {
    fontWeight: '600',
  },

  // Section
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  emptyState: {
    borderWidth: 1,
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },

  // Offline tx card
  txCard: {
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  txRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txInfo: {
    flex: 1,
    gap: 3,
  },
  txActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  // Forms
  formCard: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  formTitle: {
    fontWeight: '700',
  },
  hexInput: {
    borderWidth: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    minHeight: 100,
    padding: 12,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },

  // Actions
  actions: {
    gap: 10,
  },

  // Utils
  center: {
    textAlign: 'center',
  },
});
