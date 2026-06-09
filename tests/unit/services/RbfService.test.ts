import {
  isRbfEligible,
  calcNewFeeSats,
  calcNewChangeSats,
  validateFeeBump,
  RBF_SEQUENCE_THRESHOLD,
} from '../../../src/core/domain/services/RbfService';

describe('RbfService', () => {
  describe('isRbfEligible', () => {
    it('returns true when any input has sequence < 0xFFFFFFFE', () => {
      expect(isRbfEligible([{ sequence: 0xFFFFFFFD }])).toBe(true);
    });

    it('returns true when sequence is 0', () => {
      expect(isRbfEligible([{ sequence: 0 }])).toBe(true);
    });

    it('returns false when all inputs have sequence === 0xFFFFFFFE', () => {
      expect(isRbfEligible([{ sequence: 0xFFFFFFFE }])).toBe(false);
    });

    it('returns false when all inputs have sequence === 0xFFFFFFFF', () => {
      expect(isRbfEligible([{ sequence: 0xFFFFFFFF }])).toBe(false);
    });

    it('returns true when at least one input signals RBF among many', () => {
      const inputs = [
        { sequence: 0xFFFFFFFF },
        { sequence: 0xFFFFFFFD }, // signals RBF
        { sequence: 0xFFFFFFFE },
      ];
      expect(isRbfEligible(inputs)).toBe(true);
    });

    it('returns false when empty inputs array', () => {
      expect(isRbfEligible([])).toBe(false);
    });

    it('uses the correct threshold constant', () => {
      expect(RBF_SEQUENCE_THRESHOLD).toBe(0xFFFFFFFE);
    });
  });

  describe('calcNewFeeSats', () => {
    it('calculates fee as vBytes * feeRate', () => {
      expect(calcNewFeeSats(180, 5)).toBe(900);
    });

    it('rounds up (ceiling)', () => {
      // 141 * 2.5 = 352.5 → 353
      expect(calcNewFeeSats(141, 2.5)).toBe(353);
    });

    it('handles integer rate', () => {
      expect(calcNewFeeSats(200, 10)).toBe(2000);
    });

    it('handles 1 sat/vbyte rate (minimum)', () => {
      expect(calcNewFeeSats(140, 1)).toBe(140);
    });
  });

  describe('calcNewChangeSats', () => {
    it('calculates change = totalInput - recipient - fee', () => {
      expect(calcNewChangeSats(1_000_000, 700_000, 2_000)).toBe(298_000);
    });

    it('returns negative when fee too high', () => {
      expect(calcNewChangeSats(1_000_000, 900_000, 200_000)).toBe(-100_000);
    });

    it('returns zero when inputs exactly cover recipient + fee', () => {
      expect(calcNewChangeSats(100_000, 99_000, 1_000)).toBe(0);
    });
  });

  describe('validateFeeBump', () => {
    it('returns valid: true when fee is higher and change >= 0', () => {
      const result = validateFeeBump(900, 1800, 50_000);
      expect(result.valid).toBe(true);
    });

    it('returns fee-not-higher when new fee equals current fee', () => {
      const result = validateFeeBump(900, 900, 50_000);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('fee-not-higher');
      }
    });

    it('returns fee-not-higher when new fee is less than current fee', () => {
      const result = validateFeeBump(900, 500, 50_000);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('fee-not-higher');
      }
    });

    it('returns insufficient-change when change is negative', () => {
      const result = validateFeeBump(900, 2000, -100);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('insufficient-change');
      }
    });

    it('returns valid: true when change is exactly 0', () => {
      const result = validateFeeBump(900, 1800, 0);
      expect(result.valid).toBe(true);
    });

    it('fee-not-higher takes priority over insufficient-change when fee is lower', () => {
      // Fee not higher AND change is negative: fee-not-higher should be returned
      const result = validateFeeBump(900, 500, -100);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('fee-not-higher');
      }
    });
  });
});
