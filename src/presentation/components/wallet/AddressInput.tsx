import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../base/AppText';
import { useTheme } from '../../hooks/useTheme';

type AddressInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  error?: string | null;
};

function handleQrScan() {
  Alert.alert('QR Scan', 'Camera scanning will be available in a future update.');
}

export function AddressInput({ value, onChangeText, placeholder, testID, error }: AddressInputProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? 'bc1q… or tb1q…'}
          placeholderTextColor={theme.colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={2}
          style={[styles.input, { color: theme.colors.text }]}
          testID={testID}
        />
        <Pressable
          onPress={handleQrScan}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
          testID="btn-qr-scan"
          style={({ pressed }) => [
            styles.qrBtn,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText style={[styles.qrIcon, { color: theme.colors.textMuted }]}>⬛</AppText>
          <AppText variant="label" color="muted">QR</AppText>
        </Pressable>
      </View>

      {error ? (
        <AppText variant="caption" color="danger" testID="address-error">{error}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  inputRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: 0.3,
    lineHeight: 20,
    minHeight: 44,
  },
  qrBtn: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 3,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 52,
  },
  qrIcon: {
    fontSize: 18,
  },
});
