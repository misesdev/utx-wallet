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

const XPUB_RE = /^(xpub|tpub|zpub|vpub)[a-zA-Z0-9]+$/;
const XPRIV_RE = /^(xprv|tprv|zprv|vprv)[a-zA-Z0-9]+$/;

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

    const bNetwork = NetworkType.of(network).toBNetwork();

    if (format === 'xpriv') {
      if (kind !== 'hd' || XPUB_RE.test(secret)) {
        throw new AppError('xpriv is not available for watch-only or single-key wallets', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      const { wallet } = HDWallet.import(secret, passphrase, { network: bNetwork, purpose: 84 });
      return { format, value: wallet.getXPriv() };
    }

    if (format === 'xpub') {
      if (kind !== 'hd') {
        throw new AppError('xpub is only available for HD wallets', 'EXPORT_FORMAT_UNAVAILABLE');
      }
      const { wallet } = HDWallet.import(secret, passphrase, { network: bNetwork, purpose: 84 });
      return { format, value: wallet.getXPub() };
    }

    throw new AppError(`Unknown export format: ${format as string}`, 'EXPORT_FORMAT_UNKNOWN');
  }
}
