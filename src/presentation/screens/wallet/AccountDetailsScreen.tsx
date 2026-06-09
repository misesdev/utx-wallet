import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { TransactionItem } from '../../components/wallet/TransactionItem';
import { useAccountSummaries } from '../../hooks/useAccountSummaries';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import type { AppStackParamList } from '../../../app/navigation/routes';
import { AppRoutes } from '../../../app/navigation/routes';

type AccountDetailsRoute = RouteProp<AppStackParamList, typeof AppRoutes.AccountDetails>;

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

type RenameModalProps = {
  visible: boolean;
  initialName: string;
  error: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

function RenameModal({ visible, initialName, error, onClose, onConfirm }: RenameModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [name, setName] = useState(initialName);

  React.useEffect(() => setName(initialName), [initialName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.borderHighlight,
              borderRadius: theme.radii.xl,
            },
            theme.shadows.elevated,
          ]}
        >
          <AppText variant="subtitle" style={styles.modalTitle}>{t('accountDetails.renameTitle')}</AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('accountDetails.renamePlaceholder')}
            placeholderTextColor={theme.colors.textFaint}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
              },
            ]}
            autoFocus
            maxLength={32}
            testID="account-rename-input"
          />
          {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
          <View style={styles.modalActions}>
            <AppButton title={t('common.cancel')} variant="ghost" onPress={onClose} />
            <AppButton title={t('common.save')} onPress={() => onConfirm(name)} testID="account-rename-save" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AccountDetailsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<AccountDetailsRoute>();
  const { selectedWallet, listTransactions } = useWallet();
  const { renameAddressOrigin } = useAddressManager();
  const { summaries, isLoading, reload } = useAccountSummaries();
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof listTransactions>>>([]);

  const account = summaries.find(summary => summary.id === route.params.originId) ?? null;

  React.useEffect(() => {
    if (!selectedWallet) return;
    listTransactions(selectedWallet.id)
      .then(list => setTransactions(list.filter(tx => tx.originId === route.params.originId)))
      .catch(() => setTransactions([]));
  }, [selectedWallet, listTransactions, route.params.originId]);

  async function handleRename(name: string) {
    setIsRenaming(true);
    setRenameError('');
    try {
      await renameAddressOrigin(route.params.originId, name);
      setRenameVisible(false);
      await reload();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : t('accountDetails.renameError'));
    } finally {
      setIsRenaming(false);
    }
  }

  const title = account?.name ?? t('accountDetails.title');
  const confirmed = account?.confirmedBalanceSats ?? 0;
  const pending = account?.pendingBalanceSats ?? 0;
  const btc = useMemo(() => (confirmed / 100_000_000).toFixed(8), [confirmed]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle} numberOfLines={1}>{title}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('accountDetails.rename')}
          onPress={() => setRenameVisible(true)}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="account-rename-button"
        >
          <AppIcon name="edit" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><AppLoading label={t('common.loadingAccounts')} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        >
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.xl,
              },
            ]}
          >
            <AppText variant="label" color="muted">{t('accountDetails.balance')}</AppText>
            <View style={styles.balanceRow}>
              <AppText variant="display" style={styles.balanceValue} testID="account-balance">
                {formatSats(confirmed)}
              </AppText>
              <AppText variant="subtitle" color="muted" style={styles.balanceUnit}>{t('common.sats')}</AppText>
            </View>
            <AppText variant="body" color="muted">≈ {btc} BTC</AppText>
            {pending > 0 && (
              <AppText variant="caption" color="warning">{t('accountDetails.pending', { sats: formatSats(pending) })}</AppText>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">{t('accountDetails.transactions')}</AppText>
          </View>

          {transactions.length === 0 ? (
            <AppEmptyState
              icon="transactions"
              title={t('accountDetails.noTransactions')}
              description={t('accountDetails.noTransactionsDesc')}
            />
          ) : (
            <View style={styles.list}>
              {transactions.map(tx => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => navigation.navigate(AppRoutes.TransactionDetails, { txid: tx.txid ?? tx.id })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <RenameModal
        visible={renameVisible}
        initialName={account?.name ?? ''}
        error={renameError}
        onClose={() => { if (!isRenaming) setRenameVisible(false); }}
        onConfirm={handleRename}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  balanceCard: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
    padding: 22,
  },
  balanceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 50,
  },
  balanceUnit: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 2,
  },
  list: {
    gap: 8,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    borderWidth: 1,
    gap: 14,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
