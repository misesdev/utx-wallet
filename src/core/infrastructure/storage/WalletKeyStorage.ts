import type { SecureStorage } from './SecureStorage';

export class WalletKeyStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  async store(walletId: string, secret: string): Promise<void> {
    await this.secureStorage.setItem(`wallet_secret:${walletId}`, secret);
  }

  async retrieve(walletId: string): Promise<string | null> {
    return this.secureStorage.getItem(`wallet_secret:${walletId}`);
  }

  async remove(walletId: string): Promise<void> {
    await this.secureStorage.removeItem(`wallet_secret:${walletId}`);
  }
}
