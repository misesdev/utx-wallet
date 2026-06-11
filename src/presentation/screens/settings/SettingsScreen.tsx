import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfirmModal } from '../../components/base/AppConfirmModal';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import type { IconName } from '../../../shared/icons/iconNames';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';

type WalletSettingsRoute = 'ViewSeed' | 'Addresses' | 'Utxos' | 'ExportWalletFormat';

type NavItem = {
  icon: IconName;
  titleKey: string;
  descKey: string;
  route: WalletSettingsRoute;
  testID?: string;
};

const WALLET_ITEMS: NavItem[] = [
  { icon: 'backup', titleKey: 'settings.viewSeed', descKey: 'settings.viewSeedDesc', route: 'ViewSeed', testID: 'settings-view-seed' },
  { icon: 'addresses', titleKey: 'settings.addresses', descKey: 'settings.addressesDesc', route: 'Addresses', testID: 'settings-addresses' },
  { icon: 'wallet', titleKey: 'settings.utxos', descKey: 'settings.utxosDesc', route: 'Utxos', testID: 'settings-utxos' },
  { icon: 'export', titleKey: 'settings.export', descKey: 'settings.exportDesc', route: 'ExportWalletFormat', testID: 'settings-export' },
];

type NavRowProps = {
  icon: IconName;
  title: string;
  description: string;
  testID?: string;
  onPress: () => void;
  isLast: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

function NavRow({ icon, title, description, testID, onPress, isLast, disabled, disabledReason }: NavRowProps) {
  const { theme } = useTheme();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        testID={testID}
        accessibilityState={{ disabled: disabled ?? false }}
        onPress={() => { if (!disabled) onPress(); }}
        style={[styles.navRow, disabled ? styles.navRowDisabled : undefined]}
      >
        <View style={[styles.navIcon, { backgroundColor: disabled ? theme.colors.surfaceMuted : theme.colors.accentMuted, borderRadius: theme.radii.md }]}>
          <AppIcon name={icon} size={22} color={disabled ? theme.colors.textFaint : theme.colors.accent} />
        </View>
        <View style={styles.navBody}>
          <AppText variant="body" style={[styles.navTitle, disabled ? { color: theme.colors.textFaint } : undefined]}>{title}</AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {disabled && disabledReason ? disabledReason : description}
          </AppText>
        </View>
        {disabled ? (
          <AppIcon name="safeMode" size={18} color={theme.colors.textFaint} />
        ) : (
          <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
        )}
      </Pressable>
      {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />}
    </>
  );
}

