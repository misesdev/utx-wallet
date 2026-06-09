import type { BitcoinNetwork } from '../../entities/Network';
import type { BuiltTransaction } from '../../entities/BuiltTransaction';
import type { RbfInfo } from '../../entities/RbfInfo';
import type { BlockchainProvider } from '../../repositories/BlockchainProvider';
import type { IFeeEstimationService } from '../../services/FeeEstimationService';
import type { SignTransactionUseCase } from './SignTransactionUseCase';
import type { BroadcastTransactionUseCase, BroadcastResult } from './BroadcastTransactionUseCase';
import { AppError } from '../../../application/errors/AppError';
import { calcNewFeeSats, calcNewChangeSats, validateFeeBump } from '../../services/RbfService';
import { generateId } from '../../../../shared/utils/generateId';
import { DUST_THRESHOLD_SATS } from './BuildTransactionUseCase';

export type GetRbfInfoParams = {
  txid: string;
  toAddress: string;        // recipient address stored in Transaction.address
  walletIsWatchOnly: boolean;
  isConfirmed: boolean;
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

    const rawTx = await this.blockchainProvider.getRawTransaction(params.txid);

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
    const changeOutput = rawTx.outputs.find(o => o.address !== params.toAddress);

    if (!recipientOutput) {
      // toAddress not found in outputs — can't identify recipient
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'no-change',
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

    if (!changeOutput) {
      // No change output — can't reduce fee from change
      return {
        originalTxid: params.txid,
        isRbfEligible: false,
        ineligibilityReason: 'no-change',
        toAddress: params.toAddress,
        recipientAmountSats: recipientOutput.valueSats,
        changeAddress: '',
        changeAmountSats: 0,
        currentFeeSats: rawTx.feeSats,
        currentFeeRate: 0,
        estimatedVBytes: 0,
        rawInputs: rawTx.inputs,
      };
    }

    const estimatedVBytes = this.feeEstimation.estimateVBytes(rawTx.inputs.length, 2);
    const currentFeeRate = rawTx.feeSats / estimatedVBytes;

    return {
      originalTxid: params.txid,
      isRbfEligible: true,
      toAddress: params.toAddress,
      recipientAmountSats: recipientOutput.valueSats,
      changeAddress: changeOutput.address,
      changeAmountSats: changeOutput.valueSats,
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
    const newChangeSats = calcNewChangeSats(totalInputSats, rbfInfo.recipientAmountSats, newFeeSats);

    const validation = validateFeeBump(rbfInfo.currentFeeSats, newFeeSats, newChangeSats);
    if (!validation.valid) {
      if (validation.reason === 'fee-not-higher') {
        throw new AppError('Nova taxa deve ser maior que a atual', 'FEE_NOT_HIGHER');
      }
      throw new AppError('Saldo insuficiente para aumentar a taxa', 'INSUFFICIENT_FUNDS');
    }

    // Build replacement BuiltTransaction using same inputs
    const outputs: BuiltTransaction['outputs'] = [
      { address: rbfInfo.toAddress, amountSats: rbfInfo.recipientAmountSats, isChange: false },
    ];
    if (newChangeSats >= DUST_THRESHOLD_SATS) {
      outputs.push({ address: rbfInfo.changeAddress, amountSats: newChangeSats, isChange: true });
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
      amountSats: rbfInfo.recipientAmountSats,
      feeSats: newFeeSats,
      totalSats: totalInputSats,
      changeSats: Math.max(0, newChangeSats),
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

    return this.broadcastTransaction.execute(signed, params.walletId);
  }
}
