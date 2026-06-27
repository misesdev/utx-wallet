import { FeeEstimationService } from '../../../src/core/domain/services/FeeEstimationService';

const service = new FeeEstimationService();

// Exact BIP 141 formula: ceil(10.5 + 67.75×n + 31×m)
// Derived from: weight = base_size×3 + total_size
//   base_size  = version(4) + vin_count(1) + inputs(41×n) + vout_count(1) + outputs(31×m) + locktime(4)
//   total_size = base_size + marker(1) + flag(1) + witness(107×n)
//   vBytes     = ceil(weight/4) = ceil(10.5 + 67.75×n + 31×m)
describe('FeeEstimationService', () => {
  describe('estimateVBytes', () => {
    it('calculates vBytes for 1 input, 1 output', () => {
      // ceil(10.5 + 67.75 + 31) = ceil(109.25) = 110
      expect(service.estimateVBytes(1, 1)).toBe(110);
    });

    it('calculates vBytes for 1 input, 2 outputs (typical send with change)', () => {
      // ceil(10.5 + 67.75 + 62) = ceil(140.25) = 141
      expect(service.estimateVBytes(1, 2)).toBe(141);
    });

    it('calculates vBytes for 2 inputs, 2 outputs', () => {
      // ceil(10.5 + 135.5 + 62) = ceil(208.0) = 208
      expect(service.estimateVBytes(2, 2)).toBe(208);
    });

    it('calculates vBytes for 3 inputs, 2 outputs', () => {
      // ceil(10.5 + 203.25 + 62) = ceil(275.75) = 276
      expect(service.estimateVBytes(3, 2)).toBe(276);
    });

    it('calculates vBytes for 2 inputs, 1 output (SFA, no change)', () => {
      // ceil(10.5 + 135.5 + 31) = ceil(177.0) = 177
      expect(service.estimateVBytes(2, 1)).toBe(177);
    });

    it('single-input estimate is 141 vB — matches testmempoolaccept rejection threshold', () => {
      // Bitcoin Core rejected "min relay fee not met, 140 < 141" with the old estimate.
      expect(service.estimateVBytes(1, 2)).toBe(141);
    });

    it('scales consistently with output count (31 vB per output)', () => {
      const oneOutput = service.estimateVBytes(1, 1);
      const twoOutputs = service.estimateVBytes(1, 2);
      expect(twoOutputs - oneOutput).toBe(31);
    });

    it('scales consistently with input count from n=2 onwards (68 vB per additional input)', () => {
      expect(service.estimateVBytes(3, 2) - service.estimateVBytes(2, 2)).toBe(68);
      expect(service.estimateVBytes(4, 2) - service.estimateVBytes(3, 2)).toBe(68);
    });

    it('first-to-second input step adds 67 vB due to marker/flag overhead amortisation', () => {
      // The first input carries the +0.25 fractional rounding from marker/flag (0.5 vB shared).
      // Adding a second input resolves the fractional accumulation, so the delta is 67, not 68.
      expect(service.estimateVBytes(2, 2) - service.estimateVBytes(1, 2)).toBe(67);
    });
  });

  describe('estimateFeeSats', () => {
    it('multiplies vBytes by fee rate and rounds up', () => {
      // 1 input, 2 outputs = 141 vBytes; rate 5 → 705 sats
      expect(service.estimateFeeSats(1, 2, 5)).toBe(141 * 5);
    });

    it('rounds fractional sats up (ceiling)', () => {
      const vb = service.estimateVBytes(2, 2); // 208
      expect(service.estimateFeeSats(2, 2, 10)).toBe(Math.ceil(vb * 10));
    });

    it('uses minimum rate of 1 when rate is 0', () => {
      const atRate1 = service.estimateFeeSats(1, 2, 1);
      expect(service.estimateFeeSats(1, 2, 0)).toBe(atRate1);
    });

    it('uses minimum rate of 1 when rate is negative', () => {
      const atRate1 = service.estimateFeeSats(1, 2, 1);
      expect(service.estimateFeeSats(1, 2, -5)).toBe(atRate1);
    });

    it('returns higher fee for faster rate', () => {
      const slow = service.estimateFeeSats(1, 2, 1);
      const fast = service.estimateFeeSats(1, 2, 20);
      expect(fast).toBeGreaterThan(slow);
    });

    it('1-input at 1 sat/vB pays 141 sats — above the 141-vByte minimum relay threshold', () => {
      expect(service.estimateFeeSats(1, 2, 1)).toBe(141);
    });

    it('estimated fee always covers the actual transaction weight at given rate', () => {
      const actualSingleInputVBytes = 141; // confirmed via testmempoolaccept
      expect(service.estimateFeeSats(1, 2, 1)).toBeGreaterThanOrEqual(actualSingleInputVBytes * 1);
      expect(service.estimateFeeSats(1, 2, 5)).toBeGreaterThanOrEqual(actualSingleInputVBytes * 5);
    });
  });
});
