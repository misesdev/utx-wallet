import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';

type AppConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AppConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading,
  onConfirm,
  onCancel,
}: AppConfirmModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <AppText variant="subtitle" testID="confirm-modal-title">
            {title}
          </AppText>
          <AppText variant="body" color="muted" testID="confirm-modal-message">
            {message}
          </AppText>

          <View style={styles.actions}>
            <AppButton
              title={cancelLabel}
              variant="ghost"
              size="md"
              style={styles.flex}
              onPress={onCancel}
              disabled={isLoading}
              testID="confirm-modal-cancel"
            />
            <AppButton
              title={confirmLabel}
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              loading={isLoading}
              style={styles.flex}
              onPress={onConfirm}
              testID="confirm-modal-confirm"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flex: {
    flex: 1,
  },
});
