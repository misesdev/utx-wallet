import type { Transaction, TransactionDraft } from '../../domain/entities/Transaction';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';
import { AppError } from '../../application/errors/AppError';
import { generateId } from '../../../shared/utils/generateId';

// Conservative estimate for a 1-input-2-output P2WPKH transaction
const ESTIMATED_TX_VBYTES = 180;

export class TransactionRepositoryImpl implements TransactionRepository {
  async build(draft: TransactionDraft): Promise<Transaction> {
    const feeRateSatsPerVByte = draft.feeRateSatsPerVByte ?? 1;
    const feeSats = Math.ceil(feeRateSatsPerVByte * ESTIMATED_TX_VBYTES);

    return {
      id: generateId(),
      amountSats: draft.amountSats,
      feeSats,
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  async sign(_transaction: Transaction): Promise<Transaction> {
    throw new AppError(
      'Transaction signing requires key material: wallet signing not yet implemented',
      'SIGNING_NOT_AVAILABLE',
    );
  }

  async broadcast(_transaction: Transaction): Promise<Transaction> {
    throw new AppError(
      'Transaction broadcast requires a signed transaction: use sign() first',
      'BROADCAST_NOT_AVAILABLE',
    );
  }

  async list(_walletId: string): Promise<Transaction[]> {
    return [];
  }
}
