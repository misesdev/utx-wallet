import type { BitcoinNetwork } from '../entities/Network';
import type { BNetwork } from 'bitcoin-tx-lib';

const VALID: ReadonlyArray<BitcoinNetwork> = ['mainnet', 'testnet', 'testnet3', 'testnet4'];

export class NetworkType {
  private constructor(private readonly _value: BitcoinNetwork) {}

  static of(value: string): NetworkType {
    if (!VALID.includes(value as BitcoinNetwork)) {
      throw new Error(
        `Invalid network: "${value}". Must be one of: ${VALID.join(', ')}`,
      );
    }
    return new NetworkType(value as BitcoinNetwork);
  }

  get value(): BitcoinNetwork {
    return this._value;
  }

  /** Maps to bitcoin-tx-lib BNetwork (testnet3/testnet4 → 'testnet'). */
  toBNetwork(): BNetwork {
    return this._value === 'mainnet' ? 'mainnet' : 'testnet';
  }

  equals(other: NetworkType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
