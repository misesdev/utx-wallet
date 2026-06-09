import { ECPairKey, HDWallet } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../entities/Network';
import { NetworkType } from '../value-objects/NetworkType';

export type WalletImportFormat =
  | 'mnemonic'
  | 'wif'
  | 'private-key'
  | 'xpub'
  | 'xpriv'
  | 'watch-only';

export type WalletSecretStorageKind = 'hd' | 'single-private-key';

export type WalletImportFormatResult = {
  format: WalletImportFormat;
  normalizedSecret: string;
  canSign: boolean;
  isWatchOnly: boolean;
  network?: BitcoinNetwork;
  storageKind: WalletSecretStorageKind;
};

const HEX_PRIVATE_KEY_RE = /^[0-9a-fA-F]{64}$/;
const XPUB_RE = /^(xpub|tpub)[a-zA-Z0-9]+$/;
const XPRIV_RE = /^(xprv|tprv)[a-zA-Z0-9]+$/;

function networkFromExtendedKey(secret: string): BitcoinNetwork | undefined {
  if (secret.startsWith('xpub') || secret.startsWith('xprv')) return 'mainnet';
  if (secret.startsWith('tpub') || secret.startsWith('tprv')) return 'testnet';
  return undefined;
}

function extractWatchOnlySecret(input: string): string {
  const trimmed = input.trim();
  const prefixMatch = trimmed.match(/^(watch-only|watchonly|readonly|read-only):(.+)$/i);
  if (prefixMatch?.[2]) return prefixMatch[2].trim();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const type = typeof parsed.type === 'string' ? parsed.type.toLowerCase() : '';
    const value = parsed.xpub ?? parsed.extendedPublicKey ?? parsed.value;
    if ((type === 'watch-only' || type === 'watchonly') && typeof value === 'string') {
      return value.trim();
    }
  } catch {
    // Not JSON; keep the original input.
  }

  return trimmed;
}

export class WalletImportFormatDetector {
  detect(input: string, selectedNetwork?: BitcoinNetwork): WalletImportFormatResult | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const watchOnlySecret = extractWatchOnlySecret(trimmed);
    if (watchOnlySecret !== trimmed) {
      const detected = this.detectExtendedPublicKey(watchOnlySecret, 'watch-only');
      return detected;
    }

    const xpub = this.detectExtendedPublicKey(trimmed, 'xpub');
    if (xpub) return xpub;

    const xpriv = this.detectExtendedPrivateKey(trimmed);
    if (xpriv) return xpriv;

    const wif = this.detectWif(trimmed);
    if (wif) return wif;

    const rawPrivateKey = this.detectRawPrivateKey(trimmed, selectedNetwork);
    if (rawPrivateKey) return rawPrivateKey;

    const mnemonic = this.detectMnemonic(trimmed, selectedNetwork);
    if (mnemonic) return mnemonic;

    return null;
  }

  private detectExtendedPublicKey(
    secret: string,
    format: 'xpub' | 'watch-only',
  ): WalletImportFormatResult | null {
    if (!XPUB_RE.test(secret)) return null;
    try {
      const network = networkFromExtendedKey(secret);
      HDWallet.import(secret, undefined, {
        network: NetworkType.of(network ?? 'testnet').toBNetwork(),
        purpose: 84,
      });
      return {
        format,
        normalizedSecret: secret,
        canSign: false,
        isWatchOnly: true,
        network,
        storageKind: 'hd',
      };
    } catch {
      return null;
    }
  }

  private detectExtendedPrivateKey(secret: string): WalletImportFormatResult | null {
    if (!XPRIV_RE.test(secret)) return null;
    try {
      const network = networkFromExtendedKey(secret);
      HDWallet.import(secret, undefined, {
        network: NetworkType.of(network ?? 'testnet').toBNetwork(),
        purpose: 84,
      });
      return {
        format: 'xpriv',
        normalizedSecret: secret,
        canSign: true,
        isWatchOnly: false,
        network,
        storageKind: 'hd',
      };
    } catch {
      return null;
    }
  }

  private detectWif(secret: string): WalletImportFormatResult | null {
    try {
      const pair = ECPairKey.fromWif(secret);
      return {
        format: 'wif',
        normalizedSecret: pair.getWif(),
        canSign: true,
        isWatchOnly: false,
        network: pair.network === 'mainnet' ? 'mainnet' : 'testnet',
        storageKind: 'single-private-key',
      };
    } catch {
      return null;
    }
  }

  private detectRawPrivateKey(
    secret: string,
    selectedNetwork?: BitcoinNetwork,
  ): WalletImportFormatResult | null {
    if (!HEX_PRIVATE_KEY_RE.test(secret)) return null;
    try {
      const network = selectedNetwork ?? 'testnet';
      const pair = ECPairKey.fromHex(secret, NetworkType.of(network).toBNetwork());
      return {
        format: 'private-key',
        normalizedSecret: pair.getWif(),
        canSign: true,
        isWatchOnly: false,
        network,
        storageKind: 'single-private-key',
      };
    } catch {
      return null;
    }
  }

  private detectMnemonic(
    secret: string,
    selectedNetwork?: BitcoinNetwork,
  ): WalletImportFormatResult | null {
    try {
      const network = selectedNetwork ?? 'testnet';
      HDWallet.import(secret, undefined, {
        network: NetworkType.of(network).toBNetwork(),
        purpose: 84,
      });
      return {
        format: 'mnemonic',
        normalizedSecret: secret,
        canSign: true,
        isWatchOnly: false,
        network,
        storageKind: 'hd',
      };
    } catch {
      return null;
    }
  }
}
