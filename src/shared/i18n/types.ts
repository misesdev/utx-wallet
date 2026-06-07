import type ptBR from './locales/pt-BR.json';

type TranslationResources = typeof ptBR;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationResources;
    };
  }
}
