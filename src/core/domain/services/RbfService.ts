export const RBF_SEQUENCE_THRESHOLD = 0xFFFFFFFE;

/**
 * Check if a raw transaction is RBF-eligible based on input sequences.
 * A transaction signals RBF if any input has sequence < 0xFFFFFFFE.
 */
export function isRbfEligible(inputs: { sequence: number }[]): boolean {
  return inputs.some(i => i.sequence < RBF_SEQUENCE_THRESHOLD);
}

/**
 * Calculate fee in sats needed for a given fee rate and estimated vBytes.
 */
export function calcNewFeeSats(estimatedVBytes: number, newFeeRateSatsPerVByte: number): number {
  return Math.ceil(estimatedVBytes * newFeeRateSatsPerVByte);
}

/**
 * Calculate the new change output value after applying the bumped fee.
 */
export function calcNewChangeSats(
  totalInputSats: number,
  recipientAmountSats: number,
  newFeeSats: number,
): number {
  return totalInputSats - recipientAmountSats - newFeeSats;
}

export type FeeValidationResult =
  | { valid: true }
  | { valid: false; reason: 'fee-not-higher' | 'insufficient-change' };

/**
 * Validate that the proposed fee bump is valid:
 * - New fee must be strictly higher than current fee
 * - New change must be non-negative (inputs cover the new fee)
 */
export function validateFeeBump(
  currentFeeSats: number,
  newFeeSats: number,
  newChangeSats: number,
): FeeValidationResult {
  if (newFeeSats <= currentFeeSats) return { valid: false, reason: 'fee-not-higher' };
  if (newChangeSats < 0) return { valid: false, reason: 'insufficient-change' };
  return { valid: true };
}
