import { AppError } from '../../application/errors/AppError';
import type { Utxo } from '../entities/Utxo';
import type { IFeeEstimationService } from './FeeEstimationService';

export type CoinSelectionResult = {
  selectedUtxos: Utxo[];
  totalInputSats: number;
};

export interface ICoinSelectionService {
  select(utxos: Utxo[], amountSats: number, feeRateSatsPerVByte: number): CoinSelectionResult;
}

// Always assume two outputs (recipient + change) during selection so the fee
// estimate is conservative. Dust change is absorbed later by the caller.
const ASSUMED_OUTPUT_COUNT = 2;

export class CoinSelectionService implements ICoinSelectionService {
  constructor(private readonly feeEstimation: IFeeEstimationService) {}

  select(utxos: Utxo[], amountSats: number, feeRateSatsPerVByte: number): CoinSelectionResult {
    // Only spend confirmed, non-frozen UTXOs; largest-first minimises input count
    const confirmed = utxos.filter(u => u.isConfirmed && !u.isFrozen);
    const sorted = [...confirmed].sort((a, b) => b.valueSats - a.valueSats);

    const selected: Utxo[] = [];
    let totalInputSats = 0;

    for (const utxo of sorted) {
      selected.push(utxo);
      totalInputSats += utxo.valueSats;

      const feeSats = this.feeEstimation.estimateFeeSats(
        selected.length,
        ASSUMED_OUTPUT_COUNT,
        feeRateSatsPerVByte,
      );

      if (totalInputSats >= amountSats + feeSats) {
        return { selectedUtxos: selected, totalInputSats };
      }
    }

    throw new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE');
  }
}
