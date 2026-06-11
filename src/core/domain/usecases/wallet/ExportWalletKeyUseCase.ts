import { createBase58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha256';
import { HDWallet } from 'bitcoin-tx-lib';
import type { WalletRepository } from '../../repositories/WalletRepository';
import type { BitcoinNetwork } from '../../entities/Network';
import { AppError } from '../../../application/errors/AppError';
import { NetworkType } from '../../value-objects/NetworkType';

export type WalletExportFormat = 'mnemonic' | 'xpriv' | 'xpub' | 'wif';

export interface ExportWalletKeyParams {
  walletId: string;
  format: WalletExportFormat;
  network: BitcoinNetwork;
}

export interface ExportWalletKeyResult {
  format: WalletExportFormat;
  value: string;
}

// All BIP44 and BIP84 extended key prefixes for stored-secret detection
const XPUB_RE = /^(xpub|tpub|zpub|vpub)[a-zA-Z0-9]+$/;
const XPRIV_RE = /^(xprv|tprv|zprv|vprv)[a-zA-Z0-9]+$/;

// Version bytes for extended key encoding
// bitcoin-tx-lib always outputs xprv/xpub (mainnet BIP44) regardless of network; we
// rewrite the 4-byte version prefix to produce the correct network-aware format on export.
const VERSIONS = {
  xprv: new Uint8Array([0x04, 0x88, 0xad, 0xe4]), // mainnet BIP44 private
  xpub: new Uint8Array([0x04, 0x88, 0xb2, 0x1e]), // mainnet BIP44 public
  tprv: new Uint8Array([0x04, 0x35, 0x83, 0x94]), // testnet BIP44 private
  tpub: new Uint8Array([0x04, 0x35, 0x87, 0xcf]), // testnet BIP44 public
} as const;

const b58check = createBase58check(sha256);

function reversion(encoded: string, versionBytes: Uint8Array): string {
  const decoded = b58check.decode(encoded);
  return b58check.encode(new Uint8Array([...versionBytes, ...decoded.slice(4)]));
}

/** Ensures the key is in xprv format (mainnet BIP44), the form HDWallet.import accepts. */
function toXprv(encoded: string): string {
  if (encoded.startsWith('xprv')) return encoded;
  return reversion(encoded, VERSIONS.xprv);
}

/** Ensures the key is in xpub format (mainnet BIP44), the form HDWallet.import accepts. */
function toXpub(encoded: string): string {
  if (encoded.startsWith('xpub')) return encoded;
  return reversion(encoded, VERSIONS.xpub);
}

/**
 * Applies the correct BIP44 version bytes for the wallet's network:
 * - mainnet → xprv / xpub
 * - testnet → tprv / tpub
 */
function applyNetworkVersion(xKey: string, network: BitcoinNetwork, isPrivate: boolean): string {
  const isMainnet = network === 'mainnet';
  if (isPrivate) {
    return isMainnet ? xKey : reversion(xKey, VERSIONS.tprv);
  }
  return isMainnet ? xKey : reversion(xKey, VERSIONS.tpub);
}

export class ExportWalletKeyUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getAvailableFormats(walletId: string): Promise<WalletExportFormat[]> {
    const key = await this.walletRepository.retrieveRawKey(walletId);
    if (!key) return [];

    if (key.kind === 'single-private-key') return ['wif'];

    const { secret } = key;
    if (XPUB_RE.test(secret)) return ['xpub'];
    if (XPRIV_RE.test(secret)) return ['xpriv', 'xpub'];
    return ['mnemonic', 'xpriv', 'xpub'];
  }

  async execute(params: ExportWalletKeyParams): Promise<ExportWalletKeyResult> {
    const key = await this.walletRepository.retrieveRawKey(params.walletId);
    if (!key) {
      throw new AppError('Wallet key not found', 'WALLET_NOT_FOUND');
    }

    const { kind, secret, passphrase } = key;
    const { format, network } = params;

    if (format === 'mnemonic') {
      if (kind !== 'hd' || XPUB_RE.test(secret) || XPRIV_RE.test(secret)) {
        throw new AppError('Mnemonic is not available for this wallet type', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      return { format, value: secret };
    }

    if (format === 'wif') {
      if (kind !== 'single-private-key') {
        throw new AppError('WIF is only available for single-key wallets', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      return { format, value: secret };
    }

    if (format === 'xpriv') {
      if (kind !== 'hd' || XPUB_RE.test(secret)) {
        throw new AppError('xpriv is not available for watch-only or single-key wallets', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      const bNetwork = NetworkType.of(network).toBNetwork();
      // secret may be a mnemonic or a stored xprv; normalise to xprv before import
      const importable = XPRIV_RE.test(secret) ? toXprv(secret) : secret;
      const { wallet } = HDWallet.import(importable, passphrase, { network: bNetwork, purpose: 84 });
      // bitcoin-tx-lib always outputs zprv/xprv (mainnet version bytes); normalise then
      // apply the correct network version so the QR can be re-imported with the right network
      const xprv = toXprv(wallet.getXPriv());
      return { format, value: applyNetworkVersion(xprv, network, true) };
    }

    if (format === 'xpub') {
      if (kind !== 'hd') {
        throw new AppError('xpub is only available for HD wallets', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      const bNetwork = NetworkType.of(network).toBNetwork();
      const importable = XPRIV_RE.test(secret) ? toXprv(secret) : XPUB_RE.test(secret) ? toXpub(secret) : secret;
      const { wallet } = HDWallet.import(importable, passphrase, { network: bNetwork, purpose: 84 });
      const xpub = toXpub(wallet.getXPub());
      return { format, value: applyNetworkVersion(xpub, network, false) };
    }

    throw new AppError(`Unknown export format: ${format as string}`, 'EXPORT_FORMAT_UNKNOWN');
  }
}
