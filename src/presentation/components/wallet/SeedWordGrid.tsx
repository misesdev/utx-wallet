import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  words: string[];
  testID?: string;
};

export function SeedWordGrid({ words, testID }: Props) {
  const { theme } = useTheme();

  const rows: string[][] = [];
  for (let i = 0; i < words.length; i += 3) {
    rows.push(words.slice(i, i + 3));
  }

  return (
    <View style={styles.grid} testID={testID}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((word, j) => {
            const idx = ri * 3 + j;
            return (
              <View
                key={idx}
                style={[
                  styles.cell,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <AppText variant="caption" color="muted" style={styles.index}>
                  {idx + 1}
                </AppText>
                <AppText variant="body" style={styles.word} numberOfLines={1}>
                  {word}
                </AppText>
              </View>
            );
          })}
          {row.length < 3 &&
            Array.from({ length: 3 - row.length }, (_, k) => (
              <View key={`pad-${k}`} style={styles.cellPad} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cellPad: {
    flex: 1,
  },
  index: {
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'right',
  },
  word: {
    flex: 1,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
