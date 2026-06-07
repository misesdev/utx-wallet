import { colors } from '../constants/colors';
import { baseTheme, type AppTheme } from './theme';

export const lightTheme: AppTheme = {
  ...baseTheme,
  mode: 'light',
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    surfaceRaised: '#FFFFFF',
    text: '#111111',
    textMuted: '#737373',
    textFaint: '#D4D4D4',
    border: 'rgba(0,0,0,0.08)',
    borderFocus: 'rgba(0,0,0,0.24)',
    borderHighlight: 'rgba(0,0,0,0.12)',
    primary: '#111111',
    primaryText: '#FFFFFF',
    accent: colors.amberDim,
    accentMuted: 'rgba(196,154,16,0.10)',
    success: '#10B981',
    successMuted: 'rgba(16,185,129,0.10)',
    warning: colors.warning,
    warningMuted: 'rgba(245,158,11,0.12)',
    danger: '#EF4444',
    dangerMuted: 'rgba(239,68,68,0.10)',
  },
};
