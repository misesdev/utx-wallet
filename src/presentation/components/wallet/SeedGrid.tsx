import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../base/AppText';

type SeedGridProps = {
  words: string[];
};

export function SeedGrid({ words }: SeedGridProps) {
  const { theme } = useTheme();
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <View style={styles.grid}>
        {words.map((word, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.sm,
              },
            ]}
          >
            <AppText variant="caption" color="faint" style={styles.index}>
              {index + 1}
            </AppText>
            <AppText
              variant="label"
              style={[styles.word, !revealed && styles.hidden]}
              numberOfLines={1}
            >
              {revealed ? word : '••••••'}
            </AppText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setRevealed(v => !v)}
        style={({ pressed }) => [styles.revealBtn, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide seed words' : 'Reveal seed words'}
      >
        <AppText variant="caption" color="accent">
          {revealed ? 'Hide words' : 'Tap to reveal seed phrase'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  index: {
    minWidth: 16,
    textAlign: 'right',
  },
  word: {
    flex: 1,
    fontWeight: '600',
  },
  hidden: {
    letterSpacing: 2,
  },
  revealBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
});
