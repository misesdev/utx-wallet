import type { BitcoinNetwork } from '../entities/Network';
import type { BuiltTransaction } from '../entities/BuiltTransaction';
import type { SignedTransaction } from '../entities/SignedTransaction';

export interface TransactionSigner {
  sign(
    built: BuiltTransaction,
    walletId: string,
    network: BitcoinNetwork,
  ): Promise<SignedTransaction>;
}
