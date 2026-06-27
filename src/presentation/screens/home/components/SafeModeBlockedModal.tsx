import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import type { BitcoinNetwork } from '../../../../core/domain/entities/Network';
import { AppButton } from '../../../components/base/AppButton';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

function networkDisplayName(network: BitcoinNetwork): string {
  if (network === 'mainnet') return 'Mainnet';
  return 'Testnet4';
}

export type SafeModeBlockedModalProps = {
  visible: boolean;
  walletNetwork: BitcoinNetwork;
  onDisableAndOpen: () => void;
  onManageNodes: () => void;
  onCancel: () => void;
};

export function SafeModeBlockedModal({
  visible,
  walletNetwork,
  onDisableAndOpen,
  onManageNodes,
  onCancel,
}: SafeModeBlockedModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const networkName = networkDisplayName(walletNetwork);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.warning,
              borderRadius: theme.radii.xl,
            },
          ]}
          testID="safe-mode-blocked-modal"
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.warningMuted, borderRadius: theme.radii.lg },
            ]}
          >
            <AppIcon name="safeMode" size={32} color={theme.colors.warning} />
          </View>

          <AppText variant="subtitle" style={styles.title} testID="safe-mode-blocked-title">
            {t('safeMode.walletBlocked')}
          </AppText>

          <AppText variant="body" color="muted" style={styles.desc} testID="safe-mode-blocked-desc">
            {t('safeMode.walletBlockedDesc', { network: networkName })}
          </AppText>

          <View style={styles.actions}>
            <AppButton
              title={t('safeMode.disableSafeModeAndOpen')}
              variant="primary"
              onPress={onDisableAndOpen}
              testID="btn-disable-safe-mode-and-open"
            />
            <AppButton
              title={t('safeMode.manageNodes')}
              variant="secondary"
              onPress={onManageNodes}
              testID="btn-safe-mode-manage-nodes"
            />
            <AppButton
              title={t('common.cancel')}
              variant="ghost"
              onPress={onCancel}
              testID="btn-safe-mode-blocked-cancel"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
    maxWidth: 360,
    padding: 28,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    marginBottom: 4,
    width: 64,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
});
