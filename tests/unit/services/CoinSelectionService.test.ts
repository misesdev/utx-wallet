import { CoinSelectionService } from '../../../src/core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../../src/core/domain/services/FeeEstimationService';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const feeEstimation = new FeeEstimationService();
const service = new CoinSelectionService(feeEstimation);

const FEE_RATE = 5; // sat/vB

function makeUtxo(valueSats: number, isConfirmed = true, vout = 0, isFrozen = false, address?: string): Utxo {
  return { txid: `tx-${valueSats}-${vout}`, vout, valueSats, address: address ?? `bc1q${vout}`, isConfirmed, isFrozen };
}

// Fee for 1 input, 2 outputs at rate 5: (10 + 68 + 62) * 5 = 700 sats
const FEE_1IN_2OUT = feeEstimation.estimateFeeSats(1, 2, FEE_RATE);
describe('CoinSelectionService', () => {
  describe('UTXO único suficiente', () => {
    it('selects single UTXO when its value covers amount + fee', () => {
      const amount = 100_000;
      const utxo = makeUtxo(amount + FEE_1IN_2OUT);
      const { selectedUtxos, totalInputSats } = service.select([utxo], amount, FEE_RATE);

      expect(selectedUtxos).toHaveLength(1);
      expect(selectedUtxos[0]).toBe(utxo);
      expect(totalInputSats).toBe(utxo.valueSats);
    });

    it('returns as soon as the first UTXO suffices (largest-first)', () => {
      const amount = 50_000;
      const big = makeUtxo(200_000, true, 0);
      const small = makeUtxo(60_000, true, 1);
      const { selectedUtxos } = service.select([small, big], amount, FEE_RATE);

      expect(selectedUtxos).toHaveLength(1);
      expect(selectedUtxos[0]).toBe(big);
    });
  });

  describe('Múltiplos UTXOs', () => {
    it('adds UTXOs until total covers amount + fee', () => {
      const amount = 100_000;
      // Each UTXO individually insufficient; two together are enough
      const u1 = makeUtxo(60_000, true, 0);
      const u2 = makeUtxo(60_000, true, 1);
      // After 2 inputs: need amount + FEE_2IN_2OUT = 100_000 + 1040 = 101_040
      // total = 120_000 ≥ 101_040 ✓
      const { selectedUtxos } = service.select([u1, u2], amount, FEE_RATE);

      expect(selectedUtxos).toHaveLength(2);
    });

    it('selects UTXOs largest-first to minimise input count', () => {
      const amount = 50_000;
      const utxos = [
        makeUtxo(20_000, true, 0),
        makeUtxo(80_000, true, 1),
        makeUtxo(10_000, true, 2),
      ];
      const { selectedUtxos } = service.select(utxos, amount, FEE_RATE);

      expect(selectedUtxos[0].valueSats).toBe(80_000);
    });

    it('accumulates exactly enough inputs then stops', () => {
      const amount = 150_000;
      // u1=100k, u2=80k sorted desc → [100k, 80k]
      // After u1 alone: 100k < 150k+700 → insufficient
      // After u1+u2: 180k ≥ 151_040 → sufficient
      const u1 = makeUtxo(100_000, true, 0);
      const u2 = makeUtxo(80_000, true, 1);
      const u3 = makeUtxo(50_000, true, 2);
      const { selectedUtxos } = service.select([u1, u2, u3], amount, FEE_RATE);

      expect(selectedUtxos).toHaveLength(2);
    });
  });

  describe('Saldo insuficiente', () => {
    it('throws INSUFFICIENT_BALANCE when confirmed UTXOs are too small', () => {
      const utxo = makeUtxo(500); // cannot cover 100_000 + fee
      expect(() => service.select([utxo], 100_000, FEE_RATE)).toThrow(
        expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
      );
    });

    it('throws INSUFFICIENT_BALANCE when no UTXOs provided', () => {
      expect(() => service.select([], 100_000, FEE_RATE)).toThrow(
        expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
      );
    });

    it('ignores unconfirmed UTXOs', () => {
      // Unconfirmed UTXO alone would cover the amount but must be ignored
      const unconfirmed = makeUtxo(1_000_000, false);
      expect(() => service.select([unconfirmed], 100_000, FEE_RATE)).toThrow(
        expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
      );
    });

    it('uses only confirmed UTXOs even when unconfirmed ones are present', () => {
      const confirmed = makeUtxo(200_000, true, 0);
      const unconfirmed = makeUtxo(1_000_000, false, 1);
      const { selectedUtxos } = service.select([confirmed, unconfirmed], 100_000, FEE_RATE);

      expect(selectedUtxos).toHaveLength(1);
      expect(selectedUtxos[0].isConfirmed).toBe(true);
    });
  });

  describe('fee rate edge cases', () => {
    it('uses fee rate 1 sat/vB minimum when provided rate is 0', () => {
      const amount = 100_000;
      const minFee = feeEstimation.estimateFeeSats(1, 2, 1);
      const utxo = makeUtxo(amount + minFee);
      // Should succeed: rate 0 → treated as 1
      const { selectedUtxos } = service.select([utxo], amount, 0);
      expect(selectedUtxos).toHaveLength(1);
    });
  });

  describe('coin selection ignora congelados (frozen UTXOs)', () => {
    it('ignores frozen confirmed UTXOs', () => {
      const frozen = makeUtxo(1_000_000, true, 0, true);
      expect(() => service.select([frozen], 100_000, FEE_RATE)).toThrow(
        expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
      );
    });

    it('uses non-frozen confirmed UTXOs even when frozen ones are present', () => {
      const frozen = makeUtxo(1_000_000, true, 0, true);
      const available = makeUtxo(200_000, true, 1, false);
      const { selectedUtxos } = service.select([frozen, available], 100_000, FEE_RATE);
      expect(selectedUtxos).toHaveLength(1);
      expect(selectedUtxos[0].isFrozen).toBeFalsy();
    });

    it('throws INSUFFICIENT_BALANCE when only frozen UTXOs would cover the amount', () => {
      const frozen = makeUtxo(500_000, true, 0, true);
      const tiny = makeUtxo(500, true, 1, false);
      expect(() => service.select([frozen, tiny], 100_000, FEE_RATE)).toThrow(
        expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
      );
    });

    it('selects largest non-frozen UTXO first', () => {
      const frozen = makeUtxo(900_000, true, 0, true);
      const big = makeUtxo(300_000, true, 1, false);
      const small = makeUtxo(200_000, true, 2, false);
      const { selectedUtxos } = service.select([frozen, small, big], 100_000, FEE_RATE);
      expect(selectedUtxos).toHaveLength(1);
      expect(selectedUtxos[0].valueSats).toBe(300_000);
    });
  });
});
