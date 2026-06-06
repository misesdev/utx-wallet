// Accepts BIP32/44/84 paths: m/segment/segment/... where each segment is digits optionally hardened (')
const PATH_PATTERN = /^m(\/\d+'?)*$/;

export class DerivationPath {
  private constructor(private readonly _value: string) {}

  static of(value: string): DerivationPath {
    if (!PATH_PATTERN.test(value)) {
      throw new Error(
        `Invalid derivation path: "${value}". Expected format: m/purpose'/coin_type'/account'/change/index`,
      );
    }
    return new DerivationPath(value);
  }

  /** BIP44: m/44'/coinType'/account'/change/index */
  static bip44(coinType: number, account: number, change: 0 | 1, index: number): DerivationPath {
    return new DerivationPath(`m/44'/${coinType}'/${account}'/${change}/${index}`);
  }

  /** BIP84 (native SegWit): m/84'/coinType'/account'/change/index */
  static bip84(coinType: number, account: number, change: 0 | 1, index: number): DerivationPath {
    return new DerivationPath(`m/84'/${coinType}'/${account}'/${change}/${index}`);
  }

  get value(): string {
    return this._value;
  }

  equals(other: DerivationPath): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
