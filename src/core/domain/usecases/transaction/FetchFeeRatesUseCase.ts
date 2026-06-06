import type { FeeRates } from '../../repositories/BlockchainProvider';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';

export class FetchFeeRatesUseCase {
  constructor(private readonly blockchainProvider: BlockchainProvider) {}

  execute(): Promise<FeeRates> {
    return this.blockchainProvider.getFeeRates();
  }
}
