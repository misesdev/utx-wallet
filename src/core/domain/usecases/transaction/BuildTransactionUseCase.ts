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
    const feeRate = Math.max(params.feeRateSatsPerVByte, 1);
    const { selectedUtxos, totalInputSats } = this.coinSelection.select(
      utxos,
      params.amountSats,
      feeRate,
    );

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

    // ── Fee & change calculation ──────────────────────────────────────────────
    // Coin selection assumed 2 outputs; start with that fee estimate.
    let feeSats = this.feeEstimation.estimateFeeSats(selectedUtxos.length, 2, feeRate);
    let changeSats = totalInputSats - params.amountSats - feeSats;

    // Absorb dust change into the fee rather than creating an unspendable output.
    if (changeSats > 0 && changeSats < DUST_THRESHOLD_SATS) {
      feeSats += changeSats;
      changeSats = 0;
    }

    // ── Build inputs — scriptPubKey derived via bitcoin-tx-lib ────────────────
    const inputs: BuiltTransactionInput[] = selectedUtxos.map(u => ({
      txid: u.txid,
      vout: u.vout,
      valueSats: u.valueSats,
      address: u.address,
      scriptPubKey: Address.getScriptPubkey(u.address),
    }));

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
