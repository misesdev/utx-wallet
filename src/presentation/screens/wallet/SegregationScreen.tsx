import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppEmptyState } from '../../components/base/AppEmptyState';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useAccountSummaries } from '../../hooks/useAccountSummaries';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';
import type { AccountSummary } from '../../../core/domain/services/AccountSummaryService';

const COIN_TYPE: Record<string, string> = {
  mainnet: "0'",
  testnet: "1'",
  testnet3: "1'",
  testnet4: "1'",
  regtest: "1'",
};

function derivationPath(coinType: string, accountIndex: number): string {
  return `m/84'/${coinType}/${accountIndex}'`;
}

type OriginCardProps = {
  origin: AddressOrigin | AccountSummary;
  coinType: string;
};

function OriginCard({ origin, coinType }: OriginCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDefault = origin.type === 'default';

  return (
    <View
      style={[
        styles.originCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: isDefault ? theme.colors.borderHighlight : theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View
        style={[
          styles.originIcon,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppIcon name={isDefault ? "wallet" : "accounts"} size={22} color={isDefault ? theme.colors.accent : theme.colors.textMuted} />
      </View>
      <View style={styles.originInfo}>
        <View style={styles.originNameRow}>
          <AppText variant="body" style={styles.originName}>{origin.name}</AppText>
          {isDefault && (
            <View
              style={[
                styles.defaultBadge,
                {
                  backgroundColor: theme.colors.accentMuted,
                  borderRadius: theme.radii.sm,
                },
              ]}
            >
              <AppText variant="label" color="accent">{t('segregation.default')}</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">
          {derivationPath(coinType, origin.accountIndex)}
        </AppText>
        {'confirmedBalanceSats' in origin && (
          <AppText variant="subtitle" style={styles.originBalance}>
            {origin.confirmedBalanceSats.toLocaleString()} {t('common.sats')}
          </AppText>
        )}
      </View>
    </View>
  );
}

type CreateModalProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

function CreateModal({ visible, isLoading, error, onClose, onConfirm }: CreateModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [name, setName] = useState('');

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length > 0) onConfirm(trimmed);
  }, [name, onConfirm]);

  const handleClose = useCallback(() => {
    setName('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.borderHighlight,
              borderRadius: theme.radii.xl,
            },
            theme.shadows.elevated,
          ]}
          onPress={() => undefined}
        >
          <AppText variant="subtitle" style={styles.modalTitle}>{t('segregation.modalTitle')}</AppText>
          <AppText variant="caption" color="muted" style={styles.modalDesc}>
            {t('segregation.modalDesc')}
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('segregation.modalPlaceholder')}
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
          />

          {error ? (
            <AppText variant="caption" color="danger" style={styles.errorText}>{error}</AppText>
          ) : null}

          <View style={styles.modalActions}>
            <AppButton title={t('common.cancel')} variant="ghost" onPress={handleClose} />
            <AppButton
              title={isLoading ? t('segregation.creating') : t('segregation.create')}
              onPress={handleConfirm}
              disabled={isLoading || name.trim().length === 0}
            />
          </View>

          {isLoading && <ActivityIndicator style={styles.spinner} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SegregationScreen() {
  const { getOrigins, createAddressOrigin } = useAddressManager();
  const { selectedWallet } = useWallet();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();

  const [origins, setOrigins] = useState<AddressOrigin[]>([]);
  const { summaries: accountSummaries, reload: reloadAccountSummaries } = useAccountSummaries();
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const walletNetwork = selectedWallet?.network ?? 'mainnet';
  const coinType = COIN_TYPE[walletNetwork] ?? "0'";
  const isWatchOnly = selectedWallet?.status === 'watch-only';

  const loadOrigins = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoadingOrigins(true);
    try {
      const list = await getOrigins(selectedWallet.id);
      setOrigins(list);
    } catch {
      // silent
    } finally {
      setIsLoadingOrigins(false);
    }
  }, [selectedWallet, getOrigins]);

  useEffect(() => {
    loadOrigins().catch(() => undefined);
  }, [loadOrigins]);

  const handleCreate = useCallback(async (name: string) => {
    if (!selectedWallet || isWatchOnly) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createAddressOrigin(selectedWallet.id, name, selectedWallet.network);
      setShowCreateModal(false);
      await loadOrigins();
      await reloadAccountSummaries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('segregation.errorCreate');
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  }, [selectedWallet, isWatchOnly, createAddressOrigin, loadOrigins, reloadAccountSummaries, t]);

  const infoButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.info')}
      onPress={() => navigation.navigate(AppRoutes.AccountPolicy)}
      style={({ pressed }) => [styles.infoBtn, { opacity: pressed ? 0.6 : 1 }]}
      testID="btn-account-policy"
    >
      <AppIcon name="info" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );

  return (
    <AppScreen title={t('segregation.title')} subtitle={t('segregation.subtitle')} rightAction={infoButton}>
      <View style={styles.infoCard}>
        <View
          style={[
            styles.infoInner,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <AppText variant="caption" color="muted">
            {t('segregation.info')}
          </AppText>
        </View>
      </View>

      {isLoadingOrigins ? (
        <AppText variant="caption" color="muted" style={styles.loadingText}>{t('common.loading')}</AppText>
      ) : origins.length === 0 ? (
        <AppEmptyState
          icon="accounts"
          title={t('segregation.empty')}
          description={t('segregation.emptyDesc')}
        />
      ) : (
        <View style={styles.originList}>
          {(accountSummaries.length > 0 ? accountSummaries : origins).map(o => (
            <OriginCard key={o.id} origin={o} coinType={coinType} />
          ))}
        </View>
      )}

      {isWatchOnly ? (
        <View
          style={[
            styles.watchOnlyNotice,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
          testID="segregation-watch-only-notice"
        >
          <AppIcon name="eye" size={20} color={theme.colors.textMuted} />
          <View style={styles.watchOnlyNoticeBody}>
            <AppText variant="body" style={styles.watchOnlyNoticeTitle}>
              {t('segregation.watchOnlyTitle' as any)}
            </AppText>
            <AppText variant="caption" color="muted">
              {t('segregation.watchOnlyDesc' as any)}
            </AppText>
          </View>
        </View>
      ) : null}

      <AppButton
        title={t('segregation.newButton')}
        onPress={() => { setCreateError(null); setShowCreateModal(true); }}
        disabled={isWatchOnly}
        testID="segregation-new-btn"
      />

      {!isWatchOnly && (
        <CreateModal
          visible={showCreateModal}
          isLoading={isCreating}
          error={createError}
          onClose={() => setShowCreateModal(false)}
          onConfirm={handleCreate}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  infoBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  infoCard: {
    marginBottom: 4,
  },
  infoInner: {
    borderWidth: 1,
    padding: 14,
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  originList: {
    gap: 10,
  },
  originCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  originIcon: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  originIconText: {
    fontSize: 20,
  },
  originInfo: {
    flex: 1,
    gap: 4,
  },
  originNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '600',
  },
  originBalance: {
    fontWeight: '700',
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
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
  modalDesc: {
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    marginTop: -6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  spinner: {
    marginTop: -8,
  },
  watchOnlyNotice: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  watchOnlyNoticeBody: {
    flex: 1,
    gap: 4,
  },
  watchOnlyNoticeTitle: {
    fontWeight: '600',
  },
});
