import { ECPairKey, HDWallet } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { WalletAddressProvider } from '../../domain/repositories/WalletAddressProvider';
import { AppError } from '../../application/errors/AppError';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

export class WalletKeyAddressProvider implements WalletAddressProvider {
  constructor(private readonly walletKeyStorage: WalletKeyStorage) {}

  async getReceiveAddress(
    walletId: string,
    network: BitcoinNetwork,
    index: number = 0,
    accountIndex: number = 0,
  ): Promise<string> {
    const loaded = await this.loadWallet(walletId, network);
    if (loaded.kind === 'single-private-key') {
      if (index > 0 || accountIndex > 0) {
        throw new AppError('Single-key wallets only support the first receive address', 'ADDRESS_DERIVATION_UNSUPPORTED');
      }
      return loaded.pair.getAddress('p2wpkh');
    }
    return loaded.wallet.getAddress(index, { account: accountIndex, change: 0 });
  }

  async getChangeAddress(
    walletId: string,
    network: BitcoinNetwork,
    index: number = 0,
    accountIndex: number = 0,
  ): Promise<string> {
    const loaded = await this.loadWallet(walletId, network);
    if (loaded.kind === 'single-private-key') {
      if (index > 0 || accountIndex > 0) {
        throw new AppError('Single-key wallets only support the first change address', 'ADDRESS_DERIVATION_UNSUPPORTED');
      }
      return loaded.pair.getAddress('p2wpkh');
    }
    return loaded.wallet.getAddress(index, { account: accountIndex, change: 1 });
  }

  private async loadWallet(walletId: string, network: BitcoinNetwork) {
    const key = await this.walletKeyStorage.retrieveKey(walletId);
    if (!key) {
      throw new AppError('Wallet secret not found', 'WALLET_NOT_FOUND');
    }
    if (key.kind === 'single-private-key') {
      return { kind: key.kind, pair: ECPairKey.fromWif(key.secret) } as const;
    }
    const bNetwork = NetworkType.of(network).toBNetwork();
    const hd = HDWallet.import(key.secret, key.passphrase, { network: bNetwork, purpose: 84 });
    return { kind: key.kind, ...hd } as const;
  }
}
