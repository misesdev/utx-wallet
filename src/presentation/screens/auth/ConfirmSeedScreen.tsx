import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildSeedChallenge, validateSeedChallenge, type SeedChallenge } from '../../../core/domain/utils/seedChallenge';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppLoading } from '../../components/base/AppLoading';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { useTheme } from '../../hooks/useTheme';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function ConfirmSeedScreen() {
  const { words, save, isLoading, error } = useCreateWallet();

  const challenge = useMemo<SeedChallenge>(
    () => buildSeedChallenge(words),
    // Generated once — words don't change during this screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

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
    <AppScreen title="Confirm your seed" subtitle="Tap the correct words in order">
      <AppCard>
        <AppText variant="label" color="muted">
          Select the words for positions:{' '}
          {challenge.positions.map(p => `#${p + 1}`).join(', ')}
        </AppText>

        <View style={styles.row}>
          {challenge.positions.map((pos, i) => (
            <SlotChip
              key={pos}
              label={`#${pos + 1}`}
              word={selected[i]}
              onRemove={selected[i] ? () => handleRemoveSlot(i) : undefined}
            />
          ))}
        </View>

        {allFilled && !isValid && (
          <AppText variant="caption" color="danger">
            Incorrect order. Tap a filled slot to remove it and try again.
          </AppText>
        )}
      </AppCard>

      <View style={styles.row}>
        {challenge.options.map(word => (
          <WordChip
            key={word}
            word={word}
            disabled={usedOptions.has(word)}
            onPress={() => handleSelectWord(word)}
          />
        ))}
      </View>

      {error ? (
        <AppText variant="caption" color="danger" style={styles.centred}>
          {error}
        </AppText>
      ) : null}

      {isLoading ? (
        <AppLoading label="Creating wallet…" />
      ) : (
        <AppButton
          title="Confirm & create wallet"
          onPress={save}
          disabled={!isValid || isLoading}
        />
      )}
    </AppScreen>
  );
}

type SlotChipProps = {
  label: string;
  word?: string;
  onRemove?: () => void;
};

function SlotChip({ label, word, onRemove }: SlotChipProps) {
  const { theme } = useTheme();
  return (
    <AppButton
      title={word ? `${label} · ${word}` : label}
      variant={word ? 'secondary' : 'ghost'}
      size="sm"
      onPress={onRemove}
      disabled={!onRemove}
      style={[
        styles.chip,
        word ? { borderColor: theme.colors.accent } : undefined,
      ]}
    />
  );
}

type WordChipProps = {
  word: string;
  disabled: boolean;
  onPress: () => void;
};

function WordChip({ word, disabled, onPress }: WordChipProps) {
  return (
    <AppButton
      title={word}
      variant="secondary"
      size="sm"
      onPress={onPress}
      disabled={disabled}
      style={styles.chip}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: '45%',
    flexGrow: 1,
  },
  centred: {
    textAlign: 'center',
  },
});
