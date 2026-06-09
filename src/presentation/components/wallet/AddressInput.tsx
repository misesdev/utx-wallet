import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../base/AppText';
import { AppIcon } from '../base/AppIcon';
import { useTheme } from '../../hooks/useTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';

type AddressInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onQrScan?: () => void;
  placeholder?: string;
  testID?: string;
  error?: string | null;
};

export function AddressInput({ value, onChangeText, onQrScan, placeholder, testID, error }: AddressInputProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

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
          onPress={onQrScan}
          accessibilityRole="button"
          accessibilityLabel={t('qrScan.accessibilityLabel')}
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
          <AppIcon name="qrCode" size={22} color={theme.colors.textMuted} />
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
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: 46,
  },
});
