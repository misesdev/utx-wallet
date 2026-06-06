import type { TransactionPreview } from '../../entities/TransactionPreview';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import { BitcoinAddress } from '../../value-objects/BitcoinAddress';
import { AppError } from '../../../application/errors/AppError';

export const DUST_THRESHOLD_SATS = 546;
const ESTIMATED_VBYTES = 180;

export type PreviewTransactionParams = {
  walletId: string;
  toAddress: string;
  amountSats: number;
  feeRateSatsPerVByte: number;
};

export class PreviewTransactionUseCase {
  constructor(private readonly utxoRepository: UtxoRepository) {}

  async execute(params: PreviewTransactionParams): Promise<TransactionPreview> {
    BitcoinAddress.of(params.toAddress);

    if (!Number.isInteger(params.amountSats) || params.amountSats <= 0) {
      throw new AppError('Informe um valor em sats válido', 'INVALID_AMOUNT');
    }
    if (params.amountSats < DUST_THRESHOLD_SATS) {
      throw new AppError(
        `Valor mínimo é ${DUST_THRESHOLD_SATS} sats (limite de dust)`,
        'BELOW_DUST',
      );
    }

    const feeRate = params.feeRateSatsPerVByte > 0 ? params.feeRateSatsPerVByte : 1;
    const feeSats = Math.ceil(feeRate * ESTIMATED_VBYTES);

    const utxos = await this.utxoRepository.listByWallet(params.walletId);
    const confirmedSats = utxos
      .filter(u => u.isConfirmed)
      .reduce((sum, u) => sum + u.valueSats, 0);

    if (params.amountSats + feeSats > confirmedSats) {
      throw new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE');
    }

    let changeSats = confirmedSats - params.amountSats - feeSats;
    let finalFeeSats = feeSats;

    // absorb dust change into fee
    if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
      finalFeeSats += changeSats;
      changeSats = 0;
    }

    return {
      toAddress: params.toAddress,
      amountSats: params.amountSats,
      feeSats: finalFeeSats,
      totalSats: params.amountSats + finalFeeSats,
      changeSats,
      feeRateSatsPerVByte: feeRate,
      estimatedVBytes: ESTIMATED_VBYTES,
    };
  }
}
