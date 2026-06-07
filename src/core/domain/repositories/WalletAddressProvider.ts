import type { BitcoinNetwork } from '../entities/Network';

export interface WalletAddressProvider {
  getReceiveAddress(walletId: string, network: BitcoinNetwork, index: number, accountIndex?: number): Promise<string>;
  getChangeAddress(walletId: string, network: BitcoinNetwork, index: number, accountIndex?: number): Promise<string>;
}
