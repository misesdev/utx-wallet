import type { SyncStateRepository } from '../../domain/repositories/SyncStateRepository';
import type { SecureStorage } from './SecureStorage';

export class SyncStateStorage implements SyncStateRepository {
  constructor(private readonly secureStorage: SecureStorage) {}

  getLastSyncAt(walletId: string): Promise<string | null> {
    return this.secureStorage.getItem(`wallet_sync_at:${walletId}`);
  }

  async saveLastSyncAt(walletId: string, syncedAt: string): Promise<void> {
    await this.secureStorage.setItem(`wallet_sync_at:${walletId}`, syncedAt);
  }

  async removeLastSyncAt(walletId: string): Promise<void> {
    await this.secureStorage.removeItem(`wallet_sync_at:${walletId}`);
  }
}
