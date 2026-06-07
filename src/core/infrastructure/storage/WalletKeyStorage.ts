import type { SecureStorage } from './SecureStorage';

export type DecodedWalletKey = {
  mnemonic: string;
  passphrase?: string;
};

// Stored as plain mnemonic (backward compat) or JSON {"m":"...","p":"..."}
function encode(mnemonic: string, passphrase?: string): string {
  if (!passphrase) return mnemonic;
  return JSON.stringify({ m: mnemonic, p: passphrase });
}

function decode(stored: string): DecodedWalletKey {
  if (stored.startsWith('{')) {
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (typeof parsed.m === 'string') {
        return {
          mnemonic: parsed.m,
          passphrase: typeof parsed.p === 'string' ? parsed.p : undefined,
        };
      }
    } catch {
      // fall through to plain mnemonic
    }
  }
  return { mnemonic: stored };
}

export class WalletKeyStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  store(walletId: string, secret: string): Promise<void> {
    return this.secureStorage.setItem(`wallet_secret:${walletId}`, secret);
  }

  storeKey(walletId: string, mnemonic: string, passphrase?: string): Promise<void> {
    return this.secureStorage.setItem(
      `wallet_secret:${walletId}`,
      encode(mnemonic, passphrase),
    );
  }

  async retrieve(walletId: string): Promise<string | null> {
    return this.secureStorage.getItem(`wallet_secret:${walletId}`);
  }

  async retrieveKey(walletId: string): Promise<DecodedWalletKey | null> {
    const stored = await this.secureStorage.getItem(`wallet_secret:${walletId}`);
    if (!stored) return null;
    return decode(stored);
  }

  remove(walletId: string): Promise<void> {
    return this.secureStorage.removeItem(`wallet_secret:${walletId}`);
  }
}
