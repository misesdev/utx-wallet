import { TransactionId } from '../../../src/core/domain/value-objects/TransactionId';

const VALID_TXID = 'a'.repeat(64);
const VALID_TXID_MIXED = 'A'.repeat(32) + 'f'.repeat(32);

describe('TransactionId', () => {
  describe('of()', () => {
    it('accepts a 64-character lowercase hex string', () => {
      expect(() => TransactionId.of(VALID_TXID)).not.toThrow();
      expect(TransactionId.of(VALID_TXID).value).toBe(VALID_TXID);
    });

    it('normalises to lowercase', () => {
      expect(TransactionId.of(VALID_TXID_MIXED).value).toBe(VALID_TXID_MIXED.toLowerCase());
    });

    it('throws for a string shorter than 64 chars', () => {
      expect(() => TransactionId.of('abc123')).toThrow('Invalid transaction ID');
    });

    it('throws for a string longer than 64 chars', () => {
      expect(() => TransactionId.of('a'.repeat(65))).toThrow('Invalid transaction ID');
    });

    it('throws for a string with non-hex characters', () => {
      expect(() => TransactionId.of('g'.repeat(64))).toThrow('Invalid transaction ID');
    });

    it('throws for an empty string', () => {
      expect(() => TransactionId.of('')).toThrow('Invalid transaction ID');
    });
  });

  describe('equals()', () => {
    it('returns true for the same txid', () => {
      expect(TransactionId.of(VALID_TXID).equals(TransactionId.of(VALID_TXID))).toBe(true);
    });

    it('returns true regardless of case', () => {
      const lower = TransactionId.of(VALID_TXID_MIXED);
      const also = TransactionId.of(VALID_TXID_MIXED.toLowerCase());
      expect(lower.equals(also)).toBe(true);
    });

    it('returns false for different txids', () => {
      expect(TransactionId.of('a'.repeat(64)).equals(TransactionId.of('b'.repeat(64)))).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns the lowercase hex string', () => {
      expect(TransactionId.of(VALID_TXID_MIXED).toString()).toBe(VALID_TXID_MIXED.toLowerCase());
    });
  });
});
