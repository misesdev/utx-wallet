import { SatoshiAmount } from '../../../src/core/domain/value-objects/SatoshiAmount';

describe('SatoshiAmount', () => {
  describe('of()', () => {
    it('creates a valid amount', () => {
      expect(SatoshiAmount.of(1000).value).toBe(1000);
    });

    it('accepts zero', () => {
      expect(SatoshiAmount.of(0).value).toBe(0);
    });

    it('accepts maximum supply', () => {
      expect(() => SatoshiAmount.of(2_100_000_000_000_000)).not.toThrow();
    });

    it('throws for a negative amount', () => {
      expect(() => SatoshiAmount.of(-1)).toThrow('cannot be negative');
    });

    it('throws for a non-integer', () => {
      expect(() => SatoshiAmount.of(1.5)).toThrow('must be an integer');
    });

    it('throws for an amount above max supply', () => {
      expect(() => SatoshiAmount.of(2_100_000_000_000_001)).toThrow('maximum Bitcoin supply');
    });
  });

  describe('fromBTC()', () => {
    it('converts 1 BTC to 100,000,000 sats', () => {
      expect(SatoshiAmount.fromBTC(1).value).toBe(100_000_000);
    });

    it('converts 0.001 BTC to 100,000 sats', () => {
      expect(SatoshiAmount.fromBTC(0.001).value).toBe(100_000);
    });
  });

  describe('zero()', () => {
    it('returns zero sats', () => {
      expect(SatoshiAmount.zero().value).toBe(0);
    });
  });

  describe('toBTC()', () => {
    it('converts sats to BTC', () => {
      expect(SatoshiAmount.of(100_000_000).toBTC()).toBe(1);
    });
  });

  describe('arithmetic', () => {
    it('add() sums two amounts', () => {
      expect(SatoshiAmount.of(300).add(SatoshiAmount.of(200)).value).toBe(500);
    });

    it('subtract() computes the difference', () => {
      expect(SatoshiAmount.of(500).subtract(SatoshiAmount.of(200)).value).toBe(300);
    });

    it('subtract() throws when result would be negative', () => {
      expect(() => SatoshiAmount.of(100).subtract(SatoshiAmount.of(200))).toThrow();
    });
  });

  describe('comparison', () => {
    it('isGreaterThan() returns true when larger', () => {
      expect(SatoshiAmount.of(500).isGreaterThan(SatoshiAmount.of(100))).toBe(true);
    });

    it('isLessThan() returns true when smaller', () => {
      expect(SatoshiAmount.of(100).isLessThan(SatoshiAmount.of(500))).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      expect(SatoshiAmount.of(1000).equals(SatoshiAmount.of(1000))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(SatoshiAmount.of(1000).equals(SatoshiAmount.of(2000))).toBe(false);
    });
  });

  describe('toString()', () => {
    it('includes the unit', () => {
      expect(SatoshiAmount.of(42).toString()).toBe('42 sats');
    });
  });
});
