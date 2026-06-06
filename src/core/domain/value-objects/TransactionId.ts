const TXID_PATTERN = /^[0-9a-f]{64}$/i;

export class TransactionId {
  private constructor(private readonly _value: string) {}

  static of(value: string): TransactionId {
    if (!TXID_PATTERN.test(value)) {
      throw new Error(
        `Invalid transaction ID: "${value}". Must be a 64-character hex string.`,
      );
    }
    return new TransactionId(value.toLowerCase());
  }

  get value(): string {
    return this._value;
  }

  equals(other: TransactionId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
