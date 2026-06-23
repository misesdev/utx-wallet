import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { AppButton } from '../../components/base/AppButton';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useReauthenticate } from '../../hooks/useReauthenticate';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { useWalletExport } from '../../hooks/useWalletExport';
import { AppRoutes } from '../../../app/navigation/routes';
import type { WalletExportFormat } from '../../../core/domain/usecases/wallet/ExportWalletKeyUseCase';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

const COIN_TYPE: Record<string, string> = {
  mainnet: "0'",
  testnet: "1'",
  testnet3: "1'",
  testnet4: "1'",
  regtest: "1'",
};

type FormatConfig = {
  format: WalletExportFormat;
  titleKey: string;
  descKey: string;
};

const FORMAT_CONFIGS: FormatConfig[] = [
  { format: 'mnemonic', titleKey: 'walletExport.formatMnemonic', descKey: 'walletExport.formatMnemonicDesc' },
  { format: 'xpriv', titleKey: 'walletExport.formatXpriv', descKey: 'walletExport.formatXprivDesc' },
  { format: 'xpub', titleKey: 'walletExport.formatXpub', descKey: 'walletExport.formatXpubDesc' },
  { format: 'wif', titleKey: 'walletExport.formatWif', descKey: 'walletExport.formatWifDesc' },
];

// ─── Zpub Account Picker Modal ────────────────────────────────────────────────

type ZpubPickerModalProps = {
  visible: boolean;
  origins: AddressOrigin[];
  isLoading: boolean;
  network: string;
  onClose: () => void;
  onExport: (accountIndex: number) => void;
};

