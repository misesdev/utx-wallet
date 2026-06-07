import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../shared/i18n';
import type { LanguageStorage } from '../../infrastructure/storage/LanguageStorage';

export class LanguageService {
  constructor(private readonly storage: LanguageStorage) {}

  async getCurrent(): Promise<SupportedLanguage | null> {
    const stored = await this.storage.getLanguage();
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as SupportedLanguage;
    }
    return null;
  }

  async set(language: SupportedLanguage): Promise<void> {
    await this.storage.setLanguage(language);
  }
}
