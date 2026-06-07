import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import type { IconName } from '../../../shared/icons/iconNames';
import { useTheme } from '../../hooks/useTheme';

type AppEmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
};

export function AppEmptyState({ icon = 'empty', title, description, action, testID }: AppEmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.root} testID={testID}>
      <AppIcon name={icon} size={56} color={theme.colors.textFaint} testID={`${testID ?? 'empty-state'}-icon`} />
      <AppText variant="subtitle" style={styles.title}>{title}</AppText>
      {description ? (
        <AppText variant="caption" color="muted" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {action ? (
        <AppButton
          title={action.label}
          variant="secondary"
          size="sm"
          onPress={action.onPress}
          style={styles.action}
          testID={`${testID ?? 'empty-state'}-action`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },
  action: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
});
