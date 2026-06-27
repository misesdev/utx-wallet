import type { BitcoinNetwork } from '../../entities/Network';
import type { BuiltTransaction } from '../../entities/BuiltTransaction';
import type { RbfInfo } from '../../entities/RbfInfo';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { IFeeEstimationService } from '../../services/FeeEstimationService';
import type { TransactionRepository } from '../../repositories/TransactionRepository';
import type { SignTransactionUseCase } from './SignTransactionUseCase';
import type { BroadcastTransactionUseCase, BroadcastResult } from './BroadcastTransactionUseCase';
import { AppError } from '../../../application/errors/AppError';
import { calcNewFeeSats, calcNewRecipientSats, validateFeeBump } from '../../services/RbfService';
import { generateId } from '../../../../shared/utils/generateId';
import { DUST_THRESHOLD_SATS } from './BuildTransactionUseCase';

export type GetRbfInfoParams = {
  txid: string;
  toAddress: string;        // recipient address stored in Transaction.address
  walletIsWatchOnly: boolean;
  isConfirmed: boolean;
  walletNetwork: BitcoinNetwork;
};

export type AccelerateTransactionParams = {
  walletId: string;
  walletNetwork: BitcoinNetwork;
  rbfInfo: RbfInfo;
  newFeeRateSatsPerVByte: number;
};

export class AccelerateTransactionUseCase {
  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly feeEstimation: IFeeEstimationService,
    private readonly signTransaction: SignTransactionUseCase,
    private readonly broadcastTransaction: BroadcastTransactionUseCase,
    private readonly transactionRepository: TransactionRepository | null = null,
  ) {}

  async getRbfInfo(params: GetRbfInfoParams): Promise<RbfInfo> {
    if (params.walletIsWatchOnly) {
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'watch-only',
        toAddress: params.toAddress,
        recipientAmountSats: 0,
        changeAddress: '',
        changeAmountSats: 0,
        currentFeeSats: 0,
        currentFeeRate: 0,
        estimatedVBytes: 0,
        rawInputs: [],
      };
    }

    if (params.isConfirmed) {
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'already-confirmed',
        toAddress: params.toAddress,
        recipientAmountSats: 0,
        changeAddress: '',
        changeAmountSats: 0,
        currentFeeSats: 0,
        currentFeeRate: 0,
        estimatedVBytes: 0,
        rawInputs: [],
      };
    }

    const rawTx = await this.blockchainProvider.getRawTransaction(params.txid, params.walletNetwork);

    if (!rawTx.isRbfEligible) {
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'no-rbf-signal',
        toAddress: params.toAddress,
        recipientAmountSats: 0,
        changeAddress: '',
        changeAmountSats: 0,
        currentFeeSats: 0,
        currentFeeRate: 0,
        estimatedVBytes: 0,
        rawInputs: rawTx.inputs,
      };
    }

    const recipientOutput = rawTx.outputs.find(o => o.address === params.toAddress);

    if (!recipientOutput) {
      // Recipient address not found in outputs — cannot reconstruct the transaction
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'recipient-not-identified',
        toAddress: params.toAddress,
        recipientAmountSats: 0,
        changeAddress: '',
        changeAmountSats: 0,
        currentFeeSats: 0,
        currentFeeRate: 0,
        estimatedVBytes: 0,
        rawInputs: rawTx.inputs,
      };
    }

    const changeOutput = rawTx.outputs.find(o => o.address !== params.toAddress);

    // Transactions are always acceleratable by deducting the fee increase from the recipient.
    // Outputs used to estimate vBytes: 2 when change present, 1 when no change.
    const outputCount = changeOutput ? 2 : 1;
    const estimatedVBytes = this.feeEstimation.estimateVBytes(rawTx.inputs.length, outputCount);
    const currentFeeRate = rawTx.feeSats / estimatedVBytes;

    return {
      originalTxid: params.txid,
      isRbfEligible: true,
      toAddress: params.toAddress,
      recipientAmountSats: recipientOutput.valueSats,
      changeAddress: changeOutput?.address ?? '',
      changeAmountSats: changeOutput?.valueSats ?? 0,
      currentFeeSats: rawTx.feeSats,
      currentFeeRate: Math.ceil(currentFeeRate),
      estimatedVBytes,
      rawInputs: rawTx.inputs,
    };
  }

  async execute(params: AccelerateTransactionParams): Promise<BroadcastResult> {
    const { rbfInfo, newFeeRateSatsPerVByte } = params;

    if (!rbfInfo.isRbfEligible) {
      throw new AppError('Transação não elegível para substituição', 'NOT_RBF_ELIGIBLE');
    }

    const newFeeSats = calcNewFeeSats(rbfInfo.estimatedVBytes, newFeeRateSatsPerVByte);
    const totalInputSats = rbfInfo.rawInputs.reduce((sum, i) => sum + i.prevoutValue, 0);
    // Fee increase is always deducted from the recipient, keeping change unchanged.
    const newRecipientSats = calcNewRecipientSats(totalInputSats, rbfInfo.changeAmountSats, newFeeSats);

    const validation = validateFeeBump(rbfInfo.currentFeeSats, newFeeSats, newRecipientSats);
    if (!validation.valid) {
      if (validation.reason === 'fee-not-higher') {
        throw new AppError('Nova taxa deve ser maior que a atual', 'FEE_NOT_HIGHER');
      }
      throw new AppError('Taxa muito alta: valor do recebedor ficaria abaixo do mínimo', 'INSUFFICIENT_FUNDS');
    }

    const outputs: BuiltTransaction['outputs'] = [
      { address: rbfInfo.toAddress, amountSats: newRecipientSats, isChange: false },
    ];
    if (rbfInfo.changeAmountSats >= DUST_THRESHOLD_SATS) {
      outputs.push({ address: rbfInfo.changeAddress, amountSats: rbfInfo.changeAmountSats, isChange: true });
    }

    const builtTx: BuiltTransaction = {
      id: generateId(),
      walletId: params.walletId,
      inputs: rbfInfo.rawInputs.map(i => ({
        txid: i.txid,
        vout: i.vout,
        valueSats: i.prevoutValue,
        address: i.prevoutAddress,
        scriptPubKey: i.scriptPubKey,
      })),
      outputs,
      amountSats: newRecipientSats,
      feeSats: newFeeSats,
      totalSats: totalInputSats,
      changeSats: rbfInfo.changeAmountSats,
      feeRateSatsPerVByte: newFeeRateSatsPerVByte,
      estimatedVBytes: rbfInfo.estimatedVBytes,
      status: 'built',
      createdAt: new Date().toISOString(),
    };

    const signed = await this.signTransaction.execute({
      builtTransaction: builtTx,
      walletId: params.walletId,
      network: params.walletNetwork,
    });

    const result = await this.broadcastTransaction.execute(signed, params.walletId, params.walletNetwork);

    await this.markOriginalAsReplaced(params.walletId, rbfInfo.originalTxid, result.txid);

    return result;
  }

  private async markOriginalAsReplaced(
    walletId: string,
    originalTxid: string,
    replacementTxid: string,
  ): Promise<void> {
    if (!this.transactionRepository) return;
    try {
      const txs = await this.transactionRepository.list(walletId);
      const original = txs.find(tx => tx.txid === originalTxid);
      if (!original) return;
      await this.transactionRepository.upsertAll(walletId, [
        { ...original, status: 'replaced', replacedByTxid: replacementTxid },
      ]);
    } catch {
      // Non-critical — acceleration already succeeded
    }
  }
}
