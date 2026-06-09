import type { SecureStorage } from './SecureStorage';

export type DecodedWalletKey = {
  secret: string;
  mnemonic: string;
  passphrase?: string;
  kind: 'hd' | 'single-private-key';
};

// Stored as plain mnemonic (backward compat) or JSON {"m":"...","p":"...","k":"..."}
function encode(secret: string, passphrase?: string, kind: DecodedWalletKey['kind'] = 'hd'): string {
  if (!passphrase && kind === 'hd') return secret;
  return JSON.stringify({ m: secret, p: passphrase, k: kind });
}

function decode(stored: string): DecodedWalletKey {
  if (stored.startsWith('{')) {
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (typeof parsed.m === 'string') {
        const kind = parsed.k === 'single-private-key' ? 'single-private-key' : 'hd';
        return {
          secret: parsed.m,
          mnemonic: parsed.m,
          passphrase: typeof parsed.p === 'string' ? parsed.p : undefined,
          kind,
        };
      }
    } catch {
      // fall through to plain mnemonic
    }
  }
  return { secret: stored, mnemonic: stored, kind: 'hd' };
}

export class WalletKeyStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  store(walletId: string, secret: string): Promise<void> {
    return this.secureStorage.setItem(`wallet_secret:${walletId}`, secret);
  }

  storeKey(
    walletId: string,
    mnemonic: string,
    passphrase?: string,
    kind: DecodedWalletKey['kind'] = 'hd',
  ): Promise<void> {
    return this.secureStorage.setItem(
      `wallet_secret:${walletId}`,
      encode(mnemonic, passphrase, kind),
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
