import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../base/AppText';

type FormSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="subtitle">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="muted">{description}</AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  header: {
    gap: 4,
  },
});
