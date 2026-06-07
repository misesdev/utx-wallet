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
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';

const COIN_TYPE: Record<string, string> = {
  mainnet: "0'",
  testnet: "1'",
  regtest: "1'",
};

function derivationPath(coinType: string, accountIndex: number): string {
  return `m/84'/${coinType}/${accountIndex}'`;
}

type OriginCardProps = {
  origin: AddressOrigin;
  coinType: string;
};

function OriginCard({ origin, coinType }: OriginCardProps) {
  const { theme } = useTheme();
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
        <AppText style={styles.originIconText}>{isDefault ? '◎' : '⊡'}</AppText>
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
              <AppText variant="label" color="accent">Default</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">
          {derivationPath(coinType, origin.accountIndex)}
        </AppText>
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
          <AppText variant="subtitle" style={styles.modalTitle}>New Segregation</AppText>
          <AppText variant="caption" color="muted" style={styles.modalDesc}>
            Each segregation is an independent BIP84 account with its own receive and change address pool.
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Savings, Exchange)"
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
            <AppButton title="Cancel" variant="ghost" onPress={handleClose} />
            <AppButton
              title={isLoading ? 'Creating…' : 'Create'}
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
  const { networkConfig } = useNetwork();
  const { theme } = useTheme();

  const [origins, setOrigins] = useState<AddressOrigin[]>([]);
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const coinType = COIN_TYPE[networkConfig.network] ?? "0'";

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
    if (!selectedWallet) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createAddressOrigin(selectedWallet.id, name, networkConfig.network);
      setShowCreateModal(false);
      await loadOrigins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create segregation';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  }, [selectedWallet, networkConfig.network, createAddressOrigin, loadOrigins]);

  return (
    <AppScreen title="Segregation" subtitle="Logical fund accounts">
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
            Each segregation is an independent BIP84 account (accountIndex). Funds in different segregations remain separate and never mix automatically.
          </AppText>
        </View>
      </View>

      {isLoadingOrigins ? (
        <AppText variant="caption" color="muted" style={styles.loadingText}>Loading…</AppText>
      ) : origins.length === 0 ? (
        <AppEmptyState
          icon="⊡"
          title="No segregations yet"
          description="Your Default account is created automatically when you first sync."
        />
      ) : (
        <View style={styles.originList}>
          {origins.map(o => (
            <OriginCard key={o.id} origin={o} coinType={coinType} />
          ))}
        </View>
      )}

      <AppButton
        title="+ New Segregation"
        onPress={() => { setCreateError(null); setShowCreateModal(true); }}
      />

      <CreateModal
        visible={showCreateModal}
        isLoading={isCreating}
        error={createError}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreate}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
});
