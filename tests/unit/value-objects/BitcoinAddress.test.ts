import { BitcoinAddress } from '../../../src/core/domain/value-objects/BitcoinAddress';

// Known valid addresses (BIP173 test vectors)
const MAINNET_P2WPKH = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const TESTNET_P2WPKH = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

describe('BitcoinAddress', () => {
  describe('of()', () => {
    it('accepts a valid mainnet bech32 address', () => {
      expect(() => BitcoinAddress.of(MAINNET_P2WPKH)).not.toThrow();
      expect(BitcoinAddress.of(MAINNET_P2WPKH).value).toBe(MAINNET_P2WPKH);
    });

    it('accepts a valid testnet bech32 address', () => {
      expect(() => BitcoinAddress.of(TESTNET_P2WPKH)).not.toThrow();
    });

    it('trims surrounding whitespace', () => {
      expect(BitcoinAddress.of(`  ${MAINNET_P2WPKH}  `).value).toBe(MAINNET_P2WPKH);
    });

    it('throws for an empty string', () => {
      expect(() => BitcoinAddress.of('')).toThrow('cannot be empty');
    });

    it('throws for a whitespace-only string', () => {
      expect(() => BitcoinAddress.of('   ')).toThrow('cannot be empty');
    });

    it('throws for a clearly invalid address', () => {
      expect(() => BitcoinAddress.of('notanaddress')).toThrow('Invalid Bitcoin address');
    });

    it('throws for a random string with correct length', () => {
      expect(() => BitcoinAddress.of('bc1qinvalidaddressthisisnotvalid0000000000')).toThrow();
    });
  });

  describe('equals()', () => {
    it('returns true for the same address', () => {
      expect(BitcoinAddress.of(MAINNET_P2WPKH).equals(BitcoinAddress.of(MAINNET_P2WPKH))).toBe(true);
    });

    it('returns false for different addresses', () => {
      expect(BitcoinAddress.of(MAINNET_P2WPKH).equals(BitcoinAddress.of(TESTNET_P2WPKH))).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns the address string', () => {
      expect(BitcoinAddress.of(MAINNET_P2WPKH).toString()).toBe(MAINNET_P2WPKH);
    });
  });
});
