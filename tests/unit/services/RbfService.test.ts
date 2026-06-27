import {
  isRbfEligible,
  calcNewFeeSats,
  calcNewRecipientSats,
  validateFeeBump,
  RBF_SEQUENCE_THRESHOLD,
} from '../../../src/core/domain/services/RbfService';

const DUST_THRESHOLD_SATS = 546;

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

  describe('calcNewRecipientSats', () => {
    it('calculates recipient = totalInput - change - newFee', () => {
      // totalInput=1_000_000, change=100_000, fee=2_000 → recipient=898_000
      expect(calcNewRecipientSats(1_000_000, 100_000, 2_000)).toBe(898_000);
    });

    it('returns full input minus fee when there is no change (changeAmountSats=0)', () => {
      // totalInput=1_000_000, change=0, fee=5_000 → recipient=995_000
      expect(calcNewRecipientSats(1_000_000, 0, 5_000)).toBe(995_000);
    });

    it('returns negative when fee exceeds available funds', () => {
      // totalInput=100_000, change=50_000, fee=60_000 → recipient=-10_000
      expect(calcNewRecipientSats(100_000, 50_000, 60_000)).toBe(-10_000);
    });
  });

  describe('validateFeeBump', () => {
    it('returns valid: true when fee is higher and recipient >= dust threshold', () => {
      const result = validateFeeBump(900, 1800, DUST_THRESHOLD_SATS);
      expect(result.valid).toBe(true);
    });

    it('returns valid: true when recipient is well above dust threshold', () => {
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

    it('returns recipient-below-dust when recipient is below dust threshold', () => {
      const result = validateFeeBump(900, 2000, DUST_THRESHOLD_SATS - 1);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('recipient-below-dust');
      }
    });

    it('returns recipient-below-dust when recipient is negative', () => {
      const result = validateFeeBump(900, 2000, -100);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('recipient-below-dust');
      }
    });

    it('fee-not-higher takes priority over recipient-below-dust when fee is lower', () => {
      const result = validateFeeBump(900, 500, -100);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('fee-not-higher');
      }
    });
  });
});
