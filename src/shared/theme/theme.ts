import type { TextStyle, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
    textFaint: string;
    border: string;
    borderFocus: string;
    borderHighlight: string;
    primary: string;
    primaryText: string;
    accent: string;
    accentMuted: string;
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    danger: string;
    dangerMuted: string;
  };
  spacing: typeof spacing;
  typography: typeof typography;
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    card: ViewStyle;
    elevated: ViewStyle;
  };
  text: {
    display: TextStyle;
    title: TextStyle;
    subtitle: TextStyle;
    body: TextStyle;
    caption: TextStyle;
    label: TextStyle;
  };
};

export const baseTheme = {
  spacing,
  typography,
  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
  shadows: {
    card: {
      shadowColor: colors.black,
      shadowOpacity: 0.6,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    elevated: {
      shadowColor: colors.black,
      shadowOpacity: 0.8,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 16 },
      elevation: 12,
    },
  },
  text: {
    display: {
      fontSize: typography.sizes.display,
      fontWeight: typography.weights.bold,
      letterSpacing: typography.tracking.tight,
      lineHeight: 42,
    },
    title: {
      fontSize: typography.sizes.title,
      fontWeight: typography.weights.bold,
      letterSpacing: typography.tracking.snug,
      lineHeight: 32,
    },
    subtitle: {
      fontSize: typography.sizes.subtitle,
      fontWeight: typography.weights.semibold,
      letterSpacing: typography.tracking.snug,
      lineHeight: 24,
    },
    body: {
      fontSize: typography.sizes.body,
      fontWeight: typography.weights.regular,
      letterSpacing: typography.tracking.normal,
      lineHeight: 22,
    },
    caption: {
      fontSize: typography.sizes.caption,
      fontWeight: typography.weights.medium,
      letterSpacing: typography.tracking.wide,
      lineHeight: 17,
    },
    label: {
      fontSize: typography.sizes.label,
      fontWeight: typography.weights.semibold,
      letterSpacing: typography.tracking.widest,
      lineHeight: 15,
      textTransform: 'uppercase' as const,
    },
  },
} as const;
