import { ECPairKey, HDWallet, HDTransaction } from 'bitcoin-tx-lib';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { BuiltTransaction } from '../../domain/entities/BuiltTransaction';
import type { SignedTransaction } from '../../domain/entities/SignedTransaction';
import type { TransactionSigner } from '../../domain/repositories/TransactionSigner';
import type { WalletAddressRepository } from '../../domain/repositories/WalletAddressRepository';
import { AppError } from '../../application/errors/AppError';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

// Fallback scan limit when HD address registry is unavailable
const ADDRESS_SCAN_LIMIT = 50;

export class WalletTransactionSigner implements TransactionSigner {
  constructor(
    private readonly walletKeyStorage: WalletKeyStorage,
    private readonly walletAddressRepository: WalletAddressRepository | null = null,
  ) {}

  async sign(
    built: BuiltTransaction,
    walletId: string,
    network: BitcoinNetwork,
  ): Promise<SignedTransaction> {
    const key = await this.walletKeyStorage.retrieveKey(walletId);
    if (!key) {
      throw new AppError('Carteira não encontrada', 'WALLET_NOT_FOUND');
    }

    const bNetwork = NetworkType.of(network).toBNetwork();
    const walletData = key.kind === 'hd'
      ? HDWallet.import(key.secret, key.passphrase, {
        network: bNetwork,
        purpose: 84,
      })
      : null;

    if (walletData?.wallet.isWatchOnly) {
      throw new AppError('Watch-only wallets cannot sign transactions', 'WATCH_ONLY_WALLET');
    }

    const singleKey = key.kind === 'single-private-key' ? ECPairKey.fromWif(key.secret) : null;
    const tx = new HDTransaction();

    for (const input of built.inputs) {
      const pairKey = singleKey ?? await this.findKeyForAddress(walletData!.wallet, input.address);
      if (!pairKey || !this.keyMatchesAddress(pairKey, input.address)) {
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

  private async findKeyForAddress(
    wallet: HDWallet,
    address: string,
  ): Promise<ECPairKey | null> {
    // Fast path: look up derivation path in the HD address registry
    if (this.walletAddressRepository) {
      const record = await this.walletAddressRepository.findByAddress(address);
      if (record) {
        const change: 0 | 1 = record.chain === 'change' ? 1 : 0;
        const pairKey = wallet.getPairKey(record.index, { account: record.accountIndex, change });
        if (this.keyMatchesAddress(pairKey, address)) {
          return pairKey;
        }
      }
    }

    // Slow path: scan account 0 (legacy, covers wallets created before HD system)
    for (const change of [0, 1] as const) {
      for (let i = 0; i < ADDRESS_SCAN_LIMIT; i++) {
        if (wallet.getAddress(i, { change }) === address) {
          return wallet.getPairKey(i, { change });
        }
      }
    }
    return null;
  }

  private keyMatchesAddress(pairKey: ECPairKey, address: string): boolean {
    return pairKey.getAddress() === address || pairKey.getAddress('p2wpkh') === address;
  }
}
