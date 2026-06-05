import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppAssets } from '../../../shared/assets';
import { AppText } from './AppText';

type AppLogoSize = 'sm' | 'md' | 'lg';

type AppLogoProps = {
  size?: AppLogoSize;
  showName?: boolean;
};

const iconSizes: Record<AppLogoSize, number> = {
  sm: 36,
  md: 64,
  lg: 88,
};

const radiiFraction = 0.27;

export function AppLogo({ size = 'md', showName = true }: AppLogoProps) {
  const dim = iconSizes[size];
  const radius = Math.round(dim * radiiFraction);

  return (
    <View style={styles.root}>
      <Image
        source={AppAssets.icon}
        style={{ width: dim, height: dim, borderRadius: radius }}
        resizeMode="contain"
        accessibilityLabel="UTXWallet logo"
      />
      {showName && (
        <AppText
          variant={size === 'sm' ? 'caption' : size === 'md' ? 'subtitle' : 'title'}
          style={[
            styles.name,
            size === 'lg' && styles.nameLg,
          ]}
        >
          UTX Wallet
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 10,
  },
  name: {
    letterSpacing: -0.4,
    fontWeight: '700',
  },
  nameLg: {
    letterSpacing: -0.8,
  },
});
