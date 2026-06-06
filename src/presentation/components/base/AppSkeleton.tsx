import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type AppSkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppSkeleton({ width = '100%', height = 16, radius, style, testID }: AppSkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: theme.colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonBalanceCard() {
  return (
    <React.Fragment>
      <AppSkeleton width="40%" height={12} />
      <AppSkeleton width="70%" height={40} />
      <AppSkeleton width="50%" height={12} />
    </React.Fragment>
  );
}

export function SkeletonTransactionItem() {
  return (
    <React.Fragment>
      <AppSkeleton width="60%" height={14} />
      <AppSkeleton width="35%" height={12} />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flexShrink: 0,
  },
});
