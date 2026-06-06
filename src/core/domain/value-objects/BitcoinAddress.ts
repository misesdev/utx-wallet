import { Address as BtcAddress } from 'bitcoin-tx-lib';

export class BitcoinAddress {
  private constructor(private readonly _value: string) {}

  static of(value: string): BitcoinAddress {
    if (!value || value.trim().length === 0) {
      throw new Error('Bitcoin address cannot be empty');
    }
    const trimmed = value.trim();
    if (!BtcAddress.isValid(trimmed)) {
      throw new Error(`Invalid Bitcoin address: "${trimmed}"`);
    }
    return new BitcoinAddress(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: BitcoinAddress): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
