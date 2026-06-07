import type { LanguageService } from '../../../application/services/LanguageService';
import type { DetectDeviceLanguageUseCase } from './DetectDeviceLanguageUseCase';
import type { SupportedLanguage } from '../../../../shared/i18n';

export class GetCurrentLanguageUseCase {
  constructor(
    private readonly languageService: LanguageService,
    private readonly detectDeviceLanguage: DetectDeviceLanguageUseCase,
  ) {}

  async execute(): Promise<SupportedLanguage> {
    const stored = await this.languageService.getCurrent();
    if (stored) return stored;
    return this.detectDeviceLanguage.execute();
  }
}
