import React from 'react';
import IoniconBase from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../hooks/useTheme';
import { ICON_NAMES, type IconName } from '../../../shared/icons/iconNames';

type AppIconProps = {
  name: IconName;
  size?: number;
  color?: string;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Standardized icon component. Uses Ionicons internally.
 *
 * Usage:
 *   <AppIcon name="send" size={20} color={theme.colors.accent} />
 *
 * All icon names are defined in src/shared/icons/iconNames.ts.
 * Never import Ionicons directly in screens or feature components.
 */
export function AppIcon({
  name,
  size = 24,
  color,
  testID,
  accessibilityLabel,
}: AppIconProps) {
  const { theme } = useTheme();

  return (
    <IoniconBase
      name={ICON_NAMES[name]}
      size={size}
      color={color ?? theme.colors.text}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
