import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../base/AppIcon';
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
  onCancel?: () => void;
};

const PIN_LENGTH = 4;

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['cancel', '0', 'backspace'],
] as const;

const STEP_TITLE_KEYS: Record<PinModalStep, string> = {
  none: '',
  'set-new': 'pinModal.setNewTitle',
  'confirm-new': 'pinModal.confirmNewTitle',
  'verify-to-remove': 'pinModal.verifyToRemoveTitle',
  verify: 'pinModal.verifyTitle',
};

const STEP_SUBTITLE_KEYS: Record<PinModalStep, string> = {
  none: '',
  'set-new': 'pinModal.setNewSubtitle',
  'confirm-new': 'pinModal.confirmNewSubtitle',
  'verify-to-remove': 'pinModal.verifyToRemoveSubtitle',
  verify: 'pinModal.verifySubtitle',
};

export function PinInputModal({ visible, step, error, isSaving, onSubmit, onCancel }: PinInputModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens or step changes
  useEffect(() => {
    if (visible) {
      setPin('');
      setIsSubmitting(false);
    }
  }, [visible, step]);

  // Shake the PIN dots row when an error appears
  useEffect(() => {
    if (!error) return;
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [error, shakeAnim]);

  // Auto-submit when PIN_LENGTH digits are collected
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || isSaving || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(pin)
      .catch(() => {})
      .finally(() => {
        setPin('');
        setIsSubmitting(false);
      });
  }, [pin, isSaving, isSubmitting, onSubmit]);

  const handleKey = useCallback(
    (key: string) => {
      if (isSaving || isSubmitting) return;
      if (key === 'backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (pin.length < PIN_LENGTH) {
        setPin(prev => prev + key);
      }
    },
    [isSaving, isSubmitting, pin.length],
  );

  const dotFilledStyle = isSubmitting
    ? { backgroundColor: theme.colors.textMuted, borderColor: theme.colors.border }
    : { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent };
  const dotEmptyStyle = { backgroundColor: 'transparent' as const, borderColor: theme.colors.border };

  // Error is hidden while the user is typing or submitting to avoid confusion
  const showError = Boolean(error) && !isSubmitting && pin.length === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.xl }]}>
            <AppIcon name="security" size={32} color={theme.colors.accent} />
          </View>

          {/* Title + subtitle */}
          <AppText variant="subtitle" style={styles.title}>
            {STEP_TITLE_KEYS[step] ? t(STEP_TITLE_KEYS[step] as any) : ''}
          </AppText>
          <AppText variant="body" color="muted" style={styles.subtitle}>
            {STEP_SUBTITLE_KEYS[step] ? t(STEP_SUBTITLE_KEYS[step] as any) : ''}
          </AppText>

          {/* Dots — shake on error */}
          <Animated.View
            style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}
            testID="pin-dots"
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length ? dotFilledStyle : dotEmptyStyle]}
              />
            ))}
          </Animated.View>

          {/* Error — only visible when pin is empty and not submitting */}
          {showError ? (
            <AppText variant="caption" color="danger" style={styles.errorText} testID="pin-error">
              {error}
            </AppText>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {/* Keypad */}
          <View style={styles.keypad} testID="pin-keypad">
            {KEYPAD_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keyRow}>
                {row.map(key => {
                  if (key === 'cancel') {
                    if (!onCancel) {
                      return <View key={key} style={styles.key} />;
                    }
                    return (
                      <Pressable
                        key={key}
                        onPress={onCancel}
                        style={({ pressed }) => [styles.key, { opacity: pressed ? 0.6 : 1 }]}
                        testID="pin-cancel"
                        accessibilityRole="button"
                        accessibilityLabel={t('common.cancel')}
                      >
                        <AppText variant="caption" color="muted">{t('common.cancel')}</AppText>
                      </Pressable>
                    );
                  }

                  if (key === 'backspace') {
                    return (
                      <Pressable
                        key={key}
                        onPress={() => handleKey('backspace')}
                        style={({ pressed }) => [
                          styles.key,
                          styles.keyDigit,
                          {
                            backgroundColor: theme.colors.surfaceRaised,
                            borderRadius: theme.radii.xl,
                            opacity: isSubmitting ? 0.4 : pressed ? 0.7 : 1,
                          },
                        ]}
                        testID="pin-backspace"
                        accessibilityRole="button"
                        accessibilityLabel="apagar"
                        disabled={isSubmitting}
                      >
                        <AppIcon name="back" size={20} color={theme.colors.text} />
                      </Pressable>
                    );
                  }

                  const isDisabled = pin.length >= PIN_LENGTH || isSaving || isSubmitting;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleKey(key)}
                      disabled={isDisabled}
                      style={({ pressed }) => [
                        styles.key,
                        styles.keyDigit,
                        {
                          backgroundColor: theme.colors.surfaceRaised,
                          borderRadius: theme.radii.xl,
                          opacity: isDisabled || pressed ? 0.4 : 1,
                        },
                      ]}
                      testID={`pin-key-${key}`}
                      accessibilityRole="button"
                      accessibilityLabel={key}
                    >
                      <AppText variant="subtitle" style={styles.keyText}>
                        {key}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const KEY_SIZE = 70;

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  iconWrap: {
    alignItems: 'center',
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 8,
  },
  dot: {
    borderRadius: 12,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  errorText: {
    minHeight: 18,
    textAlign: 'center',
  },
  errorPlaceholder: {
    height: 18,
  },
  keypad: {
    gap: 14,
    marginTop: 4,
    width: '100%',
  },
  keyRow: {
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
  },
  key: {
    alignItems: 'center',
    height: KEY_SIZE,
    justifyContent: 'center',
    width: KEY_SIZE,
  },
  keyDigit: {
    elevation: 2,
  },
  keyText: {
    fontWeight: '600',
  },
});
