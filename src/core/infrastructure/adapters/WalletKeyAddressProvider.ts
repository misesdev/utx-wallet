import { HDWallet } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { WalletAddressProvider } from '../../domain/repositories/WalletAddressProvider';
import { AppError } from '../../application/errors/AppError';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

export class WalletKeyAddressProvider implements WalletAddressProvider {
  constructor(private readonly walletKeyStorage: WalletKeyStorage) {}

  async getReceiveAddress(walletId: string, network: BitcoinNetwork, index: number = 0): Promise<string> {
    const { wallet } = await this.loadWallet(walletId, network);
    return wallet.getAddress(index, { change: 0 });
  }

  async getChangeAddress(walletId: string, network: BitcoinNetwork, index: number = 0): Promise<string> {
    const { wallet } = await this.loadWallet(walletId, network);
    return wallet.getAddress(index, { change: 1 });
  }

  private async loadWallet(walletId: string, network: BitcoinNetwork) {
    const secret = await this.walletKeyStorage.retrieve(walletId);
    if (!secret) {
      throw new AppError('Wallet secret not found', 'WALLET_NOT_FOUND');
    }
    const bNetwork = NetworkType.of(network).toBNetwork();
    return HDWallet.import(secret, undefined, { network: bNetwork, purpose: 84 });
  }
}
