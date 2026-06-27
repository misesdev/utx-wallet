import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/base/AppText';
import { useTheme } from '../../../hooks/useTheme';

export type StatPillProps = {
  label: string;
  value: string;
  accent?: string;
  testID?: string;
  wide?: boolean;
};

export function StatPill({ label, value, accent, testID, wide }: StatPillProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.base, wide ? styles.wide : styles.narrow]} testID={testID}>
      <AppText
        variant="subtitle"
        style={[styles.value, { color: accent ?? theme.colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </AppText>
      <AppText variant="caption" color="muted" style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  wide: { flex: 2 },
  narrow: { flex: 1 },
  value: { fontWeight: '700' },
  label: { fontSize: 10, letterSpacing: 0.4 },
});
