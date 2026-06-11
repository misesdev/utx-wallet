import { AppError } from '../../application/errors/AppError';
import type { Utxo } from '../entities/Utxo';
import type { IFeeEstimationService } from './FeeEstimationService';

export type CoinSelectionResult = {
  selectedUtxos: Utxo[];
  totalInputSats: number;
};

export interface ICoinSelectionService {
  select(
    utxos: Utxo[],
    amountSats: number,
    feeRateSatsPerVByte: number,
    subtractFeeFromAmount?: boolean,
  ): CoinSelectionResult;
}

// Always assume two outputs (recipient + change) during selection so the fee
// estimate is conservative. Dust change is absorbed later by the caller.
const ASSUMED_OUTPUT_COUNT = 2;

export class CoinSelectionService implements ICoinSelectionService {
  constructor(private readonly feeEstimation: IFeeEstimationService) {}

  select(
    utxos: Utxo[],
    amountSats: number,
    feeRateSatsPerVByte: number,
    subtractFeeFromAmount = false,
  ): CoinSelectionResult {
    // Group available UTXOs by address (confirmed, non-frozen only).
    // Policy: selecting any UTXO from an address means spending ALL UTXOs of that address.
    const groupsByAddress = new Map<string, Utxo[]>();
    for (const u of utxos) {
      if (!u.isConfirmed || u.isFrozen) continue;
      const existing = groupsByAddress.get(u.address) ?? [];
      existing.push(u);
      groupsByAddress.set(u.address, existing);
    }

    // Sort groups descending by total group value (largest group first)
    const groups = [...groupsByAddress.values()].sort(
      (a, b) =>
        b.reduce((s, u) => s + u.valueSats, 0) - a.reduce((s, u) => s + u.valueSats, 0),
    );

    const selected: Utxo[] = [];
    let totalInputSats = 0;

    for (const group of groups) {
      // Select the entire group — no partial address spending
      selected.push(...group);
      totalInputSats += group.reduce((s, u) => s + u.valueSats, 0);

      const feeSats = this.feeEstimation.estimateFeeSats(
        selected.length,
        ASSUMED_OUTPUT_COUNT,
        feeRateSatsPerVByte,
      );

      // In SFA mode the fee comes out of amountSats, so inputs only need to
      // cover amountSats. In standard mode the fee is an extra cost on top.
      const required = subtractFeeFromAmount ? amountSats : amountSats + feeSats;
      if (totalInputSats >= required) {
        return { selectedUtxos: selected, totalInputSats };
      }
    }

    throw new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE');
  }
}
