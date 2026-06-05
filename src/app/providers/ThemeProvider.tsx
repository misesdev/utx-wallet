import React, { createContext, PropsWithChildren, useMemo, useState } from 'react';
import { darkTheme } from '../../shared/theme/darkTheme';
import { lightTheme } from '../../shared/theme/lightTheme';
import type { AppTheme, ThemeMode } from '../../shared/theme/theme';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const value = useMemo<ThemeContextValue>(() => {
    const theme = mode === 'dark' ? darkTheme : lightTheme;
    return { theme, mode, setMode };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
