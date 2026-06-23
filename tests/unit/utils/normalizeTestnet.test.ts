import { normalizeTestnet } from '../../../src/shared/constants/networks';
import type { BitcoinNetwork } from '../../../src/core/domain/entities/Network';

describe('normalizeTestnet', () => {
  it('maps "testnet" to "testnet4"', () => {
    expect(normalizeTestnet('testnet')).toBe('testnet4');
  });

  it('maps "testnet3" to "testnet4"', () => {
    expect(normalizeTestnet('testnet3')).toBe('testnet4');
  });

  it('keeps "testnet4" unchanged', () => {
    expect(normalizeTestnet('testnet4')).toBe('testnet4');
  });

  it('keeps "mainnet" unchanged', () => {
    expect(normalizeTestnet('mainnet')).toBe('mainnet');
  });

  it('cross-variant equality: testnet === testnet4 after normalization', () => {
    expect(normalizeTestnet('testnet' as BitcoinNetwork)).toBe(
      normalizeTestnet('testnet4' as BitcoinNetwork),
    );
  });

  it('cross-variant equality: testnet3 === testnet4 after normalization', () => {
    expect(normalizeTestnet('testnet3' as BitcoinNetwork)).toBe(
      normalizeTestnet('testnet4' as BitcoinNetwork),
    );
  });

  it('does not equate mainnet with any testnet variant', () => {
    expect(normalizeTestnet('mainnet')).not.toBe(normalizeTestnet('testnet4'));
    expect(normalizeTestnet('mainnet')).not.toBe(normalizeTestnet('testnet'));
    expect(normalizeTestnet('mainnet')).not.toBe(normalizeTestnet('testnet3'));
  });
});
