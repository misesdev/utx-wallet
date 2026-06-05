import React from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';
import { AppInput } from '../base/AppInput';
import { AppText } from '../base/AppText';

type FormInputProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function FormInput({ label, hint, error, ...props }: FormInputProps) {
  return (
    <View style={styles.root}>
      <AppText variant="label" color="muted">{label}</AppText>
      <AppInput {...props} />
      {hint && !error ? (
        <AppText variant="caption" color="faint">{hint}</AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color="danger">{error}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
});
