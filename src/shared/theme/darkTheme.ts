import { colors } from '../constants/colors';
import { baseTheme, type AppTheme } from './theme';

export const darkTheme: AppTheme = {
  ...baseTheme,
  mode: 'dark',
  colors: {
    background: colors.black,
    surface: colors.surface,
    surfaceMuted: colors.surfaceMuted,
    surfaceRaised: colors.surfaceRaised,
    text: colors.white,
    textMuted: colors.gray500,
    textFaint: colors.gray700,
    border: colors.borderDefault,
    borderFocus: colors.borderFocus,
    borderHighlight: colors.borderHighlight,
    primary: colors.pureWhite,
    primaryText: colors.black,
    accent: colors.amber,
    accentMuted: colors.amberMuted,
    success: colors.success,
    successMuted: colors.successMuted,
    warning: colors.warning,
    warningMuted: colors.warningMuted,
    danger: colors.danger,
    dangerMuted: colors.dangerMuted,
  },
};
