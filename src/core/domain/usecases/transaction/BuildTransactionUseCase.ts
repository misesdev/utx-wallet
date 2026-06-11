import { Address } from 'bitcoin-tx-lib';
import type { BuiltTransaction, BuiltTransactionInput, BuiltTransactionOutput } from '../../entities/BuiltTransaction';
import type { BitcoinNetwork } from '../../entities/Network';
import type { UtxoRepository } from '../../repositories/UtxoRepository';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import type { ICoinSelectionService } from '../../services/CoinSelectionService';
import type { IFeeEstimationService } from '../../services/FeeEstimationService';
import type { GetNextChangeAddressUseCase } from '../address/GetNextChangeAddressUseCase';
import { BitcoinAddress } from '../../value-objects/BitcoinAddress';
import { AppError } from '../../../application/errors/AppError';
import { generateId } from '../../../../shared/utils/generateId';
import { calcSubtractFeeAmounts } from '../../services/FeeSubtractionService';

export const DUST_THRESHOLD_SATS = 546;

export type BuildTransactionParams = {
  walletId: string;
  walletNetwork: BitcoinNetwork;
  toAddress: string;
  amountSats: number;
  feeRateSatsPerVByte: number;
  changeAddressIndex?: number;
  /** HD origin to source the change address from (uses default when absent) */
  changeOriginId?: string;
  /** Restrict coin selection to UTXOs at these addresses (account isolation) */
  allowedAddresses?: string[];
  subtractFeeFromAmount?: boolean;
};

export class BuildTransactionUseCase {
  constructor(
    private readonly utxoRepository: UtxoRepository,
    private readonly coinSelection: ICoinSelectionService,
    private readonly feeEstimation: IFeeEstimationService,
    private readonly changeAddressProvider: WalletAddressProvider,
    private readonly getNextChangeAddress: GetNextChangeAddressUseCase | null = null,
  ) {}

  async execute(params: BuildTransactionParams): Promise<BuiltTransaction> {
    // ── Validation ────────────────────────────────────────────────────────────
    BitcoinAddress.of(params.toAddress);

    if (!Number.isInteger(params.amountSats) || params.amountSats <= 0) {
      throw new AppError('Informe um valor em sats válido', 'INVALID_AMOUNT');
    }
    if (params.amountSats < DUST_THRESHOLD_SATS) {
      throw new AppError(
        `Valor mínimo é ${DUST_THRESHOLD_SATS} sats (limite de dust)`,
        'BELOW_DUST',
      );
    }

    // ── Coin selection ────────────────────────────────────────────────────────
    const utxos = await this.utxoRepository.listByWallet(params.walletId);
    const eligibleUtxos = params.allowedAddresses?.length
      ? utxos.filter(u => params.allowedAddresses!.includes(u.address))
      : utxos;
    const feeRate = Math.max(params.feeRateSatsPerVByte, 1);

    // Determine effective fee mode. In standard mode, if the balance cannot
    // cover amount + fee (drain scenario), auto-switch to SFA so the fee is
    // deducted from the amount — otherwise the transaction is impossible.
    let effectiveSubtractFee = params.subtractFeeFromAmount ?? false;
    let selectionResult = (() => {
      try {
        return this.coinSelection.select(eligibleUtxos, params.amountSats, feeRate, effectiveSubtractFee);
      } catch (err) {
        if (!effectiveSubtractFee && err instanceof AppError && err.code === 'INSUFFICIENT_BALANCE') {
          effectiveSubtractFee = true;
          return this.coinSelection.select(eligibleUtxos, params.amountSats, feeRate, true);
        }
        throw err;
      }
    })();
    const { selectedUtxos, totalInputSats } = selectionResult;

    // ── Change address — prefer HD system, fall back to legacy provider ────────
    let changeAddress: string;
    if (this.getNextChangeAddress) {
      const hdChangeAddr = await this.getNextChangeAddress.execute(
        params.walletId,
        params.walletNetwork,
        params.changeOriginId,
        true, // reserve it
      );
      changeAddress = hdChangeAddr.address;
    } else {
      changeAddress = await this.changeAddressProvider.getChangeAddress(
        params.walletId,
        params.walletNetwork,
        params.changeAddressIndex ?? 0,
      );
    }

    // ── Build inputs — scriptPubKey derived via bitcoin-tx-lib ────────────────
    const inputs: BuiltTransactionInput[] = selectedUtxos.map(u => ({
      txid: u.txid,
      vout: u.vout,
      valueSats: u.valueSats,
      address: u.address,
      scriptPubKey: Address.getScriptPubkey(u.address),
    }));

    if (effectiveSubtractFee) {
      // SFA mode: fee is deducted from the amount going to the recipient
      let feeSats = this.feeEstimation.estimateFeeSats(selectedUtxos.length, 2, feeRate);
      const { recipientAmountSats: initialRecipient } =
        calcSubtractFeeAmounts(params.amountSats, feeSats);

      let changeSats = totalInputSats - params.amountSats;
      let recipientAmountSats = initialRecipient;

      // Absorb dust change into fee (and reduce recipient amount)
      if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
        feeSats += changeSats;
        recipientAmountSats -= changeSats;
        changeSats = 0;
      }

      if (recipientAmountSats < DUST_THRESHOLD_SATS) {
        throw new AppError(
          `Valor mínimo é ${DUST_THRESHOLD_SATS} sats (limite de dust)`,
          'BELOW_DUST',
        );
      }

      // ── Build outputs ─────────────────────────────────────────────────────────
      const outputs: BuiltTransactionOutput[] = [
        { address: params.toAddress, amountSats: recipientAmountSats, isChange: false },
      ];
      if (changeSats > 0) {
        outputs.push({ address: changeAddress, amountSats: changeSats, isChange: true });
      }

      const estimatedVBytes = this.feeEstimation.estimateVBytes(
        selectedUtxos.length,
        outputs.length,
      );

      return {
        id: generateId(),
        walletId: params.walletId,
        inputs,
        outputs,
        amountSats: recipientAmountSats,
        feeSats,
        totalSats: params.amountSats,
        changeSats,
        feeRateSatsPerVByte: feeRate,
        estimatedVBytes,
        status: 'built',
        createdAt: new Date().toISOString(),
      };
    } else {
      // Standard mode: fee is paid from sender's change
      let feeSats = this.feeEstimation.estimateFeeSats(selectedUtxos.length, 2, feeRate);
      let changeSats = totalInputSats - params.amountSats - feeSats;

      // Absorb dust change into the fee rather than creating an unspendable output.
      if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
        feeSats += changeSats;
        changeSats = 0;
      }

      // ── Build outputs ─────────────────────────────────────────────────────────
      const outputs: BuiltTransactionOutput[] = [
        { address: params.toAddress, amountSats: params.amountSats, isChange: false },
      ];
      if (changeSats > 0) {
        outputs.push({ address: changeAddress, amountSats: changeSats, isChange: true });
      }

      const estimatedVBytes = this.feeEstimation.estimateVBytes(
        selectedUtxos.length,
        outputs.length,
      );

      return {
        id: generateId(),
        walletId: params.walletId,
        inputs,
        outputs,
        amountSats: params.amountSats,
        feeSats,
        totalSats: params.amountSats + feeSats,
        changeSats,
        feeRateSatsPerVByte: feeRate,
        estimatedVBytes,
        status: 'built',
        createdAt: new Date().toISOString(),
      };
    }
  }
}
