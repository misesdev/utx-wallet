import { DerivationPath } from '../../../src/core/domain/value-objects/DerivationPath';

describe('DerivationPath', () => {
  describe('of()', () => {
    it('accepts the root path "m"', () => {
      expect(() => DerivationPath.of('m')).not.toThrow();
    });

    it('accepts a full BIP44 path', () => {
      expect(() => DerivationPath.of("m/44'/0'/0'/0/0")).not.toThrow();
    });

    it('accepts a full BIP84 path', () => {
      expect(() => DerivationPath.of("m/84'/0'/0'/1/5")).not.toThrow();
    });

    it('accepts a path without hardened segments', () => {
      expect(() => DerivationPath.of('m/0/1/2')).not.toThrow();
    });

    it('throws when the path does not start with "m"', () => {
      expect(() => DerivationPath.of("44'/0'/0'/0/0")).toThrow('Invalid derivation path');
    });

    it('throws for a trailing slash', () => {
      expect(() => DerivationPath.of("m/44'/0'/")).toThrow('Invalid derivation path');
    });

    it('throws for non-numeric segments', () => {
      expect(() => DerivationPath.of('m/purpose/coin')).toThrow('Invalid derivation path');
    });

    it('throws for an empty string', () => {
      expect(() => DerivationPath.of('')).toThrow('Invalid derivation path');
    });
  });

  describe('bip44()', () => {
    it('builds the correct BIP44 path', () => {
      expect(DerivationPath.bip44(0, 0, 0, 0).value).toBe("m/44'/0'/0'/0/0");
    });

    it('builds path for change address', () => {
      expect(DerivationPath.bip44(0, 0, 1, 3).value).toBe("m/44'/0'/0'/1/3");
    });
  });

  describe('bip84()', () => {
    it('builds the correct BIP84 path', () => {
      expect(DerivationPath.bip84(0, 0, 0, 0).value).toBe("m/84'/0'/0'/0/0");
    });
  });

  describe('equals()', () => {
    it('returns true for the same path', () => {
      expect(DerivationPath.of("m/44'/0'/0'/0/0").equals(DerivationPath.of("m/44'/0'/0'/0/0"))).toBe(true);
    });

    it('returns false for different paths', () => {
      expect(DerivationPath.of("m/44'/0'/0'/0/0").equals(DerivationPath.of("m/84'/0'/0'/0/0"))).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns the path string', () => {
      expect(DerivationPath.of("m/84'/0'/0'/0/1").toString()).toBe("m/84'/0'/0'/0/1");
    });
  });
});
