import React from 'react';
import { AppText } from '../../../src/presentation/components/base/AppText';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppText', () => {
  it('renders children', () => {
    const screen = renderWithTheme(<AppText>Bitcoin wallet</AppText>);

    expect(screen.getByText('Bitcoin wallet')).toBeTruthy();
  });
});
