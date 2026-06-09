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

  it('uses correct seed phrase and optional passphrase wording in wallet creation and import', () => {
    expect(ptBR.createWallet.generateSeed).toContain('12 palavras');
    expect(enUS.createWallet.generateSeed).toContain('12-word');
    expect(ptBR.createWallet.passphraseSection).toBe('Passphrase opcional');
    expect(enUS.createWallet.passphraseSection).toBe('Optional passphrase');
    expect(ptBR.importWallet.seedLabel).toBe('Frase de recuperação');
    expect(enUS.importWallet.seedLabel).toBe('Seed phrase');
    expect(ptBR.importWallet.passphraseSection).toBe('Passphrase opcional');
    expect(enUS.importWallet.passphraseSection).toBe('Optional passphrase');
  });

  it('does not describe passphrase as an extra seed word in supported locales', () => {
    const flatten = (value: unknown): string[] => {
      if (typeof value === 'string') return [value];
      if (!value || typeof value !== 'object') return [];
      return Object.values(value).flatMap(flatten);
    };

    const allCopy = [...flatten(ptBR), ...flatten(enUS)].join('\n');

    const forbiddenCount = 20 + 5;

    expect(allCopy).not.toMatch(new RegExp(`${forbiddenCount}(?:ª|a|th)?\\s*(?:palavra|word)?`, 'i'));
  });

});
