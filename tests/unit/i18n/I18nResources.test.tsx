import React from 'react';
import { AppText } from '../../../src/presentation/components/base/AppText';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import ptBR from '../../../src/shared/i18n/locales/pt-BR.json';
import enUS from '../../../src/shared/i18n/locales/en-US.json';

describe('i18n resources', () => {
  it('renders translated text in a component for en-US', () => {
    const screen = renderWithTheme(<AppText>{enUS.settings.language}</AppText>);

    expect(screen.getByText('Language')).toBeTruthy();
  });

  it('renders translated text in a component for pt-BR', () => {
    const screen = renderWithTheme(<AppText>{ptBR.settings.language}</AppText>);

    expect(screen.getByText('Idioma')).toBeTruthy();
  });

  it('keeps required language keys in both supported locales', () => {
    expect(ptBR.settings.language).toBe('Idioma');
    expect(enUS.settings.language).toBe('Language');
    expect(ptBR.qrScan.unavailableMessage).toBeTruthy();
    expect(enUS.qrScan.unavailableMessage).toBeTruthy();
  });
});