export function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { t } = useAppTranslation();
  const { selectedWallet, renameWallet, deleteWallet } = useWallet();
  const isWatchOnly = selectedWallet?.status === 'watch-only';

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function startEdit() {
    setEditName(selectedWallet?.name ?? '');
    setRenameError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setRenameError(null);
  }

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setRenameError(t('walletSettings.errorNameRequired'));
      return;
    }
    if (!selectedWallet) return;
    setIsSavingName(true);
    setRenameError(null);
    try {
      await renameWallet(selectedWallet.id, trimmed);
      setIsEditing(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setRenameError(msg);
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleDelete() {
    if (!selectedWallet) return;
    setIsDeleting(true);
    try {
      await deleteWallet(selectedWallet.id);
      navigation.reset({ index: 0, routes: [{ name: AppRoutes.WalletList }] });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('settings.walletTitle')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Wallet name card */}
        <View
          style={[
            styles.nameCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <View style={[styles.nameIconWrap, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.md }]}>
            <AppIcon name="wallet" size={22} color={theme.colors.accent} />
          </View>
          <View style={styles.nameBody}>
            {isEditing ? (
              <>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  style={[
                    styles.nameInput,
                    {
                      color: theme.colors.text,
                      borderColor: renameError ? theme.colors.danger : theme.colors.accent,
                      borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.surfaceMuted,
                    },
                  ]}
                  testID="wallet-name-input"
                  maxLength={48}
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
                  editable={!isSavingName}
                />
                {renameError ? (
                  <AppText variant="caption" color="danger" testID="rename-error">{renameError}</AppText>
                ) : null}
                <View style={styles.nameActions}>
                  <Pressable
                    onPress={cancelEdit}
                    style={({ pressed }) => [styles.nameActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    testID="rename-cancel"
                    accessibilityRole="button"
                  >
                    <AppText variant="caption" color="muted">{t('common.cancel')}</AppText>
                  </Pressable>
                  <Pressable
                    onPress={saveEdit}
                    disabled={isSavingName}
                    style={({ pressed }) => [
                      styles.nameActionBtn,
                      styles.nameSaveBtn,
                      { backgroundColor: theme.colors.accent, borderRadius: theme.radii.md, opacity: pressed ? 0.8 : 1 },
                    ]}
                    testID="rename-save"
                    accessibilityRole="button"
                  >
                    <AppText variant="caption" style={styles.nameSaveBtnText}>
                      {isSavingName ? t('common.loading') : t('common.save')}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppText variant="caption" color="muted">{t('walletSettings.walletName')}</AppText>
                <AppText variant="body" style={styles.walletNameText} testID="wallet-name-display">
                  {selectedWallet?.name ?? '—'}
                </AppText>
              </>
            )}
          </View>
          {!isEditing && (
            <Pressable
              onPress={startEdit}
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]}
              testID="rename-edit-btn"
              accessibilityRole="button"
              accessibilityLabel={t('walletSettings.editName')}
            >
              <AppIcon name="edit" size={20} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Network badge (read-only) */}
        {selectedWallet && (
          <View
            style={[
              styles.networkBadge,
              {
                backgroundColor: theme.colors.accentMuted,
                borderColor: theme.colors.accent + '44',
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppIcon name="network" size={16} color={theme.colors.accent} />
            <AppText variant="caption" style={{ color: theme.colors.accent }}>
              {selectedWallet.network}
            </AppText>
          </View>
        )}

        {/* Wallet actions group */}
        <View style={styles.group}>
          <AppText variant="label" color="muted" style={styles.groupLabel}>{t('settings.groupWallet')}</AppText>
          <View
            style={[
              styles.groupCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            {WALLET_ITEMS.map((item, idx) => {
              const itemDisabled = isWatchOnly && (item.route === 'ViewSeed' || item.route === 'ExportWalletFormat');
              return (
                <NavRow
                  key={item.route}
                  icon={item.icon}
                  title={t(item.titleKey as any)}
                  description={t(item.descKey as any)}
                  testID={item.testID}
                  onPress={() => navigation.navigate(AppRoutes[item.route])}
                  isLast={idx === WALLET_ITEMS.length - 1}
                  disabled={itemDisabled}
                  disabledReason={itemDisabled ? t('settings.watchOnlyDisabled' as any) : undefined}
                />
              );
            })}
          </View>
        </View>

        {/* Delete wallet */}
        <View style={styles.deleteSection}>
          <AppText variant="label" color="muted" style={styles.groupLabel}>{t('walletSettings.dangerZone')}</AppText>
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
                borderColor: theme.colors.danger + '66',
                borderRadius: theme.radii.lg,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            testID="delete-wallet-btn"
            accessibilityRole="button"
          >
            <View style={[styles.navIcon, { backgroundColor: theme.colors.dangerMuted, borderRadius: theme.radii.md }]}>
              <AppIcon name="trash" size={22} color={theme.colors.danger} />
            </View>
            <View style={styles.navBody}>
              <AppText variant="body" style={[styles.navTitle, { color: theme.colors.danger }]}>
                {t('walletSettings.deleteWallet')}
              </AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>
                {t('walletSettings.deleteWalletDesc')}
              </AppText>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <AppConfirmModal
        visible={showDeleteModal}
        title={t('walletList.deleteTitle')}
        message={t('walletList.deleteMessage', { name: selectedWallet?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </KeyboardAvoidingView>
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

  // Name card
  nameCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  nameIconWrap: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  nameBody: {
    flex: 1,
    gap: 4,
  },
  walletNameText: {
    fontWeight: '700',
  },
  nameInput: {
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nameActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  nameActionBtn: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nameSaveBtn: {
    elevation: 1,
  },
  nameSaveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  editBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  // Network badge
  networkBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  // Groups
  group: {
    gap: 8,
  },
  groupLabel: {
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  groupCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Nav rows
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navRowDisabled: {
    opacity: 0.45,
  },
  navIcon: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  navBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  navTitle: {
    fontWeight: '600',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },

  // Delete section
  deleteSection: {
    gap: 8,
    marginTop: 4,
  },
  deleteBtn: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
