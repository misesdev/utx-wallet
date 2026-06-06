import { ValidateAddressUseCase } from '../../../src/core/domain/usecases/transaction/ValidateAddressUseCase';

const useCase = new ValidateAddressUseCase();

describe('ValidateAddressUseCase', () => {
  describe('valid addresses', () => {
    it('accepts a mainnet bech32 address', () => {
      const result = useCase.execute('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('accepts a testnet bech32 address', () => {
      const result = useCase.execute('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('accepts address with surrounding whitespace (trimmed)', () => {
      const result = useCase.execute('  bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid addresses', () => {
    it('rejects empty string with valid=false and no error message', () => {
      const result = useCase.execute('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeNull();
    });

    it('rejects whitespace-only string with valid=false and no error', () => {
      const result = useCase.execute('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBeNull();
    });

    it('rejects a random string', () => {
      const result = useCase.execute('not-a-bitcoin-address');
      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
    });

    it('rejects a checksum-invalid address', () => {
      const result = useCase.execute('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdr');
      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
    });

    it('rejects a too-short string', () => {
      const result = useCase.execute('bc1');
      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
    });
  });
});
