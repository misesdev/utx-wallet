import { MnemonicUtils } from 'bitcoin-tx-lib';
import { GenerateMnemonicUseCase } from '../../../src/core/domain/usecases/wallet/GenerateMnemonicUseCase';

describe('GenerateMnemonicUseCase', () => {
  const useCase = new GenerateMnemonicUseCase();

  it('generates a 12-word BIP39 mnemonic by default', () => {
    const mnemonic = useCase.execute();
    expect(mnemonic.trim().split(/\s+/)).toHaveLength(12);
  });

  it('generates a 24-word mnemonic when strength is 256', () => {
    const mnemonic = useCase.execute(256);
    expect(mnemonic.trim().split(/\s+/)).toHaveLength(24);
  });

  it('generates a valid BIP39 mnemonic', () => {
    const mnemonic = useCase.execute();
    expect(MnemonicUtils.validateMnemonic(mnemonic)).toBe(true);
  });

  it('generates a different mnemonic each call', () => {
    const a = useCase.execute();
    const b = useCase.execute();
    expect(a).not.toBe(b);
  });
});
