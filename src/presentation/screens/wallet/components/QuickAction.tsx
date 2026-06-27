import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { IconName } from '../../../../shared/icons/iconNames';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useTheme } from '../../../hooks/useTheme';

export type QuickActionProps = {
  icon: IconName;
  label: string;
  a11yLabel?: string;
  onPress: () => void;
  accentColor?: string;
};

export function QuickAction({ icon, label, a11yLabel, onPress, accentColor }: QuickActionProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.circle,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.borderHighlight,
          },
        ]}
      >
        <AppIcon name={icon} size={28} color={accentColor ?? theme.colors.text} />
      </View>
      <AppText variant="caption" color="muted" style={styles.label}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    gap: 8,
    width: 76,
  },
  circle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  label: {
    textAlign: 'center',
  },
});
