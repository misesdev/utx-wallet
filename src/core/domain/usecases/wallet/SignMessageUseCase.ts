import type { BitcoinNetwork } from '../../entities/Network';
import type { SignedMessage } from '../../entities/SignedMessage';
import type { MessageSigner } from '../../repositories/MessageSigner';

export class SignMessageUseCase {
  constructor(private readonly signer: MessageSigner) {}

  execute(walletId: string, network: BitcoinNetwork, content: string): Promise<SignedMessage> {
    return this.signer.sign(walletId, network, content);
  }
}
