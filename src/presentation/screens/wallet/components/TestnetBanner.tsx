import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

export function TestnetBanner() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View
      testID="testnet-banner"
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.warningMuted,
          borderColor: theme.colors.warning,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <AppIcon name="warning" size={15} color={theme.colors.warning} />
      <AppText variant="caption" style={[styles.text, { color: theme.colors.warning }]}>
        {t('home.testnetBanner' as any)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
});
