import type { Transaction } from '../../entities/Transaction';
import type { SignedTransaction } from '../../entities/SignedTransaction';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { UtxoRepository } from '../../repositories/UtxoRepository';

export type BroadcastResult = {
  txid: string;
  transaction: Transaction;
};

export class BroadcastTransactionUseCase {
  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly transactionRepository: TransactionRepository,
    private readonly utxoRepository: UtxoRepository,
  ) {}

  async execute(signed: SignedTransaction, walletId: string): Promise<BroadcastResult> {
    const txid = await this.blockchainProvider.broadcastTransaction(signed.rawHex);

    // Find the non-change output = recipient
    const recipientOutput = signed.builtTransaction.outputs.find(o => !o.isChange);

    const tx: Transaction = {
      id: txid,
      txid,
      amountSats: signed.builtTransaction.amountSats,
      feeSats: signed.builtTransaction.feeSats,
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      address: recipientOutput?.address,
    };

    // Persist the new transaction locally
    await this.transactionRepository.upsertAll(walletId, [tx]);

    // Remove spent UTXOs so the local balance is immediately correct
    const spentSet = new Set(
      signed.builtTransaction.inputs.map(i => `${i.txid}:${i.vout}`),
    );
    const existing = await this.utxoRepository.listByWallet(walletId);
    const remaining = existing.filter(u => !spentSet.has(`${u.txid}:${u.vout}`));
    await this.utxoRepository.replaceAll(walletId, remaining);

    return { txid, transaction: tx };
  }
}
