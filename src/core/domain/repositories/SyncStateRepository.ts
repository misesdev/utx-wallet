export interface SyncStateRepository {
  getLastSyncAt(walletId: string): Promise<string | null>;
  saveLastSyncAt(walletId: string, syncedAt: string): Promise<void>;
  removeLastSyncAt(walletId: string): Promise<void>;
}
