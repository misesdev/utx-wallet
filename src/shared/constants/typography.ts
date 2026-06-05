export const typography = {
  sizes: {
    label: 11,
    caption: 12,
    body: 15,
    subtitle: 17,
    title: 26,
    display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  tracking: {
    tight: -0.8,
    snug: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.4,
  },
} as const;
