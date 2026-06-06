import type { FeeRates } from '../../domain/repositories/BlockchainProvider';
import type { TransactionPreview } from '../../domain/entities/TransactionPreview';
import type { BroadcastResult } from '../../domain/usecases/transaction/BroadcastTransactionUseCase';
import { ValidateAddressUseCase } from '../../domain/usecases/transaction/ValidateAddressUseCase';
import { FetchFeeRatesUseCase } from '../../domain/usecases/transaction/FetchFeeRatesUseCase';
import {
  PreviewTransactionUseCase,
  type PreviewTransactionParams,
} from '../../domain/usecases/transaction/PreviewTransactionUseCase';
import {
  BuildTransactionUseCase,
  type BuildTransactionParams,
} from '../../domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../domain/usecases/transaction/SignTransactionUseCase';
import { BroadcastTransactionUseCase } from '../../domain/usecases/transaction/BroadcastTransactionUseCase';

export type SendTransactionParams = BuildTransactionParams;

export class SendService {
  constructor(
    private readonly validateAddressUseCase: ValidateAddressUseCase,
    private readonly fetchFeeRatesUseCase: FetchFeeRatesUseCase,
    private readonly previewTransactionUseCase: PreviewTransactionUseCase,
    private readonly buildTransactionUseCase: BuildTransactionUseCase,
    private readonly signTransactionUseCase: SignTransactionUseCase,
    private readonly broadcastTransactionUseCase: BroadcastTransactionUseCase,
  ) {}

  validateAddress(address: string): { valid: boolean; error: string | null } {
    return this.validateAddressUseCase.execute(address);
  }

  fetchFeeRates(): Promise<FeeRates> {
    return this.fetchFeeRatesUseCase.execute();
  }

  preview(params: PreviewTransactionParams): Promise<TransactionPreview> {
    return this.previewTransactionUseCase.execute(params);
  }

  async send(params: SendTransactionParams): Promise<BroadcastResult> {
    const built = await this.buildTransactionUseCase.execute(params);
    const signed = await this.signTransactionUseCase.execute({
      builtTransaction: built,
      walletId: params.walletId,
      network: params.walletNetwork,
    });
    return this.broadcastTransactionUseCase.execute(signed, params.walletId);
  }
}
