export const colors = {
  // Base
  black: '#080808',
  white: '#F2F2F2',
  pureWhite: '#FFFFFF',

  // Surfaces
  surface: '#111111',
  surfaceMuted: '#0D0D0D',
  surfaceRaised: '#181818',

  // Grays
  gray950: '#0A0A0A',
  gray900: '#111111',
  gray800: '#1A1A1A',
  gray700: '#242424',
  gray600: '#2E2E2E',
  gray500: '#5A5A5A',
  gray400: '#808080',
  gray300: '#A8A8A8',
  gray200: '#D0D0D0',
  gray100: '#F0F0F0',

  // Bitcoin amber/gold — warm but not cliché orange
  amber: '#F5C418',
  amberDim: '#C49A10',
  amberMuted: 'rgba(245,196,24,0.10)',
  amberGlow: 'rgba(245,196,24,0.06)',

  // Semantic
  success: '#34D399',
  successMuted: 'rgba(52,211,153,0.10)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251,191,36,0.10)',
  danger: '#F87171',
  dangerMuted: 'rgba(248,113,113,0.10)',

  // Network
  networkBlue: '#60A5FA',
  networkBlueMuted: 'rgba(96,165,250,0.10)',

  // Borders
  borderDefault: 'rgba(255,255,255,0.07)',
  borderSubtle: 'rgba(255,255,255,0.04)',
  borderFocus: 'rgba(255,255,255,0.22)',
  borderHighlight: 'rgba(255,255,255,0.11)',
} as const;
