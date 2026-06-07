import { findBestLanguageTag } from 'react-native-localize';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type SupportedLanguage } from '../../../../shared/i18n';

export class DetectDeviceLanguageUseCase {
  execute(): SupportedLanguage {
    const result = findBestLanguageTag([...SUPPORTED_LANGUAGES]);
    if (result && (SUPPORTED_LANGUAGES as readonly string[]).includes(result.languageTag)) {
      return result.languageTag as SupportedLanguage;
    }
    return DEFAULT_LANGUAGE;
  }
}
