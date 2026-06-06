import type { BitcoinNetwork } from '../../entities/Network';
import type { BuiltTransaction } from '../../entities/BuiltTransaction';
import type { SignedTransaction } from '../../entities/SignedTransaction';
import type { TransactionSigner } from '../../repositories/TransactionSigner';

export type SignTransactionParams = {
  builtTransaction: BuiltTransaction;
  walletId: string;
  network: BitcoinNetwork;
};

export class SignTransactionUseCase {
  constructor(private readonly signer: TransactionSigner) {}

  execute(params: SignTransactionParams): Promise<SignedTransaction> {
    return this.signer.sign(params.builtTransaction, params.walletId, params.network);
  }
}
