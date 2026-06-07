import EncryptedStorage from 'react-native-encrypted-storage';

const LANGUAGE_KEY = 'app_language';

export class LanguageStorage {
  async getLanguage(): Promise<string | null> {
    return EncryptedStorage.getItem(LANGUAGE_KEY);
  }

  async setLanguage(language: string): Promise<void> {
    await EncryptedStorage.setItem(LANGUAGE_KEY, language);
  }
}
