import type { BitcoinNetwork } from '../entities/Network';
import type { SignedMessage } from '../entities/SignedMessage';

export interface MessageSigner {
  sign(walletId: string, network: BitcoinNetwork, content: string): Promise<SignedMessage>;
}
