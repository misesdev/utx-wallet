import type { TransactionPreview } from '../../entities/TransactionPreview';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import { BitcoinAddress } from '../../value-objects/BitcoinAddress';
import { AppError } from '../../../application/errors/AppError';
import { calcSubtractFeeAmounts } from '../../services/FeeSubtractionService';

export const DUST_THRESHOLD_SATS = 546;
const ESTIMATED_VBYTES = 180;

export type PreviewTransactionParams = {
  walletId: string;
  toAddress: string;
  amountSats: number;
  feeRateSatsPerVByte: number;
  subtractFeeFromAmount?: boolean;
  /** Restrict balance check to UTXOs at these addresses (account isolation) */
  allowedAddresses?: string[];
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
    const eligibleUtxos = params.allowedAddresses?.length
      ? utxos.filter(u => !u.isFrozen && params.allowedAddresses!.includes(u.address))
      : utxos.filter(u => !u.isFrozen);
    const confirmedSats = eligibleUtxos
      .filter(u => u.isConfirmed)
      .reduce((sum, u) => sum + u.valueSats, 0);

    // In standard mode, if amount + fee exceeds the balance but amount alone
    // fits, auto-switch to SFA (drain) so the full balance can be swept.
    const requestedSubtractFee = params.subtractFeeFromAmount ?? false;
    const effectiveSubtractFee =
      !requestedSubtractFee && params.amountSats + feeSats > confirmedSats && params.amountSats <= confirmedSats
        ? true
        : requestedSubtractFee;

    if (effectiveSubtractFee) {
      // SFA mode: fee is deducted from the amount going to the recipient
      if (params.amountSats > confirmedSats) {
        throw new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE');
      }

      const { recipientAmountSats: initialRecipient } =
        calcSubtractFeeAmounts(params.amountSats, feeSats);

      if (initialRecipient < DUST_THRESHOLD_SATS) {
        throw new AppError(
          `Valor mínimo é ${DUST_THRESHOLD_SATS} sats (limite de dust)`,
          'BELOW_DUST',
        );
      }

      let changeSats = confirmedSats - params.amountSats;
      let finalFeeSats = feeSats;
      let recipientAmountSats = initialRecipient;

      // Absorb dust change into fee (and reduce recipient amount)
      if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
        finalFeeSats += changeSats;
        recipientAmountSats -= changeSats;
        changeSats = 0;
      }

      return {
        toAddress: params.toAddress,
        amountSats: params.amountSats,
        recipientAmountSats,
        feeSats: finalFeeSats,
        totalSats: params.amountSats,
        changeSats,
        feeRateSatsPerVByte: feeRate,
        estimatedVBytes: ESTIMATED_VBYTES,
        subtractFeeFromAmount: true,
      };
    } else {
      // Standard mode: fee is paid from sender's change
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
        recipientAmountSats: params.amountSats,
        feeSats: finalFeeSats,
        totalSats: params.amountSats + finalFeeSats,
        changeSats,
        feeRateSatsPerVByte: feeRate,
        estimatedVBytes: ESTIMATED_VBYTES,
        subtractFeeFromAmount: false,
      };
    }
  }
}
