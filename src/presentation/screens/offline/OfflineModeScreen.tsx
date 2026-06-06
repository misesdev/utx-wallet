import React, { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import type { OfflineTransaction } from '../../../core/domain/entities/OfflineTransaction';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppInput } from '../../components/base/AppInput';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { BalanceCard } from '../../components/wallet/BalanceCard';
import { useTheme } from '../../hooks/useTheme';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { AppError } from '../../../core/application/errors/AppError';

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
      // user dismissed — ignore
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

  const shortDate = new Date(tx.createdAt).toLocaleString();

  return (
    <AppCard>
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
          <AppText variant="caption" color="faint">{shortDate}</AppText>
        </View>
      </View>

      {broadcastError && (
        <AppText variant="caption" color="danger">{broadcastError}</AppText>
      )}

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
          onPress={() => onDelete(tx.id)}
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
    </AppCard>
  );
}

type PrepareFormProps = {
  onSubmit: (toAddress: string, amountSats: number, feeRate: number) => Promise<void>;
  onCancel: () => void;
};

function PrepareForm({ onSubmit, onCancel }: PrepareFormProps) {
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
    <AppCard>
      <AppText variant="subtitle">Preparar transação offline</AppText>
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
      {error && <AppText variant="caption" color="danger">{error}</AppText>}
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
    </AppCard>
  );
}

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
    <AppCard>
      <AppText variant="subtitle">Importar transação assinada</AppText>
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
      {error && <AppText variant="caption" color="danger">{error}</AppText>}
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
    </AppCard>
  );
}

type ActiveForm = 'prepare' | 'import' | null;

export function OfflineModeScreen() {
  const { theme } = useTheme();
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

  return (
    <AppScreen title="Modo Offline">
      <View
        style={[
          styles.statusBadge,
          {
            borderColor: isOnline ? theme.colors.success : theme.colors.warning,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.xl,
          },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isOnline ? theme.colors.success : theme.colors.warning },
          ]}
        />
        <AppText variant="caption" color={isOnline ? 'success' : 'warning'}>
          {isOnline ? 'Online — dados locais + blockchain' : 'Offline — apenas dados locais'}
        </AppText>
      </View>

      <BalanceCard balanceSats={confirmedBalanceSats} label="Saldo local confirmado" />

      {pendingBalanceSats > 0 && (
        <AppCard>
          <View style={styles.row}>
            <AppText variant="caption" color="muted">Pendente</AppText>
            <AppText variant="body" color="warning">
              +{pendingBalanceSats.toLocaleString()} sats
            </AppText>
          </View>
        </AppCard>
      )}

      {isLoadingData ? (
        <AppLoading label="Carregando dados locais…" />
      ) : dataError ? (
        <AppEmptyState icon="⚠" title="Erro" description={dataError} />
      ) : null}

      {transactions.length > 0 && (
        <AppCard>
          <AppText variant="subtitle">Histórico local</AppText>
          <AppText variant="caption" color="muted">
            {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''} armazenada{transactions.length !== 1 ? 's' : ''}
          </AppText>
        </AppCard>
      )}

      <AppCard>
        <AppText variant="subtitle">Transações offline salvas</AppText>
        {offlineTransactions.length === 0 ? (
          <AppEmptyState
            icon="◌"
            title="Nenhuma transação salva"
            description="Prepare ou importe uma transação para transmiti-la depois."
          />
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
      </AppCard>

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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  hexInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  actions: {
    gap: 10,
  },
});
