import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/app/providers/ThemeProvider';

function Wrapper({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

export function renderWithTheme(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
