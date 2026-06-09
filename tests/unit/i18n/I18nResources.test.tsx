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

  describe('globalSettings keys', () => {
    const KEYS: Array<keyof typeof ptBR.globalSettings> = ['title', 'groupApp', 'groupNetwork', 'groupAdvanced'];
    it.each(KEYS)('pt-BR has non-empty globalSettings.%s', (key) => {
      expect(ptBR.globalSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty globalSettings.%s', (key) => {
      expect(enUS.globalSettings[key]).toBeTruthy();
    });
  });

  describe('donation keys', () => {
    const KEYS: Array<keyof typeof ptBR.donation> = [
      'title', 'settingsTitle', 'settingsDesc', 'heroTitle', 'description',
      'addressLabel', 'copyAddress', 'copied', 'copyFeedback', 'githubLabel',
    ];
    it.each(KEYS)('pt-BR has non-empty donation.%s', (key) => {
      expect(ptBR.donation[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty donation.%s', (key) => {
      expect(enUS.donation[key]).toBeTruthy();
    });
  });

  describe('walletSettings keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletSettings> = [
      'walletName', 'editName', 'errorNameRequired', 'dangerZone', 'deleteWallet', 'deleteWalletDesc',
    ];
    it.each(KEYS)('pt-BR has non-empty walletSettings.%s', (key) => {
      expect(ptBR.walletSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletSettings.%s', (key) => {
      expect(enUS.walletSettings[key]).toBeTruthy();
    });
  });

  describe('settings wallet-screen keys', () => {
    it('pt-BR has walletTitle, viewSeed, addresses, utxos keys', () => {
      expect(ptBR.settings.walletTitle).toBeTruthy();
      expect(ptBR.settings.viewSeed).toBeTruthy();
      expect(ptBR.settings.viewSeedDesc).toBeTruthy();
      expect(ptBR.settings.addresses).toBeTruthy();
      expect(ptBR.settings.addressesDesc).toBeTruthy();
      expect(ptBR.settings.utxos).toBeTruthy();
      expect(ptBR.settings.utxosDesc).toBeTruthy();
    });
    it('en-US has walletTitle, viewSeed, addresses, utxos keys', () => {
      expect(enUS.settings.walletTitle).toBeTruthy();
      expect(enUS.settings.viewSeed).toBeTruthy();
      expect(enUS.settings.viewSeedDesc).toBeTruthy();
      expect(enUS.settings.addresses).toBeTruthy();
      expect(enUS.settings.addressesDesc).toBeTruthy();
      expect(enUS.settings.utxos).toBeTruthy();
      expect(enUS.settings.utxosDesc).toBeTruthy();
    });
  });

  describe('viewSeed keys', () => {
    it('pt-BR has non-empty viewSeed.title', () => {
      expect(ptBR.viewSeed.title).toBeTruthy();
    });
    it('en-US has non-empty viewSeed.title', () => {
      expect(enUS.viewSeed.title).toBeTruthy();
    });
  });

});
