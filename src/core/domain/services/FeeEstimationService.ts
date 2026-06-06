// P2WPKH (native SegWit) transaction size — BIP 141 weight unit derivation:
//   overhead  = version(4) + marker(¼) + flag(¼) + locktime(4) + varint×2(1)  = 10 vB
//   per input = outpoint(36) + sequence(4) + scriptSig_len(1) + witness(108÷4) = 68 vB
//   per output= value(8) + scriptPubKey_len(1) + scriptPubKey(22)              = 31 vB
const OVERHEAD_VBYTES = 10;
const INPUT_VBYTES = 68;
const OUTPUT_VBYTES = 31;

export interface IFeeEstimationService {
  estimateVBytes(inputCount: number, outputCount: number): number;
  estimateFeeSats(inputCount: number, outputCount: number, feeRateSatsPerVByte: number): number;
}

export class FeeEstimationService implements IFeeEstimationService {
  estimateVBytes(inputCount: number, outputCount: number): number {
    return OVERHEAD_VBYTES + inputCount * INPUT_VBYTES + outputCount * OUTPUT_VBYTES;
  }

  estimateFeeSats(inputCount: number, outputCount: number, feeRateSatsPerVByte: number): number {
    const rate = Math.max(feeRateSatsPerVByte, 1);
    return Math.ceil(this.estimateVBytes(inputCount, outputCount) * rate);
  }
}
