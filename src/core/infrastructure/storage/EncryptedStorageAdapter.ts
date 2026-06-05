import EncryptedStorage from 'react-native-encrypted-storage';
import type { SecureStorage } from './SecureStorage';

export class EncryptedStorageAdapter implements SecureStorage {
  getItem(key: string): Promise<string | null> {
    return EncryptedStorage.getItem(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return EncryptedStorage.setItem(key, value);
  }

  removeItem(key: string): Promise<void> {
    return EncryptedStorage.removeItem(key);
  }
}
