import { HDWallet, ECPairKey } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { SignedMessage } from '../../domain/entities/SignedMessage';
import type { MessageSigner } from '../../domain/repositories/MessageSigner';
import type { MessageSigningService } from '../../domain/services/MessageSigningService';
import { AppError } from '../../application/errors/AppError';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

export class WalletMessageSigner implements MessageSigner {
  constructor(
    private readonly walletKeyStorage: WalletKeyStorage,
    private readonly signingService: MessageSigningService,
  ) {}

  async sign(walletId: string, network: BitcoinNetwork, content: string): Promise<SignedMessage> {
    const key = await this.walletKeyStorage.retrieveKey(walletId);
    if (!key) throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');

    let privateKey: Uint8Array;

    if (key.kind === 'hd') {
      const bNetwork = NetworkType.of(network).toBNetwork();
      const { wallet } = HDWallet.import(key.secret, key.passphrase, {
        network: bNetwork,
        purpose: 84,
      });
      if (wallet.isWatchOnly) {
        throw new AppError('Watch-only wallet cannot sign messages', 'WATCH_ONLY_WALLET');
      }
      // Use the first external receive address key (m/84'/0'/0'/0/0)
      privateKey = wallet.getPairKey(0, { account: 0, change: 0 }).getPrivateKey();
    } else {
      privateKey = ECPairKey.fromWif(key.secret).getPrivateKey();
    }

    return this.signingService.sign(content, privateKey);
  }
}
