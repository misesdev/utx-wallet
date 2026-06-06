import { MnemonicUtils } from 'bitcoin-tx-lib';

export class GenerateMnemonicUseCase {
  execute(strength: 128 | 256 = 128): string {
    return MnemonicUtils.generateMnemonic(strength);
  }
}
