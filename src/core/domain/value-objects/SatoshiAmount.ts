export class SatoshiAmount {
  static readonly SATS_PER_BTC = 100_000_000;
  private static readonly MAX_SATS = 2_100_000_000_000_000; // 21M BTC

  private constructor(private readonly _value: number) {}

  static of(sats: number): SatoshiAmount {
    if (!Number.isInteger(sats)) {
      throw new Error(`SatoshiAmount must be an integer, got: ${sats}`);
    }
    if (sats < 0) {
      throw new Error(`SatoshiAmount cannot be negative, got: ${sats}`);
    }
    if (sats > SatoshiAmount.MAX_SATS) {
      throw new Error(`SatoshiAmount exceeds maximum Bitcoin supply: ${sats}`);
    }
    return new SatoshiAmount(sats);
  }

  static fromBTC(btc: number): SatoshiAmount {
    return SatoshiAmount.of(Math.round(btc * SatoshiAmount.SATS_PER_BTC));
  }

  static zero(): SatoshiAmount {
    return new SatoshiAmount(0);
  }

  get value(): number {
    return this._value;
  }

  toBTC(): number {
    return this._value / SatoshiAmount.SATS_PER_BTC;
  }

  add(other: SatoshiAmount): SatoshiAmount {
    return SatoshiAmount.of(this._value + other._value);
  }

  subtract(other: SatoshiAmount): SatoshiAmount {
    return SatoshiAmount.of(this._value - other._value);
  }

  isGreaterThan(other: SatoshiAmount): boolean {
    return this._value > other._value;
  }

  isLessThan(other: SatoshiAmount): boolean {
    return this._value < other._value;
  }

  equals(other: SatoshiAmount): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value} sats`;
  }
}