function ZpubPickerModal({ visible, origins, isLoading, network, onClose, onExport }: ZpubPickerModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  const coinType = COIN_TYPE[network] ?? "0'";
  const activeOrigins = origins.filter(o => !o.archivedAt);

  function handleExport() {
    if (selected !== null) onExport(selected);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerModal,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.borderHighlight,
              borderRadius: theme.radii.xl,
              ...theme.shadows.elevated,
            },
          ]}
          onPress={() => undefined}
        >
          {/* Title */}
          <AppText variant="subtitle" style={styles.pickerTitle}>
            {t('walletExport.zpubPickerTitle' as any)}
          </AppText>

          {/* Info */}
          <View
            style={[
              styles.pickerInfoBox,
              {
                backgroundColor: theme.colors.accentMuted,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppIcon name="info" size={16} color={theme.colors.accent} />
            <AppText variant="caption" color="accent" style={styles.pickerInfoText}>
              {t('walletExport.zpubPickerInfo' as any)}
            </AppText>
          </View>

          {/* Account list */}
          {isLoading ? (
            <AppLoading />
          ) : (
            <View style={styles.pickerList}>
              {activeOrigins.map(origin => {
                const isSelected = selected === origin.accountIndex;
                return (
                  <Pressable
                    key={origin.id}
                    testID={`zpub-account-${origin.accountIndex}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(origin.accountIndex)}
                    style={[
                      styles.pickerItem,
                      {
                        backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        borderRadius: theme.radii.lg,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerItemIcon,
                        {
                          backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceMuted,
                          borderRadius: theme.radii.md,
                        },
                      ]}
                    >
                      <AppIcon
                        name={origin.type === 'default' ? 'wallet' : 'accounts'}
                        size={20}
                        color={isSelected ? '#fff' : theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.pickerItemBody}>
                      <AppText variant="body" style={styles.pickerItemName}>{origin.name}</AppText>
                      <AppText variant="caption" color="muted">
                        {`m/84'/${coinType}/${origin.accountIndex}'`}
                      </AppText>
                    </View>
                    {isSelected && (
                      <AppIcon name="check" size={20} color={theme.colors.accent} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={styles.pickerActions}>
            <AppButton title={t('common.cancel')} variant="ghost" onPress={onClose} />
            <AppButton
              title={t('walletExport.zpubPickerExport' as any)}
              onPress={handleExport}
              disabled={selected === null}
              testID="zpub-export-btn"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ExportWalletFormatScreen ─────────────────────────────────────────────────

export function ExportWalletFormatScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { selectedWallet } = useWallet();
  const { formats, loadingFormats, formatsError } = useWalletExport();
  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();
  const { getOrigins } = useAddressManager();

  const [zpubPickerVisible, setZpubPickerVisible] = useState(false);
  const [origins, setOrigins] = useState<AddressOrigin[]>([]);
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(false);

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  useEffect(() => {
    if (!selectedWallet) return;
    setIsLoadingOrigins(true);
    getOrigins(selectedWallet.id)
      .then(setOrigins)
      .catch(() => undefined)
      .finally(() => setIsLoadingOrigins(false));
  }, [selectedWallet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectFormat = async (format: WalletExportFormat) => {
    const ok = await requireAuth();
    if (!ok) return;
    if (format === 'xpub') {
      setZpubPickerVisible(true);
      return;
    }
    navigation.navigate(AppRoutes.ExportWalletKey, { format });
  };

  function handleZpubExport(accountIndex: number) {
    setZpubPickerVisible(false);
    navigation.navigate(AppRoutes.ExportWalletKey, { format: 'xpub', accountIndex });
  }

  const visibleConfigs = FORMAT_CONFIGS.filter(c => formats.includes(c.format));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />

      <ZpubPickerModal
        visible={zpubPickerVisible}
        origins={origins}
        isLoading={isLoadingOrigins}
        network={selectedWallet?.network ?? 'mainnet'}
        onClose={() => setZpubPickerVisible(false)}
        onExport={handleZpubExport}
      />

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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('walletExport.title')}</AppText>
          {selectedWallet && (
            <AppText variant="caption" color="muted" numberOfLines={1}>{selectedWallet.name}</AppText>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Security warning */}
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
              borderColor: theme.colors.danger + '55',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <AppIcon name="warning" size={22} color={theme.colors.danger} />
          <View style={styles.warningBody}>
            <AppText variant="label" color="danger" style={styles.warningTitle}>
              {t('walletExport.warningTitle')}
            </AppText>
            <AppText variant="caption" color="muted">{t('walletExport.warningBody')}</AppText>
          </View>
        </View>

        {/* Format picker */}
        <AppText variant="label" color="muted" style={styles.sectionLabel}>
          {t('walletExport.chooseFormat')}
        </AppText>

        {loadingFormats ? (
          <View style={styles.loadingWrap}>
            <AppLoading />
          </View>
        ) : formatsError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
                borderColor: theme.colors.danger + '44',
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <AppText variant="caption" color="danger">{formatsError}</AppText>
          </View>
        ) : (
          <View
            style={[
              styles.formatsCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            {visibleConfigs.map((cfg, idx) => (
              <React.Fragment key={cfg.format}>
                <Pressable
                  accessibilityRole="button"
                  testID={`format-${cfg.format}`}
                  onPress={() => handleSelectFormat(cfg.format)}
                  style={({ pressed }) => [styles.formatRow, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <View
                    style={[
                      styles.formatIcon,
                      { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.md },
                    ]}
                  >
                    <AppIcon name="key" size={22} color={theme.colors.accent} />
                  </View>
                  <View style={styles.formatBody}>
                    <AppText variant="body" style={styles.formatTitle}>{t(cfg.titleKey as any)}</AppText>
                    <AppText variant="caption" color="muted" numberOfLines={1}>{t(cfg.descKey as any)}</AppText>
                  </View>
                  <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
                </Pressable>
                {idx < visibleConfigs.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                )}
              </React.Fragment>
            ))}
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  warningCard: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  warningBody: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontWeight: '700',
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorCard: {
    borderWidth: 1,
    padding: 14,
  },
  formatsCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  formatRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formatIcon: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  formatBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  formatTitle: {
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },

  // Zpub picker modal
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pickerModal: {
    borderWidth: 1,
    gap: 16,
    padding: 24,
    width: '100%',
  },
  pickerTitle: {
    fontWeight: '700',
  },
  pickerInfoBox: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  pickerInfoText: {
    flex: 1,
    lineHeight: 18,
  },
  pickerList: {
    gap: 8,
  },
  pickerItem: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  pickerItemIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pickerItemBody: {
    flex: 1,
    gap: 3,
  },
  pickerItemName: {
    fontWeight: '600',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
});
