import type { FeeRates } from '../../repositories/BlockchainProvider';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../entities/Network';

export class FetchFeeRatesUseCase {
  constructor(private readonly blockchainProvider: BlockchainProvider) {}

  execute(network: BitcoinNetwork): Promise<FeeRates> {
    return this.blockchainProvider.getFeeRates(network);
  }
}
