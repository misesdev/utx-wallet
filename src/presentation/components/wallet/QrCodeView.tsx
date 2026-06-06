import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../hooks/useTheme';

type QrCodeViewProps = {
  value: string;
  size?: number;
  testID?: string;
};

export function QrCodeView({ value, size = 220, testID }: QrCodeViewProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg }]}
      testID={testID}
    >
      <QRCode
        value={value}
        size={size}
        color={theme.colors.text}
        backgroundColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    padding: 16,
  },
});
