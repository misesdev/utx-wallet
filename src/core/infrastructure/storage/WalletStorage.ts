import type { Wallet } from '../../domain/entities/Wallet';
import type { SecureStorage } from './SecureStorage';

const WALLETS_KEY = 'wallets';

function isValidWallet(obj: unknown): obj is Wallet {
  if (!obj || typeof obj !== 'object') return false;
  const w = obj as Record<string, unknown>;
  return (
    typeof w.id === 'string' &&
    typeof w.name === 'string' &&
    typeof w.network === 'string' &&
    typeof w.status === 'string' &&
    typeof w.createdAt === 'string'
  );
}

export class WalletStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  async load(): Promise<Wallet[]> {
    const value = await this.secureStorage.getItem(WALLETS_KEY);
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidWallet);
    } catch {
      return [];
    }
  }

  async save(wallets: Wallet[]): Promise<void> {
    await this.secureStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
  }
}
