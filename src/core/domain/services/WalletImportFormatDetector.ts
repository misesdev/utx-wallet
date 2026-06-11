import { createBase58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha256';
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

// All BIP44 and BIP84 extended key prefixes.
// HDWallet.import only accepts xprv/xpub; all others must be normalized first.
const XPUB_RE = /^(xpub|tpub|zpub|vpub)[a-zA-Z0-9]+$/;
const XPRIV_RE = /^(xprv|tprv|zprv|vprv)[a-zA-Z0-9]+$/;
const HEX_PRIVATE_KEY_RE = /^[0-9a-fA-F]{64}$/;

// BIP44 mainnet version bytes — the only ones HDWallet.import accepts for xprv/xpub.
const XPRV_VERSION = new Uint8Array([0x04, 0x88, 0xad, 0xe4]); // xprv
const XPUB_VERSION = new Uint8Array([0x04, 0x88, 0xb2, 0x1e]); // xpub

const b58check = createBase58check(sha256);

/**
 * Rewrites the 4-byte version prefix of a base58check-encoded extended key.
 * Used to normalise any extended key format (tprv/zprv/vprv → xprv, etc.)
 * so that HDWallet.import can handle it.
 */
function reversion(encoded: string, versionBytes: Uint8Array): string {
  const decoded = b58check.decode(encoded);
  return b58check.encode(new Uint8Array([...versionBytes, ...decoded.slice(4)]));
}

/** True when the key uses version bytes other than xprv (mainnet BIP44). */
function needsXprvNormalization(s: string): boolean {
  return s.startsWith('tprv') || s.startsWith('zprv') || s.startsWith('vprv');
}

/** True when the key uses version bytes other than xpub (mainnet BIP44). */
function needsXpubNormalization(s: string): boolean {
  return s.startsWith('tpub') || s.startsWith('zpub') || s.startsWith('vpub');
}

function networkFromExtendedKey(secret: string): BitcoinNetwork | undefined {
  if (secret.startsWith('xpub') || secret.startsWith('xprv')) return 'mainnet';
  if (secret.startsWith('tpub') || secret.startsWith('tprv')) return 'testnet'; // BIP44 testnet
  if (secret.startsWith('zpub') || secret.startsWith('zprv')) return 'mainnet'; // BIP84 mainnet
  if (secret.startsWith('vpub') || secret.startsWith('vprv')) return 'testnet'; // BIP84 testnet
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
      // Normalize to xpub so HDWallet.import can handle it (it rejects tpub/zpub/vpub)
      const normalized = needsXpubNormalization(secret) ? reversion(secret, XPUB_VERSION) : secret;
      HDWallet.import(normalized, undefined, {
        network: NetworkType.of(network ?? 'testnet').toBNetwork(),
        purpose: 84,
      });
      return {
        format,
        normalizedSecret: normalized,
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
      // Normalize to xprv so HDWallet.import can handle it (it rejects tprv/zprv/vprv)
      const normalized = needsXprvNormalization(secret) ? reversion(secret, XPRV_VERSION) : secret;
      HDWallet.import(normalized, undefined, {
        network: NetworkType.of(network ?? 'testnet').toBNetwork(),
        purpose: 84,
      });
      return {
        format: 'xpriv',
        normalizedSecret: normalized,
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
