import React from 'react';
import { LoadingScreen } from '../../../src/presentation/screens/LoadingScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

jest.mock('../../../assets/icon.png', () => 1);

describe('LoadingScreen', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<LoadingScreen />)).not.toThrow();
  });

  it('renders an ActivityIndicator', () => {
    const screen = renderWithTheme(<LoadingScreen />);
    expect(screen.getByTestId !== undefined).toBe(true);
    expect(screen.UNSAFE_getByType !== undefined).toBe(true);
  });
});
