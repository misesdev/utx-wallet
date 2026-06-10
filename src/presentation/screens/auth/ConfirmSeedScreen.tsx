import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildSeedChallenge, validateSeedChallenge, type SeedChallenge } from '../../../core/domain/utils/seedChallenge';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppRoutes } from '../../../app/navigation/routes';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { AppLoading } from '../../components/base/AppLoading';
import { WalletSetupProgressModal } from '../../components/wallet/WalletSetupProgressModal';
import type { WalletSetupStep } from '../../components/wallet/WalletSetupProgressModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function ConfirmSeedScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { words, save, isLoading, error, reset } = useCreateWallet();
  const { importSync } = useAddressManager();
  const { t } = useAppTranslation();

  const challenge = useMemo<SeedChallenge>(
    () => buildSeedChallenge(words),
    // Generated once — words don't change during this screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());
  const [setupStep, setSetupStep] = useState<WalletSetupStep>('importing');
  const [setupVisible, setSetupVisible] = useState(false);
  const [setupError, setSetupError] = useState<string | undefined>();
  const [subMessage, setSubMessage] = useState<string | undefined>();
  const didSave = useRef(false);

  React.useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  async function handleConfirmAndCreate() {
    if (didSave.current) return;
    didSave.current = true;

    setSetupStep('importing');
    setSetupError(undefined);
    setSubMessage(t('walletSetup.generatingKeys'));
    setSetupVisible(true);
    // Yield to the JS event loop so React flushes state and renders the modal
    // before CPU-intensive key derivation blocks the thread.
    await new Promise<void>(resolve => setTimeout(resolve, 32));

    const wallet = await save();
    if (!wallet) {
      didSave.current = false;
      setSetupVisible(false);
      return;
    }

    setSetupStep('discovering');
    setSubMessage(undefined);
    try {
      await importSync(wallet.id, wallet.network, (progress) => {
        if (progress.phase === 'syncing') {
          setSetupStep('syncing');
          setSubMessage(t('walletSetup.syncingChain'));
          return;
        }
        if (progress.txFound) {
          setSubMessage(t('walletSetup.foundActivity', { account: progress.accountIndex }));
        } else {
          setSubMessage(
            t('walletSetup.checkingAddress', {
              account: progress.accountIndex,
              index: progress.addressIndex + 1,
            }),
          );
        }
      });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : undefined);
      setSetupStep('error');
      return;
    }

    setSubMessage(undefined);
    setSetupStep('done');
  }

  function handleSetupDone() {
    reset();
    setSetupVisible(false);
    navigation.navigate(AppRoutes.WalletList);
  }

  function handleSetupRetry() {
    didSave.current = false;
    setSetupVisible(false);
  }

  function handleSelectWord(word: string) {
    if (selected.length >= challenge.positions.length) return;
    setSelected(prev => [...prev, word]);
    setUsedOptions(prev => new Set([...prev, word]));
  }

  function handleRemoveSlot(slotIndex: number) {
    const word = selected[slotIndex];
    setSelected(prev => prev.filter((_, i) => i !== slotIndex));
    setUsedOptions(prev => {
      const next = new Set(prev);
      next.delete(word);
      return next;
    });
  }

  const allFilled = selected.length === challenge.positions.length;
  const isValid = allFilled && validateSeedChallenge(words, challenge, selected);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <WalletSetupProgressModal
        visible={setupVisible}
        currentStep={setupStep}
        subMessage={subMessage}
        error={setupError}
        onDone={handleSetupDone}
        onRetry={handleSetupRetry}
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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('confirmSeed.title')}</AppText>
          <AppText variant="caption" color="muted">{t('confirmSeed.instruction')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Slots card */}
        <View
          style={[
            styles.slotsCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: isValid ? theme.colors.accent + '66' : theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.slotsHeader}>
            <AppText variant="label" color="muted">
              {t('confirmSeed.selectPositions', { positions: challenge.positions.map(p => `#${p + 1}`).join(', ') })}
            </AppText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.slots}>
            {challenge.positions.map((pos, i) => (
              <Pressable
                key={pos}
                accessibilityRole="button"
                onPress={selected[i] ? () => handleRemoveSlot(i) : undefined}
                style={({ pressed }) => [
                  styles.slot,
                  {
                    backgroundColor: selected[i]
                      ? theme.colors.accentMuted
                      : theme.colors.surfaceMuted,
                    borderColor: selected[i]
                      ? theme.colors.accent
                      : theme.colors.border,
                    borderRadius: theme.radii.md,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText variant="caption" color="muted" style={styles.slotPos}>
                  #{pos + 1}
                </AppText>
                {selected[i] ? (
                  <AppText variant="label" style={[styles.slotWord, { color: theme.colors.accent }]}>
                    {selected[i]}
                  </AppText>
                ) : (
                  <AppText variant="caption" color="muted" style={styles.slotEmpty}>___</AppText>
                )}
              </Pressable>
            ))}
          </View>

          {allFilled && !isValid && (
            <AppText variant="caption" color="danger" style={styles.validationError}>
              {t('confirmSeed.wrongOrder')}
            </AppText>
          )}
        </View>

        {/* Word options */}
        <View style={styles.options}>
          {challenge.options.map(word => {
            const used = usedOptions.has(word);
            return (
              <Pressable
                key={word}
                accessibilityRole="button"
                disabled={used}
                onPress={() => handleSelectWord(word)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: used ? theme.colors.surfaceMuted : theme.colors.surfaceRaised,
                    borderColor: used ? theme.colors.border : theme.colors.accent + '66',
                    borderRadius: theme.radii.md,
                    opacity: used ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={used ? styles.optionTextUsed : [styles.optionText, { color: theme.colors.accent }]}
                >
                  {word}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Error */}
        {error ? (
          <AppText variant="caption" color="danger" style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>

      {/* Sticky footer CTA */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {isLoading && !setupVisible ? (
          <AppLoading label={t('confirmSeed.creating')} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('confirmSeed.confirmCreate')}
            onPress={handleConfirmAndCreate}
            disabled={!isValid || isLoading}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: isValid ? theme.colors.accent : theme.colors.surfaceMuted,
                borderRadius: theme.radii.lg,
                opacity: pressed || !isValid ? (isValid ? 0.8 : 0.5) : 1,
              },
            ]}
          >
            <AppText
              variant="subtitle"
              style={isValid ? styles.ctaTextActive : styles.ctaTextInactive}
            >
              {t('confirmSeed.confirmCreate')}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
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

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Slots
  slotsCard: {
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  slotsHeader: {},
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: '44%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotPos: {
    fontWeight: '700',
  },
  slotWord: {
    fontWeight: '600',
  },
  slotEmpty: {
    letterSpacing: 2,
  },
  validationError: {
    textAlign: 'center',
  },

  // Options
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    borderWidth: 1,
    minWidth: '28%',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexGrow: 1,
  },
  optionText: {
    fontWeight: '600',
  },
  optionTextUsed: {
    fontWeight: '600',
  },

  // Error
  error: {
    textAlign: 'center',
  },

  // CTA
  cta: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ctaTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  ctaTextInactive: {
    fontWeight: '700',
  },
});
