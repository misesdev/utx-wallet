import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';
import './types';

export const DEFAULT_LANGUAGE = 'pt-BR';
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export async function initI18n(language: string = DEFAULT_LANGUAGE): Promise<void> {
  if (i18next.isInitialized) {
    await i18next.changeLanguage(language);
    return;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export { i18next };
