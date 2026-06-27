// P2WPKH (native SegWit) transaction size — BIP 141 weight unit derivation:
//   base size  = version(4) + vin_count(1) + vout_count(1) + locktime(4)     = 10 bytes
//   per input  = outpoint(36) + scriptSig_len(1) + scriptSig(0) + seq(4)     = 41 bytes (base)
//              + witness: stack_count(1)+sig_len(1)+sig(72)+pub_len(1)+pub(33) = 108 bytes witness
//              → weight per input = 41×4 + 108 = 272 WU → 272/4 = 68 vB
//   per output = value(8) + scriptPubKey_len(1) + scriptPubKey(22)            = 31 bytes × 4 WU
//   marker+flag= 2 bytes × 1 WU each = 2 WU → 0.5 vB (shared, not per-input)
//   total      = ceil(10×4 + 2 + 272×n + 124×m) / 4
//              = ceil(10.5 + 68×n + 31×m)
//
// DER signatures are 71 or 72 bytes depending on the R/S values of the ECDSA sig. Using 72 bytes
// (the worst case) ensures the fee estimate never falls below the actual transaction weight, which
// would cause "min relay fee not met" rejections from Bitcoin nodes.
const OVERHEAD_VBYTES = 10.5;
const INPUT_VBYTES = 68;
const OUTPUT_VBYTES = 31;

export interface IFeeEstimationService {
  estimateVBytes(inputCount: number, outputCount: number): number;
  estimateFeeSats(inputCount: number, outputCount: number, feeRateSatsPerVByte: number): number;
}

export class FeeEstimationService implements IFeeEstimationService {
  estimateVBytes(inputCount: number, outputCount: number): number {
    return Math.ceil(OVERHEAD_VBYTES + inputCount * INPUT_VBYTES + outputCount * OUTPUT_VBYTES);
  }

  estimateFeeSats(inputCount: number, outputCount: number, feeRateSatsPerVByte: number): number {
    const rate = Math.max(feeRateSatsPerVByte, 1);
    return Math.ceil(this.estimateVBytes(inputCount, outputCount) * rate);
  }
}
