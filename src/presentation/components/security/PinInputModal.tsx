import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { AppButton } from '../base/AppButton';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { PinModalStep } from '../../hooks/useSecuritySettings';

type PinInputModalProps = {
  visible: boolean;
  step: PinModalStep;
  error: string | null;
  isSaving?: boolean;
  onSubmit: (pin: string) => Promise<void>;
  onCancel: () => void;
};

const STEP_TITLE_KEYS: Record<PinModalStep, string> = {
  'none': '',
  'set-new': 'pinModal.setNewTitle',
  'confirm-new': 'pinModal.confirmNewTitle',
  'verify-to-remove': 'pinModal.verifyToRemoveTitle',
};

const STEP_SUBTITLE_KEYS: Record<PinModalStep, string> = {
  'none': '',
  'set-new': 'pinModal.setNewSubtitle',
  'confirm-new': 'pinModal.confirmNewSubtitle',
  'verify-to-remove': 'pinModal.verifyToRemoveSubtitle',
};

export function PinInputModal({ visible, step, error, isSaving, onSubmit, onCancel }: PinInputModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, step]);

  const handleConfirm = async () => {
    if (pin.length < 4 || isSaving) return;
    await onSubmit(pin);
    setPin('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppText variant="title">{STEP_TITLE_KEYS[step] ? t(STEP_TITLE_KEYS[step] as any) : ''}</AppText>
          <AppText variant="body" color="muted">{STEP_SUBTITLE_KEYS[step] ? t(STEP_SUBTITLE_KEYS[step] as any) : ''}</AppText>

          <View style={styles.dots}>
            {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < pin.length ? theme.colors.primary : theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={v => setPin(v.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            style={[styles.hiddenInput, { color: theme.colors.text }]}
            testID="pin-input"
          />

          {error ? (
            <AppText variant="caption" color="danger">{error}</AppText>
          ) : null}

          <View style={styles.actions}>
            <AppButton title={t('common.cancel')} variant="ghost" onPress={onCancel} />
            <AppButton
              title={isSaving ? t('common.loading') : t('common.confirm')}
              variant="primary"
              onPress={handleConfirm}
              disabled={pin.length < 4 || isSaving}
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  hiddenInput: {
    height: 0,
    width: 0,
    opacity: 0,
    position: 'absolute',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
