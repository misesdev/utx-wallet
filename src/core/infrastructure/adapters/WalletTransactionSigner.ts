import { HDWallet, HDTransaction } from 'bitcoin-tx-lib';
import type { ECPairKey } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { BuiltTransaction } from '../../domain/entities/BuiltTransaction';
import type { SignedTransaction } from '../../domain/entities/SignedTransaction';
import type { TransactionSigner } from '../../domain/repositories/TransactionSigner';
import { AppError } from '../../application/errors/AppError';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

// Gap limit: number of consecutive unused addresses to scan per chain (receive + change)
const ADDRESS_SCAN_LIMIT = 50;

export class WalletTransactionSigner implements TransactionSigner {
  constructor(private readonly walletKeyStorage: WalletKeyStorage) {}

  async sign(
    built: BuiltTransaction,
    walletId: string,
    network: BitcoinNetwork,
  ): Promise<SignedTransaction> {
    const secret = await this.walletKeyStorage.retrieve(walletId);
    if (!secret) {
      throw new AppError('Carteira não encontrada', 'WALLET_NOT_FOUND');
    }

    const bNetwork = NetworkType.of(network).toBNetwork();
    const { wallet } = HDWallet.import(secret, undefined, {
      network: bNetwork,
      purpose: 84,
    });

    const tx = new HDTransaction();

    for (const input of built.inputs) {
      const pairKey = this.findKeyForAddress(wallet, input.address);
      if (!pairKey) {
        throw new AppError(
          `Chave não encontrada para o endereço: ${input.address}`,
          'KEY_NOT_FOUND',
        );
      }
      tx.addInput(
        {
          txid: input.txid,
          vout: input.vout,
          value: input.valueSats,
          scriptPubKey: input.scriptPubKey,
        },
        pairKey,
      );
    }

    for (const output of built.outputs) {
      tx.addOutput({ address: output.address, amount: output.amountSats });
    }

    tx.sign();

    return {
      rawHex: tx.getRawHex(),
      txid: tx.getTxid(),
      builtTransaction: built,
    };
  }

  // Scans receive (change=0) then internal (change=1) addresses up to ADDRESS_SCAN_LIMIT
  // to find the signing key for a given P2WPKH address.
  private findKeyForAddress(wallet: HDWallet, address: string): ECPairKey | null {
    for (const change of [0, 1] as const) {
      for (let i = 0; i < ADDRESS_SCAN_LIMIT; i++) {
        const key = wallet.getPairKey(i, { change });
        if (key.getAddress() === address) {
          return key;
        }
      }
    }
    return null;
  }
}
