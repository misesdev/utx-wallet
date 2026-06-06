import { NetworkType } from '../../../src/core/domain/value-objects/NetworkType';

describe('NetworkType', () => {
  describe('of()', () => {
    it.each(['mainnet', 'testnet', 'testnet3', 'testnet4'])(
      'accepts valid network "%s"',
      network => {
        expect(() => NetworkType.of(network)).not.toThrow();
        expect(NetworkType.of(network).value).toBe(network);
      },
    );

    it('throws for an unknown network', () => {
      expect(() => NetworkType.of('signet')).toThrow('Invalid network');
    });

    it('throws for an empty string', () => {
      expect(() => NetworkType.of('')).toThrow('Invalid network');
    });
  });

  describe('toBNetwork()', () => {
    it('maps mainnet to "mainnet"', () => {
      expect(NetworkType.of('mainnet').toBNetwork()).toBe('mainnet');
    });

    it.each(['testnet', 'testnet3', 'testnet4'])(
      'maps %s to "testnet"',
      network => {
        expect(NetworkType.of(network).toBNetwork()).toBe('testnet');
      },
    );
  });

  describe('equals()', () => {
    it('returns true for the same network', () => {
      expect(NetworkType.of('mainnet').equals(NetworkType.of('mainnet'))).toBe(true);
    });

    it('returns false for different networks', () => {
      expect(NetworkType.of('mainnet').equals(NetworkType.of('testnet'))).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns the network string', () => {
      expect(NetworkType.of('testnet4').toString()).toBe('testnet4');
    });
  });
});
