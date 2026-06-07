import { i18next, type SupportedLanguage } from '../../../../shared/i18n';
import type { LanguageService } from '../../../application/services/LanguageService';

export class SetLanguageUseCase {
  constructor(private readonly languageService: LanguageService) {}

  async execute(language: SupportedLanguage): Promise<void> {
    await this.languageService.set(language);
    await i18next.changeLanguage(language);
  }
}
