import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { AppIcon } from '../base/AppIcon';
import { AppText } from '../base/AppText';
import { AppButton } from '../base/AppButton';

export type WalletSetupStep = 'importing' | 'discovering' | 'syncing' | 'done' | 'error';

type Props = {
  visible: boolean;
  currentStep: WalletSetupStep;
  subMessage?: string;
  error?: string;
  onDone?: () => void;
  onRetry?: () => void;
};

type StepState = 'pending' | 'active' | 'done';

function getStepState(stepIndex: number, currentStep: WalletSetupStep): StepState {
  const stepOrder: WalletSetupStep[] = ['importing', 'discovering', 'syncing', 'done'];
  const currentIndex = stepOrder.indexOf(currentStep);

  if (currentStep === 'error') {
    return stepIndex <= 0 ? 'done' : 'pending';
  }
  if (currentIndex < 0) return 'pending';
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

type StepRowProps = {
  label: string;
  state: StepState;
};

function StepRow({ label, state }: StepRowProps) {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'active') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [state, spinValue]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const indicatorColor =
    state === 'done'
      ? theme.colors.success
      : state === 'active'
        ? theme.colors.accent
        : theme.colors.textMuted;

  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIndicator, { borderColor: indicatorColor, borderRadius: theme.radii.xl }]}>
        {state === 'done' ? (
          <AppIcon name="check" size={16} color={theme.colors.success} />
        ) : state === 'active' ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </Animated.View>
        ) : (
          <View style={[styles.pendingDot, { backgroundColor: theme.colors.textMuted }]} />
        )}
      </View>
      <AppText
        variant="body"
        style={[
          styles.stepLabel,
          state === 'done' && styles.stepLabelDone,
          state === 'active' && styles.stepLabelActive,
          state === 'pending' && styles.stepLabelPending,
          { color: state === 'done' ? theme.colors.success : state === 'active' ? theme.colors.text : theme.colors.textMuted },
        ]}
      >
        {label}
      </AppText>
    </View>
  );
}

export function WalletSetupProgressModal({
  visible,
  currentStep,
  subMessage,
  error,
  onDone,
  onRetry,
}: Props) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const isDone = currentStep === 'done';
  const isError = currentStep === 'error';

  const steps = [
    { label: t('walletSetup.step1Label'), index: 0 },
    { label: t('walletSetup.step2Label'), index: 1 },
    { label: t('walletSetup.step3Label'), index: 2 },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={undefined}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isError ? theme.colors.danger : theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            {isDone ? (
              <AppIcon name="success" size={32} color={theme.colors.success} />
            ) : isError ? (
              <AppIcon name="error" size={32} color={theme.colors.danger} />
            ) : (
              <AppIcon name="wallet" size={32} color={theme.colors.accent} />
            )}
            <AppText variant="subtitle" style={styles.cardTitle}>
              {isDone
                ? t('walletSetup.done')
                : isError
                  ? t('walletSetup.errorTitle')
                  : t('walletSetup.settingUpTitle')}
            </AppText>
            <AppText variant="caption" color="muted" style={styles.cardSubtitle}>
              {isDone
                ? t('walletSetup.doneDesc')
                : isError
                  ? (error ?? t('walletSetup.errorDesc'))
                  : ''}
            </AppText>
          </View>

          {/* Steps */}
          {!isDone && (
            <View
              style={[
                styles.stepsContainer,
                { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.lg },
              ]}
            >
              {steps.map((step) => (
                <StepRow
                  key={step.index}
                  label={step.label}
                  state={getStepState(step.index, currentStep)}
                />
              ))}
            </View>
          )}

          {/* Sub-message: granular progress detail */}
          {!isDone && !isError && subMessage ? (
            <AppText
              variant="caption"
              color="muted"
              style={styles.subMessage}
              testID="wallet-setup-sub-message"
            >
              {subMessage}
            </AppText>
          ) : null}

          {/* Actions */}
          {isDone && onDone ? (
            <AppButton
              title={t('common.close')}
              variant="primary"
              onPress={onDone}
              testID="wallet-setup-done-btn"
            />
          ) : isError && onRetry ? (
            <View style={styles.errorActions}>
              <AppButton
                title={t('walletSetup.retry')}
                variant="secondary"
                onPress={onRetry}
                testID="wallet-setup-retry-btn"
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    gap: 20,
    padding: 24,
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSubtitle: {
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 10,
  },
  stepIndicator: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  pendingDot: {
    borderRadius: 99,
    height: 6,
    width: 6,
  },
  stepLabel: {
    flex: 1,
  },
  stepLabelActive: {
    fontWeight: '600',
  },
  stepLabelDone: {
    fontWeight: '400',
  },
  stepLabelPending: {
    fontWeight: '400',
  },
  errorActions: {
    gap: 10,
  },
  subMessage: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
