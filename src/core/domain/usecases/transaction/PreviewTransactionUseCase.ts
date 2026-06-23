import type { TransactionPreview, TxPreviewInput, TxPreviewOutput } from '../../entities/TransactionPreview';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { Utxo } from '../../entities/Utxo';
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

function selectPreviewInputs(confirmedUtxos: Utxo[], targetSats: number): TxPreviewInput[] {
  const sorted = [...confirmedUtxos].sort((a, b) => b.valueSats - a.valueSats);
  const inputs: TxPreviewInput[] = [];
  let total = 0;
  for (const u of sorted) {
    if (total >= targetSats) break;
    inputs.push({ address: u.address, valueSats: u.valueSats });
    total += u.valueSats;
  }
  return inputs;
}

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
    const confirmedUtxos = eligibleUtxos.filter(u => u.isConfirmed);
    const confirmedSats = confirmedUtxos.reduce((sum, u) => sum + u.valueSats, 0);

    const requestedSubtractFee = params.subtractFeeFromAmount ?? false;
    const effectiveSubtractFee =
      !requestedSubtractFee && params.amountSats + feeSats > confirmedSats && params.amountSats <= confirmedSats
        ? true
        : requestedSubtractFee;

    let recipientAmountSats: number;
    let changeSats: number;
    let finalFeeSats: number;
    let totalSats: number;

    if (effectiveSubtractFee) {
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

      changeSats = confirmedSats - params.amountSats;
      finalFeeSats = feeSats;
      recipientAmountSats = initialRecipient;

      if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
        finalFeeSats += changeSats;
        recipientAmountSats -= changeSats;
        changeSats = 0;
      }

      totalSats = params.amountSats;
    } else {
      if (params.amountSats + feeSats > confirmedSats) {
        throw new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE');
      }

      changeSats = confirmedSats - params.amountSats - feeSats;
      finalFeeSats = feeSats;

      if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
        finalFeeSats += changeSats;
        changeSats = 0;
      }

      recipientAmountSats = params.amountSats;
      totalSats = params.amountSats + finalFeeSats;
    }

    const inputs = selectPreviewInputs(confirmedUtxos, totalSats);
    const outputs: TxPreviewOutput[] = [
      { address: params.toAddress, amountSats: recipientAmountSats, isChange: false },
    ];
    if (changeSats > 0) {
      outputs.push({ address: '', amountSats: changeSats, isChange: true });
    }

    return {
      toAddress: params.toAddress,
      amountSats: params.amountSats,
      recipientAmountSats,
      feeSats: finalFeeSats,
      totalSats,
      changeSats,
      feeRateSatsPerVByte: feeRate,
      estimatedVBytes: ESTIMATED_VBYTES,
      subtractFeeFromAmount: effectiveSubtractFee,
      inputs,
      outputs,
    };
  }
}
