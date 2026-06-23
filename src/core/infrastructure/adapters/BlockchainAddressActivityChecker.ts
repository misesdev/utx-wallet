import type { AddressActivityChecker } from '../../domain/repositories/AddressActivityChecker';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { BlockchainProvider } from '../../domain/repositories/BlockchainProvider';

/**
 * Routes address activity checks through the configured BlockchainProvider
 * (personal node or public API), respecting the user's node routing settings.
 */
export class BlockchainAddressActivityChecker implements AddressActivityChecker {
  constructor(private readonly blockchainProvider: BlockchainProvider) {}

  async getAddressTxCount(address: string, network: BitcoinNetwork): Promise<number> {
    const txs = await this.blockchainProvider.getTransactions(address, network);
    return txs.length;
  }
}
